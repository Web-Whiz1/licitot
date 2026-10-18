-- LiciTot · Phase 7: in-app notifications, reviews, reports and admin tools.
--
-- Notifications are created by triggers on the tables whose changes they describe, so no code
-- path (RPC, cron job, webhook) can forget one. The UI renders them from `type` + `data`
-- (messages/ro.json → notifications.types.*). Emails are sent later by the server for the
-- important types once an email provider is configured (`emailed_at`).

-- ─── Notifications ───────────────────────────────────────────────────────
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'outbid', 'auction_won', 'auction_sold', 'auction_unsold', 'watch_ending',
    'order_paid', 'order_shipped', 'order_completed', 'payout_sent', 'order_cancelled',
    'dispute_opened', 'review_received', 'listing_hidden', 'report_new'
  )),
  data jsonb not null default '{}',
  link text check (link ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications, written only by triggers/RPCs.';

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_idx on public.notifications (created_at) where emailed_at is null;

revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.notifications enable row level security;

-- Policy: users read only their own notifications.
create policy "Users read their notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Policy: users mark their own notifications as read (column grant: read_at only).
create policy "Users mark their notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The header bell listens for new rows (Realtime applies RLS: each user gets only theirs).
alter publication supabase_realtime add table public.notifications;

create or replace function private.notify(p_user_id uuid, p_type text, p_data jsonb, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, data, link)
  select p_user_id, p_type, coalesce(p_data, '{}'::jsonb), p_link
  where p_user_id is not null;
$$;

create or replace function private.notify_admins(p_type text, p_data jsonb, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, data, link)
  select id, p_type, coalesce(p_data, '{}'::jsonb), p_link
  from public.profiles where role = 'admin' and not is_banned;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
$$;

revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Service role: emails sent for these notifications.
create or replace function public.mark_notifications_emailed(p_ids bigint[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set emailed_at = now() where id = any (p_ids);
$$;

revoke execute on function public.mark_notifications_emailed(bigint[]) from public, anon, authenticated;
grant execute on function public.mark_notifications_emailed(bigint[]) to service_role;

-- ─── Triggers: auctions ──────────────────────────────────────────────────
-- Runs after auctions_create_order (triggers fire in name order), so the order exists.
create or replace function private.notify_auction_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link text := '/licitatie/' || new.id || '-' || new.slug;
  v_order_link text;
begin
  -- The previous leader was outbid.
  if new.status = 'active' and old.high_bidder_id is not null
     and new.high_bidder_id is distinct from old.high_bidder_id then
    perform private.notify(old.high_bidder_id, 'outbid',
      jsonb_build_object('title', new.title, 'price', new.current_price), v_link);
  end if;

  if new.status is distinct from old.status then
    if new.status = 'ended_sold' then
      select '/cont/comanda/' || o.id into v_order_link
      from public.orders o where o.auction_id = new.id;
      perform private.notify(new.winner_id, 'auction_won',
        jsonb_build_object('title', new.title, 'price', new.final_price), coalesce(v_order_link, v_link));
      perform private.notify(new.seller_id, 'auction_sold',
        jsonb_build_object('title', new.title, 'price', new.final_price), coalesce(v_order_link, v_link));
    elsif new.status = 'ended_unsold' then
      perform private.notify(new.seller_id, 'auction_unsold',
        jsonb_build_object('title', new.title), v_link);
    end if;
  end if;
  return new;
end;
$$;

create trigger auctions_notify
  after update of status, high_bidder_id on public.auctions
  for each row execute function private.notify_auction_changes();

-- ─── Triggers: orders ────────────────────────────────────────────────────
create or replace function private.notify_order_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_link text := '/cont/comanda/' || new.id;
  v_total bigint := new.item_price + new.shipping_cost;
begin
  select title into v_title from public.auctions where id = new.auction_id;

  if new.status is distinct from old.status then
    case new.status
      when 'paid' then
        perform private.notify(new.seller_id, 'order_paid',
          jsonb_build_object('title', v_title, 'amount', v_total, 'delivery', new.delivery_method,
            'ship_by', new.ship_by), v_link);
      when 'shipped' then
        perform private.notify(new.buyer_id, 'order_shipped',
          jsonb_build_object('title', v_title, 'carrier', new.tracking_carrier,
            'awb', new.tracking_number), v_link);
      when 'completed' then
        perform private.notify(new.buyer_id, 'order_completed',
          jsonb_build_object('title', v_title, 'role', 'buyer'), v_link);
        perform private.notify(new.seller_id, 'order_completed',
          jsonb_build_object('title', v_title, 'role', 'seller'), v_link);
      when 'disputed' then
        perform private.notify(new.seller_id, 'dispute_opened',
          jsonb_build_object('title', v_title, 'role', 'seller'), v_link);
        perform private.notify_admins('dispute_opened',
          jsonb_build_object('title', v_title, 'role', 'admin'), '/admin/dispute');
      when 'cancelled' then
        perform private.notify(new.buyer_id, 'order_cancelled',
          jsonb_build_object('title', v_title, 'refund', new.paid_at is not null), v_link);
        if old.status <> 'pending_payment' then
          perform private.notify(new.seller_id, 'order_cancelled',
            jsonb_build_object('title', v_title, 'refund', true), v_link);
        end if;
      else
        null;
    end case;
  end if;

  if new.released_at is not null and old.released_at is null and new.funds_model = 'escrow' then
    perform private.notify(new.seller_id, 'payout_sent',
      jsonb_build_object('title', v_title, 'amount', v_total - new.platform_fee), v_link);
  end if;
  return new;
end;
$$;

create trigger orders_notify
  after update on public.orders
  for each row execute function private.notify_order_changes();

-- ─── Watchlist: "ends within the hour" (pg_cron, every 5 minutes) ───────
alter table public.watchlist add column ending_notified_at timestamptz;

create or replace function public.notify_watch_ending()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    update public.watchlist w
    set ending_notified_at = now()
    from public.auctions a
    where a.id = w.auction_id
      and a.status = 'active' and not a.is_hidden
      and a.ends_at > now() and a.ends_at <= now() + interval '1 hour'
      and w.ending_notified_at is null
      and w.user_id <> a.seller_id
    returning w.user_id, a.id, a.slug, a.title, a.current_price, a.ends_at
  )
  insert into public.notifications (user_id, type, data, link)
  select user_id, 'watch_ending',
         jsonb_build_object('title', title, 'price', current_price, 'ends_at', ends_at),
         '/licitatie/' || id || '-' || slug
  from due;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.notify_watch_ending() from public, anon, authenticated;
grant execute on function public.notify_watch_ending() to service_role;

select cron.schedule('licitot-watch-ending', '*/5 * * * *', $$select public.notify_watch_ending()$$);

-- ─── Reviews ─────────────────────────────────────────────────────────────
-- After a completed order, buyer and seller rate each other once (1–5 stars + comment).
create table public.reviews (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(btrim(comment)) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint reviews_once unique (order_id, reviewer_id),
  constraint reviews_not_self check (reviewer_id <> reviewee_id)
);

comment on table public.reviews is 'Public ratings between the parties of a completed order.';

create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

revoke insert, update, delete on public.reviews from anon, authenticated;
alter table public.reviews enable row level security;

-- Policy: reviews are public (shown on profiles).
create policy "Reviews are public"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- Keeps profiles.rating_avg / rating_count in sync.
create or replace function private.refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.profiles p
  set rating_count = s.n,
      rating_avg = s.avg
  from (
    select count(*)::integer as n, round(avg(rating)::numeric, 2) as avg
    from public.reviews where reviewee_id = v_user
  ) s
  where p.id = v_user;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or delete on public.reviews
  for each row execute function private.refresh_rating();

create or replace function private.notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer text;
  v_username text;
begin
  select display_name into v_reviewer from public.profiles where id = new.reviewer_id;
  select username into v_username from public.profiles where id = new.reviewee_id;
  perform private.notify(new.reviewee_id, 'review_received',
    jsonb_build_object('rating', new.rating, 'reviewer', v_reviewer), '/u/' || v_username);
  return null;
end;
$$;

create trigger reviews_notify
  after insert on public.reviews
  for each row execute function private.notify_review();

-- Within 30 days of completion; the other party of the order is the reviewee.
create or replace function public.leave_review(p_order_id uuid, p_rating integer, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_uid not in (v_order.buyer_id, v_order.seller_id) then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'review_not_allowed' using errcode = 'P0001';
  end if;
  if coalesce(v_order.completed_at, now()) < now() - interval '30 days' then
    raise exception 'review_expired' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating not between 1 and 5
     or char_length(btrim(coalesce(p_comment, ''))) > 1000 then
    raise exception 'review_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reviews where order_id = p_order_id and reviewer_id = v_uid) then
    raise exception 'review_exists' using errcode = 'P0001';
  end if;

  insert into public.reviews (order_id, reviewer_id, reviewee_id, reviewer_role, rating, comment)
  values (
    p_order_id,
    v_uid,
    case when v_uid = v_order.buyer_id then v_order.seller_id else v_order.buyer_id end,
    case when v_uid = v_order.buyer_id then 'buyer' else 'seller' end,
    p_rating,
    nullif(btrim(p_comment), '')
  );
end;
$$;

revoke execute on function public.leave_review(uuid, integer, text) from public, anon;
grant execute on function public.leave_review(uuid, integer, text) to authenticated;

-- ─── Reports ─────────────────────────────────────────────────────────────
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  auction_id uuid references public.auctions (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake', 'prohibited', 'scam', 'offensive', 'other')),
  details text check (char_length(btrim(details)) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_target check (auction_id is not null or reported_user_id is not null)
);

comment on table public.reports is 'User reports of listings or accounts; reviewed by admins.';

create index reports_open_idx on public.reports (created_at) where status = 'open';
create unique index reports_once_idx on public.reports (
  reporter_id, coalesce(auction_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where status = 'open';

revoke all on public.reports from anon;
revoke insert, update, delete on public.reports from authenticated;
alter table public.reports enable row level security;

-- Policy: reporters see their own reports; admins see all.
create policy "Reporters and admins read reports"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.report_content(
  p_auction_id uuid,
  p_user_id uuid,
  p_reason text,
  p_details text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_title text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if (p_auction_id is null) = (p_user_id is null) then
    raise exception 'report_invalid' using errcode = 'P0001';
  end if;
  if p_reason not in ('fake', 'prohibited', 'scam', 'offensive', 'other')
     or char_length(btrim(coalesce(p_details, ''))) > 1000 then
    raise exception 'report_invalid' using errcode = 'P0001';
  end if;
  if p_auction_id is not null then
    select title into v_title from public.auctions
    where id = p_auction_id and status <> 'draft' and seller_id <> v_uid;
    if not found then
      raise exception 'report_invalid' using errcode = 'P0001';
    end if;
  elsif p_user_id = v_uid or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'report_invalid' using errcode = 'P0001';
  end if;

  begin
    insert into public.reports (reporter_id, auction_id, reported_user_id, reason, details)
    values (v_uid, p_auction_id, p_user_id, p_reason, nullif(btrim(p_details), ''));
  exception when unique_violation then
    raise exception 'report_exists' using errcode = 'P0001';
  end;

  perform private.notify_admins('report_new',
    jsonb_build_object('title', v_title, 'reason', p_reason), '/admin/rapoarte');
end;
$$;

revoke execute on function public.report_content(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_content(uuid, uuid, text, text) to authenticated;

-- ─── Admin tools ─────────────────────────────────────────────────────────
-- Hide a listing (an active one is also stopped: no more bids, it won't sell).
create or replace function public.admin_hide_auction(p_auction_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.auctions;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found or v_a.status = 'draft' then
    raise exception 'auction_not_found' using errcode = 'P0001';
  end if;

  update public.auctions
  set is_hidden = true,
      hidden_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      status = case when status = 'active' then 'cancelled'::public.auction_status else status end,
      ends_at = case when status = 'active' then now() else ends_at end
  where id = p_auction_id;

  perform private.notify(v_a.seller_id, 'listing_hidden',
    jsonb_build_object('title', v_a.title, 'reason', nullif(btrim(coalesce(p_reason, '')), '')),
    '/cont/licitatii');
end;
$$;

create or replace function public.admin_unhide_auction(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  update public.auctions set is_hidden = false, hidden_reason = null where id = p_auction_id;
end;
$$;

-- Suspend (or restore) an account. Suspending stops and hides its active listings.
create or replace function public.admin_set_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid()
     or exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'cannot_ban_admin' using errcode = 'P0001';
  end if;

  update public.profiles
  set is_banned = p_banned,
      banned_at = case when p_banned then now() end
  where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if p_banned then
    update public.auctions
    set is_hidden = true,
        hidden_reason = 'account_suspended',
        status = 'cancelled',
        ends_at = now()
    where seller_id = p_user_id and status = 'active';
  end if;
end;
$$;

create or replace function public.admin_resolve_report(p_report_id bigint, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'report_invalid' using errcode = 'P0001';
  end if;
  update public.reports
  set status = p_status,
      resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_report_id and status = 'open';
end;
$$;

-- Dashboard numbers (all money in bani).
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'active_auctions', (select count(*) from public.auctions where status = 'active' and not is_hidden),
    'published_30d', (select count(*) from public.auctions where published_at > now() - interval '30 days'),
    'bids_30d', (select count(*) from public.bids where created_at > now() - interval '30 days'),
    'orders_completed', (select count(*) from public.orders where status = 'completed'),
    'gmv', (select coalesce(sum(item_price), 0) from public.orders where status = 'completed'),
    'fees', (select coalesce(sum(platform_fee), 0) from public.orders
             where status = 'completed' and released_at is not null),
    'gmv_30d', (select coalesce(sum(item_price), 0) from public.orders
                where status = 'completed' and completed_at > now() - interval '30 days'),
    'fees_30d', (select coalesce(sum(platform_fee), 0) from public.orders
                 where status = 'completed' and released_at > now() - interval '30 days'),
    'held', (select coalesce(sum(item_price + shipping_cost), 0) from public.orders
             where status in ('paid', 'shipped', 'disputed')
                or (status = 'completed' and released_at is null and funds_model = 'escrow')),
    'awaiting_payment', (select count(*) from public.orders where status = 'pending_payment'),
    'open_disputes', (select count(*) from public.orders where status = 'disputed'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'banned_users', (select count(*) from public.profiles where is_banned)
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_hide_auction(uuid, text)',
    'public.admin_unhide_auction(uuid)',
    'public.admin_set_banned(uuid, boolean)',
    'public.admin_resolve_report(bigint, text, text)',
    'public.admin_stats()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

revoke execute on function private.notify(uuid, text, jsonb, text) from public;
revoke execute on function private.notify_admins(text, jsonb, text) from public;
