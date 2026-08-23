CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  image_url text,
  delivery_type text NOT NULL DEFAULT 'instant',
  delivery_content text,
  stock integer NOT NULL DEFAULT 0,
  unlimited_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage store products"
ON public.store_products FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER store_products_updated_at BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  user_id uuid,
  buyer_email text NOT NULL,
  product_title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  crypto_name text NOT NULL,
  network text NOT NULL,
  payment_address text NOT NULL,
  crypto_amount numeric,
  status text NOT NULL DEFAULT 'awaiting_payment',
  tx_reference text,
  delivered_content text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage store orders"
ON public.store_orders FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view own store orders"
ON public.store_orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER store_orders_updated_at BEFORE UPDATE ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_store_products()
RETURNS TABLE(id uuid, title text, description text, category text, price numeric,
  currency text, image_url text, delivery_type text, stock integer,
  unlimited_stock boolean, sort_order integer, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, description, category, price, currency, image_url, delivery_type,
         stock, unlimited_stock, sort_order, created_at
  FROM public.store_products
  WHERE is_active = true
  ORDER BY sort_order ASC, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_store_product(_id uuid)
RETURNS TABLE(id uuid, title text, description text, category text, price numeric,
  currency text, image_url text, delivery_type text, stock integer,
  unlimited_stock boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, description, category, price, currency, image_url, delivery_type,
         stock, unlimited_stock
  FROM public.store_products
  WHERE is_active = true AND id = _id;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_wallets()
RETURNS TABLE(id uuid, crypto_name text, network text, wallet_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, crypto_name, network, wallet_address
  FROM public.crypto_wallets
  WHERE is_active = true
  ORDER BY crypto_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.create_store_order(
  _product_id uuid, _buyer_email text, _wallet_id uuid, _quantity integer DEFAULT 1)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.store_products%ROWTYPE;
  w public.crypto_wallets%ROWTYPE;
  qty integer := GREATEST(COALESCE(_quantity, 1), 1);
  new_id uuid;
BEGIN
  SELECT * INTO p FROM public.store_products WHERE id = _product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;

  SELECT * INTO w FROM public.crypto_wallets WHERE id = _wallet_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment method not available'; END IF;

  IF _buyer_email IS NULL OR btrim(_buyer_email) = '' THEN
    RAISE EXCEPTION 'Email required';
  END IF;

  IF NOT p.unlimited_stock AND p.stock < qty THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  INSERT INTO public.store_orders (
    product_id, user_id, buyer_email, product_title, quantity, amount, currency,
    crypto_name, network, payment_address)
  VALUES (p.id, auth.uid(), lower(btrim(_buyer_email)), p.title, qty, p.price * qty, p.currency,
    w.crypto_name, w.network, w.wallet_address)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_order(_id uuid)
RETURNS TABLE(id uuid, product_id uuid, buyer_email text, product_title text, quantity integer,
  amount numeric, currency text, crypto_name text, network text, payment_address text,
  status text, delivered_content text, delivered_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, product_id, buyer_email, product_title, quantity, amount, currency,
         crypto_name, network, payment_address, status,
         CASE WHEN status = 'completed' THEN delivered_content ELSE NULL END,
         delivered_at, created_at
  FROM public.store_orders
  WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.mark_store_order_paid(_id uuid, _tx_reference text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.store_orders
  SET status = CASE WHEN status = 'awaiting_payment' THEN 'payment_submitted' ELSE status END,
      tx_reference = COALESCE(NULLIF(btrim(COALESCE(_tx_reference, '')), ''), tx_reference),
      updated_at = now()
  WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_product(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_wallets() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order(uuid, text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_order(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_store_order_paid(uuid, text) TO anon, authenticated;