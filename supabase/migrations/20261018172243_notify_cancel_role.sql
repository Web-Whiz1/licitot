-- LiciTot · Order notifications carry the recipient's role, so "order cancelled" can say
-- "your money is coming back" to the buyer and "the buyer was refunded" to the seller.
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
            'ship_by', new.ship_by, 'role', 'seller'), v_link);
      when 'shipped' then
        perform private.notify(new.buyer_id, 'order_shipped',
          jsonb_build_object('title', v_title, 'carrier', new.tracking_carrier,
            'awb', new.tracking_number, 'role', 'buyer'), v_link);
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
          jsonb_build_object('title', v_title, 'refund', new.paid_at is not null, 'role', 'buyer'),
          v_link);
        if old.status <> 'pending_payment' then
          perform private.notify(new.seller_id, 'order_cancelled',
            jsonb_build_object('title', v_title, 'refund', new.paid_at is not null, 'role', 'seller'),
            v_link);
        end if;
      else
        null;
    end case;
  end if;

  if new.released_at is not null and old.released_at is null and new.funds_model = 'escrow' then
    perform private.notify(new.seller_id, 'payout_sent',
      jsonb_build_object('title', v_title, 'amount', v_total - new.platform_fee, 'role', 'seller'),
      v_link);
  end if;
  return new;
end;
$$;
