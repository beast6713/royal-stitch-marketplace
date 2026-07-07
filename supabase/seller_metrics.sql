-- Create an RPC to aggregate seller metrics efficiently in PostgreSQL

CREATE OR REPLACE FUNCTION public.get_seller_metrics(p_seller_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric;
  v_pending_orders integer;
  v_completed_orders integer;
  v_top_products jsonb;
BEGIN
  -- Total revenue (only sum up orders that are paid or completed, depending on your business logic)
  -- Here we sum unit_price * quantity + custom_margin for order_items belonging to the seller
  SELECT COALESCE(SUM((unit_price + custom_margin) * quantity), 0)
  INTO v_total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.seller_id = p_seller_id
    AND oi.shipping_status != 'returned'
    AND o.payment_status IN ('paid', 'cod_due');

  -- Pending orders count
  SELECT COUNT(*)
  INTO v_pending_orders
  FROM public.order_items
  WHERE seller_id = p_seller_id AND shipping_status IN ('pending', 'label_created');

  -- Completed orders count
  SELECT COUNT(*)
  INTO v_completed_orders
  FROM public.order_items
  WHERE seller_id = p_seller_id AND shipping_status = 'delivered';

  -- Top 3 selling products
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_top_products
  FROM (
    SELECT product_name, SUM(quantity) as units_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.seller_id = p_seller_id
      AND o.payment_status IN ('paid', 'cod_due')
    GROUP BY product_name
    ORDER BY units_sold DESC
    LIMIT 3
  ) t;

  RETURN jsonb_build_object(
    'total_revenue', v_total_revenue,
    'pending_orders', v_pending_orders,
    'completed_orders', v_completed_orders,
    'top_products', v_top_products
  );
END;
$$;
