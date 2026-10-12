-- LiciTot · Auctions (Phase 3): drafts, images, publishing.
-- Sellers create and edit DRAFTS directly (RLS + column grants). Everything that changes an
-- auction's lifecycle (publish now; bids/closing in Phase 5) goes through security-definer RPCs.

create type public.auction_status as enum ('draft', 'active', 'ended_sold', 'ended_unsold', 'cancelled');
create type public.item_condition as enum ('nou', 'ca_nou', 'folosit', 'pentru_piese');

-- ─── App settings (feature flags) ────────────────────────────────────────
create table private.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Stripe Connect onboarding (Phase 6) will flip this to true. Until then, sellers can publish
-- without it so the marketplace can be built and tested end to end.
insert into private.app_settings (key, value) values ('require_connect_for_publish', 'false');

-- ─── Auctions ────────────────────────────────────────────────────────────
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id smallint not null references public.categories (id),
  title text not null check (char_length(btrim(title)) between 5 and 80),
  slug text not null default '',
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  condition public.item_condition not null,
  status public.auction_status not null default 'draft',

  -- Money: bigint bani. 1 RON minimum, 10,000,000 RON maximum.
  starting_price bigint not null check (starting_price between 100 and 1000000000),
  reserve_price bigint check (reserve_price >= starting_price and reserve_price <= 1000000000),
  buy_now_price bigint check (
    buy_now_price > starting_price
    and buy_now_price <= 1000000000
    and (reserve_price is null or buy_now_price >= reserve_price)
  ),
  min_increment bigint not null check (min_increment between 100 and 100000000),
  current_price bigint not null default 0 check (current_price >= 0),
  bid_count integer not null default 0 check (bid_count >= 0),
  high_bidder_id uuid references public.profiles (id) on delete set null,

  duration_days smallint not null check (duration_days in (1, 3, 5, 7, 10)),
  published_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  original_ends_at timestamptz,

  county_code text not null references public.counties (code),
  city text not null check (char_length(btrim(city)) between 1 and 80),
  ship_pickup boolean not null default true,
  ship_courier boolean not null default false,
  courier_cost bigint check (courier_cost between 0 and 100000),

  winner_id uuid references public.profiles (id) on delete set null,
  final_price bigint check (final_price >= 0),

  is_hidden boolean not null default false,
  hidden_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint auctions_shipping_option check (ship_pickup or ship_courier),
  constraint auctions_courier_cost check (not ship_courier or courier_cost is not null),
  constraint auctions_schedule check (
    status = 'draft' or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

comment on table public.auctions is 'Auction listings. All money columns are bigint bani.';
comment on column public.auctions.current_price is
  'Equals starting_price until the first bid; then maintained by place_bid() (Phase 5).';

create index auctions_seller_idx on public.auctions (seller_id, created_at desc);
create index auctions_status_ends_idx on public.auctions (status, ends_at) where not is_hidden;
create index auctions_category_idx on public.auctions (category_id) where status = 'active';

create trigger auctions_set_updated_at
  before update on public.auctions
  for each row execute function private.set_updated_at();

-- Keeps derived draft fields in sync: URL slug from the title, current price from the start price.
-- security definer so it can call private.slugify() on behalf of the seller.
create or replace function private.auctions_sync_draft_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.slug := left(private.slugify(new.title), 60);
  if new.status = 'draft' then
    new.current_price := new.starting_price;
  end if;
  return new;
end;
$$;

create trigger auctions_sync_draft_fields
  before insert or update of title, starting_price on public.auctions
  for each row execute function private.auctions_sync_draft_fields();

-- ─── Auction images ──────────────────────────────────────────────────────
create table public.auction_images (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  file_id text not null check (char_length(file_id) between 1 and 64),
  -- ImageKit file path; uploads go to /licitot/auctions/<seller id>/…
  path text not null check (path ~ '^/licitot/auctions/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,200}$'),
  width integer check (width between 1 and 20000),
  height integer check (height between 1 and 20000),
  -- Tiny base64 preview generated in the browser, used as the blur placeholder.
  blur_data_url text check (
    blur_data_url ~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$'
    and char_length(blur_data_url) <= 3000
  ),
  position smallint not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  constraint auction_images_position_unique unique (auction_id, position) deferrable initially deferred
);

create index auction_images_auction_idx on public.auction_images (auction_id, position);

-- Hard cap: at most 10 photos per auction.
create or replace function private.auction_images_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.auction_images where auction_id = new.auction_id) >= 10 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger auction_images_limit
  before insert on public.auction_images
  for each row execute function private.auction_images_limit();

-- ─── Privileges ──────────────────────────────────────────────────────────
-- Sellers may write only the descriptive fields of a draft. Status, prices-in-play, bids,
-- schedule, winner and moderation fields are server-controlled.
revoke insert, update, delete on public.auctions from anon, authenticated;
grant insert (
  category_id, title, description, condition, starting_price, reserve_price, buy_now_price,
  min_increment, duration_days, county_code, city, ship_pickup, ship_courier, courier_cost
) on public.auctions to authenticated;
grant update (
  category_id, title, description, condition, starting_price, reserve_price, buy_now_price,
  min_increment, duration_days, county_code, city, ship_pickup, ship_courier, courier_cost
) on public.auctions to authenticated;
grant delete on public.auctions to authenticated;

revoke insert, update, delete on public.auction_images from anon, authenticated;
grant insert (auction_id, file_id, path, width, height, blur_data_url, position)
  on public.auction_images to authenticated;
grant delete on public.auction_images to authenticated;

-- ─── RLS: auctions ───────────────────────────────────────────────────────
alter table public.auctions enable row level security;

-- Policy: published, non-hidden auctions are public. Sellers always see their own (including
-- drafts and hidden ones); admins see everything.
create policy "Published auctions are public"
  on public.auctions for select
  to anon, authenticated
  using (
    (status <> 'draft' and not is_hidden)
    or seller_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Policy: a signed-in, non-banned user can create drafts for themselves only.
create policy "Users create their own drafts"
  on public.auctions for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and status = 'draft'
    and not exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_banned
    )
  );

-- Policy: sellers can edit their auction only while it is a draft.
create policy "Sellers edit their drafts"
  on public.auctions for update
  to authenticated
  using (seller_id = (select auth.uid()) and status = 'draft')
  with check (seller_id = (select auth.uid()) and status = 'draft');

-- Policy: sellers can delete only drafts (published auctions are cancelled, never deleted).
create policy "Sellers delete their drafts"
  on public.auctions for delete
  to authenticated
  using (seller_id = (select auth.uid()) and status = 'draft');

-- ─── RLS: auction_images ─────────────────────────────────────────────────
alter table public.auction_images enable row level security;

-- Policy: an image is visible exactly when its auction is visible (the subquery is itself
-- filtered by the auctions SELECT policy).
create policy "Images follow auction visibility"
  on public.auction_images for select
  to anon, authenticated
  using (exists (select 1 from public.auctions a where a.id = auction_id));

-- Policy: sellers add images to their own drafts, only from their own upload folder.
create policy "Sellers add images to their drafts"
  on public.auction_images for insert
  to authenticated
  with check (
    path like '/licitot/auctions/' || (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.seller_id = (select auth.uid()) and a.status = 'draft'
    )
  );

-- Policy: sellers remove images from their own drafts.
create policy "Sellers remove images from their drafts"
  on public.auction_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.seller_id = (select auth.uid()) and a.status = 'draft'
    )
  );

-- ─── RPC: replace a draft's images atomically (order = array order) ─────
-- security invoker: runs with the caller's RLS, so it can't touch other sellers' drafts.
create or replace function public.replace_auction_images(p_auction_id uuid, p_images jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.auctions
    where id = p_auction_id and seller_id = (select auth.uid()) and status = 'draft'
  ) then
    raise exception 'auction_not_editable' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_images) <> 'array' or jsonb_array_length(p_images) > 10 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;

  delete from public.auction_images where auction_id = p_auction_id;

  insert into public.auction_images (auction_id, file_id, path, width, height, blur_data_url, position)
  select
    p_auction_id,
    img ->> 'file_id',
    img ->> 'path',
    (img ->> 'width')::integer,
    (img ->> 'height')::integer,
    nullif(img ->> 'blur_data_url', ''),
    (ord - 1)::smallint
  from jsonb_array_elements(p_images) with ordinality as t (img, ord);
end;
$$;

revoke execute on function public.replace_auction_images(uuid, jsonb) from public, anon;
grant execute on function public.replace_auction_images(uuid, jsonb) to authenticated;

-- ─── RPC: publish a draft ────────────────────────────────────────────────
-- Validates and starts the auction: schedule from now, price reset to the starting price.
-- Errors use SQLSTATE P0001 with a stable message code the app maps to Romanian text.
create or replace function public.publish_auction(p_auction_id uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
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

revoke execute on function public.publish_auction(uuid) from public, anon;
grant execute on function public.publish_auction(uuid) to authenticated;
