-- LiciTot · Bidding (Phase 5): proxy bids, anti-sniping, buy now, cancelling, automatic closing.
--
-- Every bid goes through public.place_bid() (security definer), which locks the auction row,
-- so concurrent bids on one auction are applied one after another. Clients never write to
-- bids or auto_bids directly.
--
-- Proxy bidding: the bidder enters the MAXIMUM they are willing to pay. The system bids for
-- them only as much as needed to stay ahead (one increment over the next best maximum). On a
-- tie between maximums, whoever reached that maximum first keeps the lead.

-- ─── Hide the reserve price ──────────────────────────────────────────────
-- The reserve is secret: buyers only learn whether it has been met. Column-level SELECT
-- grants keep reserve_price out of public reads; sellers read it through
-- public.get_auction_reserve(). NOTE: new auctions columns must be added to this grant.
alter table public.auctions
  add column has_reserve boolean generated always as (reserve_price is not null) stored,
  add column reserve_met boolean generated always as (
    reserve_price is not null and bid_count > 0 and current_price >= reserve_price
  ) stored;

revoke select on public.auctions from anon, authenticated;
grant select (
  id, seller_id, category_id, title, slug, description, condition, status,
  starting_price, buy_now_price, min_increment, current_price, bid_count, high_bidder_id,
  duration_days, published_at, starts_at, ends_at, original_ends_at,
  county_code, city, ship_pickup, ship_courier, courier_cost,
  winner_id, final_price, is_hidden, hidden_reason, created_at, updated_at,
  search_tsv, has_reserve, reserve_met
) on public.auctions to anon, authenticated;

-- Seller (or admin) reads the reserve of their own auction.
create or replace function public.get_auction_reserve(p_auction_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select a.reserve_price
  from public.auctions a
  where a.id = p_auction_id
    and (a.seller_id = (select auth.uid()) or (select public.is_admin()));
$$;

revoke execute on function public.get_auction_reserve(uuid) from public, anon;
grant execute on function public.get_auction_reserve(uuid) to authenticated;

-- ─── Bids ────────────────────────────────────────────────────────────────
-- One row per visible price step. `is_auto` marks steps placed by the proxy on someone's behalf.
create table public.bids (
  id bigint generated always as identity primary key,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount between 100 and 1000000000),
  is_auto boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.bids is 'Bid history (bani). Written only by place_bid().';

create index bids_auction_idx on public.bids (auction_id, id desc);
create index bids_bidder_idx on public.bids (bidder_id, created_at desc);

-- Each bidder's secret maximum per auction. Also the list of auctions a user takes part in.
create table public.auto_bids (
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  max_amount bigint not null check (max_amount between 100 and 1000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (auction_id, bidder_id)
);

comment on table public.auto_bids is 'Secret proxy maximum per (auction, bidder). Owner-readable only.';

create index auto_bids_bidder_idx on public.auto_bids (bidder_id, updated_at desc);

create trigger auto_bids_set_updated_at
  before update on public.auto_bids
  for each row execute function private.set_updated_at();

revoke insert, update, delete on public.bids from anon, authenticated;
revoke insert, update, delete on public.auto_bids from anon, authenticated;
revoke all on public.auto_bids from anon;

alter table public.bids enable row level security;
alter table public.auto_bids enable row level security;

-- Policy: bidders see their own bids; sellers see every bid on their auctions; admins see all.
-- The public history (with masked names) comes from get_auction_bids().
create policy "Bidders, sellers and admins read bids"
  on public.bids for select
  to authenticated
  using (
    bidder_id = (select auth.uid())
    or exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.seller_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

-- Policy: a maximum is secret; only its owner can read it.
create policy "Bidders read their own maximum"
  on public.auto_bids for select
  to authenticated
  using (bidder_id = (select auth.uid()));

-- ─── RPC: place a (proxy) bid ────────────────────────────────────────────
-- Anti-sniping: a bid in the last 2 minutes pushes the end to 2 minutes from now.
create or replace function public.place_bid(p_auction_id uuid, p_max_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_snipe_window constant interval := interval '2 minutes';
  v_uid uuid := auth.uid();
  v_a public.auctions;
  v_min bigint;
  v_prev_max bigint;
  v_leader_max bigint;
  v_price bigint;
  v_high uuid;
  v_new_bids integer := 0;
  v_ends timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_a from public.auctions where id = p_auction_id for update;

  if not found or v_a.status = 'draft' or v_a.is_hidden then
    raise exception 'auction_not_found' using errcode = 'P0001';
  end if;
  if v_a.status <> 'active' or v_a.ends_at <= now() then
    raise exception 'auction_ended' using errcode = 'P0001';
  end if;
  if v_a.seller_id = v_uid then
    raise exception 'own_auction' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then
    raise exception 'user_banned' using errcode = 'P0001';
  end if;
  if p_max_amount is null or p_max_amount > 1000000000 then
    raise exception 'bid_too_high' using errcode = 'P0001';
  end if;

  v_min := case when v_a.bid_count = 0 then v_a.starting_price
                else v_a.current_price + v_a.min_increment end;
  v_price := v_a.current_price;
  v_high := v_a.high_bidder_id;

  if v_a.high_bidder_id = v_uid then
    -- The leader raises their own maximum. The price only moves if that meets the reserve.
    select max_amount into v_prev_max
    from public.auto_bids where auction_id = p_auction_id and bidder_id = v_uid;
    if p_max_amount <= coalesce(v_prev_max, v_a.current_price) then
      raise exception 'max_not_higher' using errcode = 'P0001';
    end if;

    update public.auto_bids set max_amount = p_max_amount
    where auction_id = p_auction_id and bidder_id = v_uid;

    if v_a.reserve_price is not null and v_a.current_price < v_a.reserve_price then
      v_price := least(p_max_amount, v_a.reserve_price);
      insert into public.bids (auction_id, bidder_id, amount) values (p_auction_id, v_uid, v_price);
      v_new_bids := 1;
    end if;
  else
    if p_max_amount < v_min then
      raise exception 'bid_too_low' using errcode = 'P0001';
    end if;

    insert into public.auto_bids (auction_id, bidder_id, max_amount)
    values (p_auction_id, v_uid, p_max_amount)
    on conflict (auction_id, bidder_id) do update set max_amount = excluded.max_amount;

    if v_a.high_bidder_id is null then
      -- First bid: the starting price (or straight to the reserve if the maximum covers it).
      v_price := greatest(v_a.starting_price, least(p_max_amount, coalesce(v_a.reserve_price, 0)));
      insert into public.bids (auction_id, bidder_id, amount) values (p_auction_id, v_uid, v_price);
      v_new_bids := 1;
      v_high := v_uid;
    else
      select max_amount into v_leader_max
      from public.auto_bids where auction_id = p_auction_id and bidder_id = v_a.high_bidder_id;
      v_leader_max := greatest(coalesce(v_leader_max, 0), v_a.current_price);

      if p_max_amount > v_leader_max then
        -- New leader. The old leader's proxy first bids its whole maximum.
        if v_leader_max > v_a.current_price then
          insert into public.bids (auction_id, bidder_id, amount, is_auto)
          values (p_auction_id, v_a.high_bidder_id, v_leader_max, true);
          v_new_bids := v_new_bids + 1;
        end if;
        v_price := least(p_max_amount, v_leader_max + v_a.min_increment);
        v_price := greatest(v_price, least(p_max_amount, coalesce(v_a.reserve_price, 0)));
        insert into public.bids (auction_id, bidder_id, amount) values (p_auction_id, v_uid, v_price);
        v_new_bids := v_new_bids + 1;
        v_high := v_uid;
      else
        -- The leader's proxy answers right away and keeps the lead.
        insert into public.bids (auction_id, bidder_id, amount)
        values (p_auction_id, v_uid, p_max_amount);
        v_price := least(v_leader_max, p_max_amount + v_a.min_increment);
        insert into public.bids (auction_id, bidder_id, amount, is_auto)
        values (p_auction_id, v_a.high_bidder_id, v_price, true);
        v_new_bids := 2;
      end if;
    end if;
  end if;

  v_ends := v_a.ends_at;
  if v_new_bids > 0 and v_ends - now() < c_snipe_window then
    v_ends := now() + c_snipe_window;
  end if;

  update public.auctions
  set current_price = v_price,
      bid_count = bid_count + v_new_bids,
      high_bidder_id = v_high,
      ends_at = v_ends
  where id = p_auction_id;

  return jsonb_build_object(
    'leading', v_high = v_uid,
    'current_price', v_price,
    'bid_count', v_a.bid_count + v_new_bids,
    'ends_at', v_ends,
    'extended', v_ends > v_a.ends_at
  );
end;
$$;

comment on function public.place_bid is
  'Places a proxy bid (maximum in bani). Errors: P0001 with a stable code (see sell.errors / bid.errors).';

revoke execute on function public.place_bid(uuid, bigint) from public, anon;
grant execute on function public.place_bid(uuid, bigint) to authenticated;

-- ─── RPC: buy now (only while there are no bids) ─────────────────────────
create or replace function public.buy_now(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.auctions;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_a from public.auctions where id = p_auction_id for update;

  if not found or v_a.status = 'draft' or v_a.is_hidden then
    raise exception 'auction_not_found' using errcode = 'P0001';
  end if;
  if v_a.status <> 'active' or v_a.ends_at <= now() then
    raise exception 'auction_ended' using errcode = 'P0001';
  end if;
  if v_a.seller_id = v_uid then
    raise exception 'own_auction' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then
    raise exception 'user_banned' using errcode = 'P0001';
  end if;
  if v_a.buy_now_price is null or v_a.bid_count > 0 then
    raise exception 'buy_now_unavailable' using errcode = 'P0001';
  end if;

  update public.auctions
  set status = 'ended_sold',
      current_price = buy_now_price,
      final_price = buy_now_price,
      winner_id = v_uid,
      high_bidder_id = v_uid,
      ends_at = now()
  where id = p_auction_id;

  return jsonb_build_object('final_price', v_a.buy_now_price);
end;
$$;

revoke execute on function public.buy_now(uuid) from public, anon;
grant execute on function public.buy_now(uuid) to authenticated;

-- ─── RPC: seller cancels an active auction (only before the first bid) ──
create or replace function public.cancel_auction(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.auctions;
begin
  select * into v_a from public.auctions where id = p_auction_id for update;

  if not found or v_a.seller_id is distinct from auth.uid() then
    raise exception 'auction_not_found' using errcode = 'P0001';
  end if;
  if v_a.status <> 'active' or v_a.ends_at <= now() then
    raise exception 'auction_ended' using errcode = 'P0001';
  end if;
  if v_a.bid_count > 0 then
    raise exception 'has_bids' using errcode = 'P0001';
  end if;

  update public.auctions set status = 'cancelled', ends_at = now() where id = p_auction_id;
end;
$$;

revoke execute on function public.cancel_auction(uuid) from public, anon;
grant execute on function public.cancel_auction(uuid) to authenticated;

-- ─── RPC: public bid history with masked bidder names ───────────────────
-- "Andrei Popescu" → "A***u". The caller's own bids are flagged so the UI can say "you".
create or replace function public.get_auction_bids(p_auction_id uuid, p_limit integer default 20)
returns table (
  id bigint,
  amount bigint,
  created_at timestamptz,
  bidder text,
  is_auto boolean,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.amount,
    b.created_at,
    left(btrim(p.display_name), 1) || '***' || right(btrim(p.display_name), 1),
    b.is_auto,
    b.bidder_id = (select auth.uid())
  from public.bids b
  join public.auctions a on a.id = b.auction_id
  join public.profiles p on p.id = b.bidder_id
  where b.auction_id = p_auction_id
    and (
      (a.status <> 'draft' and not a.is_hidden)
      or a.seller_id = (select auth.uid())
      or (select public.is_admin())
    )
  order by b.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

grant execute on function public.get_auction_bids(uuid, integer) to anon, authenticated;

-- ─── Closing job ─────────────────────────────────────────────────────────
-- Every minute: auctions past their end become sold (bids + reserve met) or unsold.
create or replace function private.close_ended_auctions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.auctions
  set status = case
        when high_bidder_id is not null and (reserve_price is null or current_price >= reserve_price)
          then 'ended_sold'::public.auction_status
        else 'ended_unsold'::public.auction_status
      end,
      winner_id = case
        when high_bidder_id is not null and (reserve_price is null or current_price >= reserve_price)
          then high_bidder_id
      end,
      final_price = case
        when high_bidder_id is not null and (reserve_price is null or current_price >= reserve_price)
          then current_price
      end
  where status = 'active' and ends_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function private.close_ended_auctions() from public;

select cron.schedule(
  'licitot-close-auctions',
  '* * * * *',
  $$select private.close_ended_auctions()$$
);

-- ─── Realtime ────────────────────────────────────────────────────────────
-- The detail page subscribes to its auction row (price, bids, end time, status). Realtime
-- applies RLS and column privileges, so subscribers never receive reserve_price.
alter publication supabase_realtime add table public.auctions;
