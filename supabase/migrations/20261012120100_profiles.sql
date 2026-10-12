-- LiciTot · Profiles. One account type: every user can buy and sell.
--
-- public.profiles          → public data (shown on /u/<username>), readable by everyone.
-- public.profiles_private  → personal/operational data (phone, Stripe Connect state), owner-only.
--
-- RLS restricts rows; column-level GRANTs restrict which fields a user may change, so
-- role, ban status, ratings and Stripe flags can only be changed server-side.

create type public.user_role as enum ('user', 'admin');

-- ─── Public profile ──────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 50),
  avatar_path text check (char_length(avatar_path) <= 300),
  county_code text references public.counties (code),
  city text check (char_length(city) <= 80),
  bio text check (char_length(bio) <= 500),
  role public.user_role not null default 'user',
  is_banned boolean not null default false,
  banned_at timestamptz,
  rating_avg numeric(3, 2) check (rating_avg between 1 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.avatar_path is 'ImageKit file path (Phase 3), not a full URL.';
comment on column public.profiles.rating_avg is 'Maintained by the reviews trigger (Phase 7).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ─── Private profile ─────────────────────────────────────────────────────
create table public.profiles_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone ~ '^\+40[237][0-9]{8}$'),
  phone_verified_at timestamptz,
  stripe_account_id text unique,
  stripe_details_submitted boolean not null default false,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles_private.phone is 'E.164 Romanian number (+40…). Verification comes later.';
comment on column public.profiles_private.stripe_charges_enabled is
  'Set only by the Stripe webhook (account.updated). Required to publish auctions.';

create trigger profiles_private_set_updated_at
  before update on public.profiles_private
  for each row execute function private.set_updated_at();

-- Changing the phone number invalidates its verification.
create or replace function private.reset_phone_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone then
    new.phone_verified_at := null;
  end if;
  return new;
end;
$$;

create trigger profiles_private_reset_phone_verification
  before update of phone on public.profiles_private
  for each row execute function private.reset_phone_verification();

-- ─── Admin helper (used in policies) ─────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_banned
  );
$$;

comment on function public.is_admin is 'True when the current user is a non-banned admin.';

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ─── Column-level privileges ─────────────────────────────────────────────
-- Rows are created by the signup trigger, never by clients.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_path, county_code, city, bio)
  on public.profiles to authenticated;

revoke all on public.profiles_private from anon;
revoke insert, update, delete on public.profiles_private from authenticated;
grant update (phone) on public.profiles_private to authenticated;

-- ─── RLS: profiles ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Policy: public profiles are visible to everyone, except banned users, who are hidden from
-- the public but still visible to themselves and to admins.
create policy "Profiles are public unless banned"
  on public.profiles for select
  to anon, authenticated
  using (
    not is_banned
    or id = (select auth.uid())
    or (select public.is_admin())
  );

-- Policy: a signed-in, non-banned user may update only their own row (and, via the column
-- grants above, only the editable fields).
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and not is_banned)
  with check (id = (select auth.uid()));

-- ─── RLS: profiles_private ───────────────────────────────────────────────
alter table public.profiles_private enable row level security;

-- Policy: only the owner can read their private data (phone, Stripe status).
create policy "Owners read their private profile"
  on public.profiles_private for select
  to authenticated
  using (id = (select auth.uid()));

-- Policy: only the owner can update it (column grants limit this to `phone`).
create policy "Owners update their private profile"
  on public.profiles_private for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── Signup trigger ──────────────────────────────────────────────────────
-- Creates both profile rows when an auth user is created (email, magic link or Google).
-- Display name comes from signup metadata (`display_name`), Google (`full_name`/`name`),
-- or the email's local part. Username is a unique slug derived from it.
create or replace function private.unique_username(seed text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text := left(replace(private.slugify(seed), '-', ''), 24);
  candidate text;
begin
  if char_length(base) < 3 then
    base := 'user' || base;
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || (floor(random() * 9000) + 1000)::int::text;
  end loop;
  return candidate;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  )), '');
begin
  v_name := left(coalesce(v_name, 'Utilizator'), 50);
  if char_length(v_name) < 2 then
    v_name := 'Utilizator';
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, private.unique_username(v_name), v_name);

  insert into public.profiles_private (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
