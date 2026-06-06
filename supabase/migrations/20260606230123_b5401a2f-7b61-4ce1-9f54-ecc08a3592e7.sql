
-- =================== ACCOUNT MARKETPLACE ===================

CREATE TABLE IF NOT EXISTS public.account_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  category text NOT NULL,           -- streaming|social|gaming|email|other
  platform text NOT NULL,           -- Netflix, Spotify, Instagram, Steam...
  title text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0),
  crypto_type text NOT NULL DEFAULT 'USDT',
  chain_key text,
  stock_count integer NOT NULL DEFAULT 0,
  sold_count integer NOT NULL DEFAULT 0,
  delivery_type text NOT NULL DEFAULT 'auto', -- auto | manual
  warranty_hours integer NOT NULL DEFAULT 24,
  auto_replace boolean NOT NULL DEFAULT true,
  images text[] NOT NULL DEFAULT '{}',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  credential_template text[] NOT NULL DEFAULT ARRAY['email','password'],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_listings TO authenticated;
GRANT ALL ON public.account_listings TO service_role;
ALTER TABLE public.account_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active listings" ON public.account_listings
  FOR SELECT USING (is_active = true OR seller_id = auth.uid() OR public.is_admin_or_moderator());
CREATE POLICY "Sellers manage their listings" ON public.account_listings
  FOR ALL TO authenticated USING (seller_id = auth.uid() OR public.is_admin_or_moderator())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin_or_moderator());

CREATE INDEX idx_listings_category ON public.account_listings(category) WHERE is_active = true;
CREATE INDEX idx_listings_seller ON public.account_listings(seller_id);

-- Individual sellable units (credentials per stock item)
CREATE TABLE IF NOT EXISTS public.listing_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.account_listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  credentials text NOT NULL,         -- raw delivery payload (email:pass, cookie, etc.)
  status text NOT NULL DEFAULT 'available', -- available|reserved|sold|replaced|dead
  purchase_id uuid,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_stock TO authenticated;
GRANT ALL ON public.listing_stock TO service_role;
ALTER TABLE public.listing_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own stock" ON public.listing_stock
  FOR ALL TO authenticated USING (seller_id = auth.uid() OR public.is_admin_or_moderator())
  WITH CHECK (seller_id = auth.uid() OR public.is_admin_or_moderator());

CREATE INDEX idx_stock_listing_status ON public.listing_stock(listing_id, status);

CREATE TABLE IF NOT EXISTS public.listing_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.account_listings(id) ON DELETE CASCADE,
  stock_id uuid REFERENCES public.listing_stock(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  escrow_id uuid REFERENCES public.escrows(id) ON DELETE SET NULL,
  price numeric NOT NULL,
  crypto_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|delivered|claimed_dead|replaced|refunded|completed
  warranty_expires_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.listing_purchases TO authenticated;
GRANT ALL ON public.listing_purchases TO service_role;
ALTER TABLE public.listing_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view purchases" ON public.listing_purchases
  FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin_or_moderator());
CREATE POLICY "Buyers create purchases" ON public.listing_purchases
  FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Parties update purchases" ON public.listing_purchases
  FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin_or_moderator());

-- Reviews
CREATE TABLE IF NOT EXISTS public.listing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.listing_purchases(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.account_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_id)
);
GRANT SELECT ON public.listing_reviews TO anon;
GRANT SELECT, INSERT ON public.listing_reviews TO authenticated;
GRANT ALL ON public.listing_reviews TO service_role;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.listing_reviews FOR SELECT USING (true);
CREATE POLICY "Buyer can post review" ON public.listing_reviews
  FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Add verified-seller flag to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_seller boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sales integer NOT NULL DEFAULT 0;

-- Trigger: keep stock count synced
CREATE OR REPLACE FUNCTION public.sync_listing_stock_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.account_listings
  SET stock_count = (SELECT count(*) FROM public.listing_stock WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id) AND status = 'available'),
      updated_at = now()
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS trg_sync_listing_stock ON public.listing_stock;
CREATE TRIGGER trg_sync_listing_stock
AFTER INSERT OR UPDATE OR DELETE ON public.listing_stock
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_stock_count();

-- Trigger: when purchase completes, bump sold_count + total_sales + verified flag
CREATE OR REPLACE FUNCTION public.on_purchase_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE public.account_listings SET sold_count = sold_count + 1 WHERE id = NEW.listing_id;
    UPDATE public.profiles SET total_sales = total_sales + 1,
      verified_seller = CASE WHEN total_sales + 1 >= 5 THEN true ELSE verified_seller END
      WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_on_purchase_completed ON public.listing_purchases;
CREATE TRIGGER trg_on_purchase_completed
AFTER UPDATE ON public.listing_purchases
FOR EACH ROW EXECUTE FUNCTION public.on_purchase_completed();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_listings_updated ON public.account_listings;
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.account_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_purchases_updated ON public.listing_purchases;
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON public.listing_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public seller stats RPC
CREATE OR REPLACE FUNCTION public.get_seller_stats(_seller_id uuid)
RETURNS TABLE(total_sales int, verified boolean, avg_rating numeric, review_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.total_sales,
    p.verified_seller,
    COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.listing_reviews WHERE seller_id = _seller_id), 0),
    COALESCE((SELECT count(*)::int FROM public.listing_reviews WHERE seller_id = _seller_id), 0)
  FROM public.profiles p WHERE p.id = _seller_id;
$$;
