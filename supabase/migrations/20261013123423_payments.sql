-- LiciTot · Payments (Phase 6): orders, Stripe Connect (Express) sellers, Checkout with a 5% fee.
--
-- Flow: an auction ends sold (closing job or buy now) → a trigger creates the order → the buyer
-- picks delivery and pays through Stripe Checkout (destination charge to the seller's connected
-- account, application fee = 5% of the item price; shipping is passed through) → the payment is
-- confirmed by the Stripe webhook or on return from Checkout (both idempotent) → the seller
-- marks it shipped/handed over → the buyer confirms receipt.
--
-- Clients never write orders: user steps are security-definer RPCs; payment and Stripe
-- account state change only through service-role functions called by trusted server code.

-- ─── Stripe needs at least 2 RON per charge ──────────────────────────────
alter table public.auctions drop constraint auctions_starting_price_check;
alter table public.auctions
  add constraint auctions_starting_price_check check (starting_price between 200 and 1000000000);

-- ─── Sellers must connect Stripe before publishing ───────────────────────
update private.app_settings set value = 'true', updated_at = now()
where key = 'require_connect_for_publish';

-- ─── Orders ──────────────────────────────────────────────────────────────
create type public.order_status as enum ('pending_payment', 'paid', 'shipped', 'completed', 'cancelled');
create type public.delivery_method as enum ('pickup', 'courier');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auctions (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  item_price bigint not null check (item_price between 200 and 1000000000),
  platform_fee bigint not null check (platform_fee >= 0 and platform_fee < item_price),
  -- Null while the buyer still has to choose (the auction offers both).
  delivery_method public.delivery_method,
  shipping_cost bigint not null default 0 check (shipping_cost between 0 and 100000),
  total bigint generated always as (item_price + shipping_cost) stored,
  status public.order_status not null default 'pending_payment',
  payment_due_at timestamptz not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_parties check (buyer_id <> seller_id)
);

comment on table public.orders is
  'One per sold auction. Money in bani; platform_fee = 5% of item_price (see lib/money.ts).';

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

revoke all on public.orders from anon;
revoke insert, update, delete on public.orders from authenticated;

alter table public.orders enable row level security;

-- Policy: an order is visible to its buyer, its seller and admins.
create policy "Buyers, sellers and admins read orders"
  on public.orders for select
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
    or (select public.is_admin())
  );

-- 5% of the item price, rounded half up to whole bani. Mirrors calcPlatformFee().
create or replace function private.platform_fee(p_price bigint)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (p_price * 5 + 50) / 100;
$$;

-- Creates the order when an auction becomes sold. If the auction offers a single delivery
-- option it is preselected; with both, the buyer chooses before paying.
create or replace function private.create_order_for_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_method public.delivery_method;
  v_shipping bigint := 0;
begin
  if new.ship_pickup and not new.ship_courier then
    v_method := 'pickup';
  elsif new.ship_courier and not new.ship_pickup then
    v_method := 'courier';
    v_shipping := coalesce(new.courier_cost, 0);
  end if;

  insert into public.orders (
    auction_id, buyer_id, seller_id, item_price, platform_fee,
    delivery_method, shipping_cost, payment_due_at
  ) values (
    new.id, new.winner_id, new.seller_id, new.final_price, private.platform_fee(new.final_price),
    v_method, v_shipping, now() + interval '3 days'
  )
  on conflict (auction_id) do nothing;
  return new;
end;
$$;

create trigger auctions_create_order
  after update of status on public.auctions
  for each row
  when (
    new.status = 'ended_sold' and old.status is distinct from 'ended_sold'
    and new.winner_id is not null and new.final_price is not null
  )
  execute function private.create_order_for_sale();

-- ─── RPC: buyer chooses the delivery method (before paying) ─────────────
create or replace function public.choose_delivery(p_order_id uuid, p_method public.delivery_method)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_auction public.auctions;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.buyer_id is distinct from auth.uid() then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'order_not_pending' using errcode = 'P0001';
  end if;

  select * into v_auction from public.auctions where id = v_order.auction_id;
  if (p_method = 'pickup' and not v_auction.ship_pickup)
     or (p_method = 'courier' and not v_auction.ship_courier) then
    raise exception 'delivery_unavailable' using errcode = 'P0001';
  end if;

  update public.orders
  set delivery_method = p_method,
      shipping_cost = case when p_method = 'courier' then coalesce(v_auction.courier_cost, 0) else 0 end
  where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

revoke execute on function public.choose_delivery(uuid, public.delivery_method) from public, anon;
grant execute on function public.choose_delivery(uuid, public.delivery_method) to authenticated;

-- ─── RPC: seller marks the item shipped / handed over ───────────────────
create or replace function public.mark_order_shipped(p_order_id uuid)
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
  if v_order.status <> 'paid' then
    raise exception 'order_not_paid' using errcode = 'P0001';
  end if;
  update public.orders set status = 'shipped', shipped_at = now() where id = p_order_id;
end;
$$;

revoke execute on function public.mark_order_shipped(uuid) from public, anon;
grant execute on function public.mark_order_shipped(uuid) to authenticated;

-- ─── RPC: buyer confirms receipt ─────────────────────────────────────────
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
      shipped_at = coalesce(shipped_at, now())
  where id = p_order_id;
end;
$$;

revoke execute on function public.confirm_order_received(uuid) from public, anon;
grant execute on function public.confirm_order_received(uuid) to authenticated;

-- ─── RPC: seller cancels an order the buyer did not pay in time ─────────
-- The server expires any open Checkout session first, so a late payment can't slip through.
create or replace function public.cancel_unpaid_order(p_order_id uuid)
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
  if v_order.status <> 'pending_payment' then
    raise exception 'order_not_pending' using errcode = 'P0001';
  end if;
  if v_order.payment_due_at > now() then
    raise exception 'payment_not_overdue' using errcode = 'P0001';
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
end;
$$;

revoke execute on function public.cancel_unpaid_order(uuid) from public, anon;
grant execute on function public.cancel_unpaid_order(uuid) to authenticated;

-- ─── RPC: contact details of the other party, only after payment ────────
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
    and o.status in ('paid', 'shipped', 'completed');
$$;

revoke execute on function public.get_order_contact(uuid) from public, anon;
grant execute on function public.get_order_contact(uuid) to authenticated;

-- ─── Service role: Checkout and payment state ───────────────────────────
create or replace function public.order_attach_checkout(p_order_id uuid, p_session_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
  set stripe_checkout_session_id = p_session_id
  where id = p_order_id and status = 'pending_payment';
$$;

-- Marks an order paid if the amount matches. Returns true the first time, false if it was
-- already paid (webhook and return page may both call it). Raises if it can't be paid.
create or replace function public.order_mark_paid(
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
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
  if v_order.status in ('paid', 'shipped', 'completed') then
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
      stripe_checkout_session_id = p_session_id,
      stripe_payment_intent_id = p_payment_intent_id
  where id = p_order_id;
  return true;
end;
$$;

-- ─── Service role: Stripe Connect accounts ──────────────────────────────
-- Stores the user's connected account id once; returns the id on file.
create or replace function public.set_stripe_account(p_user_id uuid, p_account_id text)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.profiles_private
  set stripe_account_id = coalesce(stripe_account_id, p_account_id)
  where id = p_user_id
  returning stripe_account_id;
$$;

create or replace function public.sync_stripe_account(
  p_account_id text,
  p_details_submitted boolean,
  p_charges_enabled boolean,
  p_payouts_enabled boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles_private
  set stripe_details_submitted = p_details_submitted,
      stripe_charges_enabled = p_charges_enabled,
      stripe_payouts_enabled = p_payouts_enabled
  where stripe_account_id = p_account_id;
$$;

-- ─── Service role: webhook idempotency ──────────────────────────────────
create table private.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- True the first time an event id is seen; false for Stripe's retries/duplicates.
create or replace function public.stripe_event_once(p_event_id text, p_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.stripe_events (id, type) values (p_event_id, p_type);
  return true;
exception when unique_violation then
  return false;
end;
$$;

-- Forget a claimed event when handling it failed, so Stripe's retry is processed.
create or replace function public.stripe_event_release(p_event_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.stripe_events where id = p_event_id;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.order_attach_checkout(uuid, text)',
    'public.order_mark_paid(uuid, text, text, bigint)',
    'public.set_stripe_account(uuid, text)',
    'public.sync_stripe_account(text, boolean, boolean, boolean)',
    'public.stripe_event_once(text, text)',
    'public.stripe_event_release(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- Old webhook events are only needed for deduplication.
select cron.schedule(
  'licitot-stripe-events-cleanup',
  '23 3 * * *',
  $$delete from private.stripe_events where received_at < now() - interval '30 days'$$
);
