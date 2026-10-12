-- LiciTot · Search (Phase 4): Romanian full-text search that ignores diacritics,
-- so "masina" finds "mașină" and "biciclete" finds "Bicicletă" (Romanian stemming).

create text search configuration public.ro_unaccent (copy = pg_catalog.romanian);

alter text search configuration public.ro_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, pg_catalog.romanian_stem;

comment on text search configuration public.ro_unaccent is
  'Romanian stemming + unaccent. Use for every auction search (to_tsvector / websearch_to_tsquery).';

-- Weighted document: title (A) > description (B) > city (C).
alter table public.auctions
  add column search_tsv tsvector generated always as (
    setweight(to_tsvector('public.ro_unaccent'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('public.ro_unaccent'::regconfig, coalesce(description, '')), 'B')
    || setweight(to_tsvector('public.ro_unaccent'::regconfig, coalesce(city, '')), 'C')
  ) stored;

create index auctions_search_idx on public.auctions using gin (search_tsv);

-- Listing sorts on live auctions.
create index auctions_live_published_idx on public.auctions (published_at desc)
  where status = 'active' and not is_hidden;
create index auctions_live_price_idx on public.auctions (current_price)
  where status = 'active' and not is_hidden;
create index auctions_live_county_idx on public.auctions (county_code)
  where status = 'active' and not is_hidden;
