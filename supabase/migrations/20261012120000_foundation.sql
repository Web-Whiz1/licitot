-- LiciTot · Foundation: extensions, internal schema, shared helpers, reference data, rate limiting.
-- All money in this database is bigint bani (1 RON = 100 bani). All timestamps are timestamptz.

-- ─── Extensions ──────────────────────────────────────────────────────────
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_cron;

-- ─── Internal schema ─────────────────────────────────────────────────────
-- Tables and functions here are NOT exposed through the Data API (PostgREST only serves
-- `public`). Only security-definer functions and the service role touch them.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─── Helpers ─────────────────────────────────────────────────────────────
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lowercase ASCII slug: "Bistrița-Năsăud!" → "bistrita-nasaud"
create or replace function private.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- ─── Counties (județe) ───────────────────────────────────────────────────
-- Reference data, mirrored in src/lib/counties.ts (a unit test keeps them in sync).
create table public.counties (
  code text primary key check (code ~ '^[A-Z]{1,2}$'),
  name text not null unique
);

comment on table public.counties is 'Romanian counties (41) + Municipiul București. Read-only reference data.';

insert into public.counties (code, name) values
  ('AB', 'Alba'), ('AR', 'Arad'), ('AG', 'Argeș'), ('BC', 'Bacău'), ('BH', 'Bihor'),
  ('BN', 'Bistrița-Năsăud'), ('BT', 'Botoșani'), ('BV', 'Brașov'), ('BR', 'Brăila'),
  ('B', 'București'), ('BZ', 'Buzău'), ('CS', 'Caraș-Severin'), ('CL', 'Călărași'),
  ('CJ', 'Cluj'), ('CT', 'Constanța'), ('CV', 'Covasna'), ('DB', 'Dâmbovița'), ('DJ', 'Dolj'),
  ('GL', 'Galați'), ('GR', 'Giurgiu'), ('GJ', 'Gorj'), ('HR', 'Harghita'), ('HD', 'Hunedoara'),
  ('IL', 'Ialomița'), ('IS', 'Iași'), ('IF', 'Ilfov'), ('MM', 'Maramureș'), ('MH', 'Mehedinți'),
  ('MS', 'Mureș'), ('NT', 'Neamț'), ('OT', 'Olt'), ('PH', 'Prahova'), ('SM', 'Satu Mare'),
  ('SJ', 'Sălaj'), ('SB', 'Sibiu'), ('SV', 'Suceava'), ('TR', 'Teleorman'), ('TM', 'Timiș'),
  ('TL', 'Tulcea'), ('VS', 'Vaslui'), ('VL', 'Vâlcea'), ('VN', 'Vrancea');

alter table public.counties enable row level security;

-- Policy: anyone (including logged-out visitors) can read the county list; nobody can write
-- it through the API (no insert/update/delete policies → denied).
create policy "Counties are public"
  on public.counties for select
  to anon, authenticated
  using (true);

-- ─── Categories ──────────────────────────────────────────────────────────
create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  parent_id smallint references public.categories (id) on delete restrict,
  icon text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories (parent_id, sort_order);

comment on table public.categories is 'Two-level category tree. Managed by admins via migrations.';

alter table public.categories enable row level security;

-- Policy: categories are public reference data; writes only via migrations/service role.
create policy "Categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

with parents (slug, name, icon, sort_order) as (
  values
    ('electronice', 'Electronice', 'laptop', 1),
    ('auto-moto', 'Auto & Moto', 'car', 2),
    ('casa-gradina', 'Casă & Grădină', 'home', 3),
    ('moda', 'Modă', 'shirt', 4),
    ('sport', 'Sport & Timp liber', 'bike', 5),
    ('colectii', 'Colecții & Artă', 'gem', 6),
    ('copii', 'Copii', 'toy-brick', 7),
    ('carti', 'Cărți & Muzică', 'book-open', 8)
)
insert into public.categories (slug, name, icon, sort_order)
select slug, name, icon, sort_order from parents;

with children (parent_slug, slug, name, sort_order) as (
  values
    ('electronice', 'telefoane', 'Telefoane', 1),
    ('electronice', 'laptopuri-pc', 'Laptopuri & PC', 2),
    ('electronice', 'foto-video', 'Foto & Video', 3),
    ('electronice', 'console-jocuri', 'Console & Jocuri', 4),
    ('electronice', 'audio', 'Audio', 5),
    ('auto-moto', 'piese-auto', 'Piese auto', 1),
    ('auto-moto', 'accesorii-auto', 'Accesorii auto', 2),
    ('auto-moto', 'motociclete', 'Motociclete & Scutere', 3),
    ('casa-gradina', 'mobila', 'Mobilă', 1),
    ('casa-gradina', 'electrocasnice', 'Electrocasnice', 2),
    ('casa-gradina', 'gradina', 'Grădină', 3),
    ('casa-gradina', 'decoratiuni', 'Decorațiuni', 4),
    ('moda', 'imbracaminte', 'Îmbrăcăminte', 1),
    ('moda', 'incaltaminte', 'Încălțăminte', 2),
    ('moda', 'ceasuri-bijuterii', 'Ceasuri & Bijuterii', 3),
    ('moda', 'genti-accesorii', 'Genți & Accesorii', 4),
    ('sport', 'biciclete', 'Biciclete', 1),
    ('sport', 'fitness', 'Fitness', 2),
    ('sport', 'camping', 'Camping & Drumeții', 3),
    ('sport', 'sporturi-iarna', 'Sporturi de iarnă', 4),
    ('colectii', 'monede', 'Monede & Bancnote', 1),
    ('colectii', 'timbre', 'Timbre', 2),
    ('colectii', 'arta', 'Artă', 3),
    ('colectii', 'antichitati', 'Antichități', 4),
    ('copii', 'jucarii', 'Jucării', 1),
    ('copii', 'carucioare', 'Cărucioare & Scaune auto', 2),
    ('copii', 'haine-copii', 'Haine copii', 3),
    ('carti', 'carti-reviste', 'Cărți & Reviste', 1),
    ('carti', 'viniluri-cd', 'Viniluri & CD-uri', 2),
    ('carti', 'instrumente-muzicale', 'Instrumente muzicale', 3)
)
insert into public.categories (slug, name, parent_id, sort_order)
select c.slug, c.name, p.id, c.sort_order
from children c
join public.categories p on p.slug = c.parent_slug;

-- ─── Rate limiting ───────────────────────────────────────────────────────
-- Fixed-window counters used by server actions (bidding, auth). Lives in `private` and is
-- callable only by the service role, so clients can't inflate or reset anyone's counters.
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as rl (key, window_start)
  values (p_key, v_window)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning rl.hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

comment on function public.rate_limit_hit is
  'Increments the counter for (key, current window) and returns true while hits <= limit. Service role only.';

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Hourly cleanup of expired windows.
select cron.schedule(
  'licitot-rate-limit-cleanup',
  '17 * * * *',
  $$delete from private.rate_limits where window_start < now() - interval '1 day'$$
);
