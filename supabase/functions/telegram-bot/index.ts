import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userState: Record<number, { step: string; role?: string; data?: any }> = {};

async function getBotToken(): Promise<string | null> {
  const { data } = await supabase.from('bot_config').select('bot_token').eq('is_active', true).limit(1).single();
  return data?.bot_token || null;
}

async function getSettings(): Promise<any> {
  const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
  return data || { signup_link: '', fee_percentage: 2, safety_message: '' };
}

async function getWebAppUrl(): Promise<string> {
  const settings = await getSettings();
  if (settings.signup_link) {
    // Extract base URL from signup link
    try {
      const url = new URL(settings.signup_link);
      return `${url.protocol}//${url.host}`;
    } catch { /* ignore */ }
  }
  return 'https://webpayescrow.lovable.app';
}

async function sendTelegram(token: string, method: string, body: any) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function handleUpdate(update: any, token: string) {
  const message = update.message;
  const callbackQuery = update.callback_query;

  if (callbackQuery) {
    await handleCallback(callbackQuery, token);
    return;
  }
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text || '';
  const username = message.from?.username || '';

  if (text.startsWith('/')) {
    const command = text.split(' ')[0].split('@')[0].toLowerCase();
    switch (command) {
      case '/start': return handleStart(chatId, username, token);
      case '/help': return handleHelp(chatId, token);
      case '/myescrows': return handleMyEscrows(chatId, username, token);
      case '/newescrow': return handleNewEscrow(chatId, token);
      case '/status': return handleStatus(chatId, username, token);
      case '/wallets': return handleWallets(chatId, token);
      case '/resetpassword': return handleResetPassword(chatId, token);
      default:
        return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❓ Unknown command. Use /help.' });
    }
  }

  // Conversation state
  const state = userState[chatId];
  if (state) {
    await handleConversation(chatId, text, username, token);
    return;
  }

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: 'Use the buttons or type /help to see available commands.',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }],
        [{ text: '📋 My Escrows', callback_data: 'my_escrows' }],
      ],
    },
  });
}

async function handleStart(chatId: number, username: string, token: string) {
  const webUrl = await getWebAppUrl();
  const settings = await getSettings();
  const signupUrl = settings.signup_link || `${webUrl}/signup`;

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `🛡️ *Welcome to EscrowBot!*\n\nSecure crypto escrow for P2P trades.\n\n👤 Username: @${username}\n\n⚠️ _${settings.safety_message || 'Never trade outside the platform.'}_\n\nChoose an action:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤝 New Escrow', callback_data: 'start_escrow' }, { text: '📋 My Escrows', callback_data: 'my_escrows' }],
        [{ text: '💰 Wallets', callback_data: 'wallets' }, { text: '👤 Status', callback_data: 'status' }],
        [{ text: '🔑 Reset Password', callback_data: 'reset_password' }],
        [{ text: '🌐 Sign Up / Open Web', url: signupUrl }],
        [{ text: '❓ Help', callback_data: 'help' }],
      ],
    },
  });

  // Link chat_id
  if (username) {
    await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('telegram_username', username);
  }
}

async function handleHelp(chatId: number, token: string) {
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `❓ *EscrowBot Commands*\n\n/start — Main menu\n/help — This help\n/newescrow — Create escrow\n/myescrows — Your escrows\n/status — Account info\n/wallets — Payment wallets\n/resetpassword — Reset web password\n\n🛡️ *How it works:*\n1️⃣ Create escrow (buyer/seller)\n2️⃣ Counterpart accepts → 30 min timer starts\n3️⃣ Buyer sends crypto → marks paid\n4️⃣ Admin verifies payment\n5️⃣ Seller releases → trade complete\n6️⃣ Both parties rate each other\n\n*Supported:* BTC, ETH, USDT (TRC20/ERC20)`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleMyEscrows(chatId: number, username: string, token: string) {
  const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_username', username).single();
  const webUrl = await getWebAppUrl();

  if (!profile) {
    const settings = await getSettings();
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '❌ Account not linked. Sign up on the web first!',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Sign Up', url: settings.signup_link || `${webUrl}/signup` }]] },
    });
  }

  const { data: escrows } = await supabase.from('escrows').select('*')
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
    .order('created_at', { ascending: false }).limit(10);

  if (!escrows?.length) {
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId, text: '📋 No escrows yet.',
      reply_markup: { inline_keyboard: [[{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }]] },
    });
  }

  const emoji: Record<string, string> = {
    pending: '⏳', active: '🟢', paid: '💳', confirmed: '✅', completed: '🎉', disputed: '⚠️', cancelled: '❌',
  };

  let msg = '📋 *Your Escrows:*\n\n';
  const buttons: any[] = [];
  escrows.forEach((e) => {
    const role = e.buyer_id === profile.id ? '🛒' : '💰';
    msg += `${emoji[e.status] || '•'} ${role} *${e.title}*\n   💰 ${e.amount} ${e.crypto_type} — _${e.status}_\n\n`;
    if (['pending', 'active', 'paid', 'confirmed', 'disputed'].includes(e.status)) {
      buttons.push([{ text: `📌 ${e.title}`, url: `${webUrl}/dashboard/escrows/${e.id}` }]);
    }
  });

  buttons.push([{ text: '◀️ Main Menu', callback_data: 'back_main' }]);

  await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

async function handleNewEscrow(chatId: number, token: string) {
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: '🤝 *New Escrow*\n\nAre you the buyer or seller?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Buyer', callback_data: 'role_buyer' }, { text: '💰 Seller', callback_data: 'role_seller' }],
        [{ text: '◀️ Back', callback_data: 'back_main' }],
      ],
    },
  });
}

async function handleStatus(chatId: number, username: string, token: string) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_username', username).single();
  const webUrl = await getWebAppUrl();

  if (!profile) {
    const settings = await getSettings();
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `⚠️ Account not linked.\n\nSign up with username: @${username}`,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Sign Up', url: settings.signup_link || `${webUrl}/signup` }]] },
    });
  }

  const { count } = await supabase.from('escrows').select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`);

  const verified = profile.is_verified ? '✅ Verified' : '❌ Not verified';
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `👤 *Your Account*\n\n📛 ${profile.display_name || username}\n📱 @${username}\n${verified}\n👍 ${profile.positive_ratings || 0}  👎 ${profile.negative_ratings || 0}\n📊 Escrows: ${count || 0}`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleWallets(chatId: number, token: string) {
  const { data: wallets } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);
  if (!wallets?.length) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '💰 No wallets configured. Contact admin.' });
  }
  let msg = '💰 *Payment Wallets:*\n\n';
  wallets.forEach((w) => { msg += `*${w.crypto_name}* (${w.network})\n\`${w.wallet_address}\`\n\n`; });
  await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] } });
}

async function handleResetPassword(chatId: number, token: string) {
  const webUrl = await getWebAppUrl();
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: '🔑 *Reset Password*\n\nClick below to reset your web login password:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔑 Reset Password', url: `${webUrl}/reset-password` }], [{ text: '◀️ Back', callback_data: 'back_main' }]] },
  });
}

async function handleConversation(chatId: number, text: string, username: string, token: string) {
  const state = userState[chatId];
  if (!state) return;

  if (state.step === 'awaiting_counterpart') {
    const counterpart = text.replace('@', '').trim();
    if (!counterpart) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Enter a valid username.' });
    }
    const webUrl = await getWebAppUrl();
    delete userState[chatId];
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `✅ You're the *${state.role}*, counterpart: @${counterpart}.\n\n🌐 Complete on the web app:`,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '🌐 Create Escrow', url: `${webUrl}/dashboard/escrows/new` }],
        [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
      ] },
    });
  }
}

async function handleCallback(query: any, token: string) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const username = query.from?.username || '';

  await sendTelegram(token, 'answerCallbackQuery', { callback_query_id: query.id });

  switch (data) {
    case 'start_escrow': return handleNewEscrow(chatId, token);
    case 'role_buyer':
    case 'role_seller': {
      const role = data === 'role_buyer' ? 'buyer' : 'seller';
      userState[chatId] = { step: 'awaiting_counterpart', role };
      return sendTelegram(token, 'sendMessage', {
        chat_id: chatId, text: `You: *${role.toUpperCase()}*\n\nSend counterpart's username (without @):`, parse_mode: 'Markdown',
      });
    }
    case 'my_escrows': return handleMyEscrows(chatId, username, token);
    case 'wallets': return handleWallets(chatId, token);
    case 'status': return handleStatus(chatId, username, token);
    case 'help': return handleHelp(chatId, token);
    case 'reset_password': return handleResetPassword(chatId, token);
    case 'back_main': return handleStart(chatId, username, token);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = await getBotToken();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Bot not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();

      // Telegram webhook update
      if (body.update_id !== undefined) {
        await handleUpdate(body, token);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { action } = body;

      if (action === 'set_webhook') {
        const result = await sendTelegram(token, 'setWebhook', {
          url: body.webhook_url, allowed_updates: ['message', 'callback_query'],
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'get_webhook_info') {
        const result = await sendTelegram(token, 'getWebhookInfo', {});
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'send_notification') {
        const result = await sendTelegram(token, 'sendMessage', { chat_id: body.chat_id, text: body.text, parse_mode: 'Markdown' });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'set_commands') {
        const result = await sendTelegram(token, 'setMyCommands', {
          commands: [
            { command: 'start', description: '🛡️ Main menu' },
            { command: 'help', description: '❓ Help' },
            { command: 'newescrow', description: '🤝 New escrow' },
            { command: 'myescrows', description: '📋 My escrows' },
            { command: 'status', description: '👤 Account status' },
            { command: 'wallets', description: '💰 Wallets' },
            { command: 'resetpassword', description: '🔑 Reset password' },
          ],
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
