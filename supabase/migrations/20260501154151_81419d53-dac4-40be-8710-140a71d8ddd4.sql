-- User balances
CREATE TABLE public.user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crypto_type text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, crypto_type)
);

ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balances" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all balances" ON public.user_balances
  FOR SELECT USING (public.is_admin_or_moderator());

CREATE POLICY "Admins manage balances" ON public.user_balances
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_user_balances_updated_at
  BEFORE UPDATE ON public.user_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Balance ledger (audit trail)
CREATE TABLE public.balance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crypto_type text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'deposit', 'withdrawal', 'admin_adjust', 'escrow_lock', 'escrow_release', 'fee'
  reference_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger" ON public.balance_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ledger" ON public.balance_ledger
  FOR SELECT USING (public.is_admin_or_moderator());

CREATE POLICY "Admins create ledger entries" ON public.balance_ledger
  FOR INSERT WITH CHECK (public.is_admin());

-- Connected wallets (WalletConnect — public addresses only, never private keys)
CREATE TABLE public.connected_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  chain_id integer,
  network text,
  label text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, address, chain_id)
);

ALTER TABLE public.connected_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wallets" ON public.connected_wallets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all connected wallets" ON public.connected_wallets
  FOR SELECT USING (public.is_admin_or_moderator());