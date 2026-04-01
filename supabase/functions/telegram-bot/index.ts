import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '@supabase/supabase-js/cors';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getBotToken(): Promise<string | null> {
  const { data } = await supabase.from('bot_config').select('bot_token').eq('is_active', true).limit(1).single();
  return data?.bot_token || null;
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

  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text;
  const username = message.from?.username || '';

  if (text === '/start') {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `🛡️ *Welcome to EscrowBot!*\n\nSecure crypto escrow for digital trades.\n\nYour username: @${username}\nChat ID: \`${chatId}\`\n\nChoose an action below:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }],
          [{ text: '📋 My Escrows', callback_data: 'my_escrows' }],
          [{ text: '🌐 Open Web App', url: Deno.env.get('WEB_APP_URL') || supabaseUrl.replace('.supabase.co', '.lovable.app') }],
          [{ text: '❓ Help', callback_data: 'help' }],
        ],
      },
    });

    // Update profile with chat_id if user exists
    await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('telegram_username', username);
  }
}

async function handleCallback(query: any, token: string) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const username = query.from?.username || '';

  // Acknowledge callback
  await sendTelegram(token, 'answerCallbackQuery', { callback_query_id: query.id });

  switch (data) {
    case 'start_escrow':
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
      break;

    case 'role_buyer':
    case 'role_seller':
      const role = data === 'role_buyer' ? 'buyer' : 'seller';
      await sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `You selected: *${role.toUpperCase()}*\n\n📝 Please send the counterpart's Telegram username (e.g. @username):`,
        parse_mode: 'Markdown',
      });
      // Store state in a simple way - we'll track via message context
      break;

    case 'my_escrows': {
      // Find user's escrows
      const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_username', username).single();
      if (!profile) {
        await sendTelegram(token, 'sendMessage', {
          chat_id: chatId,
          text: '❌ You need to register on the web app first!\n\nUse the link below to sign up.',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Sign Up', url: (Deno.env.get('WEB_APP_URL') || '') + '/signup' }],
            ],
          },
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
          reply_markup: {
            inline_keyboard: [
              [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }],
            ],
          },
        });
        return;
      }

      const statusEmoji: Record<string, string> = {
        pending: '⏳', active: '🟢', paid: '💳', confirmed: '✅', completed: '🎉', disputed: '⚠️', cancelled: '❌'
      };

      let msg = '📋 *Your Recent Escrows:*\n\n';
      escrows.forEach((e, i) => {
        msg += `${statusEmoji[e.status] || '•'} *${e.title}*\n   ${e.amount} ${e.crypto_type} — ${e.status.toUpperCase()}\n\n`;
      });

      await sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 View on Web', url: (Deno.env.get('WEB_APP_URL') || '') + '/dashboard/escrows' }],
            [{ text: '◀️ Back', callback_data: 'back_main' }],
          ],
        },
      });
      break;
    }

    case 'help':
      await sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `❓ *EscrowBot Help*\n\n🛡️ *What is EscrowBot?*\nA secure escrow service for trading digital goods (accounts, files, etc.) using cryptocurrency.\n\n*How it works:*\n1️⃣ Both parties start the bot\n2️⃣ Create an escrow (buyer or seller)\n3️⃣ Buyer sends crypto to the provided wallet\n4️⃣ Admin verifies the payment\n5️⃣ Seller delivers the goods\n6️⃣ Trade marked as complete\n\n*Supported Crypto:*\n• BTC (Bitcoin)\n• ETH (Ethereum)\n• USDT (TRC20 & ERC20)\n\n*Need help?* Contact admin.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '◀️ Back', callback_data: 'back_main' }],
          ],
        },
      });
      break;

    case 'back_main':
      await sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: '🛡️ *EscrowBot Main Menu*\n\nChoose an action:',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }],
            [{ text: '📋 My Escrows', callback_data: 'my_escrows' }],
            [{ text: '🌐 Open Web App', url: Deno.env.get('WEB_APP_URL') || '' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      });
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

      // Webhook handler - process Telegram update
      if (body.update_id) {
        await handleUpdate(body, token);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Manual actions from web
      const { action } = body;

      if (action === 'set_webhook') {
        const webhookUrl = body.webhook_url;
        const result = await sendTelegram(token, 'setWebhook', { url: webhookUrl });
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
