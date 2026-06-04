import { useEffect, useState } from "react";

const LANGUAGE_EVENT = "app-language-change";

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard", my_escrows: "My Escrows", disputes: "Disputes", settings: "Settings",
    overview: "Overview", users: "Users", all_escrows: "All Escrows", payments: "Payments",
    crypto_wallets: "Crypto Wallets", bot_config: "Bot Config", platform: "Platform Settings",
    sign_out: "Sign Out", admin_panel: "Admin Panel", user_dashboard: "User Dashboard",
    create_escrow: "Create Escrow", new_escrow: "New Escrow", buyer: "Buyer", seller: "Seller",
    amount: "Amount", title: "Title", description: "Description", status: "Status",
    accept: "Accept", reject: "Reject", confirm: "Confirm", cancel: "Cancel",
    submit_payment: "Submit Payment", raise_dispute: "Raise Dispute",
    payment_confirmed: "Payment Confirmed", payment_rejected: "Payment Rejected",
    waiting_acceptance: "Waiting for counterpart to accept",
    payment_deadline: "Payment Deadline", time_remaining: "Time Remaining",
    mark_paid: "Mark as Paid", release_funds: "Release Funds",
    rate_trade: "Rate This Trade", positive: "Positive", negative: "Negative",
    verified: "Verified", fee: "Platform Fee", safety_warning: "Safety Warning",
    no_offline: "⚠️ NEVER trade outside this platform. All trades must go through escrow.",
    login: "Login", signup: "Sign Up", email: "Email", password: "Password",
    telegram_username: "Telegram Username", forgot_password: "Forgot Password?",
    reset_password: "Reset Password", send_reset: "Send Reset Link",
    counterpart: "Counterpart Username", i_am_the: "I am the",
    escrow_chat: "Escrow Chat", send: "Send", type_message: "Type a message...",
    creating: "Creating...", created: "Created", active: "Active", pending: "Pending",
    completed: "Completed", cancelled: "Cancelled", paid: "Paid", confirmed_status: "Confirmed",
    language: "Language", save: "Save", actions: "Actions",
    signup_link: "Bot Signup Link", fee_percentage: "Fee Percentage (%)",
    safety_message: "Safety Message", save_settings: "Save Settings",
    feedback: "Feedback", your_rating: "Your Rating", leave_comment: "Leave a comment...",
    submit_feedback: "Submit Feedback", trade_complete: "Trade Complete!",
    positive_ratings: "👍 Positive", negative_ratings: "👎 Negative",
    accept_escrow: "Accept Escrow", decline_escrow: "Decline Escrow",
    escrow_accepted: "Escrow Accepted!", payment_window: "30 min payment window started",
    expired: "Expired", dispute_reason: "Describe the issue...",
    moderator_joined: "🛡️ Moderator has joined the chat",
    admin_confirm_amount: "Confirmed Amount", wallet_address: "Wallet Address",
    network: "Network", crypto: "Crypto", tx_hash: "TX Hash",
    total_trades: "Total Trades", member_since: "Member Since",
    escrow_history: "Trade History", export_csv: "Export CSV",
    change_password: "Change Password", new_password: "New Password",
    current_password: "Current Password", display_name: "Display Name",
    profile_settings: "Profile Settings", reset_via_bot: "Reset via Telegram Bot",
    delivery_details: "Delivery Details", release_section: "Release & Delivery",
    funds_available: "Funds Available", balances: "Balances",
    user_wallets: "User Wallets", chains: "Chains", sweeps: "Sweeps",
    scam_reports: "Scam Reports",
  },
  zh: {
    dashboard: "仪表板", my_escrows: "我的托管", disputes: "争议", settings: "设置",
    overview: "概览", users: "用户", all_escrows: "所有托管", payments: "支付",
    crypto_wallets: "加密钱包", bot_config: "机器人配置", platform: "平台设置",
    sign_out: "退出", admin_panel: "管理面板", user_dashboard: "用户面板",
    create_escrow: "创建托管", new_escrow: "新托管", buyer: "买家", seller: "卖家",
    amount: "金额", title: "标题", description: "描述", status: "状态",
    accept: "接受", reject: "拒绝", confirm: "确认", cancel: "取消",
    submit_payment: "提交支付", raise_dispute: "提出争议",
    waiting_acceptance: "等待对方接受", payment_deadline: "支付截止",
    time_remaining: "剩余时间", mark_paid: "标记已付", release_funds: "释放资金",
    rate_trade: "评价交易", positive: "好评", negative: "差评",
    verified: "已验证", fee: "平台费用", safety_warning: "安全警告",
    no_offline: "⚠️ 切勿在平台外交易。所有交易必须通过托管进行。",
    login: "登录", signup: "注册", email: "邮箱", password: "密码",
    telegram_username: "Telegram用户名", forgot_password: "忘记密码?",
    reset_password: "重置密码", counterpart: "对方用户名", i_am_the: "我是",
    escrow_chat: "托管聊天", send: "发送", type_message: "输入消息...",
    creating: "创建中...", created: "已创建", active: "进行中", pending: "待处理",
    completed: "已完成", cancelled: "已取消", paid: "已支付", confirmed_status: "已确认",
    language: "语言", save: "保存", actions: "操作",
    feedback: "反馈", accept_escrow: "接受托管", decline_escrow: "拒绝托管",
    expired: "已过期", save_settings: "保存设置",
    signup_link: "注册链接", fee_percentage: "费率 (%)", safety_message: "安全信息",
    escrow_history: "交易历史", export_csv: "导出CSV", send_reset: "发送重置链接",
    total_trades: "总交易数", member_since: "注册时间",
    change_password: "修改密码", new_password: "新密码", current_password: "当前密码",
    display_name: "显示名称", profile_settings: "个人设置",
    reset_via_bot: "通过Telegram机器人重置", delivery_details: "交付详情",
    release_section: "交付与发布", funds_available: "资金可用",
  },
  ru: {
    dashboard: "Панель", my_escrows: "Мои сделки", disputes: "Споры", settings: "Настройки",
    overview: "Обзор", users: "Пользователи", all_escrows: "Все сделки", payments: "Платежи",
    crypto_wallets: "Крипто кошельки", bot_config: "Настройка бота", platform: "Настройки платформы",
    sign_out: "Выход", admin_panel: "Админ панель", user_dashboard: "Панель пользователя",
    create_escrow: "Создать сделку", new_escrow: "Новая сделка", buyer: "Покупатель", seller: "Продавец",
    amount: "Сумма", title: "Название", description: "Описание", status: "Статус",
    accept: "Принять", reject: "Отклонить", confirm: "Подтвердить", cancel: "Отмена",
    submit_payment: "Подтвердить оплату", raise_dispute: "Открыть спор",
    waiting_acceptance: "Ожидание подтверждения", payment_deadline: "Срок оплаты",
    time_remaining: "Осталось", mark_paid: "Отметить оплату", release_funds: "Выплатить",
    rate_trade: "Оценить сделку", positive: "Положительный", negative: "Отрицательный",
    verified: "Верифицирован", fee: "Комиссия", safety_warning: "Предупреждение",
    no_offline: "⚠️ НИКОГДА не торгуйте вне платформы. Все сделки через эскроу.",
    login: "Вход", signup: "Регистрация", email: "Email", password: "Пароль",
    telegram_username: "Telegram", forgot_password: "Забыли пароль?",
    reset_password: "Сброс пароля", counterpart: "Контрагент", i_am_the: "Я",
    escrow_chat: "Чат сделки", send: "Отправить", type_message: "Сообщение...",
    creating: "Создание...", active: "Активна", pending: "Ожидание",
    completed: "Завершена", cancelled: "Отменена", paid: "Оплачено", confirmed_status: "Подтверждено",
    language: "Язык", save: "Сохранить", actions: "Действия",
    feedback: "Отзыв", accept_escrow: "Принять сделку", decline_escrow: "Отклонить сделку",
    expired: "Истекла", save_settings: "Сохранить", signup_link: "Ссылка для регистрации",
    fee_percentage: "Комиссия (%)", safety_message: "Сообщение безопасности",
    escrow_history: "История сделок", export_csv: "Экспорт CSV", send_reset: "Отправить ссылку",
    total_trades: "Всего сделок", member_since: "С нами с",
    change_password: "Изменить пароль", new_password: "Новый пароль", current_password: "Текущий пароль",
    display_name: "Имя", profile_settings: "Настройки профиля",
    reset_via_bot: "Сброс через Telegram бота", delivery_details: "Детали доставки",
    release_section: "Доставка и передача", funds_available: "Средства доступны",
  },
  ko: {
    dashboard: "대시보드", my_escrows: "내 에스크로", disputes: "분쟁", settings: "설정",
    overview: "개요", users: "사용자", all_escrows: "모든 에스크로", payments: "결제",
    crypto_wallets: "암호화폐 지갑", bot_config: "봇 설정", platform: "플랫폼 설정",
    sign_out: "로그아웃", admin_panel: "관리자 패널", user_dashboard: "사용자 패널",
    create_escrow: "에스크로 생성", new_escrow: "새 에스크로", buyer: "구매자", seller: "판매자",
    amount: "금액", title: "제목", description: "설명", status: "상태",
    accept: "수락", reject: "거절", confirm: "확인", cancel: "취소",
    submit_payment: "결제 제출", raise_dispute: "분쟁 제기",
    waiting_acceptance: "상대방 수락 대기 중", payment_deadline: "결제 기한",
    mark_paid: "결제 완료 표시", release_funds: "자금 릴리스",
    rate_trade: "거래 평가", positive: "긍정적", negative: "부정적",
    verified: "인증됨", fee: "수수료", safety_warning: "안전 경고",
    no_offline: "⚠️ 플랫폼 외부에서 거래하지 마세요.",
    login: "로그인", signup: "회원가입", email: "이메일", password: "비밀번호",
    escrow_chat: "에스크로 채팅", send: "보내기", type_message: "메시지 입력...",
    language: "언어", save: "저장", actions: "작업",
    feedback: "피드백", accept_escrow: "에스크로 수락", decline_escrow: "에스크로 거절",
    save_settings: "설정 저장", signup_link: "가입 링크", fee_percentage: "수수료 (%)",
    escrow_history: "거래 내역", export_csv: "CSV 내보내기", send_reset: "재설정 링크 보내기",
    total_trades: "총 거래", member_since: "가입일",
    forgot_password: "비밀번호 찾기", reset_password: "비밀번호 재설정",
    telegram_username: "텔레그램 사용자명", counterpart: "상대방 사용자명",
    change_password: "비밀번호 변경", new_password: "새 비밀번호", current_password: "현재 비밀번호",
    display_name: "표시 이름", profile_settings: "프로필 설정",
    reset_via_bot: "텔레그램 봇으로 재설정", delivery_details: "배달 세부정보",
    release_section: "배달 및 릴리스", funds_available: "자금 사용 가능",
  },
  fr: {
    dashboard: "Tableau de bord", my_escrows: "Mes séquestres", disputes: "Litiges", settings: "Paramètres",
    login: "Connexion", signup: "Inscription", email: "Email", password: "Mot de passe",
    create_escrow: "Créer un séquestre", buyer: "Acheteur", seller: "Vendeur",
    amount: "Montant", title: "Titre", status: "Statut", accept: "Accepter",
    confirm: "Confirmer", cancel: "Annuler", sign_out: "Déconnexion",
    language: "Langue", save: "Enregistrer", actions: "Actions",
    change_password: "Changer le mot de passe", display_name: "Nom d'affichage",
    profile_settings: "Paramètres du profil", reset_via_bot: "Réinitialiser via Telegram Bot",
  },
  es: {
    dashboard: "Panel", my_escrows: "Mis depósitos", disputes: "Disputas", settings: "Ajustes",
    login: "Iniciar sesión", signup: "Registrarse", email: "Correo", password: "Contraseña",
    create_escrow: "Crear depósito", buyer: "Comprador", seller: "Vendedor",
    amount: "Cantidad", title: "Título", status: "Estado", accept: "Aceptar",
    confirm: "Confirmar", cancel: "Cancelar", sign_out: "Cerrar sesión",
    language: "Idioma", save: "Guardar", actions: "Acciones",
    change_password: "Cambiar contraseña", display_name: "Nombre para mostrar",
    profile_settings: "Configuración del perfil", reset_via_bot: "Restablecer via Telegram Bot",
  },
  ar: {
    dashboard: "لوحة القيادة", my_escrows: "ضماناتي", disputes: "النزاعات", settings: "الإعدادات",
    login: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور",
    create_escrow: "إنشاء ضمان", buyer: "المشتري", seller: "البائع",
    amount: "المبلغ", title: "العنوان", status: "الحالة", accept: "قبول",
    confirm: "تأكيد", cancel: "إلغاء", sign_out: "تسجيل الخروج",
    language: "اللغة", save: "حفظ", change_password: "تغيير كلمة المرور",
    display_name: "الاسم المعروض", profile_settings: "إعدادات الملف الشخصي",
  },
  pt: {
    dashboard: "Painel", my_escrows: "Meus depósitos", login: "Entrar", signup: "Cadastrar",
    email: "Email", password: "Senha", buyer: "Comprador", seller: "Vendedor",
    amount: "Valor", title: "Título", status: "Status", sign_out: "Sair",
    language: "Idioma", save: "Salvar", change_password: "Alterar senha",
    display_name: "Nome de exibição", profile_settings: "Configurações do perfil",
  },
};

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

export function t(key: string, lang: string = "en"): string {
  return translations[lang]?.[key] || translations.en?.[key] || key;
}

export function getUserLanguage(): string {
  const saved = localStorage.getItem("app_language");
  if (saved) return saved;
  const browserLang = navigator.language?.split("-")[0] || "en";
  const supported = LANGUAGES.map((l) => l.code);
  if (supported.includes(browserLang)) return browserLang;
  return "en";
}

export function setUserLanguage(lang: string) {
  localStorage.setItem("app_language", lang);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
}

export function useLanguage() {
  const [lang, setLang] = useState(() => getUserLanguage());

  useEffect(() => {
    const syncLanguage = () => setLang(getUserLanguage());
    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    window.addEventListener("storage", syncLanguage);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  return { lang };
}

export function normalizeExternalUrl(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^tg:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed) || /^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
