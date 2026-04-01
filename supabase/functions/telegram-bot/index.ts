import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// In-memory conversation state (per-invocation; for persistent state, use DB)
const userState: Record<number, { step: string; role?: string; data?: any }> = {};

async function getBotToken(): Promise<string | null> {
  const { data } = await supabase.from('bot_config').select('bot_token').eq('is_active', true).limit(1).single();
  return data?.bot_token || null;
}

async function getWebAppUrl(): Promise<string> {
  const { data } = await supabase.from('bot_config').select('bot_username').eq('is_active', true).limit(1).single();
  return Deno.env.get('WEB_APP_URL') || 'https://webpayescrow.lovable.app';
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

  // Handle commands
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].split('@')[0].toLowerCase();

    switch (command) {
      case '/start':
        await handleStart(chatId, username, token);
        return;
      case '/help':
        await handleHelp(chatId, token);
        return;
      case '/myescrows':
        await handleMyEscrows(chatId, username, token);
        return;
      case '/newescrow':
        await handleNewEscrow(chatId, token);
        return;
      case '/status':
        await handleStatus(chatId, username, token);
        return;
      case '/wallets':
        await handleWallets(chatId, token);
        return;
      default:
        await sendTelegram(token, 'sendMessage', {
          chat_id: chatId,
          text: '❓ Unknown command. Use /help to see available commands.',
        });
        return;
    }
  }

  // Handle conversation state (e.g., counterpart username input)
  const state = userState[chatId];
  if (state) {
    await handleConversation(chatId, text, username, token);
    return;
  }

  // Default: show help
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

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `🛡️ *Welcome to EscrowBot!*\n\nSecure crypto escrow for digital trades.\n\n👤 Your username: @${username}\n🔑 Chat ID: \`${chatId}\`\n\n📱 *Sign up on the web app* to complete your account, then come back here to manage your escrows!\n\nChoose an action:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }],
        [{ text: '📋 My Escrows', callback_data: 'my_escrows' }],
        [{ text: '💰 View Wallets', callback_data: 'wallets' }],
        [{ text: '🌐 Open Web App', url: webUrl }],
        [{ text: '❓ Help', callback_data: 'help' }],
      ],
    },
  });

  // Link chat_id to profile
  if (username) {
    await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('telegram_username', username);
  }
}

async function handleHelp(chatId: number, token: string) {
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `❓ *EscrowBot Commands*\n\n/start — Main menu\n/help — Show this help\n/newescrow — Create a new escrow\n/myescrows — View your escrows\n/status — Your account status\n/wallets — View payment wallets\n\n🛡️ *How it works:*\n1️⃣ Both parties register on the web app\n2️⃣ Create an escrow (buyer or seller)\n3️⃣ Buyer sends crypto to the platform wallet\n4️⃣ Admin verifies the payment\n5️⃣ Seller delivers the goods\n6️⃣ Buyer confirms receipt → trade complete\n\n*Supported Crypto:*\n• BTC (Bitcoin)\n• ETH (Ethereum)\n• USDT (TRC20 & ERC20)`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
      ],
    },
  });
}

async function handleMyEscrows(chatId: number, username: string, token: string) {
  const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_username', username).single();
  const webUrl = await getWebAppUrl();

  if (!profile) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '❌ You need to register on the web app first!\n\nSign up with your Telegram username to link your account.',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Sign Up', url: webUrl + '/signup' }]] },
    });
    return;
  }

  const { data: escrows } = await supabase.from('escrows').select('*')
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
    .order('created_at', { ascending: false }).limit(5);

  if (!escrows?.length) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '📋 You have no escrows yet.\n\nStart one using the button below!',
      reply_markup: { inline_keyboard: [[{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }]] },
    });
    return;
  }

  const emoji: Record<string, string> = {
    pending: '⏳', active: '🟢', paid: '💳', confirmed: '✅', completed: '🎉', disputed: '⚠️', cancelled: '❌',
  };

  let msg = '📋 *Your Recent Escrows:*\n\n';
  escrows.forEach((e) => {
    msg += `${emoji[e.status] || '•'} *${e.title}*\n   💰 ${e.amount} ${e.crypto_type} — _${e.status.toUpperCase()}_\n\n`;
  });

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 View on Web', url: webUrl + '/dashboard/escrows' }],
        [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
      ],
    },
  });
}

async function handleNewEscrow(chatId: number, token: string) {
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: '🤝 *Start New Escrow*\n\nAre you the buyer or seller?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 I\'m the Buyer', callback_data: 'role_buyer' }],
        [{ text: '💰 I\'m the Seller', callback_data: 'role_seller' }],
        [{ text: '◀️ Back', callback_data: 'back_main' }],
      ],
    },
  });
}

async function handleStatus(chatId: number, username: string, token: string) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_username', username).single();
  const webUrl = await getWebAppUrl();

  if (!profile) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `⚠️ *Account Not Linked*\n\nYour Telegram (@${username}) is not linked to a web account yet.\n\nSign up on the web app with username: \`${username}\``,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Sign Up', url: webUrl + '/signup' }]] },
    });
    return;
  }

  const { count: escrowCount } = await supabase.from('escrows')
    .select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`);

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `👤 *Your Account*\n\n📛 Name: ${profile.display_name || '—'}\n📱 Telegram: @${username}\n🔗 Linked: ✅ Yes\n📊 Total Escrows: ${escrowCount || 0}`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleWallets(chatId: number, token: string) {
  const { data: wallets } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);

  if (!wallets?.length) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '💰 No payment wallets are configured yet. Contact admin.',
    });
    return;
  }

  let msg = '💰 *Available Payment Wallets:*\n\n';
  wallets.forEach((w) => {
    msg += `*${w.crypto_name}* (${w.network})\n\`${w.wallet_address}\`\n\n`;
  });

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleConversation(chatId: number, text: string, username: string, token: string) {
  const state = userState[chatId];
  if (!state) return;

  if (state.step === 'awaiting_counterpart') {
    const counterpart = text.replace('@', '').trim();
    if (!counterpart) {
      await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Please enter a valid username.' });
      return;
    }

    const webUrl = await getWebAppUrl();

    // Direct user to web app to complete escrow creation
    delete userState[chatId];
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `✅ Got it! You're the *${state.role}* and your counterpart is @${counterpart}.\n\n🌐 Complete the escrow setup on the web app to set the amount, crypto type, and details.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Create Escrow on Web', url: webUrl + '/dashboard/create' }],
          [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
        ],
      },
    });
  }
}

async function handleCallback(query: any, token: string) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const username = query.from?.username || '';

  await sendTelegram(token, 'answerCallbackQuery', { callback_query_id: query.id });

  switch (data) {
    case 'start_escrow':
      await handleNewEscrow(chatId, token);
      break;

    case 'role_buyer':
    case 'role_seller': {
      const role = data === 'role_buyer' ? 'buyer' : 'seller';
      userState[chatId] = { step: 'awaiting_counterpart', role };
      await sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `You selected: *${role.toUpperCase()}*\n\n📝 Please send the counterpart's Telegram username (without @):`,
        parse_mode: 'Markdown',
      });
      break;
    }

    case 'my_escrows':
      await handleMyEscrows(chatId, username, token);
      break;

    case 'wallets':
      await handleWallets(chatId, token);
      break;

    case 'help':
      await handleHelp(chatId, token);
      break;

    case 'back_main':
      await handleStart(chatId, username, token);
      break;
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
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Manual actions from web app
      const { action } = body;

      if (action === 'set_webhook') {
        const webhookUrl = body.webhook_url;
        const result = await sendTelegram(token, 'setWebhook', {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
        });
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'get_webhook_info') {
        const result = await sendTelegram(token, 'getWebhookInfo', {});
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'send_notification') {
        const { chat_id, text } = body;
        const result = await sendTelegram(token, 'sendMessage', {
          chat_id, text, parse_mode: 'Markdown',
        });
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'set_commands') {
        const result = await sendTelegram(token, 'setMyCommands', {
          commands: [
            { command: 'start', description: '🛡️ Main menu' },
            { command: 'help', description: '❓ Show help and commands' },
            { command: 'newescrow', description: '🤝 Create a new escrow' },
            { command: 'myescrows', description: '📋 View your escrows' },
            { command: 'status', description: '👤 Your account status' },
            { command: 'wallets', description: '💰 View payment wallets' },
          ],
        });
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
