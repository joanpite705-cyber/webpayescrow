import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Touch a few tables so the database registers real activity (prevents idle pause)
    const [profiles, escrows, listings] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('escrows').select('id', { count: 'exact', head: true }),
      supabase.from('account_listings').select('id', { count: 'exact', head: true }),
    ])

    const stats = {
      profiles: profiles.count ?? 0,
      escrows: escrows.count ?? 0,
      listings: listings.count ?? 0,
    }

    // Write a heartbeat row (also keeps storage/write path warm)
    const { error: insertError } = await supabase
      .from('keepalive_pings')
      .insert({ source: 'cron', stats })

    if (insertError) throw insertError

    // Prune old heartbeats (keep last 90 days)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('keepalive_pings').delete().lt('created_at', cutoff)

    return new Response(
      JSON.stringify({ ok: true, pinged_at: new Date().toISOString(), stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
