-- LiciTot · Orders whose held money can go to the seller now. Decided with the database clock
-- (release_at is set with now() too), so app-server clock skew can't delay a payout.
create or replace function public.orders_ready_for_payout(p_order_id uuid default null)
returns table (
  id uuid,
  amount bigint,
  stripe_charge_id text,
  stripe_account_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.item_price + o.shipping_cost - o.platform_fee, o.stripe_charge_id, pp.stripe_account_id
  from public.orders o
  join public.profiles_private pp on pp.id = o.seller_id
  where o.status = 'completed'
    and o.funds_model = 'escrow'
    and o.released_at is null
    and o.stripe_charge_id is not null
    and (o.release_at is null or o.release_at <= now())
    and (p_order_id is null or o.id = p_order_id)
  order by o.completed_at
  limit 50;
$$;

revoke execute on function public.orders_ready_for_payout(uuid) from public, anon, authenticated;
grant execute on function public.orders_ready_for_payout(uuid) to service_role;
