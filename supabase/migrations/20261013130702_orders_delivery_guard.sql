-- LiciTot · Orders: a paid order always has a delivery method (Checkout requires the choice;
-- this makes it a database guarantee as well).
alter table public.orders
  add constraint orders_delivery_when_paid
  check (status in ('pending_payment', 'cancelled') or delivery_method is not null);
