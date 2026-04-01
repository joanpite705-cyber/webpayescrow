
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create escrow status enum
CREATE TYPE public.escrow_status AS ENUM ('pending', 'active', 'paid', 'confirmed', 'completed', 'disputed', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'submitted', 'confirmed', 'rejected');

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  telegram_username TEXT UNIQUE,
  telegram_chat_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Escrows table
CREATE TABLE public.escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(18,8) NOT NULL DEFAULT 0,
  crypto_type TEXT NOT NULL DEFAULT 'USDT',
  status escrow_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  moderator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Escrow messages
CREATE TABLE public.escrow_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  crypto_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  tx_hash TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputes
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crypto wallets (admin managed)
CREATE TABLE public.crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_name TEXT NOT NULL,
  network TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bot configuration
CREATE TABLE public.bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username TEXT,
  bot_token TEXT,
  chat_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Helper: is_escrow_party
CREATE OR REPLACE FUNCTION public.is_escrow_party(_escrow_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.escrows
    WHERE id = _escrow_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid() OR created_by = auth.uid())
  )
$$;

-- Helper: is_admin_or_moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
$$;

-- Trigger function for auto-creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, telegram_username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'telegram_username',
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'telegram_username')
  );
  -- Auto-assign user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON public.escrows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crypto_wallets_updated_at BEFORE UPDATE ON public.crypto_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bot_config_updated_at BEFORE UPDATE ON public.bot_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin());

-- Escrows policies
CREATE POLICY "Users can view own escrows" ON public.escrows FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can view all escrows" ON public.escrows FOR SELECT USING (public.is_admin_or_moderator());
CREATE POLICY "Users can create escrows" ON public.escrows FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update any escrow" ON public.escrows FOR UPDATE USING (public.is_admin_or_moderator());
CREATE POLICY "Parties can update own escrow" ON public.escrows FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Escrow messages policies
CREATE POLICY "Parties can view messages" ON public.escrow_messages FOR SELECT USING (public.is_escrow_party(escrow_id));
CREATE POLICY "Admins can view all messages" ON public.escrow_messages FOR SELECT USING (public.is_admin_or_moderator());
CREATE POLICY "Parties can send messages" ON public.escrow_messages FOR INSERT WITH CHECK (public.is_escrow_party(escrow_id) AND auth.uid() = sender_id);

-- Payments policies
CREATE POLICY "Parties can view payments" ON public.payments FOR SELECT USING (public.is_escrow_party(escrow_id));
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE USING (public.is_admin());
CREATE POLICY "System can create payments" ON public.payments FOR INSERT WITH CHECK (public.is_escrow_party(escrow_id));

-- Disputes policies
CREATE POLICY "Parties can view disputes" ON public.disputes FOR SELECT USING (public.is_escrow_party(escrow_id));
CREATE POLICY "Admins can view all disputes" ON public.disputes FOR SELECT USING (public.is_admin_or_moderator());
CREATE POLICY "Parties can create disputes" ON public.disputes FOR INSERT WITH CHECK (public.is_escrow_party(escrow_id) AND auth.uid() = raised_by);
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE USING (public.is_admin());

-- Crypto wallets policies
CREATE POLICY "Admins can manage wallets" ON public.crypto_wallets FOR ALL USING (public.is_admin());
CREATE POLICY "Authenticated users can view active wallets" ON public.crypto_wallets FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- Bot config policies
CREATE POLICY "Admins can manage bot config" ON public.bot_config FOR ALL USING (public.is_admin());

-- Indexes
CREATE INDEX idx_escrows_buyer ON public.escrows(buyer_id);
CREATE INDEX idx_escrows_seller ON public.escrows(seller_id);
CREATE INDEX idx_escrows_status ON public.escrows(status);
CREATE INDEX idx_escrow_messages_escrow ON public.escrow_messages(escrow_id);
CREATE INDEX idx_payments_escrow ON public.payments(escrow_id);
CREATE INDEX idx_disputes_escrow ON public.disputes(escrow_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_profiles_telegram ON public.profiles(telegram_username);
