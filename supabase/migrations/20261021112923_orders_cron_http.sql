-- Host-independent trigger for the orders job (payouts, refunds, deadlines, emails).
-- Every 5 minutes pg_cron calls POST https://licitot.ro/api/cron/orders over HTTPS (pg_net),
-- authenticated with CRON_SECRET read from Supabase Vault. Replaces the Netlify scheduled
-- function, so the app can run on any host (Vercel's free plan only allows daily crons).
--
-- The secret is stored once, outside migrations (never committed):
--   select vault.create_secret('<CRON_SECRET>', 'licitot_cron_secret');

create extension if not exists pg_net;

create or replace function private.call_orders_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'licitot_cron_secret';

  if v_secret is null then
    raise warning 'licitot_cron_secret is missing from Vault: orders job skipped';
    return;
  end if;

  -- Fire and forget: the response lands in net._http_response (kept ~6 hours by pg_net).
  perform net.http_post(
    url := 'https://licitot.ro/api/cron/orders',
    headers := jsonb_build_object('authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;

comment on function private.call_orders_job is
  'Calls the app''s /api/cron/orders with the Vault secret. Run by pg_cron every 5 minutes.';

-- Only pg_cron (as postgres) runs it; nobody can call it through the API.
revoke all on function private.call_orders_job() from public, anon, authenticated;

select cron.schedule('licitot-orders-http', '*/5 * * * *', $$select private.call_orders_job()$$);
