-- LiciTot · New order status for buyer disputes (own migration: an enum value can't be used in
-- the same transaction that adds it).
alter type public.order_status add value if not exists 'disputed' before 'completed';
