-- LiciTot · Safe payments (escrow), handover codes, tracking, disputes, new-seller limits and
-- duplicate-photo detection.
--
-- Money flow (Stripe "separate charges and transfers"): the buyer pays the platform; the money
-- stays at Stripe until the order is complete, then it is transferred to the seller minus the
-- 5% fee. Refunds before that are full refunds.
--
--   paid ──(pickup: seller enters the buyer's handover code)────────────────► completed
--     │  ──(courier: seller enters the AWB)──► shipped ──(buyer confirms, or
--     │                                          5 days pass with no dispute)──► completed
--     ├──(buyer: "I have a problem")──► disputed ──(admin: refund | release)──► cancelled | completed
--     └──(seller misses the 5-day deadline: buyer cancels; after 10 days automatically)──► cancelled
--
-- completed + released_at null → the server transfers the money (Stripe), then order_mark_released().
-- cancelled + paid_at not null + refunded_at null → the server refunds, then order_mark_refunded().
-- Those Stripe steps run from features/payments/server.ts (order page, actions and a scheduled job).

-- ─── Orders: escrow, deadlines, tracking ─────────────────────────────────
alter table public.orders
  -- 'escrow' (money held until completion) or 'direct' (paid before escrow existed: the money
  -- went straight to the seller, so refunds must reverse that transfer).
  add column funds_model text not null default 'escrow' check (funds_model in ('escrow', 'direct')),
  add column ship_by timestamptz,
  add column release_at timestamptz,
  add column released_at timestamptz,
  add column handed_over_at timestamptz,
  add column refunded_at timestamptz,
  add column stripe_charge_id text,
  add column stripe_transfer_id text unique,
  add column stripe_refund_id text unique,
  add column tracking_carrier text check (char_length(btrim(tracking_carrier)) between 2 and 40),
  add column tracking_number text check (tracking_number ~ '^[A-Za-z0-9-]{4,40}$');

comment on column public.orders.ship_by is 'Seller deadline to hand over or ship (paid_at + 5 days).';
comment on column public.orders.release_at is 'When the held money may go to the seller.';

-- Orders paid before this migration used destination charges: the seller already has the money.
update public.orders
set funds_model = 'direct',
    released_at = coalesce(paid_at, now()),
    ship_by = coalesce(paid_at, now()) + interval '5 days'
where status in ('paid', 'shipped', 'completed');

create index orders_settle_idx on public.orders (status, release_at)
  where released_at is null or refunded_at is null;

-- ─── Handover codes (pickup) ─────────────────────────────────────────────
-- Only the buyer can read the code (get_handover_code); the seller types it in at the handover.
create table private.order_handover (
  order_id uuid primary key references public.orders (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{6}$'),
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

create or replace function private.new_handover_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select lpad(
    (abs(('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::integer) % 1000000)::text,
    6, '0'
  );
$$;

insert into private.order_handover (order_id, code)
select id, private.new_handover_code() from public.orders where status = 'paid'
on conflict do nothing;

-- ─── Disputes ────────────────────────────────────────────────────────────
create table public.order_disputes (
  order_id uuid primary key references public.orders (id) on delete cascade,
  reason text not null check (reason in ('not_received', 'not_as_described', 'other')),
  details text not null check (char_length(btrim(details)) between 10 and 2000),
  seller_response text check (char_length(btrim(seller_response)) between 1 and 2000),
  resolution text check (resolution in ('refund', 'release')),
  resolution_note text check (char_length(resolution_note) <= 1000),
  opened_at timestamptz not null default now(),
  responded_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

comment on table public.order_disputes is 'Buyer complaint on an order; resolved by an admin.';

revoke all on public.order_disputes from anon;
revoke insert, update, delete on public.order_disputes from authenticated;
alter table public.order_disputes enable row level security;

-- Policy: the buyer and the seller of the order (and admins) read its dispute.
create policy "Order parties and admins read disputes"
  on public.order_disputes for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (select auth.uid()) in (o.buyer_id, o.seller_id)
    )
    or (select public.is_admin())
  );

-- ─── New sellers ─────────────────────────────────────────────────────────
-- A seller is "new" until one of their sales has been paid out (escrow completed).
create or replace function private.is_new_seller(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.orders
    where seller_id = p_user_id and status = 'completed' and released_at is not null
  );
$$;

-- ─── Duplicate photos ────────────────────────────────────────────────────
-- 64-bit perceptual hash from ImageKit, stored by the server at publish time. The same photo
-- (even re-compressed) has a near-identical hash.
alter table public.auction_images add column phash bit(64);
create index auction_images_phash_idx on public.auction_images (phash) where phash is not null;

-- Service role: stores the hashes the server read from ImageKit for a draft's photos.
create or replace function public.set_auction_image_hashes(p_auction_id uuid, p_hashes jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.auction_images i
  set phash = ('x' || lpad(lower(h ->> 'phash'), 16, '0'))::bit(64)
  from jsonb_array_elements(p_hashes) as h
  where i.auction_id = p_auction_id
    and i.file_id = h ->> 'file_id'
    and (h ->> 'phash') ~ '^[0-9a-fA-F]{1,16}$';
$$;

-- ─── publish_auction: photo checks and new-seller limit ─────────────────
create or replace function public.publish_auction(p_auction_id uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_new_seller_max_active constant integer := 3;
  c_max_photo_distance constant integer := 6;
  v_uid uuid := auth.uid();
  v_auction public.auctions;
  v_require_connect boolean;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;

  if not found or v_auction.seller_id is distinct from v_uid then
    raise exception 'auction_not_found' using errcode = 'P0001';
  end if;
  if v_auction.status <> 'draft' then
    raise exception 'auction_not_draft' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then
    raise exception 'user_banned' using errcode = 'P0001';
  end if;

  select coalesce((value)::boolean, false) into v_require_connect
  from private.app_settings where key = 'require_connect_for_publish';
  if coalesce(v_require_connect, false) and not exists (
    select 1 from public.profiles_private where id = v_uid and stripe_charges_enabled
  ) then
    raise exception 'connect_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.auction_images where auction_id = p_auction_id) then
    raise exception 'images_required' using errcode = 'P0001';
  end if;

  -- Every photo must have been checked by the server (hash read from ImageKit).
  if exists (select 1 from public.auction_images where auction_id = p_auction_id and phash is null) then
    raise exception 'photos_unverified' using errcode = 'P0001';
  end if;

  -- A photo already used in another seller's listing (e.g. copied from the internet).
  if exists (
    select 1
    from public.auction_images mine
    join public.auction_images other on other.auction_id <> mine.auction_id and other.phash is not null
    join public.auctions oa on oa.id = other.auction_id
    where mine.auction_id = p_auction_id
      and oa.seller_id <> v_uid
      and oa.status <> 'draft'
      and bit_count(mine.phash # other.phash) <= c_max_photo_distance
  ) then
    raise exception 'duplicate_photo' using errcode = 'P0001';
  end if;

  if private.is_new_seller(v_uid) and (
    select count(*) from public.auctions where seller_id = v_uid and status = 'active'
  ) >= c_new_seller_max_active then
    raise exception 'new_seller_limit' using errcode = 'P0001';
  end if;

  update public.auctions
  set status = 'active',
      published_at = now(),
      starts_at = now(),
      ends_at = now() + make_interval(days => duration_days),
      original_ends_at = now() + make_interval(days => duration_days),
      current_price = starting_price,
      bid_count = 0,
      high_bidder_id = null
  where id = p_auction_id
  returning * into v_auction;

  return v_auction;
end;
$$;

-- ─── Payment: order_mark_paid now records the charge and starts the escrow ─
drop function public.order_mark_paid(uuid, text, text, bigint);

create or replace function public.order_mark_paid(
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_amount bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.paid_at is not null then
    return false;
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'order_not_pending' using errcode = 'P0001';
  end if;
  if p_amount <> v_order.total then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;

  update public.orders
  set status = 'paid',
      paid_at = now(),
      ship_by = now() + interval '5 days',
      stripe_checkout_session_id = p_session_id,
      stripe_payment_intent_id = p_payment_intent_id,
      stripe_charge_id = p_charge_id
  where id = p_order_id;

  insert into private.order_handover (order_id, code)
  values (p_order_id, private.new_handover_code())
  on conflict (order_id) do nothing;
  return true;
end;
$$;

-- ─── Buyer: read the handover code (pickup, while paid) ─────────────────
create or replace function public.get_handover_code(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select h.code
  from public.orders o
  join private.order_handover h on h.order_id = o.id
  where o.id = p_order_id
    and o.buyer_id = (select auth.uid())
    and o.status = 'paid'
    and o.delivery_method = 'pickup';
$$;

-- ─── Seller: confirm a pickup handover with the buyer's code ────────────
-- Returns 'ok', 'invalid' or 'locked' (5 wrong codes lock it for 30 minutes). It returns
-- instead of raising so the failed-attempt counter is kept.
create or replace function public.confirm_handover(p_order_id uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_handover private.order_handover;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.seller_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'paid' or v_order.delivery_method is distinct from 'pickup' then
    raise exception 'order_not_handover' using errcode = 'P0001';
  end if;

  select * into v_handover from private.order_handover where order_id = p_order_id for update;
  if not found then
    raise exception 'order_not_handover' using errcode = 'P0001';
  end if;
  if v_handover.locked_until is not null and v_handover.locked_until > now() then
    return 'locked';
  end if;

  if btrim(coalesce(p_code, '')) <> v_handover.code then
    update private.order_handover
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '30 minutes' end
    where order_id = p_order_id;
    return 'invalid';
  end if;

  update private.order_handover set failed_attempts = 0, locked_until = null where order_id = p_order_id;
  update public.orders
  set status = 'completed',
      handed_over_at = now(),
      completed_at = now(),
      release_at = now()
  where id = p_order_id;
  return 'ok';
end;
$$;

-- ─── Seller: ship by courier (AWB required) ──────────────────────────────
-- The money is released 5 days later (≈2 days in transit + 3 days to check the item) unless the
-- buyer confirms sooner or opens a dispute; 4 more days for sellers without a completed sale.
drop function public.mark_order_shipped(uuid);

create or replace function public.mark_order_shipped(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.seller_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'paid' or v_order.delivery_method is distinct from 'courier' then
    raise exception 'order_not_shippable' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_carrier, ''))) < 2
     or coalesce(p_tracking_number, '') !~ '^[A-Za-z0-9-]{4,40}$' then
    raise exception 'tracking_invalid' using errcode = 'P0001';
  end if;

  update public.orders
  set status = 'shipped',
      shipped_at = now(),
      tracking_carrier = btrim(p_carrier),
      tracking_number = upper(p_tracking_number),
      release_at = now() + interval '5 days'
        + case when private.is_new_seller(v_order.seller_id) then interval '4 days' else interval '0' end
  where id = p_order_id;
end;
$$;

-- ─── Buyer: confirm receipt (releases the money now) ────────────────────
create or replace function public.confirm_order_received(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.buyer_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status not in ('paid', 'shipped') then
    raise exception 'order_not_paid' using errcode = 'P0001';
  end if;
  update public.orders
  set status = 'completed',
      completed_at = now(),
      handed_over_at = coalesce(handed_over_at, now()),
      shipped_at = coalesce(shipped_at, now()),
      release_at = now()
  where id = p_order_id;
end;
$$;

-- ─── Buyer: open a dispute (freezes the money) ──────────────────────────
create or replace function public.open_dispute(p_order_id uuid, p_reason text, p_details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.buyer_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status not in ('paid', 'shipped') or v_order.released_at is not null then
    raise exception 'dispute_not_allowed' using errcode = 'P0001';
  end if;
  if p_reason not in ('not_received', 'not_as_described', 'other')
     or char_length(btrim(coalesce(p_details, ''))) not between 10 and 2000 then
    raise exception 'dispute_invalid' using errcode = 'P0001';
  end if;

  insert into public.order_disputes (order_id, reason, details)
  values (p_order_id, p_reason, btrim(p_details));
  update public.orders set status = 'disputed' where id = p_order_id;
end;
$$;

-- ─── Seller: answer a dispute ────────────────────────────────────────────
create or replace function public.respond_dispute(p_order_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.orders
    where id = p_order_id and seller_id = auth.uid() and status = 'disputed'
  ) then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_response, ''))) not between 1 and 2000 then
    raise exception 'dispute_invalid' using errcode = 'P0001';
  end if;
  update public.order_disputes
  set seller_response = btrim(p_response), responded_at = now()
  where order_id = p_order_id;
end;
$$;

-- ─── Admin: resolve a dispute ────────────────────────────────────────────
-- 'refund' → cancelled (the server refunds the buyer); 'release' → completed (the server pays
-- the seller).
create or replace function public.admin_resolve_dispute(
  p_order_id uuid,
  p_outcome text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  if p_outcome not in ('refund', 'release') then
    raise exception 'dispute_invalid' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id and status = 'disputed') then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  update public.order_disputes
  set resolution = p_outcome, resolution_note = nullif(btrim(p_note), ''),
      resolved_at = now(), resolved_by = auth.uid()
  where order_id = p_order_id;

  if p_outcome = 'refund' then
    update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  else
    update public.orders
    set status = 'completed', completed_at = now(), release_at = now()
    where id = p_order_id;
  end if;
end;
$$;

-- ─── Buyer: cancel when the seller missed the deadline (refund follows) ─
create or replace function public.cancel_late_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.buyer_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'order_not_paid' using errcode = 'P0001';
  end if;
  if v_order.ship_by is null or v_order.ship_by > now() then
    raise exception 'deadline_not_passed' using errcode = 'P0001';
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
end;
$$;

-- ─── Contact details: also while disputed ────────────────────────────────
create or replace function public.get_order_contact(p_order_id uuid)
returns table (display_name text, username text, email text, phone text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.display_name, p.username, u.email::text, pp.phone
  from public.orders o
  join public.profiles p
    on p.id = case when o.buyer_id = (select auth.uid()) then o.seller_id else o.buyer_id end
  join auth.users u on u.id = p.id
  left join public.profiles_private pp on pp.id = p.id
  where o.id = p_order_id
    and (select auth.uid()) in (o.buyer_id, o.seller_id)
    and o.status in ('paid', 'shipped', 'disputed', 'completed');
$$;

-- ─── Service role: record Stripe transfers and refunds ──────────────────
create or replace function public.order_mark_released(p_order_id uuid, p_transfer_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set released_at = now(), stripe_transfer_id = p_transfer_id
  where id = p_order_id and status = 'completed' and released_at is null;
$$;

create or replace function public.order_mark_refunded(p_order_id uuid, p_refund_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set refunded_at = now(), stripe_refund_id = p_refund_id
  where id = p_order_id and status = 'cancelled' and refunded_at is null;
$$;

-- ─── Time-based steps (pg_cron, every 5 minutes) ────────────────────────
-- Shipped orders whose window passed without a dispute become completed (money released by the
-- server); paid orders the seller never handed over or shipped are cancelled after 10 days.
create or replace function public.advance_orders()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed integer;
  v_cancelled integer;
begin
  update public.orders
  set status = 'completed', completed_at = now()
  where status = 'shipped' and release_at <= now();
  get diagnostics v_completed = row_count;

  update public.orders
  set status = 'cancelled', cancelled_at = now()
  where status = 'paid' and ship_by + interval '5 days' <= now();
  get diagnostics v_cancelled = row_count;

  return jsonb_build_object('completed', v_completed, 'cancelled', v_cancelled);
end;
$$;

select cron.schedule('licitot-advance-orders', '*/5 * * * *', $$select public.advance_orders()$$);

-- ─── Privileges ──────────────────────────────────────────────────────────
do $$
declare
  f text;
begin
  -- Signed-in users (each function checks who may do what).
  foreach f in array array[
    'public.get_handover_code(uuid)',
    'public.confirm_handover(uuid, text)',
    'public.mark_order_shipped(uuid, text, text)',
    'public.open_dispute(uuid, text, text)',
    'public.respond_dispute(uuid, text)',
    'public.admin_resolve_dispute(uuid, text, text)',
    'public.cancel_late_order(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

  -- Trusted server code only.
  foreach f in array array[
    'public.order_mark_paid(uuid, text, text, text, bigint)',
    'public.order_mark_released(uuid, text)',
    'public.order_mark_refunded(uuid, text)',
    'public.set_auction_image_hashes(uuid, jsonb)',
    'public.advance_orders()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

revoke execute on function private.is_new_seller(uuid) from public;
revoke execute on function private.new_handover_code() from public;
