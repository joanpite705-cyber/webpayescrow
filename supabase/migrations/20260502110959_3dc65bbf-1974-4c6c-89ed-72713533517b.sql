-- Per-chain admin configuration (RPC, treasury, gas wallet, keys)
CREATE TABLE public.chain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_key TEXT NOT NULL UNIQUE, -- e.g. 'ethereum','bsc','polygon','arbitrum','optimism','base','tron','bitcoin','solana'
  display_name TEXT NOT NULL,
  family TEXT NOT NULL CHECK (family IN ('evm','tron','btc','solana')),
  chain_id INTEGER, -- EVM only
  rpc_url TEXT,
  explorer_url TEXT,
  native_symbol TEXT NOT NULL,
  native_decimals INTEGER NOT NULL DEFAULT 18,
  treasury_address TEXT,
  treasury_private_key TEXT, -- admin-only; never exposed to users
  gas_wallet_address TEXT,
  gas_wallet_private_key TEXT, -- admin-only
  min_gas_reserve NUMERIC NOT NULL DEFAULT 0,
  min_confirmations INTEGER NOT NULL DEFAULT 3,
  cold_wallet_address TEXT, -- sweep destination
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chain_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chain_configs"
  ON public.chain_configs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER chain_configs_updated_at
  BEFORE UPDATE ON public.chain_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tokens per chain (ERC20/TRC20/SPL)
CREATE TABLE public.chain_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_key TEXT NOT NULL REFERENCES public.chain_configs(chain_key) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chain_key, contract_address)
);

ALTER TABLE public.chain_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chain_tokens"
  ON public.chain_tokens FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Public, redacted view for authenticated users (no private keys)
CREATE OR REPLACE FUNCTION public.get_public_chains()
RETURNS TABLE (
  chain_key TEXT,
  display_name TEXT,
  family TEXT,
  chain_id INTEGER,
  explorer_url TEXT,
  native_symbol TEXT,
  treasury_address TEXT,
  min_confirmations INTEGER,
  sort_order INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT chain_key, display_name, family, chain_id, explorer_url,
         native_symbol, treasury_address, min_confirmations, sort_order
  FROM public.chain_configs
  WHERE is_active = true
  ORDER BY sort_order ASC, display_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_tokens()
RETURNS TABLE (
  chain_key TEXT,
  symbol TEXT,
  contract_address TEXT,
  decimals INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.chain_key, t.symbol, t.contract_address, t.decimals
  FROM public.chain_tokens t
  JOIN public.chain_configs c ON c.chain_key = t.chain_key
  WHERE t.is_active = true AND c.is_active = true;
$$;

-- Sweep jobs audit trail
CREATE TABLE public.sweep_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_key TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_contract TEXT,
  amount NUMERIC,
  gas_funding_tx TEXT,
  sweep_tx TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, gas_funding, sweeping, completed, failed
  error_message TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual | auto
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sweep_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sweep_jobs"
  ON public.sweep_jobs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER sweep_jobs_updated_at
  BEFORE UPDATE ON public.sweep_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add chain_key + token_symbol to escrows for multi-chain payment routing
ALTER TABLE public.escrows
  ADD COLUMN IF NOT EXISTS chain_key TEXT,
  ADD COLUMN IF NOT EXISTS token_symbol TEXT,
  ADD COLUMN IF NOT EXISTS token_contract TEXT;

-- Add chain_key + network metadata to connected_wallets if missing (chain_id already there)
-- Seed default chains (inactive, no keys — admin must configure)
INSERT INTO public.chain_configs (chain_key, display_name, family, chain_id, native_symbol, native_decimals, sort_order, is_active) VALUES
  ('ethereum',  'Ethereum',         'evm',     1,        'ETH',  18, 10, false),
  ('bsc',       'BNB Smart Chain',  'evm',     56,       'BNB',  18, 20, false),
  ('polygon',   'Polygon',          'evm',     137,      'MATIC',18, 30, false),
  ('arbitrum',  'Arbitrum One',     'evm',     42161,    'ETH',  18, 40, false),
  ('optimism',  'Optimism',         'evm',     10,       'ETH',  18, 50, false),
  ('base',      'Base',             'evm',     8453,     'ETH',  18, 60, false),
  ('tron',      'Tron',             'tron',    NULL,     'TRX',   6, 70, false),
  ('bitcoin',   'Bitcoin',          'btc',     NULL,     'BTC',   8, 80, false),
  ('solana',    'Solana',           'solana',  NULL,     'SOL',   9, 90, false)
ON CONFLICT (chain_key) DO NOTHING;