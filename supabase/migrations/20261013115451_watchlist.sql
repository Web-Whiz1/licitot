-- LiciTot · Watchlist ("Favorite"): auctions a user follows. Private to each user.

create table public.watchlist (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);

comment on table public.watchlist is 'Auctions a user follows. Owner-only.';

create index watchlist_user_idx on public.watchlist (user_id, created_at desc);
create index watchlist_auction_idx on public.watchlist (auction_id);

revoke all on public.watchlist from anon;
revoke update on public.watchlist from authenticated;
grant select, delete on public.watchlist to authenticated;
grant insert (auction_id) on public.watchlist to authenticated;

alter table public.watchlist enable row level security;

-- Policy: users see only their own watchlist.
create policy "Users read their watchlist"
  on public.watchlist for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Policy: users add auctions they can see (published, not hidden) to their own list.
create policy "Users add to their watchlist"
  on public.watchlist for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.status <> 'draft' and not a.is_hidden
    )
  );

-- Policy: users remove entries from their own list.
create policy "Users remove from their watchlist"
  on public.watchlist for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Max 500 followed auctions per user.
create or replace function private.watchlist_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.watchlist where user_id = new.user_id) >= 500 then
    raise exception 'watchlist_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger watchlist_limit
  before insert on public.watchlist
  for each row execute function private.watchlist_limit();
