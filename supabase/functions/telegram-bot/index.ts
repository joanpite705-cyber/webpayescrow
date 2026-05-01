import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------- helpers ----------

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

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// ---------- session persistence ----------

interface SessionState {
  step: string;
  role?: string;
  data?: any;
}

async function getSession(chatId: number): Promise<SessionState | null> {
  const { data } = await supabase
    .from('telegram_sessions')
    .select('step, state, flow')
    .eq('chat_id', String(chatId))
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  return { step: data.step, role: data.flow, data: (data.state as any) || {} };
}

async function setSession(chatId: number, state: SessionState, username?: string) {
  // Upsert by chat_id
  const { data: existing } = await supabase
    .from('telegram_sessions')
    .select('id')
    .eq('chat_id', String(chatId))
    .limit(1)
    .single();

  const row = {
    chat_id: String(chatId),
    step: state.step,
    flow: state.role || 'escrow',
    state: state.data || {},
    telegram_username: username || null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from('telegram_sessions').update(row).eq('id', existing.id);
  } else {
    await supabase.from('telegram_sessions').insert(row);
  }
}

async function clearSession(chatId: number) {
  await supabase.from('telegram_sessions').delete().eq('chat_id', String(chatId));
}

// ---------- profile helpers ----------

async function getProfileByChatId(chatId: number) {
  const { data } = await supabase.from('profiles').select('*').eq('telegram_chat_id', String(chatId)).single();
  return data;
}

async function getProfileByUsername(username: string) {
  const clean = username.replace('@', '').trim().toLowerCase();
  const { data } = await supabase.from('profiles').select('*').ilike('telegram_username', clean).single();
  return data;
}

async function ensureProfile(chatId: number, username: string, token: string): Promise<any | null> {
  let profile = await getProfileByChatId(chatId);
  if (!profile && username) {
    profile = await getProfileByUsername(username);
    if (profile) {
      await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('id', profile.id);
    }
  }
  if (!profile) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '❌ *No account found.*\n\nSend /start to create your account first.',
      parse_mode: 'Markdown',
    });
    return null;
  }
  return profile;
}

// ---------- menus ----------

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🤝 New Escrow', callback_data: 'start_escrow' }, { text: '📋 My Escrows', callback_data: 'my_escrows' }],
      [{ text: '💰 Wallets', callback_data: 'wallets' }, { text: '👤 Status', callback_data: 'status' }],
      [{ text: '🔑 Reset Password', callback_data: 'reset_password' }, { text: '❓ Help', callback_data: 'help' }],
    ],
  };
}

// ---------- handlers ----------

async function handleUpdate(update: any, token: string) {
  const message = update.message;
  const callbackQuery = update.callback_query;

  if (callbackQuery) {
    await handleCallback(callbackQuery, token);
    return;
  }
  if (!message) return;

  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const username = message.from?.username || '';

  // Check persistent session first
  const session = await getSession(chatId);
  if (session) {
    await handleConversation(chatId, text, username, token, session);
    return;
  }

  if (text.startsWith('/')) {
    const command = text.split(' ')[0].split('@')[0].toLowerCase();
    switch (command) {
      case '/start': return handleStart(chatId, username, token);
      case '/help': return handleHelp(chatId, token);
      case '/myescrows': return handleMyEscrows(chatId, username, token);
      case '/newescrow': return handleNewEscrow(chatId, username, token);
      case '/status': return handleStatus(chatId, username, token);
      case '/wallets': return handleWallets(chatId, token);
      case '/resetpassword': return handleResetPassword(chatId, username, token);
      default:
        return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❓ Unknown command. Use /help or press buttons below.', reply_markup: mainMenuKeyboard() });
    }
  }

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: '💡 Use the buttons below or type a command like /help',
    reply_markup: mainMenuKeyboard(),
  });
}

async function handleStart(chatId: number, username: string, token: string) {
  await clearSession(chatId);
  const settings = await getSettings();
  const webUrl = await getWebAppUrl();

  let profile = await getProfileByChatId(chatId);
  if (!profile && username) {
    profile = await getProfileByUsername(username);
    if (profile) {
      await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('id', profile.id);
    }
  }

  if (profile) {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `🛡️ *Welcome back, @${profile.telegram_username || username}!*\n\nSecure crypto escrow for P2P trades.\n\n⚠️ _${settings.safety_message || 'Never trade outside the platform.'}_\n\nChoose an action:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤝 New Escrow', callback_data: 'start_escrow' }, { text: '📋 My Escrows', callback_data: 'my_escrows' }],
          [{ text: '💰 Wallets', callback_data: 'wallets' }, { text: '👤 Status', callback_data: 'status' }],
          [{ text: '🔑 Reset Password', callback_data: 'reset_password' }],
          [{ text: '🌐 Open Web App', url: `${webUrl}/dashboard` }],
          [{ text: '❓ Help', callback_data: 'help' }],
        ],
      },
    });
  } else {
    await sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `🛡️ *Welcome to EscrowBot!*\n\nYou don't have an account yet.\n\n📧 To get started, send your *email address* and we'll create your account automatically.\n\nYour Telegram username (@${username}) will be linked.`,
      parse_mode: 'Markdown',
    });
    await setSession(chatId, { step: 'awaiting_email', data: { username } }, username);
  }
}

async function handleHelp(chatId: number, token: string) {
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `❓ *EscrowBot Commands*\n\n/start — Main menu\n/help — This help\n/newescrow — Create escrow\n/myescrows — Your escrows\n/status — Account info\n/wallets — Payment wallets\n/resetpassword — Reset password\n\n🛡️ *How it works:*\n1️⃣ Create escrow (buyer/seller)\n2️⃣ Counterpart accepts → 30 min timer\n3️⃣ Buyer sends crypto → marks paid\n4️⃣ Admin verifies payment\n5️⃣ Seller releases → trade complete\n6️⃣ Both parties rate each other\n\n*Supported:* BTC, ETH, USDT (TRC20/ERC20)`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleNewEscrow(chatId: number, username: string, token: string) {
  const profile = await ensureProfile(chatId, username, token);
  if (!profile) return;

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: '🤝 *New Escrow*\n\nAre you the *buyer* or *seller*?',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 I\'m Buying', callback_data: 'role_buyer' }, { text: '💰 I\'m Selling', callback_data: 'role_seller' }],
        [{ text: '◀️ Cancel', callback_data: 'back_main' }],
      ],
    },
  });
}

async function handleMyEscrows(chatId: number, username: string, token: string) {
  const profile = await ensureProfile(chatId, username, token);
  if (!profile) return;
  const webUrl = await getWebAppUrl();

  const { data: escrows } = await supabase.from('escrows').select('*')
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id},created_by.eq.${profile.id}`)
    .order('created_at', { ascending: false }).limit(10);

  if (!escrows?.length) {
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId, text: '📋 No escrows yet. Create your first one!',
      reply_markup: { inline_keyboard: [[{ text: '🤝 New Escrow', callback_data: 'start_escrow' }, { text: '◀️ Menu', callback_data: 'back_main' }]] },
    });
  }

  const emoji: Record<string, string> = { pending: '⏳', active: '🟢', paid: '💳', confirmed: '✅', completed: '🎉', disputed: '⚠️', cancelled: '❌' };

  let msg = '📋 *Your Escrows:*\n\n';
  const buttons: any[] = [];
  for (const e of escrows) {
    const role = e.buyer_id === profile.id ? '🛒 Buyer' : e.seller_id === profile.id ? '💰 Seller' : '📌 Creator';
    msg += `${emoji[e.status] || '•'} ${role}: *${e.title}*\n   💰 ${e.amount} ${e.crypto_type} — _${e.status}_\n\n`;
    if (['pending', 'active', 'paid', 'confirmed', 'disputed'].includes(e.status)) {
      buttons.push([{ text: `📌 ${e.title} (${e.status})`, callback_data: `escrow_${e.id}` }]);
    }
  }
  buttons.push([{ text: '🌐 View on Web', url: `${webUrl}/dashboard/escrows` }]);
  buttons.push([{ text: '◀️ Main Menu', callback_data: 'back_main' }]);

  await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

async function handleStatus(chatId: number, username: string, token: string) {
  const profile = await ensureProfile(chatId, username, token);
  if (!profile) return;

  const { count } = await supabase.from('escrows').select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`);

  const verified = profile.is_verified ? '✅ Verified' : '❌ Not verified';
  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `👤 *Your Account*\n\n📛 ${profile.display_name || username}\n📱 @${profile.telegram_username || username}\n${verified}\n👍 ${profile.positive_ratings || 0}  👎 ${profile.negative_ratings || 0}\n📊 Escrows: ${count || 0}\n📅 Since: ${new Date(profile.created_at).toLocaleDateString()}`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

async function handleWallets(chatId: number, token: string) {
  const { data: wallets } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);
  if (!wallets?.length) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '💰 No wallets configured yet. Contact admin.',
      reply_markup: { inline_keyboard: [[{ text: '◀️ Menu', callback_data: 'back_main' }]] } });
  }
  let msg = '💰 *Platform Wallets:*\n\n_Send payments to these addresses_\n\n';
  wallets.forEach((w: any) => { msg += `*${w.crypto_name}* (${w.network})\n\`${w.wallet_address}\`\n\n`; });
  await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] } });
}

async function handleResetPassword(chatId: number, username: string, token: string) {
  const profile = await ensureProfile(chatId, username, token);
  if (!profile) return;

  const tempPassword = generateTempPassword();
  const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
  if (!userData?.user) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Could not find your auth account. Contact admin.' });
  }

  const { error } = await supabase.auth.admin.updateUserById(profile.id, { password: tempPassword });
  if (error) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: `❌ Error: ${error.message}` });
  }

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: `🔑 *Password Reset*\n\nYour temporary password:\n\n\`${tempPassword}\`\n\n⚠️ *Change it after logging in!*\n\nUse this to sign in on the web.`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
  });
}

// ---------- conversation (persistent sessions) ----------

async function handleConversation(chatId: number, text: string, username: string, token: string, state: SessionState) {
  // Account creation flow
  if (state.step === 'awaiting_email') {
    const email = text.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Please enter a valid email address.' });
    }
    await setSession(chatId, { step: 'awaiting_password', data: { ...state.data, email } }, username);
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '🔒 Now enter a *password* (min 6 characters) for your account:',
      parse_mode: 'Markdown',
    });
  }

  if (state.step === 'awaiting_password') {
    const password = text.trim();
    if (password.length < 6) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Password must be at least 6 characters. Try again.' });
    }
    const email = state.data?.email;
    const tgUsername = state.data?.username || username;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { telegram_username: tgUsername, display_name: tgUsername },
    });

    if (authError) {
      await clearSession(chatId);
      return sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `❌ Could not create account: ${authError.message}\n\nTry /start again.`,
      });
    }

    if (authData?.user) {
      await supabase.from('profiles').update({ telegram_chat_id: String(chatId) }).eq('id', authData.user.id);
    }

    await clearSession(chatId);

    const webUrl = await getWebAppUrl();
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: `✅ *Account Created!*\n\n📧 Email: ${email}\n📱 Telegram: @${tgUsername}\n\nYou can now use the same credentials to log in on the web.\n\n⚠️ _Never trade outside the platform!_`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤝 Start Escrow', callback_data: 'start_escrow' }, { text: '📋 My Escrows', callback_data: 'my_escrows' }],
          [{ text: '🌐 Open Web', url: `${webUrl}/dashboard` }],
        ],
      },
    });
  }

  // Escrow creation flow
  if (state.step === 'awaiting_counterpart') {
    const counterpart = text.replace('@', '').trim();
    if (!counterpart) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Enter a valid Telegram username (without @).' });
    }

    const counterpartProfile = await getProfileByUsername(counterpart);
    const newState: SessionState = {
      step: 'awaiting_title',
      role: state.role,
      data: { ...state.data, counterpart, counterpartId: counterpartProfile?.id || null },
    };
    await setSession(chatId, newState, username);

    if (!counterpartProfile) {
      return sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `⚠️ User @${counterpart} is not registered yet. The escrow will be created and they'll find it when they join.\n\n📝 Now enter a *title* for this escrow:`,
        parse_mode: 'Markdown',
      });
    } else {
      return sendTelegram(token, 'sendMessage', {
        chat_id: chatId,
        text: `✅ Found @${counterpart}!\n\n📝 Now enter a *title* for this escrow:`,
        parse_mode: 'Markdown',
      });
    }
  }

  if (state.step === 'awaiting_title') {
    const title = text.trim();
    if (!title || title.length < 2) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Title too short. Enter a descriptive title.' });
    }
    await setSession(chatId, { step: 'awaiting_amount', role: state.role, data: { ...state.data, title } }, username);
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '💰 Enter the *amount* (number only):',
      parse_mode: 'Markdown',
    });
  }

  if (state.step === 'awaiting_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Enter a valid positive number.' });
    }
    await setSession(chatId, { step: 'awaiting_crypto', role: state.role, data: { ...state.data, amount } }, username);
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '🪙 Select cryptocurrency:',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'USDT (TRC20)', callback_data: 'crypto_USDT' }, { text: 'USDT (ERC20)', callback_data: 'crypto_USDT_ERC20' }],
          [{ text: 'Bitcoin', callback_data: 'crypto_BTC' }, { text: 'Ethereum', callback_data: 'crypto_ETH' }],
        ],
      },
    });
  }
}

// ---------- create escrow ----------

async function createEscrowFromBot(chatId: number, username: string, token: string) {
  const state = await getSession(chatId);
  if (!state?.data) return;

  const profile = await ensureProfile(chatId, username, token);
  if (!profile) { await clearSession(chatId); return; }

  const { role, counterpart, counterpartId, title, amount, crypto } = state.data;
  const settings = await getSettings();
  const feeAmount = amount * (settings.fee_percentage || 2) / 100;

  const escrowData: any = {
    title,
    amount,
    crypto_type: crypto,
    created_by: profile.id,
    status: 'pending',
    fee_amount: feeAmount,
  };

  if (role === 'buyer') {
    escrowData.buyer_id = profile.id;
    escrowData.buyer_username = profile.telegram_username;
    escrowData.seller_id = counterpartId || null;
    escrowData.seller_username = counterpart;
  } else {
    escrowData.seller_id = profile.id;
    escrowData.seller_username = profile.telegram_username;
    escrowData.buyer_id = counterpartId || null;
    escrowData.buyer_username = counterpart;
  }

  const { data: escrow, error } = await supabase.from('escrows').insert(escrowData).select().single();
  await clearSession(chatId);

  if (error) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: `❌ Error: ${error.message}` });
  }

  const webUrl = await getWebAppUrl();
  let msg = `✅ *Escrow Created!*\n\n📌 *${title}*\n💰 ${amount} ${crypto}\n📊 Fee: ${feeAmount.toFixed(4)} ${crypto}\n👤 You: ${role.toUpperCase()}\n🤝 Counterpart: @${counterpart}\n\n`;

  if (!counterpartId) {
    msg += `⚠️ @${counterpart} isn't registered yet. They'll see this escrow when they join.\n\n`;
  } else {
    msg += `Waiting for @${counterpart} to accept.\n\n`;
    const counterpartProfile = await getProfileByUsername(counterpart);
    if (counterpartProfile?.telegram_chat_id) {
      await sendTelegram(token, 'sendMessage', {
        chat_id: parseInt(counterpartProfile.telegram_chat_id),
        text: `🔔 *New Escrow Invite!*\n\n📌 *${title}*\n💰 ${amount} ${crypto}\nFrom: @${profile.telegram_username || username}\nYou are: ${role === 'buyer' ? 'SELLER' : 'BUYER'}\n\nAccept or decline below:`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '✅ Accept', callback_data: `accept_${escrow.id}` }, { text: '❌ Decline', callback_data: `decline_${escrow.id}` }],
          [{ text: '👁 View Details', callback_data: `escrow_${escrow.id}` }],
          [{ text: '🌐 Open Web', url: `${webUrl}/dashboard/escrows/${escrow.id}` }],
        ] },
      });
    }
  }

  // Post system message
  await supabase.from('escrow_messages').insert({
    escrow_id: escrow.id,
    sender_id: profile.id,
    message: settings.safety_message || '⚠️ NEVER trade outside this platform. All trades must go through escrow.',
    message_type: 'system',
    message_label: 'Moderator',
  });

  await sendTelegram(token, 'sendMessage', {
    chat_id: chatId,
    text: msg,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [
      [{ text: '🌐 View on Web', url: `${webUrl}/dashboard/escrows/${escrow.id}` }],
      [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
    ] },
  });
}

// ---------- escrow detail ----------

async function handleEscrowDetail(chatId: number, escrowId: string, username: string, token: string) {
  const profile = await ensureProfile(chatId, username, token);
  if (!profile) return;

  const { data: escrow } = await supabase.from('escrows').select('*').eq('id', escrowId).single();
  if (!escrow) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Escrow not found.' });
  }

  const isParty = [escrow.buyer_id, escrow.seller_id, escrow.created_by].includes(profile.id);
  if (!isParty) {
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ You are not part of this escrow.' });
  }

  const isBuyer = escrow.buyer_id === profile.id;
  const isSeller = escrow.seller_id === profile.id;
  const emoji: Record<string, string> = { pending: '⏳', active: '🟢', paid: '💳', confirmed: '✅', completed: '🎉', disputed: '⚠️', cancelled: '❌' };

  let msg = `${emoji[escrow.status] || '•'} *${escrow.title}*\n\n💰 Amount: ${escrow.amount} ${escrow.crypto_type}\n📊 Fee: ${escrow.fee_amount || 0} ${escrow.crypto_type}\n📍 Status: _${escrow.status}_\n👤 You: ${isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Creator'}\n`;

  // Show confirmed amount for seller
  if (isSeller && ['confirmed', 'paid'].includes(escrow.status)) {
    const { data: payments } = await supabase.from('payments').select('*').eq('escrow_id', escrowId).eq('status', 'confirmed');
    if (payments?.length) {
      msg += `\n💰 *Funds confirmed:* ${payments.reduce((s: number, p: any) => s + p.amount, 0)} ${escrow.crypto_type}\n`;
    }
  }

  const buttons: any[] = [];
  const webUrl = await getWebAppUrl();

  if (escrow.status === 'active' && isBuyer) {
    const { data: wallets } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);
    const matching = wallets?.filter((w: any) => {
      if (escrow.crypto_type === 'USDT') return w.crypto_name === 'USDT' && w.network === 'TRC20';
      if (escrow.crypto_type === 'USDT_ERC20') return w.crypto_name === 'USDT' && w.network === 'ERC20';
      return w.crypto_name === escrow.crypto_type;
    }) || [];
    if (matching.length) {
      msg += '\n💳 *Send payment to:*\n';
      matching.forEach((w: any) => { msg += `\n${w.crypto_name} (${w.network}):\n\`${w.wallet_address}\`\n`; });
    }
    buttons.push([{ text: '✅ Mark as Paid', callback_data: `mark_paid_${escrowId}` }]);
  }

  if (escrow.status === 'confirmed' && isSeller) {
    buttons.push([{ text: '📦 Share Release Details', callback_data: `release_prompt_${escrowId}` }]);
    buttons.push([{ text: '🎉 Release Funds', callback_data: `release_${escrowId}` }]);
  }

  if (['active', 'paid', 'confirmed'].includes(escrow.status)) {
    buttons.push([{ text: '⚠️ Raise Dispute', callback_data: `dispute_${escrowId}` }]);
  }

  buttons.push([{ text: '🌐 Open on Web', url: `${webUrl}/dashboard/escrows/${escrowId}` }]);
  buttons.push([{ text: '◀️ Back to Escrows', callback_data: 'my_escrows' }]);

  await sendTelegram(token, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

// ---------- callbacks ----------

async function handleCallback(query: any, token: string) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const username = query.from?.username || '';

  await sendTelegram(token, 'answerCallbackQuery', { callback_query_id: query.id });

  if (data.startsWith('escrow_')) {
    return handleEscrowDetail(chatId, data.replace('escrow_', ''), username, token);
  }

  if (data.startsWith('accept_')) {
    const escrowId = data.replace('accept_', '');
    const profile = await ensureProfile(chatId, username, token);
    if (!profile) return;
    const { data: escrow } = await supabase.from('escrows').select('*').eq('id', escrowId).single();
    if (!escrow) return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Escrow not found.' });
    if (escrow.status !== 'pending') {
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: `ℹ️ Already ${escrow.status}.` });
    }
    const settings = await getSettings();
    const feeAmount = (escrow.amount || 0) * (settings.fee_percentage || 2) / 100;
    const deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from('escrows').update({
      status: 'active', accepted_at: new Date().toISOString(),
      payment_deadline: deadline, fee_amount: feeAmount,
    }).eq('id', escrowId);
    await supabase.from('escrow_messages').insert({
      escrow_id: escrowId, sender_id: profile.id,
      message: settings.safety_message || '⚠️ Escrow accepted. 30 min payment window started.',
      message_type: 'system', message_label: 'Moderator',
    });
    return handleEscrowDetail(chatId, escrowId, username, token);
  }

  if (data.startsWith('decline_')) {
    const escrowId = data.replace('decline_', '');
    const profile = await ensureProfile(chatId, username, token);
    if (!profile) return;
    await supabase.from('escrows').update({ status: 'cancelled' }).eq('id', escrowId);
    await supabase.from('escrow_messages').insert({
      escrow_id: escrowId, sender_id: profile.id,
      message: '❌ Counterpart declined the escrow.',
      message_type: 'system', message_label: 'Moderator',
    });
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId, text: '❌ Escrow declined.',
      reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
    });
  }

  if (data.startsWith('mark_paid_')) {
    const escrowId = data.replace('mark_paid_', '');
    const profile = await ensureProfile(chatId, username, token);
    if (!profile) return;
    const { data: escrow } = await supabase.from('escrows').select('*').eq('id', escrowId).single();
    if (!escrow) return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ Escrow not found.' });
    const { data: wallets } = await supabase.from('crypto_wallets').select('*').eq('is_active', true);
    const matching = wallets?.filter((w: any) => {
      if (escrow.crypto_type === 'USDT') return w.crypto_name === 'USDT' && w.network === 'TRC20';
      if (escrow.crypto_type === 'USDT_ERC20') return w.crypto_name === 'USDT' && w.network === 'ERC20';
      return w.crypto_name === escrow.crypto_type;
    }) || [];
    if (matching.length) {
      await supabase.from('payments').insert({
        escrow_id: escrowId, crypto_type: escrow.crypto_type,
        wallet_address: matching[0].wallet_address, amount: escrow.amount, status: 'submitted',
      });
      await supabase.from('escrows').update({ status: 'paid' }).eq('id', escrowId);
      await supabase.from('escrow_messages').insert({
        escrow_id: escrowId, sender_id: profile.id,
        message: '💳 Buyer has marked payment as submitted. Waiting for admin verification.',
        message_type: 'system', message_label: 'Moderator',
      });
      return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '✅ Payment marked! Admin will verify shortly.',
        reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] } });
    }
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '❌ No matching wallet found.' });
  }

  if (data.startsWith('release_prompt_')) {
    const escrowId = data.replace('release_prompt_', '');
    await setSession(chatId, { step: 'awaiting_release_details', data: { escrowId } }, username);
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '📦 *Share Delivery Details*\n\nSend the delivery content now:\n• Links, credentials, file URLs\n• Username/password combos\n• Any relevant info for the buyer\n\nType it all in one message:',
      parse_mode: 'Markdown',
    });
  }

  if (data.startsWith('release_')) {
    const escrowId = data.replace('release_', '');
    await supabase.from('escrows').update({ status: 'completed' }).eq('id', escrowId);
    const profile = await ensureProfile(chatId, username, token);
    if (profile) {
      await supabase.from('escrow_messages').insert({
        escrow_id: escrowId, sender_id: profile.id,
        message: '🎉 Seller has released funds. Trade complete!',
        message_type: 'system', message_label: 'Moderator',
      });
    }
    return sendTelegram(token, 'sendMessage', { chat_id: chatId, text: '🎉 *Trade Complete!* Funds released.\n\nPlease rate your counterpart on the web.',
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] } });
  }

  if (data.startsWith('dispute_')) {
    const escrowId = data.replace('dispute_', '');
    await setSession(chatId, { step: 'awaiting_dispute_reason', data: { escrowId } }, username);
    return sendTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: '⚠️ *Raise Dispute*\n\nDescribe the issue in one message:',
      parse_mode: 'Markdown',
    });
  }

  if (data.startsWith('crypto_')) {
    const crypto = data.replace('crypto_', '');
    const session = await getSession(chatId);
    if (session) {
      await setSession(chatId, { ...session, data: { ...session.data, crypto } }, username);
      await createEscrowFromBot(chatId, username, token);
    }
    return;
  }

  switch (data) {
    case 'start_escrow': return handleNewEscrow(chatId, username, token);
    case 'role_buyer':
    case 'role_seller': {
      const role = data === 'role_buyer' ? 'buyer' : 'seller';
      await setSession(chatId, { step: 'awaiting_counterpart', role, data: { role } }, username);
      return sendTelegram(token, 'sendMessage', {
        chat_id: chatId, text: `You: *${role.toUpperCase()}*\n\n📝 Enter counterpart's Telegram username (without @):`, parse_mode: 'Markdown',
      });
    }
    case 'my_escrows': return handleMyEscrows(chatId, username, token);
    case 'wallets': return handleWallets(chatId, token);
    case 'status': return handleStatus(chatId, username, token);
    case 'help': return handleHelp(chatId, token);
    case 'reset_password': return handleResetPassword(chatId, username, token);
    case 'back_main': return handleStart(chatId, username, token);
  }
}

// ---------- server ----------

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

      // Handle release details and dispute reason from conversation
      if (body.update_id !== undefined) {
        // Check for release/dispute sessions in conversation handler
        const msg = body.message;
        if (msg) {
          const cid = msg.chat.id;
          const session = await getSession(cid);
          if (session?.step === 'awaiting_release_details') {
            const profile = await ensureProfile(cid, msg.from?.username || '', token);
            if (profile) {
              const escrowId = session.data?.escrowId;
              const content = (msg.text || '').trim();
              // Save to escrow_releases
              await supabase.from('escrow_releases').insert({
                escrow_id: escrowId,
                sender_id: profile.id,
                release_type: 'text',
                content,
                title: 'Delivery Details',
              });
              // Post in chat
              await supabase.from('escrow_messages').insert({
                escrow_id: escrowId,
                sender_id: profile.id,
                message: `📦 *Delivery Details*\n\n${content}`,
                message_type: 'release',
                message_label: 'Seller Delivery',
              });
              await clearSession(cid);
              await sendTelegram(token, 'sendMessage', {
                chat_id: cid,
                text: '✅ Delivery details shared with buyer!\n\nYou can now release funds when ready.',
                reply_markup: { inline_keyboard: [
                  [{ text: '🎉 Release Funds', callback_data: `release_${escrowId}` }],
                  [{ text: '◀️ Main Menu', callback_data: 'back_main' }],
                ] },
              });
              return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }
          if (session?.step === 'awaiting_dispute_reason') {
            const profile = await ensureProfile(cid, msg.from?.username || '', token);
            if (profile) {
              const escrowId = session.data?.escrowId;
              const reason = (msg.text || '').trim();
              await supabase.from('disputes').insert({
                escrow_id: escrowId, raised_by: profile.id, reason,
              });
              await supabase.from('escrows').update({ status: 'disputed' }).eq('id', escrowId);
              await supabase.from('escrow_messages').insert({
                escrow_id: escrowId, sender_id: profile.id,
                message: '🛡️ Moderator has joined the chat. A dispute has been raised and will be reviewed.',
                message_type: 'system', message_label: 'Moderator',
              });
              await clearSession(cid);
              await sendTelegram(token, 'sendMessage', {
                chat_id: cid,
                text: '⚠️ Dispute raised! A moderator will review shortly.',
                reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'back_main' }]] },
              });
              return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }
        }

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
            { command: 'help', description: '❓ Help & commands' },
            { command: 'newescrow', description: '🤝 Create new escrow' },
            { command: 'myescrows', description: '📋 View my escrows' },
            { command: 'status', description: '👤 Account status' },
            { command: 'wallets', description: '💰 Payment wallets' },
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
