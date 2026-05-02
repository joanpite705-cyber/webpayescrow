// Admin-only: sweep funds from treasury to cold wallet on a given chain.
// Body: { chain_key: string, token_symbol?: string }  // omit token_symbol to sweep native
// EVM signing uses ethers via esm.sh. Non-EVM chains return 'not_implemented'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

async function isAdmin(supa: any, userId: string) {
  const { data } = await supa.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const admin = createClient(SUPABASE_URL, SERVICE);
    if (!(await isAdmin(admin, u.user.id))) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json() as { chain_key: string; token_symbol?: string };
    const { data: c } = await admin.from("chain_configs").select("*").eq("chain_key", body.chain_key).maybeSingle();
    if (!c) return new Response(JSON.stringify({ error: "chain_not_configured" }), { status: 400, headers: corsHeaders });
    if (!c.cold_wallet_address) return new Response(JSON.stringify({ error: "cold_wallet_not_set" }), { status: 400, headers: corsHeaders });
    if (!c.treasury_private_key || !c.rpc_url) return new Response(JSON.stringify({ error: "treasury_not_configured" }), { status: 400, headers: corsHeaders });

    const job = await admin.from("sweep_jobs").insert({
      chain_key: c.chain_key, from_address: c.treasury_address ?? "", to_address: c.cold_wallet_address,
      token_symbol: body.token_symbol ?? c.native_symbol, status: "pending", trigger_type: "manual", initiated_by: u.user.id,
    }).select().single();
    const jobId = job.data?.id;

    const finish = async (patch: any) => admin.from("sweep_jobs").update(patch).eq("id", jobId);

    if (c.family !== "evm") {
      await finish({ status: "failed", error_message: "non_evm_signing_not_implemented" });
      return new Response(JSON.stringify({ error: "non_evm_signing_not_implemented", job_id: jobId }), { status: 400, headers: corsHeaders });
    }

    try {
      const provider = new ethers.JsonRpcProvider(c.rpc_url);
      const wallet = new ethers.Wallet(c.treasury_private_key, provider);
      let txHash: string;
      let amountStr: string;

      if (!body.token_symbol || body.token_symbol === c.native_symbol) {
        // Native sweep — leave min_gas_reserve behind
        const bal = await provider.getBalance(wallet.address);
        const reserve = ethers.parseUnits(String(c.min_gas_reserve ?? "0"), c.native_decimals);
        const feeData = await provider.getFeeData();
        const gasLimit = 21000n;
        const maxFee = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * gasLimit;
        const sendable = bal - reserve - maxFee;
        if (sendable <= 0n) throw new Error("insufficient_native_balance");
        const tx = await wallet.sendTransaction({ to: c.cold_wallet_address, value: sendable });
        txHash = tx.hash;
        amountStr = ethers.formatUnits(sendable, c.native_decimals);
      } else {
        // ERC20 sweep — auto-fund gas from gas wallet if treasury has insufficient native
        const { data: tokenRow } = await admin.from("chain_tokens").select("contract_address,decimals").eq("chain_key", c.chain_key).eq("symbol", body.token_symbol).maybeSingle();
        if (!tokenRow) throw new Error("token_not_configured");
        const erc = new ethers.Contract(tokenRow.contract_address, ERC20_ABI, wallet);
        const tokenBal: bigint = await erc.balanceOf(wallet.address);
        if (tokenBal === 0n) throw new Error("zero_token_balance");

        const feeData = await provider.getFeeData();
        const gasLimit = 80000n;
        const gasNeeded = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * gasLimit;
        const treasuryNative = await provider.getBalance(wallet.address);

        if (treasuryNative < gasNeeded && c.gas_wallet_private_key) {
          const gasWallet = new ethers.Wallet(c.gas_wallet_private_key, provider);
          const fundAmt = gasNeeded - treasuryNative + (gasNeeded / 4n); // 25% buffer
          const fundTx = await gasWallet.sendTransaction({ to: wallet.address, value: fundAmt });
          await finish({ gas_funding_tx: fundTx.hash, status: "gas_funding" });
          await fundTx.wait(1);
        }

        await finish({ status: "sweeping" });
        const tx = await erc.transfer(c.cold_wallet_address, tokenBal);
        txHash = tx.hash;
        amountStr = ethers.formatUnits(tokenBal, tokenRow.decimals);
      }

      await finish({ status: "completed", sweep_tx: txHash, amount: amountStr });
      return new Response(JSON.stringify({ ok: true, tx: txHash, amount: amountStr, job_id: jobId }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } catch (e) {
      await finish({ status: "failed", error_message: (e as Error).message });
      return new Response(JSON.stringify({ error: (e as Error).message, job_id: jobId }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});