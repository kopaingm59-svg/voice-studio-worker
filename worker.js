// ===========================================================================
// Cloudflare Worker - Ko Paing AI Voice Studio (Backend + Frontend)
// (D1 Database Edition - Firebase removed)
// ===========================================================================

const ADMIN_TELEGRAM_USERNAME = 'kopaing209'; // @ မထည့်ပါနှင့်
const TELEGRAM_BOT_USERNAME = 'kopaingvcabot'; // Referral link (t.me/<username>?startapp=CODE) တည်ဆောက်ဖို့ Bot Username ကို ဒီမှာပြောင်းထည့်ပါ — @ မထည့်ပါနှင့်

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (!env.DB) {
        throw new Error('D1 Database binding "DB" ကို wrangler.toml ထဲမှာ မတွေ့ပါ။');
      }

      // ---- Pages -----------------------------------------------------
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return html(getLandingHtml());
      }
      if (url.pathname === '/admin') {
        return html(getAdminDashboardHtml());
      }
      if (url.pathname === '/studio') {
        return html(getStudioHtml());
      }
      if (url.pathname === '/plans') {
        return html(getPlansHtml());
      }
      if (url.pathname === '/profile') {
        return html(getProfileHtml());
      }
      if (url.pathname === '/api-docs') {
        return html(getApiDocsHtml());
      }
      if (url.pathname === '/privacy') {
        return html(getPrivacyHtml());
      }

      // ---- API ---------------------------------------------------------
      if (url.pathname === '/api/auth/telegram' && request.method === 'POST') {
        return await handleTelegramAuth(request, env, corsHeaders);
      }
      if (url.pathname === '/api/auth/admin' && request.method === 'POST') {
        return await handleAdminAuth(request, env, corsHeaders);
      }
      if (url.pathname === '/api/user/sync' && request.method === 'POST') {
        return await handleUserSync(request, env, corsHeaders);
      }
      if (url.pathname === '/api/user/get' && request.method === 'POST') {
        return await handleUserGet(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/users' && request.method === 'POST') {
        return await handleAdminListUsers(request, env, corsHeaders);
      }
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleGenerateStart(request, env, corsHeaders);
      }
      if (url.pathname === '/api/generate/status' && request.method === 'POST') {
        return await handleGenerateStatus(request, env, corsHeaders);
      }

      // ---- Plans (public) ----------------------------------------------
      if (url.pathname === '/api/plans/list' && request.method === 'POST') {
        return await handlePlansList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/payment-methods/list' && request.method === 'POST') {
        return await handlePaymentMethodsList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/purchase/submit' && request.method === 'POST') {
        return await handlePurchaseSubmit(request, env, corsHeaders);
      }
      if (url.pathname === '/api/generate/save-audio' && request.method === 'POST') {
        return await handleSaveAudio(request, env, corsHeaders);
      }
      if (url.pathname === '/api/generate/send-telegram' && request.method === 'POST') {
        return await handleSendTelegramAudio(request, env, corsHeaders);
      }
      if (url.pathname.startsWith('/api/audio/') && request.method === 'GET') {
        return await handleAudioDownload(url.pathname.split('/').pop(), env, corsHeaders);
      }

      // ---- Admin: Plans --------------------------------------------------
      if (url.pathname === '/api/admin/plans/list' && request.method === 'POST') {
        return await handleAdminPlansList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/plans/create' && request.method === 'POST') {
        return await handleAdminPlanCreate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/plans/update' && request.method === 'POST') {
        return await handleAdminPlanUpdate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/plans/delete' && request.method === 'POST') {
        return await handleAdminPlanDelete(request, env, corsHeaders);
      }

      // ---- Admin: Payment Methods -----------------------------------------
      if (url.pathname === '/api/admin/payment-methods/list' && request.method === 'POST') {
        return await handleAdminPaymentMethodsList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/payment-methods/create' && request.method === 'POST') {
        return await handleAdminPaymentMethodCreate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/payment-methods/update' && request.method === 'POST') {
        return await handleAdminPaymentMethodUpdate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/payment-methods/delete' && request.method === 'POST') {
        return await handleAdminPaymentMethodDelete(request, env, corsHeaders);
      }

      // ---- Admin: Settings (Signup Bonus + Payment Setup) ----------------
      if (url.pathname === '/api/admin/settings/get' && request.method === 'POST') {
        return await handleAdminSettingsGet(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/settings/update' && request.method === 'POST') {
        return await handleAdminSettingsUpdate(request, env, corsHeaders);
      }

      // ---- Admin: Users (Ban / Unban) -------------------------------------
      if (url.pathname === '/api/admin/users/ban' && request.method === 'POST') {
        return await handleAdminBanUser(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/users/credits' && request.method === 'POST') {
        return await handleAdminAdjustCredits(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/requests/list' && request.method === 'POST') {
        return await handleAdminRequestsList(request, env, corsHeaders);
      }

      // ---- Admin: Voice Presets (pre-uploaded named voices) ---------------
      if (url.pathname === '/api/admin/voice-presets/list' && request.method === 'POST') {
        return await handleAdminVoicePresetsList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/voice-presets/create' && request.method === 'POST') {
        return await handleAdminVoicePresetCreate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/voice-presets/delete' && request.method === 'POST') {
        return await handleAdminVoicePresetDelete(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/voice-presets/get' && request.method === 'POST') {
        return await handleAdminVoicePresetGet(request, env, corsHeaders);
      }

      // ---- Admin: Purchase Approvals --------------------------------------
      if (url.pathname === '/api/admin/purchases/list' && request.method === 'POST') {
        return await handleAdminPurchasesList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/purchases/review' && request.method === 'POST') {
        return await handleAdminPurchaseReview(request, env, corsHeaders);
      }

      // ---- Admin: Notify User (Telegram) -----------------------------------
      if (url.pathname === '/api/admin/notify-user' && request.method === 'POST') {
        return await handleAdminNotifyUser(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/broadcast' && request.method === 'POST') {
        return await handleAdminBroadcast(request, env, corsHeaders);
      }

      // ---- Profile / Referral / API Key -----------------------------------
      if (url.pathname === '/api/profile/get' && request.method === 'POST') {
        return await handleProfileGet(request, env, corsHeaders);
      }
      if (url.pathname === '/api/profile/requests' && request.method === 'POST') {
        return await handleProfileRequestsList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/profile/api-key/generate' && request.method === 'POST') {
        return await handleApiKeyGenerate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/profile/api-key/revoke' && request.method === 'POST') {
        return await handleApiKeyRevoke(request, env, corsHeaders);
      }

      // ---- Public: Voice Presets list (for Studio dropdown) ---------------
      if (url.pathname === '/api/voice-presets/list' && request.method === 'POST') {
        return await handleVoicePresetsList(request, env, corsHeaders);
      }

      // ---- Public API (v1) for external site/app integration via API Key --
      if (url.pathname === '/api/v1/generate' && request.method === 'POST') {
        return await handleApiV1Generate(request, env, corsHeaders);
      }
      if (url.pathname === '/api/v1/generate/status' && request.method === 'POST') {
        return await handleApiV1GenerateStatus(request, env, corsHeaders);
      }

      return json({ error: 'Not Found' }, 404, corsHeaders);
    } catch (err) {
      console.error('Worker Request Error:', err);
      return json({ error: err.message || 'Internal Error' }, 500, corsHeaders);
    }
  },
};

// ===========================================================================
// Small response helpers
// ===========================================================================

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(corsHeaders || {}) },
  });
}

function html(body) {
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ===========================================================================
// D1 Database Helper (Firebase အစားထိုး)
// ===========================================================================

async function upsertUser(env, userId, { name, username, credits, isAdmin } = {}) {
  await env.DB.prepare(
    `INSERT INTO users (id, name, username, credits, is_admin, updated_at)
     VALUES (?1, ?2, ?3, COALESCE(?4, 0), ?5, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = COALESCE(?2, users.name),
       username = COALESCE(?3, users.username),
       credits = COALESCE(?4, users.credits, 0),
       is_admin = COALESCE(?5, users.is_admin),
       updated_at = datetime('now')`
  )
    .bind(
      String(userId),
      name ?? null,
      username ?? null,
      credits !== undefined ? credits : null,
      isAdmin !== undefined ? (isAdmin ? 1 : 0) : null
    )
    .run();
}

async function getSetting(env, key, defaultValue) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first();
  return row ? row.value : defaultValue;
}

// ---- Telegram messaging helpers --------------------------------------------
// Bot Token ရှိထားပြီး user/admin က bot ကို chat စတင်ထားသူဖြစ်မှသာ (chat_id သိထားမှသာ)
// message ပို့နိုင်ပါသည် — ဒါကြောင့် Mini App ကနေ login ဝင်ဖူးသူများသာ ပို့နိုင်ပါမည်။

// Telegram sendMessage ကို parse_mode 'HTML' နဲ့ ခေါ်နေတာမို့ user-controlled text (name/username)
// ကို message ထဲ ထည့်ရင် HTML tag အဖြစ် အလုပ်လုပ်နိုင်ပါတယ် (ဥပမာ <a href> link spoof) — ဒါကြောင့်
// admin ဆီ ပို့တဲ့ notification ထဲမှာ user-controlled name/username ကို ဒီ function နဲ့ escape လုပ်ရမည်
function escapeTelegramHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}

async function sendTelegramMessage(env, chatId, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !chatId) {
    return { ok: false, description: 'Telegram bot token (သို့) chat id မရှိပါ' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = await res.json();
    return { ok: !!data.ok, description: data.description };
  } catch (e) {
    return { ok: false, description: e && e.message ? e.message : String(e) };
  }
}

// Admin အဖြစ် မှတ်ထားတဲ့ user (users.is_admin = 1) ကို Telegram message ပို့သည်
// — Plan ဝယ်တာလို event တွေမှာ Admin ကို notify ဖို့ သုံးမည် (fail ဖြစ်လည်း main flow ကို မထိခိုက်စေရန်
// error ကို ဆွဲမထားပါ)
async function notifyAdminTelegram(env, text) {
  try {
    const admin = await env.DB.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').first();
    if (admin && admin.id) {
      await sendTelegramMessage(env, admin.id, text);
    }
  } catch (e) {
    // Admin notify fail ဖြစ်လည်း user-facing flow ကို လုံးဝ မထိခိုက်စေရန် swallow လုပ်မည်
  }
}

async function setSetting(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = ?2`
  )
    .bind(key, value)
    .run();
}

// ---- Admin session tokens ---------------------------------------------------
// SESSION_SECRET ကို client ဆီ တိုက်ရိုက် မပေးတော့ပါ (ပေးလိုက်ရင် ထာဝရ skeleton-key
// တစ်ခု ဖြစ်သွားမှာမို့ပါ)။ အစား သက်တမ်း (expiry) ပါတဲ့ signed token ကို ထုတ်ပေးပြီး
// login တိုင်း အသစ်ပြန်ရမည်၊ သက်တမ်းကုန်ရင် ပြန် login ဝင်ရမည်ဖြစ်သည်။
const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createAdminToken(env) {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_TOKEN_TTL_SECONDS;
  const payload = `admin.${expires}`;
  const sig = await hmacHex(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

async function requireAdmin(env, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const [tag, expiresStr, sig] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!expires || Math.floor(Date.now() / 1000) > expires) return false;
  const expectedSig = await hmacHex(env.SESSION_SECRET, `${tag}.${expiresStr}`);
  return constantTimeEqual(expectedSig, sig);
}

// ---- Request logs: tracks each generate call so users/admins can see
// exactly what happened to a request (queued/completed/failed, credits used) ----

async function logRequestStart(env, { userId, jobId, source, textLength }) {
  try {
    await env.DB.prepare(
      `INSERT INTO request_logs (user_id, job_id, source, text_length, status, credits_charged, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'IN_QUEUE', 0, datetime('now'), datetime('now'))`
    )
      .bind(String(userId), String(jobId), source, Number(textLength) || 0)
      .run();
  } catch (e) {
    // request_logs table မရှိသေးရင်တောင် voice generation ကို ဆက်လက် အလုပ်လုပ်စေရန် (မထိခိုက်ရန်)
    console.error('logRequestStart failed', e);
  }
}

async function logRequestUpdate(env, jobId, { status, creditsCharged, errorMessage }) {
  try {
    await env.DB.prepare(
      `UPDATE request_logs SET status = ?1, credits_charged = ?2, error_message = ?3, updated_at = datetime('now') WHERE job_id = ?4`
    )
      .bind(status, Number(creditsCharged) || 0, errorMessage || null, String(jobId))
      .run();
  } catch (e) {
    console.error('logRequestUpdate failed', e);
  }
}

// ---- Referral code + API key helpers --------------------------------------

function generateReferralCodeString() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 0/O/1/I/L ကဲ့သို့ မှားလွယ်တဲ့စာလုံးများ ဖယ်ထားသည်
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

async function generateUniqueReferralCode(env) {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCodeString();
    const exists = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ?1').bind(code).first();
    if (!exists) return code;
  }
  return 'R' + Date.now().toString(36).toUpperCase();
}

function generateApiKeyPlaintext() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return 'kpv_' + hex;
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===========================================================================
// Request Handlers
// ===========================================================================

async function handleTelegramAuth(request, env, corsHeaders) {
  const body = await request.json();
  const { initData, referralCode } = body;

  if (!initData) {
    return json({ error: 'Missing initData' }, 400, corsHeaders);
  }

  const isValid = await verifyTelegramAuth(initData, env.TELEGRAM_BOT_TOKEN, 86400);
  if (!isValid) {
    return json({ error: 'Invalid Telegram authentication' }, 401, corsHeaders);
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));

  // Telegram username ကိုကြည့်ပြီး Admin ဟုတ်/မဟုတ် Auto Detect
  const isAdmin = (user.username || '').toLowerCase() === ADMIN_TELEGRAM_USERNAME;

  const existing = await env.DB.prepare('SELECT id, is_banned, referral_code FROM users WHERE id = ?1')
    .bind(String(user.id))
    .first();

  if (existing && existing.is_banned) {
    return json(
      { error: 'သင့်အကောင့်ကို ပိတ်ထားပါသည်။ Admin ကို ဆက်သွယ်ပါ။' },
      403,
      corsHeaders
    );
  }

  // Signup Bonus: user အသစ်အတွက်သာ Admin သတ်မှတ်ထားတဲ့ bonus credits ကို ပေးမည်
  // Referral: valid referral code ဖြင့် ဝင်ရောက်လာသော user အသစ်အတွက် ထပ်ဆောင်း bonus ပေးမည်
  let initialCredits;
  let referrerRow = null;
  if (!existing) {
    const bonus = await getSetting(env, 'signup_bonus', '0');
    initialCredits = parseInt(bonus, 10) || 0;

    if (referralCode && String(referralCode).trim()) {
      referrerRow = await env.DB.prepare('SELECT id FROM users WHERE referral_code = ?1')
        .bind(String(referralCode).trim().toUpperCase())
        .first();
      if (referrerRow && String(referrerRow.id) === String(user.id)) {
        referrerRow = null; // ကိုယ့်ကိုယ်ကို refer လုပ်တာကို ignore လုပ်မည်
      }
      if (referrerRow) {
        const referredBonus = parseInt(await getSetting(env, 'referral_bonus_referred', '0'), 10) || 0;
        initialCredits += referredBonus;
      }
    }
  }

  await upsertUser(env, user.id, {
    name: user.first_name || user.username || 'User',
    username: user.username || null,
    credits: existing ? undefined : initialCredits,
    isAdmin,
  });

  // Referral code backfill: User အသစ်ဖြစ်ဖြစ်၊ Referral code မရှိသေးတဲ့ User အဟောင်းဖြစ်ဖြစ် ကိုယ်ပိုင် code ထုတ်ပေးမည်
  if (!existing || !existing.referral_code) {
    const myReferralCode = await generateUniqueReferralCode(env);
    await env.DB.prepare(
      `UPDATE users SET referral_code = ?1, referred_by = COALESCE(referred_by, ?2), updated_at = datetime('now') WHERE id = ?3`
    )
      .bind(myReferralCode, referrerRow ? String(referrerRow.id) : null, String(user.id))
      .run();
  }

  // Referrer bonus + referrals history ကတော့ User အသစ်အတွက်သာ (Login ပြန်ဝင်တိုင်း ထပ်ခါထပ်ခါ bonus မပေးမိစေရန်)
  if (!existing && referrerRow) {
    const referrerBonus = parseInt(await getSetting(env, 'referral_bonus_referrer', '0'), 10) || 0;
    const referredBonus = parseInt(await getSetting(env, 'referral_bonus_referred', '0'), 10) || 0;

    if (referrerBonus > 0) {
      await env.DB.prepare(
        `UPDATE users SET credits = COALESCE(credits, 0) + ?1, updated_at = datetime('now') WHERE id = ?2`
      )
        .bind(referrerBonus, String(referrerRow.id))
        .run();
    }

    await env.DB.prepare(
      `INSERT INTO referrals (referrer_id, referred_id, referrer_bonus, referred_bonus, created_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'))`
    )
      .bind(String(referrerRow.id), String(user.id), referrerBonus, referredBonus)
      .run();
  }

  return json(
    { success: true, user: { ...user, isAdmin }, token: isAdmin ? await createAdminToken(env) : null },
    200,
    corsHeaders
  );
}

// ---- Admin login brute-force protection ------------------------------------
// Admin password ကို script နဲ့ ဆက်တိုက် guess လုပ်နိုင်တာကို ကာကွယ်ရန် — IP တစ်ခုက
// short window ထဲမှာ fail ဖြစ်တာ အကြိမ်များနေရင် ခဏ block ထားမည် (table ကို
// လိုအပ်ရင် အလိုအလျောက် create လုပ်ပေးမည်၊ manual migration မလိုပါ)
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_WINDOW_SECONDS = 300; // 5 minutes

async function ensureAdminAttemptsTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS admin_login_attempts (ip TEXT NOT NULL, attempted_at TEXT NOT NULL)`
  ).run();
}

async function isAdminLoginLocked(env, ip) {
  try {
    await ensureAdminAttemptsTable(env);
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM admin_login_attempts WHERE ip = ?1 AND attempted_at > datetime('now', ?2)`
    )
      .bind(ip, `-${ADMIN_LOGIN_WINDOW_SECONDS} seconds`)
      .first();
    return (row ? Number(row.cnt) : 0) >= ADMIN_LOGIN_MAX_ATTEMPTS;
  } catch (e) {
    return false; // logging ကျရင် login ကို လုံးဝ ပိတ်မထားစေရန်
  }
}

async function recordAdminLoginFailure(env, ip) {
  try {
    await ensureAdminAttemptsTable(env);
    await env.DB.prepare(`INSERT INTO admin_login_attempts (ip, attempted_at) VALUES (?1, datetime('now'))`)
      .bind(ip)
      .run();
  } catch (e) {
    // ignore
  }
}

// ---- Per-user generate rate limit -------------------------------------------
// hacker (သို့) user ကိုယ်တိုင်က script နဲ့ /api/generate ကို ဆက်တိုက် spam ခေါ်ပြီး
// RunPod ကုန်ကျစရိတ်တက်စေခြင်း/ server overload ဖြစ်စေခြင်းကို ကာကွယ်ရန်
const GENERATE_RATE_LIMIT = 100;
const GENERATE_RATE_WINDOW_SECONDS = 60;

async function isGenerateRateLimited(env, userId) {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM request_logs WHERE user_id = ?1 AND created_at > datetime('now', ?2)`
    )
      .bind(userId, `-${GENERATE_RATE_WINDOW_SECONDS} seconds`)
      .first();
    return (row ? Number(row.cnt) : 0) >= GENERATE_RATE_LIMIT;
  } catch (e) {
    return false; // request_logs မရှိသေးရင်တောင် voice generation ကို ဆက်လက်အလုပ်လုပ်စေရန်
  }
}

async function handleAdminAuth(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { password } = body;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (await isAdminLoginLocked(env, ip)) {
    return json({ error: 'ကြိမ်ဖန်များစွာ မှားနေပါသည် — ၅ မိနစ်ခန့် စောင့်ပြီးမှ ထပ်ကြိုးစားပါ' }, 429, corsHeaders);
  }

  if (!password || !constantTimeEqual(String(password), String(env.ADMIN_SECRET || ''))) {
    await recordAdminLoginFailure(env, ip);
    return json({ error: 'Invalid Password' }, 401, corsHeaders);
  }

  return json({ success: true, token: await createAdminToken(env) }, 200, corsHeaders);
}

// SECURITY NOTE: ဒီ endpoint ကို frontend ဘယ်နေရာကမှ မခေါ်တော့ပါ။ ယခင်က auth
// စစ်ဆေးမှု လုံးဝမရှိဘဲ client က ပို့လိုက်တဲ့ userId + credits ကို တိုက်ရိုက် DB ထဲ
// ရေးခွင့်ပေးခဲ့တာ hacker တစ်ယောက်က ကိုယ့် credits ကို ကန့်သတ်မရှိ တိုးနိုင်တဲ့
// အလွန်အန္တရာယ်ကြီးတဲ့ ပေါက်ကြားမှုတစ်ခု ဖြစ်ခဲ့ပါတယ်။ Telegram initData verify
// လုပ်ပြီး ကိုယ်ပိုင် account ရဲ့ "name" ကိုသာ update ခွင့်ပြု၍ credits ကို client
// ဘက်ကနေ ဘယ်လိုနည်းနဲ့မှ မပြောင်းလဲနိုင်တော့အောင် ပြင်ဆင်ထားပါသည်.
async function handleUserSync(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData, userData } = body;

  const verifiedUserId = await getVerifiedTelegramUserId(initData, env);
  if (!verifiedUserId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  // credits ကို ဒီနေရာကနေ ဘယ်တော့မှ လက်ခံမည်မဟုတ်ပါ — credits ပြောင်းလဲမှုအားလုံးကို
  // server-side logic (signup bonus, referral bonus, generate ကုန်ကျစရိတ်, admin adjust)
  // ကနေသာ ချုပ်ကိုင်ပါသည်။
  await upsertUser(env, verifiedUserId, {
    name: userData?.name,
  });

  return json({ success: true }, 200, corsHeaders);
}

async function handleUserGet(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData } = body;

  const verifiedUserId = await getVerifiedTelegramUserId(initData, env);
  if (!verifiedUserId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  // client က ပို့လိုက်တဲ့ userId ကို လုံးဝ မယုံပါ — initData ထဲက verify ပြီးသား id ကိုသာ
  // သုံးပြီး ကိုယ်ပိုင် account ဒေတာကိုသာ ပြန်ပေးပါသည် (တခြားသူ့ account ကို ကြည့်လို့မရအောင်)
  const row = await env.DB.prepare(
    'SELECT id, name, username, credits, is_admin FROM users WHERE id = ?1'
  )
    .bind(verifiedUserId)
    .first();

  return json({ success: true, user: row || null }, 200, corsHeaders);
}

async function handleAdminListUsers(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const token = body.token || (request.headers.get('Authorization') || '').replace('Bearer ', '');

  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { results } = await env.DB.prepare(
    'SELECT id, name, username, credits, is_admin, is_banned, updated_at FROM users ORDER BY updated_at DESC LIMIT 500'
  ).all();

  return json({ success: true, users: results }, 200, corsHeaders);
}

// ---- Admin: Ban / Unban ---------------------------------------------------

async function handleAdminBanUser(request, env, corsHeaders) {
  const body = await request.json();
  const { token, userId, banned } = body;

  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `UPDATE users SET is_banned = ?1, updated_at = datetime('now') WHERE id = ?2`
  )
    .bind(banned ? 1 : 0, String(userId))
    .run();

  return json({ success: true }, 200, corsHeaders);
}

// ---- Admin: Adjust a single user's credits (top-up) -----------------------

async function handleAdminAdjustCredits(request, env, corsHeaders) {
  const body = await request.json();
  const { token, userId, amount } = body;

  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }
  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta === 0) {
    return json({ error: 'Amount ကို ဂဏန်းအနေနဲ့ ထည့်ပေးပါ (0 မဖြစ်ရပါ)' }, 400, corsHeaders);
  }

  const existing = await env.DB.prepare('SELECT id, credits FROM users WHERE id = ?1')
    .bind(String(userId))
    .first();
  if (!existing) {
    return json({ error: 'User မတွေ့ပါ' }, 404, corsHeaders);
  }

  const newCredits = Math.max(Number(existing.credits || 0) + delta, 0);
  await env.DB.prepare(
    `UPDATE users SET credits = ?1, updated_at = datetime('now') WHERE id = ?2`
  )
    .bind(newCredits, String(userId))
    .run();

  return json({ success: true, credits: newCredits }, 200, corsHeaders);
}

// ---- Admin: Request logs (view any/all users' generate history) -----------

async function handleAdminRequestsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, userId } = body;

  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  try {
    let query, binding;
    if (userId) {
      query = `SELECT r.job_id, r.user_id, r.source, r.text_length, r.status, r.credits_charged, r.error_message, r.created_at,
                      u.name as user_name, u.username as user_username
               FROM request_logs r LEFT JOIN users u ON u.id = r.user_id
               WHERE r.user_id = ?1 ORDER BY r.created_at DESC LIMIT 200`;
      binding = String(userId);
    } else {
      query = `SELECT r.job_id, r.user_id, r.source, r.text_length, r.status, r.credits_charged, r.error_message, r.created_at,
                      u.name as user_name, u.username as user_username
               FROM request_logs r LEFT JOIN users u ON u.id = r.user_id
               ORDER BY r.created_at DESC LIMIT 200`;
    }
    const stmt = binding ? env.DB.prepare(query).bind(binding) : env.DB.prepare(query);
    const { results } = await stmt.all();

    return json({ success: true, requests: results }, 200, corsHeaders);
  } catch (e) {
    return json({ error: 'request_logs table မရှိသေးပါ — အောက်က migration SQL ကို D1 database မှာ run ပေးပါ' }, 500, corsHeaders);
  }
}

// ---- Voice Presets: Admin uploads a named reference voice (e.g. "Audio Book"),
// users pick it from the Studio dropdown instead of uploading their own sample. ----

async function handleAdminVoicePresetsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, prompt_text, created_at FROM voice_presets ORDER BY created_at DESC`
    ).all();
    return json({ success: true, presets: results }, 200, corsHeaders);
  } catch (e) {
    return json({ error: 'DB error: ' + (e && e.message ? e.message : String(e)) }, 500, corsHeaders);
  }
}

async function handleAdminVoicePresetGet(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, id } = body;
  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!id) {
    return json({ error: 'Missing id' }, 400, corsHeaders);
  }
  const preset = await env.DB.prepare(
    `SELECT id, name, audio_base64, prompt_text FROM voice_presets WHERE id = ?1`
  ).bind(Number(id)).first();
  if (!preset) {
    return json({ error: 'Preset မတွေ့ပါ' }, 404, corsHeaders);
  }
  return json({ success: true, preset }, 200, corsHeaders);
}

async function handleAdminVoicePresetCreate(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, name, audioBase64, promptText } = body;
  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!name || !name.trim()) {
    return json({ error: 'Voice name လိုအပ်ပါသည် (ဥပမာ - Audio Book)' }, 400, corsHeaders);
  }
  if (!audioBase64) {
    return json({ error: 'Audio file လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  // D1 (Cloudflare) ရဲ့ string/blob/row hard limit က 2,000,000 bytes (2MB) ပါ — အရင်က
  // ဒီနေရာမှာ 4,000,000 အထိ ခွင့်ပြုထားလို့ 2MB~4MB ကြားရှိတဲ့ audio တွေက ဒီ check ကို
  // ဖြတ်ပေမယ့် DB ကနေ "SQLITE_TOOBIG" နဲ့ fail ဖြစ်ခဲ့တာ ဖြစ်ပါတယ်။ name/prompt_text
  // column တွေအတွက်ပါ နေရာချန်ထားရန် D1 limit အောက်မှာ ကောင်းကောင်း ရှောင်ထားသည့် ceiling
  // ချထားပါသည် (~1.8MB base64 ≈ ~1.35MB actual audio)။
  if (audioBase64.length > 1_800_000) {
    return json({ error: 'Audio file အရွယ်အစား ကြီးလွန်းပါသည် — စက္ကန့်အနည်းငယ်ရှိတဲ့ file တို လေး တစ်ခု သုံးပေးပါ' }, 400, corsHeaders);
  }
  const presetAudioBytes = safeDecodeBase64(audioBase64, 1_800_000);
  if (!presetAudioBytes || !looksLikeAudio(presetAudioBytes)) {
    return json({ error: 'Audio format ကို မှတ်မိပါ — .wav/.mp3/.ogg/.m4a/.flac file ဖြစ်ရပါမည်' }, 400, corsHeaders);
  }

  try {
    const result = await env.DB.prepare(
      `INSERT INTO voice_presets (name, audio_base64, prompt_text, created_at, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))`
    )
      .bind(name.trim(), audioBase64, promptText ? promptText.trim() : null)
      .run();

    return json({ success: true, id: result.meta.last_row_id }, 200, corsHeaders);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (msg.includes('TOOBIG')) {
      return json({ error: 'Audio file အရွယ်အစား ကြီးလွန်းပါသည် — စက္ကန့်အနည်းငယ်ရှိတဲ့ file တို လေး တစ်ခု သုံးပေးပါ' }, 400, corsHeaders);
    }
    return json({ error: 'DB error: ' + msg }, 500, corsHeaders);
  }
}

async function handleAdminVoicePresetDelete(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, id } = body;
  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!id) {
    return json({ error: 'Missing id' }, 400, corsHeaders);
  }
  await env.DB.prepare(`DELETE FROM voice_presets WHERE id = ?1`).bind(Number(id)).run();
  return json({ success: true }, 200, corsHeaders);
}

async function handleVoicePresetsList(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name FROM voice_presets ORDER BY name ASC`
    ).all();
    return json({ success: true, presets: results }, 200, corsHeaders);
  } catch (e) {
    // table မရှိသေးရင် Studio ကို ဘာမှ မထိခိုက်ဘဲ empty list ပြန်ပေးမည်
    return json({ success: true, presets: [] }, 200, corsHeaders);
  }
}

// ---- Plans: Public ---------------------------------------------------------

async function handlePlansList(request, env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, price, price_th, credits, bonus_credits, description FROM plans WHERE is_active = 1 ORDER BY credits ASC'
  ).all();

  return json({ success: true, plans: results }, 200, corsHeaders);
}

async function handlePaymentMethodsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const country = body.country === 'TH' ? 'TH' : 'MM';

  const { results } = await env.DB.prepare(
    'SELECT id, method, account_name, account_number, note, country FROM payment_methods WHERE is_active = 1 AND country = ?1 ORDER BY id ASC'
  )
    .bind(country)
    .all();

  return json({ success: true, methods: results }, 200, corsHeaders);
}

// ---- Plans: Admin CRUD -------------------------------------------------

async function handleAdminPlansList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { results } = await env.DB.prepare('SELECT * FROM plans ORDER BY id ASC').all();
  return json({ success: true, plans: results }, 200, corsHeaders);
}

async function handleAdminPlanCreate(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { name, price, priceTh, credits, bonusCredits, description } = body;
  if (!name || !credits) {
    return json({ error: 'Plan name and credits လိုအပ်ပါသည်' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `INSERT INTO plans (name, price, price_th, credits, bonus_credits, description, is_active, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, datetime('now'))`
  )
    .bind(name, price || '', priceTh || '', Number(credits), Number(bonusCredits) || 0, description || '')
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPlanUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id, name, price, priceTh, credits, bonusCredits, description, is_active } = body;
  if (!id) {
    return json({ error: 'Missing plan id' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `UPDATE plans SET
       name = COALESCE(?2, name),
       price = COALESCE(?3, price),
       price_th = COALESCE(?4, price_th),
       credits = COALESCE(?5, credits),
       bonus_credits = COALESCE(?6, bonus_credits),
       description = COALESCE(?7, description),
       is_active = COALESCE(?8, is_active),
       updated_at = datetime('now')
     WHERE id = ?1`
  )
    .bind(
      id,
      name ?? null,
      price ?? null,
      priceTh ?? null,
      credits !== undefined ? Number(credits) : null,
      bonusCredits !== undefined ? Number(bonusCredits) : null,
      description ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null
    )
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPlanDelete(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id } = body;
  if (!id) {
    return json({ error: 'Missing plan id' }, 400, corsHeaders);
  }

  await env.DB.prepare('DELETE FROM plans WHERE id = ?1').bind(id).run();
  return json({ success: true }, 200, corsHeaders);
}

// ---- Settings: Signup Bonus + Payment Setup -----------------------------

async function handleAdminSettingsGet(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const signupBonus = await getSetting(env, 'signup_bonus', '0');
  const referralBonusReferrer = await getSetting(env, 'referral_bonus_referrer', '0');
  const referralBonusReferred = await getSetting(env, 'referral_bonus_referred', '0');
  return json(
    {
      success: true,
      signupBonus: parseInt(signupBonus, 10) || 0,
      referralBonusReferrer: parseInt(referralBonusReferrer, 10) || 0,
      referralBonusReferred: parseInt(referralBonusReferred, 10) || 0,
    },
    200,
    corsHeaders
  );
}

async function handleAdminSettingsUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  if (body.signupBonus !== undefined) {
    await setSetting(env, 'signup_bonus', String(parseInt(body.signupBonus, 10) || 0));
  }
  if (body.referralBonusReferrer !== undefined) {
    await setSetting(env, 'referral_bonus_referrer', String(parseInt(body.referralBonusReferrer, 10) || 0));
  }
  if (body.referralBonusReferred !== undefined) {
    await setSetting(env, 'referral_bonus_referred', String(parseInt(body.referralBonusReferred, 10) || 0));
  }

  return json({ success: true }, 200, corsHeaders);
}

// ---- Payment Methods: Admin CRUD -----------------------------------------

async function handleAdminPaymentMethodsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { results } = await env.DB.prepare('SELECT * FROM payment_methods ORDER BY id ASC').all();
  return json({ success: true, methods: results }, 200, corsHeaders);
}

async function handleAdminPaymentMethodCreate(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { method, accountName, accountNumber, note, country } = body;
  if (!method) {
    return json({ error: 'Payment method name လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  const countryCode = country === 'TH' ? 'TH' : 'MM';

  await env.DB.prepare(
    `INSERT INTO payment_methods (method, account_name, account_number, note, country, is_active, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'))`
  )
    .bind(method, accountName || '', accountNumber || '', note || '', countryCode)
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPaymentMethodUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id, method, accountName, accountNumber, note, is_active, country } = body;
  if (!id) {
    return json({ error: 'Missing payment method id' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `UPDATE payment_methods SET
       method = COALESCE(?2, method),
       account_name = COALESCE(?3, account_name),
       account_number = COALESCE(?4, account_number),
       note = COALESCE(?5, note),
       is_active = COALESCE(?6, is_active),
       country = COALESCE(?7, country),
       updated_at = datetime('now')
     WHERE id = ?1`
  )
    .bind(
      id,
      method ?? null,
      accountName ?? null,
      accountNumber ?? null,
      note ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      country === 'TH' || country === 'MM' ? country : null
    )
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPaymentMethodDelete(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id } = body;
  if (!id) {
    return json({ error: 'Missing payment method id' }, 400, corsHeaders);
  }

  await env.DB.prepare('DELETE FROM payment_methods WHERE id = ?1').bind(id).run();
  return json({ success: true }, 200, corsHeaders);
}

// ---- Purchases: Submit (User) + Approve/Reject (Admin) ----------------

async function handlePurchaseSubmit(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData, planId, slipImageBase64 } = body;

  // login ဝင်ထားသူ ကိုယ်တိုင်ရဲ့ account အတွက်သာ purchase တင်ခွင့်ပြုပါသည် — client ပို့လိုက်တဲ့
  // userId ကို မယုံပါက တခြားသူ့ account နာမည်ဖြင့် fake purchase spam တင်ခြင်းကို ကာကွယ်နိုင်ပါသည်
  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!planId || !slipImageBase64) {
    return json({ error: 'planId, slip image လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  // D1 (Cloudflare SQLite) မှာ column/parameter တစ်ခုစီအတွက် သိမ်းနိုင်တဲ့ size limit
  // ရှိပါတယ် — ဒါထက်ကျော်ရင် "SQLITE_TOOBIG" error နဲ့ insert မအောင်မြင်ပါ။ ဒါကြောင့်
  // frontend က resize/compress လုပ်ပြီးသားပေမယ့် server ဘက်ကလည်း အတည်ပြု စစ်ဆေးထားသည်
  if (slipImageBase64.length > 1_400_000) {
    return json(
      { error: 'Slip image ဖိုင် size သိပ်ကြီးလွန်းပါသည် — ပုံ ပိုသေးအောင် (screenshot/compress) ပြန်ရိုက်ပြီး ထပ်တင်ပေးပါ' },
      413,
      corsHeaders
    );
  }
  // frontend က FileReader.readAsDataURL() ရလဒ် (data:image/...;base64,xxxx ပုံစံ) တစ်ခုလုံးကို
  // တိုက်ရိုက်ပို့ထားလို့ — magic-byte စစ်ရာမှာ prefix ကို ဖယ်ပြီးမှသာ decode လုပ်ရမည်
  // (DB ထဲ သိမ်းမည့်တန်ဖိုးကတော့ admin dashboard က <img src="..."> အနေနဲ့ တိုက်ရိုက်သုံးနေလို့
  // client ပို့လိုက်တဲ့ အတိုင်း full data URI ကိုပဲ မပြောင်းလဲဘဲ ဆက်သိမ်းမည်)
  const rawSlipBase64 = slipImageBase64.includes(',') ? slipImageBase64.split(',')[1] : slipImageBase64;
  const slipBytes = safeDecodeBase64(rawSlipBase64, 1_400_000);
  if (!slipBytes) {
    return json({ error: 'Slip image သိပ်ကြီးလွန်း (သို့) ပျက်နေပါသည်' }, 413, corsHeaders);
  }
  if (!looksLikeImage(slipBytes)) {
    return json({ error: 'Slip image format မှားနေပါသည် (JPEG/PNG/WEBP ဖြစ်ရပါမည်)' }, 400, corsHeaders);
  }

  const plan = await env.DB.prepare('SELECT * FROM plans WHERE id = ?1 AND is_active = 1')
    .bind(planId)
    .first();
  if (!plan) {
    return json({ error: 'Plan not found' }, 404, corsHeaders);
  }

  await env.DB.prepare(
    `INSERT INTO purchases (user_id, plan_id, plan_name, credits, price, slip_image, status, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', datetime('now'))`
  )
    .bind(String(userId), plan.id, plan.name, plan.credits, plan.price, slipImageBase64)
    .run();

  // User က Plan ဝယ်တဲ့အချိန် Admin ကို Telegram ဖြင့် အသိပေးမည် (fail ဖြစ်လည်း purchase flow ကို
  // မထိခိုက်စေရန် notifyAdminTelegram ထဲမှာ error ကို ကိုင်တွယ်ထားပါသည်)
  const buyerRow = await env.DB.prepare('SELECT name, username FROM users WHERE id = ?1')
    .bind(String(userId))
    .first();
  const buyerLabel = buyerRow
    ? (buyerRow.username ? `${escapeTelegramHtml(buyerRow.name) || 'User'} (@${escapeTelegramHtml(buyerRow.username)})` : (escapeTelegramHtml(buyerRow.name) || 'User'))
    : 'User';
  await notifyAdminTelegram(
    env,
    `🛒 <b>Plan ဝယ်ယူမှု အသစ်</b>\n` +
      `User: ${buyerLabel} (ID: ${userId})\n` +
      `Plan: ${plan.name}\n` +
      `Credits: ${plan.credits}\n` +
      `Price: ${plan.price}\n\n` +
      `Admin panel ကနေ Approve/Reject လုပ်ပေးပါ။`
  );

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPurchasesList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const status = body.status || 'pending';
  const { results } = await env.DB.prepare(
    'SELECT * FROM purchases WHERE status = ?1 ORDER BY created_at DESC LIMIT 100'
  )
    .bind(status)
    .all();

  return json({ success: true, purchases: results }, 200, corsHeaders);
}

async function handleAdminPurchaseReview(request, env, corsHeaders) {
  const body = await request.json();
  if (!(await requireAdmin(env, body.token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { purchaseId, approve } = body;
  if (!purchaseId) {
    return json({ error: 'Missing purchaseId' }, 400, corsHeaders);
  }

  const purchase = await env.DB.prepare('SELECT * FROM purchases WHERE id = ?1')
    .bind(purchaseId)
    .first();
  if (!purchase) {
    return json({ error: 'Purchase not found' }, 404, corsHeaders);
  }
  if (purchase.status !== 'pending') {
    return json({ error: 'ဒီ purchase ကို ပြန်စစ်ပြီးသားဖြစ်ပါသည်' }, 400, corsHeaders);
  }

  if (approve) {
    await env.DB.prepare(
      `UPDATE users SET credits = COALESCE(credits, 0) + ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(purchase.credits, purchase.user_id)
      .run();
    await env.DB.prepare(
      `UPDATE purchases SET status = 'approved', updated_at = datetime('now') WHERE id = ?1`
    )
      .bind(purchaseId)
      .run();
  } else {
    await env.DB.prepare(
      `UPDATE purchases SET status = 'rejected', updated_at = datetime('now') WHERE id = ?1`
    )
      .bind(purchaseId)
      .run();
  }

  return json({ success: true }, 200, corsHeaders);
}

// Server maintenance စတဲ့ အကြောင်းအရာများအတွက် Admin ကနေ user တစ်ယောက်ချင်းစီရဲ့ Telegram
// account ကို တိုက်ရိုက် message ပို့ဖို့ (User Telegram User ID လိုအပ်ပါသည်)
async function handleAdminNotifyUser(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, userId, message } = body;
  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!userId || !String(userId).trim()) {
    return json({ error: 'User Telegram ID လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  if (!message || !message.trim()) {
    return json({ error: 'Message လိုအပ်ပါသည်' }, 400, corsHeaders);
  }

  const result = await sendTelegramMessage(env, String(userId).trim(), message.trim());
  if (!result.ok) {
    return json({ error: result.description || 'Telegram ကို ပို့လို့ မရပါ' }, 500, corsHeaders);
  }
  return json({ success: true }, 200, corsHeaders);
}

// User အားလုံး (banned မဟုတ်သူများ) ကို Telegram ဖြင့် Title + Message (Image ပါ/မပါ) တစ်ခါတည်း
// ပို့ဖို့ — Server ပြုပြင်နေချိန် အသိပေးစာစသည့် broadcast announcement များအတွက်
async function handleAdminBroadcast(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { token, title, message, imageBase64 } = body;
  if (!(await requireAdmin(env, token))) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!message || !message.trim()) {
    return json({ error: 'Message လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ error: 'Telegram bot token မရှိပါ' }, 500, corsHeaders);
  }
  if (imageBase64) {
    const rawImageBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const broadcastImageBytes = safeDecodeBase64(rawImageBase64, 10 * 1024 * 1024);
    if (!broadcastImageBytes || !looksLikeImage(broadcastImageBytes)) {
      return json({ error: 'Image format ကို မှတ်မိပါ — .jpg/.png/.webp/.gif file ဖြစ်ရပါမည်' }, 400, corsHeaders);
    }
  }

  const { results: users } = await env.DB.prepare(
    `SELECT id FROM users WHERE is_banned IS NOT 1`
  ).all();
  if (!users || !users.length) {
    return json({ error: 'Notify ပို့ဖို့ user မရှိသေးပါ' }, 400, corsHeaders);
  }

  const text = title && title.trim() ? `<b>${title.trim()}</b>\n\n${message.trim()}` : message.trim();
  const photoBytes = imageBase64
    ? base64ToBytes(imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64)
    : null;

  // Telegram/Workers subrequest ကန့်သတ်ချက်များကို ရှောင်ရန် batch (20 user) တစ်ခုချင်းစီ
  // parallel ပို့ပြီးမှ batch နောက်တစ်ခု ဆက်ပို့မည်
  const BATCH_SIZE = 20;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(u => sendBroadcastToOne(env, u.id, text, photoBytes))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && r.value.ok) sent++; else failed++;
    }
  }

  return json({ success: true, sent, failed, total: users.length }, 200, corsHeaders);
}

async function sendBroadcastToOne(env, chatId, text, photoBytes) {
  if (photoBytes) {
    try {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('photo', new Blob([photoBytes]), 'broadcast.jpg');
      form.append('caption', text.slice(0, 1024)); // Telegram caption limit
      form.append('parse_mode', 'HTML');
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      return { ok: !!data.ok };
    } catch (e) {
      return { ok: false };
    }
  }
  return await sendTelegramMessage(env, chatId, text);
}

// Credits system: 1 character of TTS text = 1 credit.
// Job အောင်မြင်စွာ ပြီးမြောက်မှသာ (COMPLETED) credits ကို နုတ်ပါသည် — fail/cancel ဖြစ်ရင် ဘာမှ မနုတ်ပါ။

// ===========================================================================
// Long-text TTS support
// ---------------------------------------------------------------------------
// Model တစ်ခါ generate() ခေါ်ရင် internal generation-length ကန့်သတ်ချက်ကြောင့်
// (VOXCPM_MAX_LEN) စာလုံးများများ တစ်ကြိမ်တည်း ပို့လိုက်ရင် audio ဟာ တစ်ဝက်လောက်မှာ
// ရပ်တန့်သွားတတ်သည် (e.g. 900+ စာလုံး ပို့လိုက်ရင် ~800 လောက်သာ အသံထွက်လာခြင်း)။
// ဒါကို ကိုင်တွယ်ဖို့ user မမြင်ရအောင် Background (ဒီ Worker) မှာပဲ text ကို safe-length
// chunk များအဖြစ် ပိုင်းပြီး RunPod job များစွာအဖြစ် ခွဲ ပို့ကာ၊ အားလုံးပြီးတဲ့အခါ audio
// (WAV) များကို ပြန်ပေါင်းစည်းပြီး တစ်ဆက်တည်း file တစ်ခုအဖြစ် ပြန်ထုတ်ပေးပါသည်။
// ===========================================================================

const TTS_CHUNK_MAX_CHARS = 400; // request တစ်ခုချင်းစီအတွက် "safe" စာလုံးအရေအတွက်
const MULTI_JOB_PREFIX = 'multi:'; // compound jobId (RunPod job id များကို ',' ဖြင့်ချိတ်ထား) ဖော်ပြသည့် prefix

// Multi-voice tag ("M:"/"F:"/"C:") continuity ကို ထိန်းသိမ်းလျက် text ကို line boundary
// အတိုင်းသာ (line တစ်ကြောင်းကို မလျှင်းအောင်) TTS_CHUNK_MAX_CHARS အောက် chunk များအဖြစ်
// ပိုင်းထုတ်ပေးသည်။ line တစ်ကြောင်းတည်းက ကန့်သတ်ချက်ထက် ကျော်နေရင် sentence/space
// boundary ဖြင့် ထပ်ပိုင်းသည်။
function splitTextForTts(text, maxChars, voiceType) {
  const speakerTagRe = /^\s*([A-Za-z]{1,6})\s*[:：]\s*(.+)$/;
  const speakerAliases = {
    m: 'M', male: 'M', man: 'M', boy: 'M',
    f: 'F', female: 'F', woman: 'F', girl: 'F',
    c: 'C', child: 'C', kid: 'C',
  };

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!rawLines.length) return [text.trim()].filter(Boolean);

  // sentence-boundary (သို့) space ဖြင့် line ရှည်ကြီးများကို ပိုင်းထုတ်ပေးသည့် helper
  function splitLongLine(str, limit) {
    if (str.length <= limit) return [str];
    const boundaryRe = /[။၊.!?]\s*/g;
    const out = [];
    let remaining = str;
    while (remaining.length > limit) {
      const window = remaining.slice(0, limit + 1);
      let lastIdx = -1;
      let match;
      boundaryRe.lastIndex = 0;
      while ((match = boundaryRe.exec(window)) !== null) {
        lastIdx = match.index + match[0].length;
      }
      let cut = lastIdx;
      if (cut <= 0) {
        const lastSpace = remaining.lastIndexOf(' ', limit);
        cut = lastSpace > 0 ? lastSpace + 1 : limit;
      }
      const piece = remaining.slice(0, cut).trim();
      if (piece) out.push(piece);
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) out.push(remaining);
    return out;
  }

  // Line တစ်ကြောင်းချင်းစီကို (voice tag ပါအောင်) ပြန်တည်ဆောက်ပြီး sub-split လုပ်ထားသည့်
  // စာကြောင်း array တစ်ခုတည်း ရအောင် ပြင်ဆင်သည်
  let lastTag = null;
  const outLines = [];
  for (const line of rawLines) {
    let tag = null;
    let content = line;
    if (voiceType === 'multi') {
      const m = speakerTagRe.exec(line);
      if (m && speakerAliases[m[1].trim().toLowerCase()]) {
        tag = speakerAliases[m[1].trim().toLowerCase()];
        content = m[2].trim();
      } else {
        tag = lastTag; // tag မပါတဲ့ line က ယခင် speaker ကို ဆက်အသုံးပြုမည်
      }
      lastTag = tag;
    }
    const prefix = tag ? `${tag}: ` : '';
    const budget = Math.max(maxChars - prefix.length, 20);
    const subParts = splitLongLine(content, budget);
    for (const part of subParts) {
      outLines.push(prefix + part);
    }
  }

  // outLines များကို maxChars အောက်ကျန်အောင် greedy ဖြင့် chunk များအဖြစ် ပေါင်းစည်းသည်
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const line of outLines) {
    if (currentLen > 0 && currentLen + line.length + 1 > maxChars) {
      chunks.push(current.join('\n'));
      current = [];
      currentLen = 0;
    }
    current.push(line);
    currentLen += line.length + 1;
  }
  if (current.length) chunks.push(current.join('\n'));

  return chunks.length ? chunks : [text.trim()];
}

// ---- Base64 <-> bytes helpers (large-buffer safe) --------------------------

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// base64 string ကို decode လုပ်ပြီး size limit ကျော်လွန်ခြင်း/format မမှန်ခြင်းများကို
// server ဘက်ကနေ တိုက်ရိုက် စစ်ဆေးရန် — client က ပို့လိုက်တဲ့ base64 string ကို
// "audioလို့ ဆို"/"ပုံလို့ ဆို" ဆိုတာနဲ့ လုံးဝ မယုံဘဲ magic-byte signature ကို အမှန်တကယ် စစ်သည်
function safeDecodeBase64(b64, maxBytes) {
  if (!b64 || typeof b64 !== 'string') return null;
  let bytes;
  try {
    bytes = base64ToBytes(b64);
  } catch (e) {
    return null;
  }
  if (maxBytes && bytes.length > maxBytes) return null;
  return bytes;
}

function looksLikeImage(bytes) {
  if (!bytes || bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true; // WEBP
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true; // GIF
  return false;
}

function looksLikeAudio(bytes) {
  if (!bytes || bytes.length < 12) return false;
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) return true; // WAV
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true; // MP3 (ID3)
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true; // MP3 frame sync / AAC ADTS
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true; // OGG
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) return true; // FLAC
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true; // M4A/MP4/3GP (any ftyp brand)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return true; // WebM/Matroska (phone/browser recordings)
  if (bytes[0] === 0x46 && bytes[1] === 0x4f && bytes[2] === 0x52 && bytes[3] === 0x4d) return true; // AIFF ("FORM")
  if (
    bytes[0] === 0x30 && bytes[1] === 0x26 && bytes[2] === 0xb2 && bytes[3] === 0x75
  ) return true; // WMA (ASF container)
  return false;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ---- Minimal RIFF/WAVE parsing + stitching ---------------------------------

function parseWav(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, false) !== 0x52494646 /* 'RIFF' */ || dv.getUint32(8, false) !== 0x57415645 /* 'WAVE' */) {
    throw new Error('Not a valid WAV file');
  }
  let offset = 12;
  let fmt = null;
  let dataBytes = null;
  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const chunkSize = dv.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      fmt = {
        channels: dv.getUint16(chunkStart + 2, true),
        sampleRate: dv.getUint32(chunkStart + 4, true),
        bitsPerSample: dv.getUint16(chunkStart + 14, true),
      };
    } else if (chunkId === 'data') {
      dataBytes = bytes.subarray(chunkStart, chunkStart + chunkSize);
    }
    offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  if (!fmt || !dataBytes) throw new Error('Malformed WAV: missing fmt/data chunk');
  return { ...fmt, dataBytes };
}

function buildWavHeader(dataLength, { channels, sampleRate, bitsPerSample }) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const buf = new ArrayBuffer(44);
  const dv = new DataView(buf);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  dv.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  dv.setUint32(40, dataLength, true);
  return new Uint8Array(buf);
}

// audioBase64Chunks ကို (original order အတိုင်း) short silence gap တစ်ခုစီ ခြားပြီး
// တစ်ဆက်တည်း WAV file တစ်ခုအဖြစ် ပေါင်းစည်းပေးသည်
function mergeWavChunksBase64(audioBase64Chunks) {
  if (audioBase64Chunks.length === 1) return audioBase64Chunks[0];

  const parsed = audioBase64Chunks.map(b64 => parseWav(base64ToBytes(b64)));
  const ref = parsed[0];

  const gapSeconds = 0.25;
  const gapBytes = Math.floor(ref.sampleRate * gapSeconds) * ref.channels * (ref.bitsPerSample / 8);
  const gap = new Uint8Array(gapBytes); // silence (zero-filled)

  let totalLen = 0;
  for (let i = 0; i < parsed.length; i++) {
    totalLen += parsed[i].dataBytes.length;
    if (i < parsed.length - 1) totalLen += gap.length;
  }

  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (let i = 0; i < parsed.length; i++) {
    merged.set(parsed[i].dataBytes, pos);
    pos += parsed[i].dataBytes.length;
    if (i < parsed.length - 1) {
      merged.set(gap, pos);
      pos += gap.length;
    }
  }

  const header = buildWavHeader(merged.length, ref);
  const finalBytes = new Uint8Array(header.length + merged.length);
  finalBytes.set(header, 0);
  finalBytes.set(merged, header.length);

  return bytesToBase64(finalBytes);
}

// RunPod ကနေ response ပြန်လာချိန် (network glitch, gateway timeout, RunPod ကိုယ်တိုင် down
// စတာတွေကြောင့်) တခါတရံ JSON မဟုတ်ဘဲ HTML/plain-text error page ပြန်လာနိုင်ပါတယ်။ အဲဒါကို
// try/catch မလုပ်ဘဲ .json() ခေါ်ရင် Worker တစ်ခုလုံး crash ဖြစ်ပြီး Cloudflare ရဲ့ own HTML
// error page ကို client ဆီ ပြန်ပို့မိတတ်ပါတယ် (frontend မှာ "Unexpected token '<'" ဆိုပြီး
// ပေါ်လာစေတဲ့ အကြောင်းရင်းပါ) — ဒီ helper က အဲဒါကို ဖမ်းပြီး clean JSON error အဖြစ် ပြန်ပေးပါတယ်
async function safeJsonParse(res) {
  const text = await res.text();
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, data: null, rawText: text.slice(0, 300) };
  }
}

async function handleGenerateStart(request, env, corsHeaders) {
  const body = await request.json();
  const { initData, text, refAudioBase64, promptText, voiceType, voicePresetId } = body;

  // client ပို့လိုက်တဲ့ userId ကို လုံးဝ မယုံပါ — Telegram initData signature ကို verify
  // လုပ်ပြီး ဒီ request ကို ပို့သူ ဟုတ်/မဟုတ် သေချာအောင် စစ်ဆေးပါသည်
  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  const userStatus = await env.DB.prepare('SELECT is_banned FROM users WHERE id = ?1').bind(userId).first();
  if (userStatus && userStatus.is_banned) {
    return json({ error: 'သင့်အကောင့်ကို ပိတ်ထားပါသည်။ Admin ကို ဆက်သွယ်ပါ။' }, 403, corsHeaders);
  }
  // Spam/abuse ကာကွယ်ရန် — 1 မိနစ်အတွင်း request အလွန်များနေရင် ခဏငြင်းပယ်ပါမည်
  if (await isGenerateRateLimited(env, userId)) {
    return json({ error: 'Request အလွန်များနေပါသည် — ခဏစောင့်ပြီး ထပ်ကြိုးစားပါ' }, 429, corsHeaders);
  }
  if (!text || !text.trim()) {
    return json({ error: 'Text to speak လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }
  // Voice cloning အတွက် upload လုပ်လိုက်တဲ့ reference audio ဟုတ်/မဟုတ် magic-byte နဲ့
  // server ဘက်ကနေ တကယ်စစ်ပါသည် — client က "audio" လို့ ဆိုတာနဲ့ မယုံပါ
  if (refAudioBase64) {
    const refBytes = safeDecodeBase64(refAudioBase64, 20 * 1024 * 1024);
    if (!refBytes) {
      return json({ error: 'Reference audio file သိပ်ကြီးလွန်း (သို့) ပျက်နေပါသည်' }, 400, corsHeaders);
    }
    if (!looksLikeAudio(refBytes)) {
      return json({ error: 'Reference audio file format မှားနေပါသည်' }, 400, corsHeaders);
    }
  }

  const cost = text.trim().length;

  const userRow = await env.DB.prepare('SELECT credits FROM users WHERE id = ?1')
    .bind(userId)
    .first();
  const currentCredits = userRow ? Number(userRow.credits || 0) : 0;

  if (currentCredits < cost) {
    return json(
      { error: `Credits မလုံလောက်ပါ။ လိုအပ်ချက်: ${cost}, လက်ကျန်: ${currentCredits}` },
      402,
      corsHeaders
    );
  }

  // Admin ကြိုတင် upload ထားတဲ့ voice preset ကို ရွေးထားရင် — အဲ့ဒီ preset ရဲ့ audio ကို reference အဖြစ်သုံးမည်
  let finalRefAudio = refAudioBase64;
  let finalPromptText = promptText;
  if (voicePresetId) {
    const preset = await env.DB.prepare('SELECT audio_base64, prompt_text FROM voice_presets WHERE id = ?1')
      .bind(Number(voicePresetId))
      .first();
    if (!preset) {
      return json({ error: 'ရွေးထားတဲ့ Voice Preset မတွေ့ပါ' }, 400, corsHeaders);
    }
    finalRefAudio = preset.audio_base64;
    finalPromptText = (promptText && promptText.trim()) ? promptText.trim() : preset.prompt_text;
  }

  // Long text ကို safe-length chunk များအဖြစ် ပိုင်းပြီး RunPod job များစွာ ခွဲပို့မည်
  // (chunk တစ်ခုတည်းရှိရင် ယခင်အတိုင်း job တစ်ခုတည်းသာ ဖြစ်မည်)
  const textChunks = splitTextForTts(text.trim(), TTS_CHUNK_MAX_CHARS, voiceType);

  // *** fix ***: chunk အားလုံးကို sequential (တစ်ခုပြီးမှ တစ်ခု) fetch မလုပ်တော့ဘဲ Promise.all
  // နဲ့ တစ်ပြိုင်နက် ပို့လိုက်ပါတယ် — sequential ဆိုရင် chunk 14-15 ခုအတွက် RunPod ကို ဆက်တိုက်
  // ခေါ်ရင်း (round-trip time အများကြီး ပေါင်းသွားပြီး) Cloudflare Worker ရဲ့ request time limit
  // ကို ထိသွားနိုင်ပါတယ် — ထိသွားရင် Cloudflare ကိုယ်တိုင်က JSON မဟုတ်ဘဲ HTML timeout error page
  // ပြန်ပေးလိုက်လို့ frontend မှာ "Unexpected token '<'" ပေါ်လာခဲ့တာပါ (text ရှည်လေ chunk များလေ၊
  // sequential ခေါ်ချိန်ကြာလေ ဖြစ်ခွင့်များလေ ဖြစ်ပါတယ်) — parallel ခေါ်လိုက်ရင် စုစုပေါင်းချိန် chunk
  // အရေအတွက်ပေါ် မမူတည်တော့ဘဲ တစ်ခုတည်းရဲ့ ကြာချိန်ခန့်ပဲ ကြာမည်ဖြစ်လို့ timeout ဖြစ်ခွင့် အများကြီးလျော့သွားပါမည်
  const chunkResults = await Promise.all(
    textChunks.map(async (chunkText) => {
      const input = { text: chunkText };
      if (finalRefAudio) {
        input.reference_audio_base64 = finalRefAudio;
        if (finalPromptText && finalPromptText.trim()) input.prompt_text = finalPromptText.trim();
      }
      if (voiceType) input.voice_type = voiceType;

      const runRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({ input }),
      });

      const parsed = await safeJsonParse(runRes);
      if (!parsed.ok) {
        return { error: 'RunPod ကနေ response မှားနေပါသည် — ခဏနေမှ ထပ်ကြိုးစားပါ (server ခေတ္တ busy ဖြစ်နေနိုင်ပါသည်)' };
      }
      if (!runRes.ok || !parsed.data.id) {
        return { error: parsed.data.error || 'RunPod request failed' };
      }
      return { id: parsed.data.id };
    })
  );

  const failedChunk = chunkResults.find((r) => r.error);
  if (failedChunk) {
    return json({ error: failedChunk.error }, 502, corsHeaders);
  }
  const jobIds = chunkResults.map((r) => r.id);

  // Credits ကို job အောင်မြင်စွာ ပြီးမြောက်မှသာ နုတ်ပါမည် (handleGenerateStatus ထဲမှာ)
  // — user တစ်ယောက် job မအောင်မြင်ခဲ့ရင် ဘာမှ ဆုံးရှုံးမှု မရှိစေရန်

  // chunk တစ်ခုထက်ပိုရင် job id အားလုံးကို compound jobId (MULTI_JOB_PREFIX + ',' ဖြင့်ချိတ်ထား)
  // အဖြစ် frontend ကို ပြန်ပေးမည် — handleGenerateStatus က ဒါကို မှတ်ပြီး status/audio ကို ပေါင်းစည်းမည်
  const jobId = jobIds.length > 1 ? MULTI_JOB_PREFIX + jobIds.join(',') : jobIds[0];

  await logRequestStart(env, { userId, jobId, source: 'miniapp', textLength: cost });

  return json(
    { success: true, jobId, cost, remainingCredits: currentCredits },
    200,
    corsHeaders
  );
}

async function handleGenerateStatus(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData, jobId } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!jobId) {
    return json({ error: 'Missing jobId' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }

  // ဒီ job ဟုတ်တာမှန်ကန်ကြောင်း + login ဝင်ထားတဲ့ user ကိုယ်တိုင်ရဲ့ job ဟုတ်ကြောင်း
  // request_logs ထဲက အထောက်အထားနဲ့ တိုက်စစ်ပါသည် — client ဘက်က ပို့လိုက်တဲ့ userId/cost
  // ကို လုံးဝ မယုံတော့ပါ (မဟုတ်ရင် တခြားသူ့ job ကို ခိုးကြည့်တာ၊ cost ကို လိမ်ညာတာ စတာတွေ ဖြစ်နိုင်ပါတယ်)
  const logRow = await env.DB.prepare(
    'SELECT user_id, text_length, status FROM request_logs WHERE job_id = ?1'
  )
    .bind(String(jobId))
    .first();
  if (!logRow || String(logRow.user_id) !== userId) {
    return json({ error: 'Job not found' }, 404, corsHeaders);
  }
  const cost = Number(logRow.text_length) || 0;

  const data = jobId.startsWith(MULTI_JOB_PREFIX)
    ? await fetchMultiJobStatus(jobId.slice(MULTI_JOB_PREFIX.length).split(','), env)
    : await fetchSingleJobStatus(jobId, env);

  // Job အောင်မြင်စွာ ပြီးမြောက် (audio ထွက်) မှသာ credits ကို နုတ်ပါမည်
  // — logRow.status ကို စစ်ခြင်းဖြင့် frontend က status ကို ထပ်ခါထပ်ခါ poll လုပ်လည်း
  // credits ကို တစ်ကြိမ်ထက်ပို၍ ထပ်နုတ် (double-charge) မဖြစ်စေရန် ကာကွယ်ပါသည်
  if (data.status === 'COMPLETED' && cost && logRow.status !== 'COMPLETED') {
    await env.DB.prepare(
      `UPDATE users SET credits = COALESCE(credits, 0) - ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(cost, userId)
      .run();
    await logRequestUpdate(env, jobId, { status: 'COMPLETED', creditsCharged: cost, errorMessage: null });
  } else if (data.status === 'FAILED') {
    await logRequestUpdate(env, jobId, { status: 'FAILED', creditsCharged: 0, errorMessage: data.error || 'RunPod ကနေ error ပြန်ခဲ့သည်' });
  } else if (data.status === 'CANCELLED') {
    await logRequestUpdate(env, jobId, { status: 'CANCELLED', creditsCharged: 0, errorMessage: null });
  } else if (data.status === 'IN_PROGRESS') {
    await logRequestUpdate(env, jobId, { status: 'IN_PROGRESS', creditsCharged: 0, errorMessage: null });
  }

  return json(data, 200, corsHeaders);
}

// ---- single job status (RunPod) --------------------------------------------

async function fetchSingleJobStatus(jobId, env) {
  const statusRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${env.RUNPOD_API_KEY}` },
  });
  const parsed = await safeJsonParse(statusRes);
  if (!parsed.ok) {
    // RunPod ကနေ ခဏတာ non-JSON (gateway hiccup) ပြန်လာတာကို job ပျက်သွားသလို မယူဆဘဲ
    // "IN_PROGRESS" အဖြစ် ယူဆပြီး frontend ကို ဆက် poll လုပ်ခိုင်းမည် — transient error
    // တစ်ခုကြောင့် job တစ်ခုလုံး FAILED/crash မဖြစ်စေရန်
    return { id: jobId, status: 'IN_PROGRESS' };
  }
  return parsed.data;
}

// ---- multiple (chunked) job status: poll all, merge audio once all COMPLETED ----

async function fetchMultiJobStatus(jobIds, env) {
  const results = await Promise.all(jobIds.map(id => fetchSingleJobStatus(id, env)));

  const failed = results.find(r => r.status === 'FAILED');
  if (failed) {
    return { id: jobIds[0], status: 'FAILED', error: failed.error || 'Background request တစ်ခု fail ဖြစ်သွားပါသည်' };
  }
  const cancelled = results.find(r => r.status === 'CANCELLED');
  if (cancelled) {
    return { id: jobIds[0], status: 'CANCELLED' };
  }

  const allCompleted = results.every(r => r.status === 'COMPLETED');
  if (!allCompleted) {
    const anyInProgress = results.some(r => r.status === 'IN_PROGRESS');
    return { id: jobIds[0], status: anyInProgress ? 'IN_PROGRESS' : 'IN_QUEUE' };
  }

  // Chunk အားလုံး ပြီးပါပြီ — audio (WAV) များကို original order အတိုင်း ပေါင်းစည်းမည်
  try {
    const audioChunks = results.map(r => r.output && r.output.audio_base64).filter(Boolean);
    if (audioChunks.length !== results.length) {
      return { id: jobIds[0], status: 'FAILED', error: 'Background request တစ်ခုက audio ပြန်မပေးပါ' };
    }
    const mergedAudio = mergeWavChunksBase64(audioChunks);
    const first = results[0].output;
    return {
      id: jobIds[0],
      status: 'COMPLETED',
      output: {
        audio_base64: mergedAudio,
        sample_rate: first.sample_rate,
        format: first.format || 'wav',
      },
    };
  } catch (e) {
    return { id: jobIds[0], status: 'FAILED', error: 'Audio segment များ ပေါင်းစည်းရာတွင် error ဖြစ်ပွားသည်: ' + e.message };
  }
}

// ===========================================================================
// Profile / Referral / API Key
// ===========================================================================

async function handleProfileGet(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const user = await env.DB.prepare(
    'SELECT id, name, username, credits, referral_code, api_key_prefix, api_key_created_at FROM users WHERE id = ?1'
  )
    .bind(String(userId))
    .first();

  if (!user) {
    return json({ error: 'User not found' }, 404, corsHeaders);
  }

  // Referral code မရှိသေးတဲ့ User ဟောင်းများအတွက် fallback backfill (safety net)
  if (!user.referral_code) {
    const myReferralCode = await generateUniqueReferralCode(env);
    await env.DB.prepare(
      `UPDATE users SET referral_code = ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(myReferralCode, String(userId))
      .run();
    user.referral_code = myReferralCode;
  }

  const referralStats = await env.DB.prepare(
    'SELECT COUNT(*) as count, COALESCE(SUM(referrer_bonus), 0) as totalBonus FROM referrals WHERE referrer_id = ?1'
  )
    .bind(String(userId))
    .first();

  const botUsername = env.TELEGRAM_BOT_USERNAME || TELEGRAM_BOT_USERNAME;
  const referralLink = user.referral_code ? `https://t.me/${botUsername}?startapp=${user.referral_code}` : null;

  return json(
    {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        credits: user.credits,
        referralCode: user.referral_code,
        referralLink,
        referredCount: referralStats ? referralStats.count : 0,
        referralCreditsEarned: referralStats ? referralStats.totalBonus : 0,
        hasApiKey: !!user.api_key_prefix,
        apiKeyPrefix: user.api_key_prefix,
        apiKeyCreatedAt: user.api_key_created_at,
      },
    },
    200,
    corsHeaders
  );
}

// ---- Request history: user ကိုယ်တိုင် သူ့ရဲ့ request log များကို ကြည့်ရန် ----

async function handleProfileRequestsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT job_id, source, text_length, status, credits_charged, error_message, created_at
       FROM request_logs WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50`
    )
      .bind(String(userId))
      .all();

    return json({ success: true, requests: results }, 200, corsHeaders);
  } catch (e) {
    // request_logs table မရှိသေးရင် empty list ပြန်ပေးမည် (feature ကို gracefully skip)
    return json({ success: true, requests: [] }, 200, corsHeaders);
  }
}

async function handleApiKeyGenerate(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?1').bind(String(userId)).first();
  if (!user) {
    return json({ error: 'User not found' }, 404, corsHeaders);
  }

  const plainKey = generateApiKeyPlaintext();
  const hash = await sha256Hex(plainKey);
  const prefix = plainKey.slice(0, 12) + '…';

  await env.DB.prepare(
    `UPDATE users SET api_key_hash = ?1, api_key_prefix = ?2, api_key_created_at = datetime('now'), updated_at = datetime('now') WHERE id = ?3`
  )
    .bind(hash, prefix, String(userId))
    .run();

  // ဒီ plaintext key ကို database ထဲမှာ မသိမ်းပါ (hash ကိုသာ သိမ်းသည်) — ဒါကြောင့် ဒီတစ်ကြိမ်တည်းသာ ပြန်ပေးနိုင်ပါသည်
  return json({ success: true, apiKey: plainKey, apiKeyPrefix: prefix }, 200, corsHeaders);
}

async function handleApiKeyRevoke(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  await env.DB.prepare(
    `UPDATE users SET api_key_hash = NULL, api_key_prefix = NULL, api_key_created_at = NULL, updated_at = datetime('now') WHERE id = ?1`
  )
    .bind(String(userId))
    .run();

  return json({ success: true }, 200, corsHeaders);
}

// ===========================================================================
// Public API (v1) — External website/App များမှ API Key ဖြင့် ချိတ်ဆက်အသုံးပြုနိုင်ရန်
// (Telegram Mini App session မလိုအပ်ပါ၊ apiKey တစ်ခုတည်းဖြင့် authenticate လုပ်သည်)
// ===========================================================================

async function handleApiV1Generate(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { apiKey, text, refAudioBase64, promptText, voiceType, voicePresetId } = body;

  if (!apiKey) {
    return json({ error: 'Missing apiKey' }, 401, corsHeaders);
  }
  if (!text || !text.trim()) {
    return json({ error: 'text လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }
  if (refAudioBase64) {
    const refBytes = safeDecodeBase64(refAudioBase64, 20 * 1024 * 1024);
    if (!refBytes) {
      return json({ error: 'Reference audio file သိပ်ကြီးလွန်း (သို့) ပျက်နေပါသည်' }, 400, corsHeaders);
    }
    if (!looksLikeAudio(refBytes)) {
      return json({ error: 'Reference audio file format မှားနေပါသည်' }, 400, corsHeaders);
    }
  }

  const hash = await sha256Hex(apiKey);
  const user = await env.DB.prepare('SELECT id, credits, is_banned FROM users WHERE api_key_hash = ?1')
    .bind(hash)
    .first();

  if (!user) {
    return json({ error: 'Invalid API key' }, 401, corsHeaders);
  }
  if (user.is_banned) {
    return json({ error: 'Account banned' }, 403, corsHeaders);
  }
  if (await isGenerateRateLimited(env, String(user.id))) {
    return json({ error: 'Request အလွန်များနေပါသည် — ခဏစောင့်ပြီး ထပ်ကြိုးစားပါ' }, 429, corsHeaders);
  }

  const cost = text.trim().length;
  const currentCredits = Number(user.credits || 0);
  if (currentCredits < cost) {
    return json(
      { error: `Credits မလုံလောက်ပါ။ လိုအပ်ချက်: ${cost}, လက်ကျန်: ${currentCredits}` },
      402,
      corsHeaders
    );
  }

  const input = { text: text.trim() };
  // Admin ကြိုတင် upload ထားတဲ့ voice preset ကို ရွေးထားရင် — အဲ့ဒီ preset ရဲ့ audio ကို reference အဖြစ်သုံးမည်
  let finalRefAudio = refAudioBase64;
  let finalPromptText = promptText;
  if (voicePresetId) {
    const preset = await env.DB.prepare('SELECT audio_base64, prompt_text FROM voice_presets WHERE id = ?1')
      .bind(Number(voicePresetId))
      .first();
    if (!preset) {
      return json({ error: 'ရွေးထားတဲ့ Voice Preset မတွေ့ပါ' }, 400, corsHeaders);
    }
    finalRefAudio = preset.audio_base64;
    finalPromptText = (promptText && promptText.trim()) ? promptText.trim() : preset.prompt_text;
  }
  if (finalRefAudio) {
    input.reference_audio_base64 = finalRefAudio;
    if (finalPromptText && finalPromptText.trim()) input.prompt_text = finalPromptText.trim();
  }
  if (voiceType) input.voice_type = voiceType;

  const runRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input }),
  });

  const runData_parsed = await safeJsonParse(runRes);
  if (!runData_parsed.ok) {
    return json(
      { error: 'RunPod ကနေ response မှားနေပါသည် — ခဏနေမှ ထပ်ကြိုးစားပါ' },
      502,
      corsHeaders
    );
  }
  const runData = runData_parsed.data;
  if (!runRes.ok || !runData.id) {
    return json({ error: runData.error || 'RunPod request failed' }, 500, corsHeaders);
  }

  // Credits ကို job အောင်မြင်စွာ ပြီးမြောက်မှသာ နုတ်ပါမည် (handleApiV1GenerateStatus ထဲမှာ)

  await logRequestStart(env, { userId: user.id, jobId: runData.id, source: 'api', textLength: cost });

  return json(
    { success: true, jobId: runData.id, cost, remainingCredits: currentCredits },
    200,
    corsHeaders
  );
}

async function handleApiV1GenerateStatus(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { apiKey, jobId } = body;

  if (!apiKey) {
    return json({ error: 'Missing apiKey' }, 401, corsHeaders);
  }
  if (!jobId) {
    return json({ error: 'Missing jobId' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }

  const hash = await sha256Hex(apiKey);
  const user = await env.DB.prepare('SELECT id FROM users WHERE api_key_hash = ?1').bind(hash).first();
  if (!user) {
    return json({ error: 'Invalid API key' }, 401, corsHeaders);
  }

  // ဒီ jobId ဟာ ဒီ apiKey ပိုင်ရှင်ရဲ့ job အမှန်ဟုတ်ကြောင်း + cost ကို client ကနေ မယုံဘဲ
  // request_logs ထဲက authoritative value ကို သုံးပြီး စစ်ဆေးပါသည် — မဟုတ်ရင် တခြားသူ့ job ID ကို
  // ခန့်မှန်း/သိရင် အသံ output ကို ခိုးကြည့်ခြင်း၊ cost ကို လိမ်ညာနုတ်ခြင်း တို့ကို ကာကွယ်ရန်
  const logRow = await env.DB.prepare(
    'SELECT user_id, text_length, status FROM request_logs WHERE job_id = ?1'
  )
    .bind(String(jobId))
    .first();
  if (!logRow || String(logRow.user_id) !== String(user.id)) {
    return json({ error: 'Job not found' }, 404, corsHeaders);
  }
  const cost = Number(logRow.text_length) || 0;

  const statusRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${env.RUNPOD_API_KEY}` },
  });
  const statusParsed = await safeJsonParse(statusRes);
  const data = statusParsed.ok ? statusParsed.data : { status: 'IN_PROGRESS' };

  // Job အောင်မြင်စွာ ပြီးမြောက် (audio ထွက်) မှသာ credits ကို နုတ်ပါမည်
  // — status ကို ထပ်ခါထပ်ခါ poll လုပ်လည်း credits ကို တစ်ကြိမ်ထက်ပို၍ ထပ်နုတ်မဖြစ်စေရန်
  if (data.status === 'COMPLETED' && cost && logRow.status !== 'COMPLETED') {
    await env.DB.prepare(
      `UPDATE users SET credits = COALESCE(credits, 0) - ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(cost, user.id)
      .run();
    await logRequestUpdate(env, jobId, { status: 'COMPLETED', creditsCharged: cost, errorMessage: null });
  } else if (data.status === 'FAILED') {
    await logRequestUpdate(env, jobId, { status: 'FAILED', creditsCharged: 0, errorMessage: data.error || 'RunPod ကနေ error ပြန်ခဲ့သည်' });
  } else if (data.status === 'CANCELLED') {
    await logRequestUpdate(env, jobId, { status: 'CANCELLED', creditsCharged: 0, errorMessage: null });
  } else if (data.status === 'IN_PROGRESS') {
    await logRequestUpdate(env, jobId, { status: 'IN_PROGRESS', creditsCharged: 0, errorMessage: null });
  }

  return json(data, 200, corsHeaders);
}

// ===========================================================================
// Audio save/download (Telegram Mini App in-app browser ကနေ တိုက်ရိုက် download
// ဆွဲမရတဲ့ ပြဿနာအတွက် - audio ကို ခဏသိမ်းပြီး real https URL တစ်ခုအနေနဲ့ ပြန်ပေးသည်။
// ဒီ URL ကို Chrome (system browser) မှာ ဖွင့်လိုက်ရင် Content-Disposition header
// ကြောင့် တိုက်ရိုက် download ချနိုင်ပါသည်)
// ===========================================================================

async function handleSaveAudio(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData, audioBase64, format } = body;

  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!audioBase64) {
    return json({ error: 'Missing audioBase64' }, 400, corsHeaders);
  }
  // storage abuse ကို ကာကွယ်ရန် — ခွင့်ပြုနိုင်တဲ့ audio size ကို ကန့်သတ်ပြီး format ကို
  // magic-byte နဲ့ တကယ်စစ်ပါသည် (D1 database ရဲ့ column size limit ထက် မကျော်စေရန်လည်း ဖြစ်သည်
  // — မဟုတ်ရင် "SQLITE_TOOBIG" error တက်နိုင်ပါသည်)
  if (audioBase64.length > 1_400_000) {
    return json({ error: 'Audio file သိပ်ကြီးလွန်းပါသည် (max ~1MB)' }, 413, corsHeaders);
  }
  const saveAudioBytes = safeDecodeBase64(audioBase64, 1_400_000);
  if (!saveAudioBytes) {
    return json({ error: 'Audio file သိပ်ကြီးလွန်း (သို့) ပျက်နေပါသည်' }, 413, corsHeaders);
  }
  if (!looksLikeAudio(saveAudioBytes)) {
    return json({ error: 'Audio file format မှားနေပါသည်' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS audio_files (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      format TEXT,
      data TEXT,
      created_at TEXT
    )`
  ).run();

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO audio_files (id, user_id, format, data, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))`
  )
    .bind(id, userId, format || 'wav', audioBase64)
    .run();

  // 1 ရက်ထက် ကြာသွားတဲ့ အဟောင်း audio များကို ရှင်းလင်းပါ (best-effort)
  try {
    await env.DB.prepare(`DELETE FROM audio_files WHERE created_at < datetime('now', '-1 day')`).run();
  } catch (e) {
    // ignore cleanup errors
  }

  return json({ success: true, audioId: id, url: `/api/audio/${id}` }, 200, corsHeaders);
}

async function handleAudioDownload(id, env, corsHeaders) {
  if (!id) {
    return json({ error: 'Missing audio id' }, 400, corsHeaders);
  }

  const row = await env.DB.prepare('SELECT format, data FROM audio_files WHERE id = ?1').bind(id).first();
  if (!row) {
    return json({ error: 'Audio ရှာမတွေ့ပါ သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ' }, 404, corsHeaders);
  }

  const format = row.format || 'wav';
  const mime = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;

  const binary = atob(row.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="voice-output.${format}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ===========================================================================
// Send generated audio directly into the user's Telegram chat (Bot API)
// - Direct download အဆင်မပြေတဲ့အခါ အသုံးပြုရန် fallback delivery method
// ===========================================================================

async function handleSendTelegramAudio(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const { initData, audioBase64, format } = body;

  // *** critical fix ***: ယခင်က client ပို့လိုက်တဲ့ userId ကို chat_id အဖြစ် တိုက်ရိုက်
  // ယုံပြီးသုံးခဲ့တာကြောင့် hacker တစ်ယောက်က ဒီ endpoint ကို ဘယ် Telegram chat ID ကိုမဆို
  // ဒီ bot ကနေတစ်ဆင့် audio spam ပို့တဲ့ open relay အဖြစ် အလွဲသုံးစားလုပ်နိုင်ခဲ့ပါတယ်။
  // အခု initData ကို verify လုပ်ပြီး login ဝင်ထားသူ ကိုယ်တိုင်ရဲ့ chat id ကိုသာ ခွင့်ပြုပါသည်။
  const userId = await getVerifiedTelegramUserId(initData, env);
  if (!userId) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }
  if (!audioBase64) {
    return json({ error: 'Missing audioBase64' }, 400, corsHeaders);
  }
  const sendAudioBytes = safeDecodeBase64(audioBase64, 30 * 1024 * 1024);
  if (!sendAudioBytes) {
    return json({ error: 'Audio file သိပ်ကြီးလွန်းပါသည် (သို့) format မမှန်ကန်ပါ' }, 413, corsHeaders);
  }
  if (!looksLikeAudio(sendAudioBytes)) {
    return json({ error: 'Audio format ကို မှတ်မိပါ — .wav/.mp3/.ogg/.m4a/.flac file ဖြစ်ရပါမည်' }, 400, corsHeaders);
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ error: 'Telegram bot token မရှိပါ' }, 500, corsHeaders);
  }

  const fmt = format || 'wav';
  const mime = fmt === 'mp3' ? 'audio/mpeg' : `audio/${fmt}`;

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const form = new FormData();
  form.append('chat_id', userId);
  form.append('audio', new Blob([bytes], { type: mime }), `voice-output.${fmt}`);
  form.append('caption', 'Ko Paing AI Voice Studio 🎙️');

  const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendAudio`, {
    method: 'POST',
    body: form,
  });
  const tgData = await tgRes.json();

  if (!tgRes.ok || !tgData.ok) {
    return json({ error: tgData.description || 'Telegram ကို ပို့လို့ မရပါ' }, 500, corsHeaders);
  }

  return json({ success: true }, 200, corsHeaders);
}

async function verifyTelegramAuth(initData, botToken, maxAgeSeconds) {
  if (!initData || !botToken) return false;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return false;
  urlParams.delete('hash');

  const params = [];
  for (const [key, value] of urlParams.entries()) {
    params.push(`${key}=${value}`);
  }
  params.sort();
  const dataCheckString = params.join('\n');

  const encoder = new TextEncoder();

  // Telegram Mini App (WebApp) validation requires:
  // secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
  const webAppDataKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const secretKey = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataCheckString));
  const hexSignature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (!constantTimeEqual(hexSignature, hash)) return false;

  // Replay protection: Telegram ပေးတဲ့ auth_date ဟာ maxAgeSeconds ထက် ဟောင်းနေရင် ငြင်းပယ်မည်
  // (ဆိုလိုသည်မှာ ဟောင်းနေတဲ့ initData string ကို ပြန်လည် capture လုပ်ပြီး replay attack လုပ်တာကို ကာကွယ်ရန်)
  if (maxAgeSeconds) {
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    if (!authDate) return false;
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) return false;
  }

  return true;
}

// Constant-time string comparison — hash တွေကို compare လုပ်တဲ့အခါ timing attack ကို ရှောင်ရန်
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// initData ကို verify လုပ်ပြီး signature မှန်ကန်မှန်ကန် အတည်ပြုနိုင်မှသာ user id ကို ပြန်ပေးမည်
// *** client ကနေ ပို့လိုက်တဲ့ userId field ကို ဘယ်တော့မှ တိုက်ရိုက်မယုံပါနှင့် — ဒီ function ကနေရတဲ့ id ကိုသာ သုံးပါ ***
async function getVerifiedTelegramUserId(initData, env) {
  const isValid = await verifyTelegramAuth(initData, env.TELEGRAM_BOT_TOKEN, 86400);
  if (!isValid) return null;
  try {
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || 'null');
    return user && user.id != null ? String(user.id) : null;
  } catch (e) {
    return null;
  }
}

// ===========================================================================
// Shared page styles
// ===========================================================================

const BASE_STYLE = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f7f6f0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .card {
    background: #ffffff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    width: 100%;
    max-width: 360px;
    text-align: center;
  }
  .brand-icon { font-size: 40px; margin-bottom: 8px; }
  h2 {
    letter-spacing: 2px;
    font-size: 18px;
    margin: 0 0 4px;
    text-transform: uppercase;
  }
  .subtitle {
    font-size: 11px;
    letter-spacing: 1.5px;
    color: #999;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  input[type="password"] {
    width: 100%;
    padding: 12px;
    margin-bottom: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 16px;
    text-align: center;
  }
  button {
    width: 100%;
    background-color: #1a1a1a;
    color: #ffffff;
    border: none;
    padding: 12px;
    font-size: 14px;
    letter-spacing: 1px;
    cursor: pointer;
    border-radius: 4px;
    text-transform: uppercase;
  }
  button:hover { background-color: #333; }
  .error { color: #d9534f; margin-top: 15px; font-size: 13px; }
  .loading { color: #999; font-size: 13px; margin-top: 10px; }
`;

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎙️</text></svg>">`;

// ===========================================================================
// Landing Page — Telegram ထဲကနေဖွင့်ရင် Auto Login + Redirect
// Telegram App မှမဟုတ်ရင် Admin Password Card ပြသည်
// ===========================================================================

function getLandingHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ko Paing 🎙️ AI Voice Studio</title>
  ${FAVICON}
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>${BASE_STYLE}</style>
</head>
<body>
  <div class="card" id="card">
    <div class="brand-icon">🎙️</div>
    <h2>Ko Paing</h2>
    <div class="subtitle">AI Voice Studio</div>
    <div id="content">
      <input type="password" id="password" placeholder="••••••••••••">
      <button onclick="login()">Unlock</button>
      <div id="error" class="error"></div>
    </div>
  </div>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

    async function login() {
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('error');
      errorDiv.innerText = '';

      try {
        const res = await fetch('/api/auth/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          sessionStorage.setItem('admin_token', data.token);
          window.location.href = '/admin';
        } else {
          errorDiv.innerText = data.error || 'Login Failed';
        }
      } catch (err) {
        errorDiv.innerText = 'Network error: ' + err.message;
      }
    }

    // Telegram Mini App အနေနဲ့ ဖွင့်ထားရင် Auto Login + Auto Redirect
    async function autoLoginFromTelegram() {
      if (!tg || !tg.initData) return; // Telegram App ထဲက မဟုတ်ရင် password card ကိုပဲ ပြထားမယ်

      tg.ready();
      document.getElementById('content').innerHTML = '<div class="loading">Signing you in…</div>';

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: tg.initData,
            referralCode: (tg.initDataUnsafe && tg.initDataUnsafe.start_param) || undefined
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          sessionStorage.setItem('tg_user', JSON.stringify(data.user));
          if (data.user.isAdmin && data.token) {
            sessionStorage.setItem('admin_token', data.token);
          }
          // Admin ဖြစ်သည်ဖြစ်စေ မဖြစ်သည်ဖြစ်စေ Voice Studio (user UI) ဆီ အရင်ပို့ပါမည်
          // Admin ဆိုရင် Studio ပေါ်က button ကနေ /admin ဆီ ကိုယ်တိုင်ရွေးပြီးမှ သွားနိုင်ပါမည်
          window.location.href = '/studio';
        } else {
          document.getElementById('content').innerHTML =
            '<div class="error">' + (data.error || 'Login Failed') + '</div>';
        }
      } catch (err) {
        document.getElementById('content').innerHTML =
          '<div class="error">Network error: ' + err.message + '</div>';
      }
    }

    autoLoginFromTelegram();
  </script>
</body>
</html>`;
}

// ===========================================================================
// Admin Dashboard
// ===========================================================================

function getAdminDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard · Ko Paing AI Voice Studio</title>
  ${FAVICON}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f6f0;
      margin: 0;
      padding: 20px;
    }
    .header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    .tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab {
      padding: 8px 14px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;
      background: #fff; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; color: #555;
    }
    .tab.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
    .panel { display: none; }
    .panel.active { display: block; }
    table {
      width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px;
      overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;
    }
    th, td { padding: 10px 12px; text-align: left; font-size: 12.5px; border-bottom: 1px solid #eee; vertical-align: top; }
    th { background: #1a1a1a; color: #fff; text-transform: uppercase; letter-spacing: 1px; font-size: 10.5px; }
    .badge { background: #1a1a1a; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; }
    .badge.banned { background: #d9534f; }
    .error, .empty { color: #999; text-align: center; padding: 30px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 20px; margin-bottom: 20px; }
    .card h3 { margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px; }
    .field input, .field textarea {
      width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;
    }
    .field textarea { min-height: 60px; }
    .row2 { display: flex; gap: 10px; }
    .row2 > div { flex: 1; }
    button.btn {
      background: #1a1a1a; color: #fff; border: none; padding: 9px 16px; font-size: 12px;
      letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; border-radius: 4px;
    }
    button.btn:hover { background: #333; }
    button.btn.small { padding: 5px 10px; font-size: 11px; }
    button.btn.danger { background: #d9534f; }
    button.btn.danger:hover { background: #c9302c; }
    button.btn.ghost { background: #fff; color: #1a1a1a; border: 1px solid #ccc; }
    img.slip { max-width: 160px; border-radius: 4px; border: 1px solid #ddd; }
    .msg { font-size: 12px; margin-top: 8px; }
    .msg.ok { color: #4a5d4a; }
    .msg.err { color: #d9534f; }
    a.back { font-size: 12px; color: #666; text-decoration: none; }
    a.back:hover { color: #1a1a1a; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:22px;">🎙️</div>
    <h1>Ko Paing AI Voice Studio — Admin</h1>
  </div>
  <a href="/studio" class="back">← Back to User Panel</a>

  <div class="tabs" style="margin-top:16px;">
    <div class="tab active" data-tab="users">Users</div>
    <div class="tab" data-tab="requests">Requests</div>
    <div class="tab" data-tab="voices">Voices</div>
    <div class="tab" data-tab="plans">Plans</div>
    <div class="tab" data-tab="settings">Settings</div>
    <div class="tab" data-tab="purchases">Purchases</div>
    <div class="tab" data-tab="notify">Notify User</div>
    <div class="tab" data-tab="broadcast">Broadcast</div>
  </div>

  <div class="panel active" id="panel-users"><div class="empty">Loading…</div></div>
  <div class="panel" id="panel-requests"></div>
  <div class="panel" id="panel-voices"></div>
  <div class="panel" id="panel-plans"></div>
  <div class="panel" id="panel-settings"></div>
  <div class="panel" id="panel-purchases"><div class="empty">Loading…</div></div>
  <div class="panel" id="panel-notify"></div>
  <div class="panel" id="panel-broadcast"></div>

  <script>
    // Telegram display name/username တွေက user ကိုယ်တိုင် လွတ်လပ်စွာ ပြောင်းလို့ရလို့ (attacker-controlled
    // ဖြစ်နိုင်လို့) — admin dashboard ထဲမှာ innerHTML နဲ့ ပြသတဲ့နေရာတိုင်းမှာ escape မလုပ်ရင်
    // stored XSS ဖြစ်ပြီး admin ရဲ့ session token ကို ခိုးယူနိုင်ပါတယ်။ ဒါကြောင့် user-controlled
    // text တိုင်းကို ဒီ function ကနေ ဖြတ်သွားရမည် (HTML tag/attribute အဖြစ် အလုပ်မလုပ်စေရန်)
    function escapeHtml(s) {
      if (s === null || s === undefined) return '';
      return String(s)
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');
    }
    const token = sessionStorage.getItem('admin_token');
    if (!token) window.location.href = '/';

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'plans') loadPlans();
        if (tab.dataset.tab === 'settings') loadSettings();
        if (tab.dataset.tab === 'purchases') loadPurchases();
        if (tab.dataset.tab === 'notify') loadNotifyPanel();
        if (tab.dataset.tab === 'broadcast') loadBroadcastPanel();
        if (tab.dataset.tab === 'requests') loadRequestsPanel();
        if (tab.dataset.tab === 'voices') loadVoicePresetsPanel();
      });
    });

    async function api(path, extra) {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...(extra || {}) })
      });
      const data = await res.json();
      if (res.status === 401) window.location.href = '/';
      return { ok: res.ok, data };
    }

    // ---------------- USERS ----------------
    async function loadUsers() {
      const wrap = document.getElementById('panel-users');
      const { ok, data } = await api('/api/admin/users');
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load users') + '</div>';
        return;
      }
      if (!data.users.length) {
        wrap.innerHTML = '<div class="empty">No users yet.</div>';
        return;
      }
      const rows = data.users.map(u => \`
        <tr>
          <td>\${u.id}</td>
          <td>\${escapeHtml(u.name) || '-'}</td>
          <td>\${u.username ? '@' + escapeHtml(u.username) : '-'}</td>
          <td>\${u.credits ?? 0}</td>
          <td>\${u.is_admin ? '<span class="badge">ADMIN</span>' : ''} \${u.is_banned ? '<span class="badge banned">BANNED</span>' : ''}</td>
          <td style="white-space:nowrap;">
            <input type="number" id="creditAmt-\${u.id}" placeholder="±amount" style="width:90px; padding:6px 8px; font-size:12px; border:1px solid #ccc; border-radius:4px; margin-right:4px;">
            <button class="btn small ghost" onclick="adjustCredits('\${u.id}')">Add Credits</button>
            <button class="btn small ghost" onclick="viewUserRequests('\${u.id}')">Requests</button>
            <button class="btn small \${u.is_banned ? 'ghost' : 'danger'}" onclick="toggleBan('\${u.id}', \${u.is_banned ? 0 : 1})">\${u.is_banned ? 'Unban' : 'Ban'}</button>
          </td>
        </tr>
      \`).join('');
      wrap.innerHTML = \`<table><thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Credits</th><th>Status</th><th>Action</th></tr></thead><tbody>\${rows}</tbody></table>\`;
    }

    async function toggleBan(userId, banned) {
      const { ok, data } = await api('/api/admin/users/ban', { userId, banned: !!banned });
      if (ok && data.success) loadUsers();
      else alert(data.error || 'Failed');
    }

    async function adjustCredits(userId) {
      const input = document.getElementById('creditAmt-' + userId);
      const amount = Number(input.value);
      if (!amount) { alert('Amount ကို ဂဏန်းအနေနဲ့ ထည့်ပေးပါ (နုတ်ချင်ရင် -100 လိုမျိုး ထည့်နိုင်ပါသည်)'); return; }
      const { ok, data } = await api('/api/admin/users/credits', { userId, amount });
      if (ok && data.success) {
        input.value = '';
        loadUsers();
      } else {
        alert(data.error || 'Failed');
      }
    }

    // ---------------- REQUESTS ----------------
    let pendingRequestsFilter = '';

    function viewUserRequests(userId) {
      pendingRequestsFilter = userId;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const tab = document.querySelector('.tab[data-tab="requests"]');
      tab.classList.add('active');
      document.getElementById('panel-requests').classList.add('active');
      loadRequestsPanel();
    }

    function requestStatusBadge(status) {
      const map = {
        COMPLETED: ['badge', '#1a7a44', 'Completed'],
        FAILED: ['badge', '#c0392b', 'Failed'],
        CANCELLED: ['badge', '#888', 'Cancelled'],
        IN_PROGRESS: ['badge', '#a17a1c', 'In Progress'],
        IN_QUEUE: ['badge', '#a17a1c', 'Queued'],
      };
      const [cls, color, label] = map[status] || ['badge', '#888', status || 'Unknown'];
      return '<span class="' + cls + '" style="background:' + color + ';">' + label + '</span>';
    }

    async function loadRequestsPanel() {
      const wrap = document.getElementById('panel-requests');
      wrap.innerHTML = \`
        <div class="card">
          <h3>Filter</h3>
          <div class="row2">
            <div class="field" style="margin-bottom:0;">
              <label>User ID (blank = all users)</label>
              <input id="reqFilterUserId" value="\${pendingRequestsFilter}" placeholder="Telegram User ID">
            </div>
          </div>
          <button class="btn small" style="margin-top:10px;" onclick="applyRequestsFilter()">Search</button>
          <button class="btn small ghost" style="margin-top:10px;" onclick="clearRequestsFilter()">Clear</button>
        </div>
        <div id="requestsTableWrap"><div class="empty">Loading…</div></div>
      \`;
      await fetchAndRenderRequests();
    }

    function applyRequestsFilter() {
      pendingRequestsFilter = document.getElementById('reqFilterUserId').value.trim();
      fetchAndRenderRequests();
    }

    function clearRequestsFilter() {
      pendingRequestsFilter = '';
      document.getElementById('reqFilterUserId').value = '';
      fetchAndRenderRequests();
    }

    async function fetchAndRenderRequests() {
      const wrap = document.getElementById('requestsTableWrap');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/requests/list', pendingRequestsFilter ? { userId: pendingRequestsFilter } : {});
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load requests') + '</div>';
        return;
      }
      if (!data.requests.length) {
        wrap.innerHTML = '<div class="empty">Request မတွေ့ပါ</div>';
        return;
      }
      const rows = data.requests.map(r => \`
        <tr>
          <td>\${escapeHtml(r.user_name) || '-'}\${r.user_username ? ' (@' + escapeHtml(r.user_username) + ')' : ''}<br><span style="color:#999;">\${r.user_id}</span></td>
          <td>\${r.source === 'api' ? 'Public API' : 'Voice Studio'}</td>
          <td>\${r.text_length}</td>
          <td>\${requestStatusBadge(r.status)}</td>
          <td>\${r.credits_charged}</td>
          <td style="max-width:200px; white-space:normal; color:#c0392b;">\${escapeHtml(r.error_message) || '-'}</td>
          <td>\${new Date(r.created_at + 'Z').toLocaleString()}</td>
        </tr>
      \`).join('');
      wrap.innerHTML = \`<table><thead><tr><th>User</th><th>Source</th><th>Chars</th><th>Status</th><th>Credits Used</th><th>Error</th><th>Time</th></tr></thead><tbody>\${rows}</tbody></table>\`;
    }

    // ---------------- VOICE PRESETS ----------------
    let newPresetAudioBase64 = null;

    async function loadVoicePresetsPanel() {
      const wrap = document.getElementById('panel-voices');
      wrap.innerHTML = \`
        <div class="card">
          <h3>Voice အသစ် Upload လုပ်ရန်</h3>
          <p style="font-size:12.5px; color:#666; margin-top:0;">Audio file တစ်ခု upload လုပ်ပြီး နာမည်ပေးပါ (ဥပမာ — Audio Book, News Voice)။ User တွေက Voice Studio ထဲက dropdown ကနေ ဒီနာမည်နဲ့ ရွေးနိုင်ပြီး အဲ့ဒီအသံအတိုင်း generate ဖြစ်ပါမည်။</p>
          <div class="field">
            <label>Voice Name</label>
            <input id="presetName" placeholder="e.g. Audio Book">
          </div>
          <div class="field">
            <label>Audio File (WAV / MP3, စက္ကန့်အနည်းငယ်ရှိတဲ့ file တို)</label>
            <input type="file" id="presetAudioFile" accept="audio/*">
            <div id="presetFileStatus" style="font-size:11.5px; color:#999; margin-top:6px;"></div>
          </div>
          <div class="field">
            <label>Transcript <span style="color:#999; font-weight:400;">(optional — sample ထဲက စာသား, cloning quality တိုးစေသည်)</span></label>
            <input id="presetPromptText" placeholder="Sample audio ထဲမှာ ပြောထားတဲ့ စာသား">
          </div>
          <button class="btn small" onclick="createVoicePreset()">Upload Voice</button>
          <div class="msg" id="presetCreateMsg"></div>
        </div>
        <div id="presetsListWrap"><div class="empty">Loading…</div></div>
      \`;

      document.getElementById('presetAudioFile').addEventListener('change', (e) => {
        const f = e.target.files[0];
        newPresetAudioBase64 = null;
        if (!f) return;
        const statusEl = document.getElementById('presetFileStatus');
        if (f.size > 3_000_000) {
          statusEl.textContent = 'File ကြီးလွန်းပါသည် (max ~3MB) — file တို/compress လုပ်ထားတဲ့ file သုံးပါ';
          statusEl.style.color = '#c0392b';
          e.target.value = '';
          return;
        }
        statusEl.textContent = 'Reading ' + f.name + '…';
        statusEl.style.color = '#999';
        const reader = new FileReader();
        reader.onload = () => {
          newPresetAudioBase64 = reader.result.split(',')[1];
          statusEl.textContent = f.name + ' ✓ ready to upload';
          statusEl.style.color = '#1a7a44';
        };
        reader.readAsDataURL(f);
      });

      await fetchAndRenderVoicePresets();
    }

    async function createVoicePreset() {
      const name = document.getElementById('presetName').value.trim();
      const promptText = document.getElementById('presetPromptText').value.trim();
      const msgEl = document.getElementById('presetCreateMsg');
      msgEl.className = 'msg';
      msgEl.textContent = '';

      if (!name) { msgEl.className = 'msg err'; msgEl.textContent = 'Voice Name ထည့်ပေးပါ'; return; }
      if (!newPresetAudioBase64) { msgEl.className = 'msg err'; msgEl.textContent = 'Audio file ရွေးပေးပါ'; return; }

      const { ok, data } = await api('/api/admin/voice-presets/create', {
        name, audioBase64: newPresetAudioBase64, promptText: promptText || undefined
      });
      if (ok && data.success) {
        msgEl.className = 'msg ok'; msgEl.textContent = 'Upload ပြီးပါပြီ!';
        document.getElementById('presetName').value = '';
        document.getElementById('presetPromptText').value = '';
        document.getElementById('presetAudioFile').value = '';
        document.getElementById('presetFileStatus').textContent = '';
        newPresetAudioBase64 = null;
        fetchAndRenderVoicePresets();
      } else {
        msgEl.className = 'msg err'; msgEl.textContent = data.error || 'Failed';
      }
    }

    async function fetchAndRenderVoicePresets() {
      const wrap = document.getElementById('presetsListWrap');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/voice-presets/list');
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load') + '</div>';
        return;
      }
      if (!data.presets.length) {
        wrap.innerHTML = '<div class="empty">Voice preset မရှိသေးပါ</div>';
        return;
      }
      const rows = data.presets.map(p => \`
        <tr>
          <td>\${p.name}</td>
          <td>\${p.prompt_text || '-'}</td>
          <td>\${new Date(p.created_at + 'Z').toLocaleString()}</td>
          <td style="white-space:nowrap;">
            <button class="btn small ghost" onclick="previewVoicePreset(\${p.id})">Play</button>
            <button class="btn small danger" onclick="deleteVoicePreset(\${p.id})">Delete</button>
          </td>
        </tr>
        <tr id="presetAudioRow-\${p.id}" style="display:none;"><td colspan="4"><audio id="presetAudio-\${p.id}" controls style="width:100%;"></audio></td></tr>
      \`).join('');
      wrap.innerHTML = \`<table><thead><tr><th>Name</th><th>Transcript</th><th>Uploaded</th><th>Action</th></tr></thead><tbody>\${rows}</tbody></table>\`;
    }

    async function previewVoicePreset(id) {
      const row = document.getElementById('presetAudioRow-' + id);
      const audioEl = document.getElementById('presetAudio-' + id);
      if (row.style.display !== 'none') { row.style.display = 'none'; return; }
      if (!audioEl.src) {
        const { ok, data } = await api('/api/admin/voice-presets/get', { id });
        if (!ok || !data.success) { alert(data.error || 'Failed to load audio'); return; }
        audioEl.src = 'data:audio/wav;base64,' + data.preset.audio_base64;
      }
      row.style.display = '';
    }

    async function deleteVoicePreset(id) {
      if (!confirm('ဒီ voice preset ကို ဖျက်မှာ သေချာပါသလား?')) return;
      const { ok, data } = await api('/api/admin/voice-presets/delete', { id });
      if (ok && data.success) fetchAndRenderVoicePresets();
      else alert(data.error || 'Failed');
    }

    // ---------------- PLANS ----------------
    async function loadPlans() {
      const wrap = document.getElementById('panel-plans');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/plans/list');
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load plans') + '</div>';
        return;
      }

      const rows = data.plans.map(p => \`
        <tr>
          <td>\${p.name}</td>
          <td>\${p.price || '-'}</td>
          <td>\${p.price_th || '-'}</td>
          <td>\${p.credits}</td>
          <td>\${p.description || '-'}</td>
          <td>\${p.is_active ? 'Active' : 'Hidden'}</td>
          <td>
            <button class="btn small ghost" onclick="editPlanPrice(\${p.id}, \${JSON.stringify(p.price || '')}, \${JSON.stringify(p.price_th || '')})">Edit Price</button>
            <button class="btn small ghost" onclick="toggleActive(\${p.id}, \${p.is_active ? 0 : 1})">\${p.is_active ? 'Hide' : 'Show'}</button>
            <button class="btn small danger" onclick="deletePlan(\${p.id})">Delete</button>
          </td>
        </tr>
      \`).join('');

      wrap.innerHTML = \`
        <div class="card">
          <h3>Add New Plan</h3>
          <div class="row2">
            <div class="field"><label>Name</label><input id="newPlanName" placeholder="e.g. Starter"></div>
            <div class="field"><label>Credits</label><input id="newPlanCredits" type="number" placeholder="e.g. 5000"></div>
          </div>
          <div class="row2">
            <div class="field"><label>Price (Myanmar - MMK)</label><input id="newPlanPrice" placeholder="e.g. 5000 MMK"></div>
            <div class="field"><label>Price (Thailand - THB)</label><input id="newPlanPriceTh" placeholder="e.g. 150 THB"></div>
          </div>
          <div class="field"><label>Description</label><textarea id="newPlanDesc" placeholder="Optional description"></textarea></div>
          <button class="btn" onclick="createPlan()">Add Plan</button>
          <div class="msg" id="planMsg"></div>
        </div>
        <table><thead><tr><th>Name</th><th>Price (MMK)</th><th>Price (THB)</th><th>Credits</th><th>Description</th><th>Status</th><th>Action</th></tr></thead><tbody>\${rows || ''}</tbody></table>
        \${!data.plans.length ? '<div class="empty">No plans yet — add one above.</div>' : ''}
      \`;
    }

    async function createPlan() {
      const name = document.getElementById('newPlanName').value.trim();
      const price = document.getElementById('newPlanPrice').value.trim();
      const priceTh = document.getElementById('newPlanPriceTh').value.trim();
      const credits = document.getElementById('newPlanCredits').value.trim();
      const description = document.getElementById('newPlanDesc').value.trim();
      const msg = document.getElementById('planMsg');
      if (!name || !credits) { msg.textContent = 'Name and Credits လိုအပ်ပါသည်'; msg.className = 'msg err'; return; }

      const { ok, data } = await api('/api/admin/plans/create', { name, price, priceTh, credits, description });
      if (ok && data.success) { msg.textContent = 'Added!'; msg.className = 'msg ok'; loadPlans(); }
      else { msg.textContent = data.error || 'Failed'; msg.className = 'msg err'; }
    }

    async function editPlanPrice(id, currentPrice, currentPriceTh) {
      const price = prompt('Price (Myanmar - MMK):', currentPrice || '');
      if (price === null) return;
      const priceTh = prompt('Price (Thailand - THB):', currentPriceTh || '');
      if (priceTh === null) return;
      const { ok, data } = await api('/api/admin/plans/update', { id, price, priceTh });
      if (ok && data.success) loadPlans(); else alert(data.error || 'Failed');
    }

    async function toggleActive(id, isActive) {
      const { ok, data } = await api('/api/admin/plans/update', { id, is_active: !!isActive });
      if (ok && data.success) loadPlans(); else alert(data.error || 'Failed');
    }

    async function deletePlan(id) {
      if (!confirm('Delete this plan?')) return;
      const { ok, data } = await api('/api/admin/plans/delete', { id });
      if (ok && data.success) loadPlans(); else alert(data.error || 'Failed');
    }

    // ---------------- SETTINGS ----------------
    let paymentMethodsData = [];
    let currentPayCountry = 'MM';

    async function loadSettings() {
      const wrap = document.getElementById('panel-settings');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/settings/get');
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load settings') + '</div>';
        return;
      }
      wrap.innerHTML = \`
        <div class="card">
          <h3>Signup Bonus</h3>
          <div class="field"><label>Bonus Credits (new user တစ်ယောက်ချင်းကို auto ပေးမည့် credits)</label>
            <input id="signupBonus" type="number" value="\${data.signupBonus || 0}"></div>
          <button class="btn" onclick="saveSignupBonus()">Save</button>
          <div class="msg" id="bonusMsg"></div>
        </div>
        <div class="card">
          <h3>Referral Program</h3>
          <div class="row2">
            <div class="field"><label>Referrer Bonus (လူသစ် ခေါ်လာသူ ရမည့် credits)</label>
              <input id="referralBonusReferrer" type="number" value="\${data.referralBonusReferrer || 0}"></div>
            <div class="field"><label>Referred Bonus (Referral code နဲ့ ဝင်လာသူ ရမည့် ထပ်ဆောင်း credits)</label>
              <input id="referralBonusReferred" type="number" value="\${data.referralBonusReferred || 0}"></div>
          </div>
          <button class="btn" onclick="saveReferralBonus()">Save</button>
          <div class="msg" id="referralMsg"></div>
        </div>
        <div class="card">
          <h3>Payment Setup</h3>
          <div class="row2" style="margin-bottom:12px;">
            <button class="btn small" id="payCountryMM" onclick="switchPayCountry('MM')">🇲🇲 Myanmar</button>
            <button class="btn small ghost" id="payCountryTH" onclick="switchPayCountry('TH')">🇹🇭 Thailand</button>
          </div>
          <div class="field"><label>Payment Method (e.g. KBZPay, Wave Pay / PromptPay, TrueMoney)</label><input id="payMethod"></div>
          <div class="row2">
            <div class="field"><label>Account Name</label><input id="payName"></div>
            <div class="field"><label>Account Number</label><input id="payNumber"></div>
          </div>
          <div class="field"><label>Note / Instructions</label><textarea id="payNote"></textarea></div>
          <button class="btn" onclick="savePaymentInfo()">Save</button>
          <div class="msg" id="paymentMsg"></div>
        </div>
      \`;

      await loadPaymentMethods();
    }

    async function saveSignupBonus() {
      const signupBonus = document.getElementById('signupBonus').value;
      const msg = document.getElementById('bonusMsg');
      const { ok, data } = await api('/api/admin/settings/update', { signupBonus });
      msg.textContent = ok && data.success ? 'Saved!' : (data.error || 'Failed');
      msg.className = 'msg ' + (ok && data.success ? 'ok' : 'err');
    }

    async function saveReferralBonus() {
      const referralBonusReferrer = document.getElementById('referralBonusReferrer').value;
      const referralBonusReferred = document.getElementById('referralBonusReferred').value;
      const msg = document.getElementById('referralMsg');
      const { ok, data } = await api('/api/admin/settings/update', { referralBonusReferrer, referralBonusReferred });
      msg.textContent = ok && data.success ? 'Saved!' : (data.error || 'Failed');
      msg.className = 'msg ' + (ok && data.success ? 'ok' : 'err');
    }

    async function loadPaymentMethods() {
      const { ok, data } = await api('/api/admin/payment-methods/list');
      paymentMethodsData = (ok && data.success) ? data.methods : [];
      fillPayForm(currentPayCountry);
    }

    function fillPayForm(country) {
      currentPayCountry = country;
      document.getElementById('payCountryMM').className = 'btn small' + (country === 'MM' ? '' : ' ghost');
      document.getElementById('payCountryTH').className = 'btn small' + (country === 'TH' ? '' : ' ghost');
      const m = paymentMethodsData.find(x => (x.country || 'MM') === country) || {};
      document.getElementById('payMethod').value = m.method || '';
      document.getElementById('payName').value = m.account_name || '';
      document.getElementById('payNumber').value = m.account_number || '';
      document.getElementById('payNote').value = m.note || '';
    }

    function switchPayCountry(country) {
      fillPayForm(country);
    }

    async function savePaymentInfo() {
      const method = document.getElementById('payMethod').value.trim();
      const accountName = document.getElementById('payName').value.trim();
      const accountNumber = document.getElementById('payNumber').value.trim();
      const note = document.getElementById('payNote').value.trim();
      const msg = document.getElementById('paymentMsg');
      if (!method) { msg.textContent = 'Payment method name လိုအပ်ပါသည်'; msg.className = 'msg err'; return; }

      const existing = paymentMethodsData.find(x => (x.country || 'MM') === currentPayCountry);
      const { ok, data } = existing
        ? await api('/api/admin/payment-methods/update', { id: existing.id, method, accountName, accountNumber, note, country: currentPayCountry, is_active: true })
        : await api('/api/admin/payment-methods/create', { method, accountName, accountNumber, note, country: currentPayCountry });

      msg.textContent = ok && data.success ? 'Saved!' : (data.error || 'Failed');
      msg.className = 'msg ' + (ok && data.success ? 'ok' : 'err');
      if (ok && data.success) await loadPaymentMethods();
    }

    // ---------------- PURCHASES ----------------
    async function loadPurchases() {
      const wrap = document.getElementById('panel-purchases');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/purchases/list', { status: 'pending' });
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load purchases') + '</div>';
        return;
      }
      if (!data.purchases.length) {
        wrap.innerHTML = '<div class="empty">Pending purchase request မရှိပါ။</div>';
        return;
      }
      wrap.innerHTML = data.purchases.map(p => \`
        <div class="card">
          <div><b>\${p.plan_name}</b> — \${p.credits} credits (\${p.price})</div>
          <div style="font-size:12px;color:#888;margin:6px 0;">User ID: \${p.user_id} · \${p.created_at}</div>
          <img class="slip" src="\${p.slip_image}" alt="Payment slip">
          <div style="margin-top:12px;">
            <button class="btn" onclick="reviewPurchase(\${p.id}, true)">Approve</button>
            <button class="btn danger" onclick="reviewPurchase(\${p.id}, false)">Reject</button>
          </div>
        </div>
      \`).join('');
    }

    async function reviewPurchase(purchaseId, approve) {
      const { ok, data } = await api('/api/admin/purchases/review', { purchaseId, approve });
      if (ok && data.success) loadPurchases(); else alert(data.error || 'Failed');
    }

    function loadNotifyPanel() {
      const wrap = document.getElementById('panel-notify');
      wrap.innerHTML = \`
        <div class="card">
          <h3>User ကို Telegram Message ပို့ပါ</h3>
          <div class="field"><label>User Telegram ID (Users tab ထဲက ID ကို copy ယူနိုင်ပါသည်)</label>
            <input id="notifyUserId" placeholder="e.g. 123456789"></div>
          <div class="field"><label>Message (Server ပြုပြင်နေချိန်, အသိပေးစာ စသည်)</label>
            <textarea id="notifyMessage" rows="5" placeholder="ဥပမာ - Server ကို မိနစ်အနည်းငယ် ပြုပြင်နေပါသဖြင့် ခဏအတွင်း ပြန်လည် အသုံးပြုနိုင်ပါမည်။"></textarea></div>
          <button class="btn" onclick="sendUserNotification()">Send</button>
          <div class="msg" id="notifyMsg"></div>
        </div>
      \`;
    }

    async function sendUserNotification() {
      const userId = document.getElementById('notifyUserId').value.trim();
      const message = document.getElementById('notifyMessage').value.trim();
      const msg = document.getElementById('notifyMsg');
      if (!userId || !message) {
        msg.textContent = 'User ID နဲ့ Message နှစ်ခုစလုံး ဖြည့်ပေးပါ။';
        msg.className = 'msg err';
        return;
      }
      msg.textContent = 'ပို့နေသည်…';
      msg.className = 'msg';
      const { ok, data } = await api('/api/admin/notify-user', { userId, message });
      if (ok && data.success) {
        msg.textContent = 'ပို့ပြီးပါပြီ ✓';
        msg.className = 'msg ok';
        document.getElementById('notifyMessage').value = '';
      } else {
        msg.textContent = data.error || 'ပို့လို့ မရပါ';
        msg.className = 'msg err';
      }
    }

    let broadcastImageBase64 = null;

    function loadBroadcastPanel() {
      const wrap = document.getElementById('panel-broadcast');
      wrap.innerHTML = \`
        <div class="card">
          <h3>User အားလုံးကို Telegram Broadcast ပို့ပါ</h3>
          <div class="field"><label>Title (optional)</label>
            <input id="broadcastTitle" placeholder="e.g. Server Maintenance Notice"></div>
          <div class="field"><label>Message</label>
            <textarea id="broadcastMessage" rows="5" placeholder="ဥပမာ - Server ကို မိနစ်အနည်းငယ် ပြုပြင်နေပါသဖြင့် ခဏအတွင်း ပြန်လည် အသုံးပြုနိုင်ပါမည်။"></textarea></div>
          <div class="field"><label>Image (optional)</label>
            <input id="broadcastImage" type="file" accept="image/*"></div>
          <button class="btn" onclick="sendBroadcast()">Send to All Users</button>
          <div class="msg" id="broadcastMsg"></div>
        </div>
      \`;
      document.getElementById('broadcastImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        broadcastImageBase64 = null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { broadcastImageBase64 = reader.result.split(',')[1]; };
        reader.readAsDataURL(file);
      });
    }

    async function sendBroadcast() {
      const title = document.getElementById('broadcastTitle').value.trim();
      const message = document.getElementById('broadcastMessage').value.trim();
      const msg = document.getElementById('broadcastMsg');
      if (!message) {
        msg.textContent = 'Message ဖြည့်ပေးပါ။';
        msg.className = 'msg err';
        return;
      }
      if (!confirm('User အားလုံးကို ဒီ message ပို့မှာ သေချာပါသလား?')) return;
      msg.textContent = 'User အားလုံးကို ပို့နေသည်…';
      msg.className = 'msg';
      const { ok, data } = await api('/api/admin/broadcast', { title, message, imageBase64: broadcastImageBase64 });
      if (ok && data.success) {
        msg.textContent = \`ပို့ပြီးပါပြီ — Sent: \${data.sent} / \${data.total} (Failed: \${data.failed})\`;
        msg.className = 'msg ok';
      } else {
        msg.textContent = data.error || 'ပို့လို့ မရပါ';
        msg.className = 'msg err';
      }
    }

    loadUsers();
  </script>
</body>
</html>`;
}

// ===========================================================================
// Regular User Studio Page (placeholder — voice generation UI to be built here)
// ===========================================================================

function getStudioHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ko Paing 🎙️ AI Voice Studio</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
${FAVICON}
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

  :root{
    --ink:      #171a17;
    --paper:    #ffffff;
    --panel:    #ffffff;
    --line:     #e0e6e1;
    --moss:     #1a7a44;
    --moss-dim: #8fbfa2;
    --moss-soft:#eaf7ee;
    --wax:      #c0392b;
    --wax-dim:  #e3a99c;
    --radius-lg: 22px;
    --radius-md: 14px;
    --radius-sm: 10px;
    --shadow-card: 0 1px 2px rgba(23,26,23,0.04), 0 16px 34px -14px rgba(23,26,23,0.16);
    --shadow-soft: 0 8px 20px -10px rgba(23,26,23,0.14);
  }
  *{ box-sizing:border-box; }
  body{
    margin:0;
    background:var(--paper);
    color:var(--ink);
    font-family:'Inter', sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  body::before{
    content:"";
    position:fixed; inset:0; z-index:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(26,122,68,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(26,122,68,0.05) 1px, transparent 1px);
    background-size:26px 26px;
  }
  .wrap{ position:relative; z-index:1; max-width:720px; margin:0 auto; padding:28px 24px 90px; }

  /* ---- top nav: plain set type, no icon pills ---- */
  .masthead-nav{
    display:flex; justify-content:flex-end; align-items:center; gap:20px;
    margin-bottom:34px; font-family:'IBM Plex Mono', monospace; font-size:11px;
    letter-spacing:0.08em; text-transform:uppercase;
  }
  .masthead-nav a{
    color:#8a8374; text-decoration:none; padding-bottom:3px;
    border-bottom:1px solid transparent; transition:color .15s ease, border-color .15s ease;
  }
  .masthead-nav a:hover{ color:var(--moss); border-color:var(--moss); }

  header{ margin-bottom:38px; }
  .eyebrow{
    font-family:'IBM Plex Mono', monospace;
    font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--moss);
    display:flex; align-items:center; gap:8px; margin-bottom:14px;
  }
  .eyebrow .dot{ width:6px; height:6px; border-radius:50%; background:var(--moss-dim); display:inline-block; }
  .eyebrow .dot.live{ background:var(--moss); box-shadow:0 0 0 3px rgba(26,122,68,0.15); }
  .head-row{ display:flex; justify-content:space-between; align-items:flex-end; gap:20px; }
  h1{
    font-family:'Fraunces', serif; font-optical-sizing:auto; font-weight:600;
    font-size:clamp(28px, 5vw, 38px); line-height:1.05; margin:0 0 8px; letter-spacing:-0.01em;
  }
  .sub{ font-size:14px; color:#57534a; max-width:44ch; line-height:1.55; }
  .balance{
    flex-shrink:0; text-align:center; background:var(--moss-soft); border-radius:var(--radius-md);
    padding:10px 20px;
  }
  .balance-num{
    display:block; font-family:'Fraunces', serif; font-weight:600; font-size:24px;
    color:var(--moss); line-height:1;
  }
  .balance-label{
    display:block; font-family:'IBM Plex Mono', monospace; font-size:9.5px; letter-spacing:0.12em;
    text-transform:uppercase; color:#7c9484; margin-top:5px;
  }

  /* ---- the session sheet: stacked stage cards ---- */
  .reel{ position:relative; }
  .stage{ position:relative; }
  .stage + .stage{ margin-top:24px; }
  .stage-body{
    background:var(--panel); border:none; border-radius:var(--radius-lg);
    box-shadow:var(--shadow-card); overflow:hidden;
  }
  .stage-head{
    padding:18px 22px 16px; background:var(--moss);
    display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap;
  }
  .stage-head h2{ font-family:'Fraunces', serif; font-weight:600; font-size:17px; margin:0; color:#fff; }
  .stage-hint{
    font-family:'IBM Plex Mono', monospace; font-size:10.5px; letter-spacing:0.04em;
    color:rgba(255,255,255,0.75); text-transform:none;
  }
  .stage-inner{ padding:22px; }

  label{
    display:flex; align-items:baseline; justify-content:space-between;
    font-family:'IBM Plex Mono', monospace; font-size:10.5px; letter-spacing:0.08em;
    text-transform:uppercase; color:#7a756a; margin-bottom:10px;
  }
  label .req{ color:var(--wax); }
  textarea{
    width:100%; background:#fff; border:1px solid var(--line); border-radius:var(--radius-md);
    padding:12px 14px; font-family:'Fraunces', serif; font-size:17px; color:var(--ink);
    outline:none; resize:vertical; min-height:84px; line-height:1.5;
    transition:border-color .15s ease, box-shadow .15s ease;
  }
  textarea:focus{ border-color:var(--moss); box-shadow:0 0 0 4px rgba(26,122,68,0.12); }
  textarea::placeholder{ color:#b7b0a2; }
  input[type="text"]{
    width:100%; background:#fff; border:1px solid var(--line); border-radius:var(--radius-md);
    padding:11px 14px; font-family:'Inter', sans-serif; font-size:15px; color:var(--ink);
    outline:none; transition:border-color .15s ease, box-shadow .15s ease;
  }
  input[type="text"]:focus{ border-color:var(--moss); box-shadow:0 0 0 4px rgba(26,122,68,0.12); }
  input::placeholder{ color:#b7b0a2; }
  select{
    width:100%; background:#fff; border:1px solid var(--line); border-radius:var(--radius-md);
    padding:11px 14px; font-family:'Inter', sans-serif; font-size:14px; color:var(--ink);
    outline:none; transition:border-color .15s ease, box-shadow .15s ease;
  }
  select:focus{ border-color:var(--moss); box-shadow:0 0 0 4px rgba(26,122,68,0.12); }
  .voicetype{ margin-top:20px; }
  .tabs{
    display:flex; gap:6px; background:var(--moss-soft); border-radius:var(--radius-md);
    padding:4px; margin-bottom:4px;
  }
  .tab-btn{
    flex:1; border:none; background:none; padding:10px 14px; cursor:pointer;
    border-radius:calc(var(--radius-md) - 4px); font-family:'IBM Plex Mono', monospace;
    font-size:11.5px; letter-spacing:0.06em; text-transform:uppercase; color:#5f7c6c;
    transition:background .15s ease, color .15s ease;
  }
  .tab-btn.active{ background:var(--moss); color:#fff; box-shadow:var(--shadow-soft); }
  .tab-panel{ margin-top:20px; }
  .tab-panel:first-child{ margin-top:0; }
  .charcount{ text-align:right; font-family:'IBM Plex Mono', monospace; font-size:11px; color:#a39c8c; margin-top:6px; }
  .charcount.over{ color:var(--wax); }

  .dropzone{
    border:1.5px dashed #cfc7b6; border-radius:var(--radius-md); padding:18px; display:flex; align-items:center;
    gap:14px; cursor:pointer; transition:border-color .15s ease, background .15s ease;
  }
  .dropzone:hover, .dropzone.drag{ border-color:var(--moss); background:var(--moss-soft); }
  .dropzone .glyph{
    width:34px; height:34px; border-radius:50%; border:none; background:var(--moss);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; font-size:15px;
  }
  .dropzone .text{ flex:1; min-width:0; }
  .dropzone .filename{
    font-family:'IBM Plex Mono', monospace; font-size:13px; color:var(--ink);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .dropzone .hint{ font-size:12.5px; color:#8f8879; margin-top:2px; }
  .dropzone .clear{
    background:none; border:none; color:var(--wax); font-size:18px; cursor:pointer;
    line-height:1; padding:4px; display:none;
  }
  .dropzone.has-file .clear{ display:block; }
  #refAudioInput{ display:none; }
  .promptline{ margin-top:12px; }
  .promptline input{ font-size:13.5px; }
  .promptline label{ margin-bottom:6px; }
  .optional{ color:#a39c8c; font-weight:400; text-transform:none; letter-spacing:0; }
  .stage-head .optional{ color:rgba(255,255,255,0.75); }

  button.generate{
    width:100%; background:var(--moss); color:#fff; border:none; padding:15px 20px;
    border-radius:var(--radius-md); box-shadow:var(--shadow-soft);
    font-family:'IBM Plex Mono', monospace; font-size:12.5px; letter-spacing:0.1em; text-transform:uppercase;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:background .15s ease;
  }
  button.generate:hover:not(:disabled){ background:#125c34; }
  button.generate:disabled{ background:#c9d3ce; color:#8a938d; cursor:not-allowed; box-shadow:none; }
  .spinner{
    width:12px; height:12px; border-radius:50%; border:2px solid rgba(247,244,238,0.35);
    border-top-color:var(--paper); animation:spin .7s linear infinite; display:none;
  }
  .spinner.on{ display:inline-block; }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .status{
    font-family:'IBM Plex Mono', monospace; font-size:11.5px; color:#7a756a;
    min-height:16px; display:flex; align-items:center; gap:8px; margin-top:12px;
  }
  .status.err{ color:var(--wax); }
  .status.ok{ color:var(--moss); }

  /* ---- the result, styled as a clean rounded card ---- */
  .output{
    margin-top:20px; background:var(--moss-soft); border-radius:var(--radius-md);
    padding:20px; display:none;
  }
  .output.show{ display:block; }
  .output-head{
    font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;
    color:#5f7c6c; margin-bottom:14px;
  }
  .output-head b{ color:var(--ink); font-weight:600; }
  audio{ width:100%; height:42px; }
  .output-foot{ display:flex; justify-content:flex-end; margin-top:16px; }
  .download{
    font-family:'IBM Plex Mono', monospace; font-size:11.5px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--ink); text-decoration:none; border:1px solid var(--ink); border-radius:var(--radius-md); padding:10px 18px;
    display:inline-flex; align-items:center; gap:8px; transition:all .15s ease; flex-shrink:0;
    background:none; cursor:pointer;
  }
  .download:hover{ background:var(--ink); color:var(--paper); }
  .download.disabled{ opacity:0.5; pointer-events:none; }

  footer{
    text-align:center; margin-top:52px; font-family:'IBM Plex Mono', monospace;
    font-size:11px; color:#b7b0a2; letter-spacing:0.04em;
  }
  footer a{ color:#b7b0a2; text-decoration:underline; }
  footer .powered{ margin-top:6px; }

  @media (max-width:520px){
    .wrap{ padding:22px 16px 60px; }
    .head-row{ flex-direction:column; align-items:flex-start; gap:14px; }
    .balance{ text-align:left; }
    .stage-inner{ padding:18px; }
  }
</style>
</head>
<body>

<div class="wrap">

  <nav class="masthead-nav">
    <a href="/plans">Plans</a>
    <a href="/profile">Profile</a>
    <span id="adminLinkWrap"></span>
  </nav>

  <header>
    <div class="eyebrow"><span class="dot live"></span><span id="whoLabel">Ko Paing AI Voice Studio</span></div>
    <div class="head-row">
      <div>
        <h1>Voice Studio</h1>
        <p class="sub">Type a line, hand it a short voice sample, and the studio speaks it back in that voice.</p>
      </div>
      <div class="balance">
        <span class="balance-num" id="creditsNum">–</span>
        <span class="balance-label">Credits</span>
      </div>
    </div>
  </header>

  <div class="reel">

    <section class="stage">
      <div class="stage-body">
        <div class="stage-head">
          <h2>Script</h2>
          <span class="stage-hint">what the voice will say</span>
        </div>
        <div class="stage-inner">
          <label for="textInput">Text to speak <span class="req">*</span></label>
          <textarea id="textInput" placeholder="Write what you want the voice to say…"></textarea>
          <div class="charcount"><span id="charLen">0</span> characters = <span id="charCost">0</span> credits</div>
        </div>
      </div>
    </section>

    <section class="stage">
      <div class="stage-body">
        <div class="stage-head">
          <h2>Voice</h2>
          <span class="stage-hint optional">optional — add a sample to clone it</span>
        </div>
        <div class="stage-inner">
          <div class="tabs" id="voiceTabs">
            <button type="button" class="tab-btn active" data-tab="tts">Text To Speech</button>
            <button type="button" class="tab-btn" data-tab="clone">Voice Clone</button>
          </div>

          <div class="tab-panel" id="tabPanelTts">
            <div class="voicetype" id="voiceTypeWrap">
              <label for="voiceTypeSelect">Voice type</label>
              <select id="voiceTypeSelect">
                <option value="female">အမျိုးသမီးအသံ (Female)</option>
                <option value="male">အမျိုးသားအသံ (Male)</option>
                <option value="multi">Multi Voice (Dialogue)</option>
              </select>
              <div id="multiVoiceHint" style="display:none; font-size:11.5px; color:#888; margin-top:6px; line-height:1.5;">
                Line တစ်ကြောင်းချင်းစီရှေ့မှာ <b>M:</b> (အမျိုးသား) / <b>F:</b> (အမျိုးသမီး) / <b>C:</b> (ကလေး) ထည့်ပါ — ဥပမာ:<br>
                <code>F: မင်္ဂလာပါ<br>M: ဟုတ်ကဲ့ ကူညီပေးပါမယ်<br>C: ကျွန်တော်လည်း ပါချင်တယ်</code>
              </div>
            </div>
          </div>

          <div class="tab-panel" id="tabPanelClone" style="display:none;">
            <div class="voicetype">
              <label for="presetVoiceSelect">Preset voice <span class="optional">(admin ကြိုတင် upload ထားသော အသံများ)</span></label>
              <select id="presetVoiceSelect">
                <option value="">— Upload your own audio —</option>
              </select>
            </div>

            <div id="uploadVoiceWrap" style="margin-top:20px;">
              <div class="dropzone" id="dropzone">
                <div class="glyph">♪</div>
                <div class="text">
                  <div class="filename" id="fileNameLabel">Choose an audio file, or drop one here</div>
                  <div class="hint">WAV or MP3, a clean few seconds of one speaker works best</div>
                </div>
                <button class="clear" id="clearFile" type="button" title="Remove">&times;</button>
              </div>
              <input type="file" id="refAudioInput" accept="audio/*">

              <div class="promptline" id="promptLine" style="display:none;">
                <label for="promptText">What the sample says <span class="optional">(improves cloning)</span></label>
                <input type="text" id="promptText" placeholder="Transcript of the voice sample…">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="stage">
      <div class="stage-body">
        <div class="stage-head">
          <h2>Render</h2>
          <span class="stage-hint">generate and preview the take</span>
        </div>
        <div class="stage-inner">
          <button class="generate" id="generateBtn">
            <span class="spinner" id="spinner"></span>
            <span id="generateLabel">Generate speech</span>
          </button>
          <div class="status" id="statusLine"></div>

          <div class="output" id="output">
            <div class="output-head">Take rendered — <b id="outputMeta">—</b></div>
            <audio id="audioPlayer" controls></audio>
            <div class="output-foot">
              <button class="download" id="sendTelegramBtn" type="button">Telegram ကို ပို့ပါ</button>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <footer>
    AI Voice Studio
    <div class="powered">Power By Ko Paing · <a href="/privacy">Privacy Policy</a></div>
  </footer>
</div>

<script>
(function(){
  const $ = id => document.getElementById(id);

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { try { tg.ready(); } catch(e){} }
  let tgUser = null;
  try { tgUser = JSON.parse(sessionStorage.getItem('tg_user') || 'null'); } catch(e){}
  // Server ဘက်က request တိုင်းကို Telegram initData signature နဲ့ အသစ်ပြန် verify လုပ်ပါသည်
  // (userId ကို client ကနေ တိုက်ရိုက် မယုံတော့ပါ) — ဒါကြောင့် initData ကို fetch တိုင်းမှာ ထည့်ပို့ရပါမည်
  function currentInitData() { return tg && tg.initData ? tg.initData : null; }

  const textEl       = $('textInput');
  const charLenEl     = $('charLen');
  const charCostEl    = $('charCost');
  const charCountWrap = document.querySelector('.charcount');
  const creditsNumEl  = $('creditsNum');
  const whoLabelEl    = $('whoLabel');

  const dropzone      = $('dropzone');
  const refAudioInput = $('refAudioInput');
  const fileNameLabel = $('fileNameLabel');
  const clearFileBtn  = $('clearFile');
  const promptLine    = $('promptLine');
  const promptTextEl  = $('promptText');

  const generateBtn   = $('generateBtn');
  const generateLabel = $('generateLabel');
  const spinner       = $('spinner');
  const statusLine    = $('statusLine');

  const output       = $('output');
  const audioPlayer   = $('audioPlayer');
  const outputMeta     = $('outputMeta');
  const sendTelegramBtn = $('sendTelegramBtn');

  const voiceTypeSelect = $('voiceTypeSelect');
  const voiceTypeWrap = $('voiceTypeWrap');
  const multiVoiceHint = $('multiVoiceHint');
  const presetVoiceSelect = $('presetVoiceSelect');
  const uploadVoiceWrap = $('uploadVoiceWrap');

  const voiceTabBtns  = document.querySelectorAll('#voiceTabs .tab-btn');
  const tabPanelTts   = $('tabPanelTts');
  const tabPanelClone = $('tabPanelClone');

  voiceTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      voiceTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.tab === 'tts') {
        tabPanelTts.style.display = '';
        tabPanelClone.style.display = 'none';
        // Text To Speech tab ကို ပြောင်းလိုက်ရင် Voice Clone ဘက်က ရွေးချယ်ထားတာတွေကို ရှင်းလင်းပါ
        presetVoiceSelect.value = '';
        uploadVoiceWrap.style.display = '';
        clearFileBtn.click();
      } else {
        tabPanelTts.style.display = 'none';
        tabPanelClone.style.display = '';
      }
      updateVoiceTypeVisibility();
    });
  });

  voiceTypeSelect.addEventListener('change', () => {
    multiVoiceHint.style.display = voiceTypeSelect.value === 'multi' ? 'block' : 'none';
  });

  // Voice Type ဟာ reference audio မပါတဲ့အခါမှသာ အလုပ်လုပ်သည် (admin preset ရွေးထားရင်
  // ဖြစ်စေ၊ own audio upload လုပ်ထားရင်ဖြစ်စေ voice_type ကို backend က လျစ်လျူရှုမည်ဖြစ်၍) —
  // ဒါကြောင့် "Upload your own audio" ရွေးထားပြီး audio မတင်ရသေးတဲ့အချိန်မှသာ ပြပေးမည်
  function updateVoiceTypeVisibility(){
    const hasPreset = !!presetVoiceSelect.value;
    const hasUpload = !!refAudioBase64;
    voiceTypeWrap.style.display = (hasPreset || hasUpload) ? 'none' : '';
  }

  presetVoiceSelect.addEventListener('change', () => {
    uploadVoiceWrap.style.display = presetVoiceSelect.value ? 'none' : '';
    updateVoiceTypeVisibility();
  });

  async function loadVoicePresets(){
    try {
      const res = await fetch('/api/voice-presets/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.success && data.presets && data.presets.length) {
        data.presets.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          presetVoiceSelect.appendChild(opt);
        });
      }
    } catch (e) { /* preset list ကို load မရရင် upload-your-own အတိုင်းပဲ ဆက်အလုပ်လုပ်ပါမည် */ }
  }
  loadVoicePresets();

  let refAudioBase64 = null;
  let currentCredits = 0;
  let polling = false;
  let lastAudioBase64 = null;
  let lastAudioFormat = null;

  updateVoiceTypeVisibility();

  if (!tgUser || !tgUser.id) {
    statusLine.textContent = 'Telegram App ကနေ ပြန်ဝင်ပေးပါ။';
    statusLine.className = 'status err';
    generateBtn.disabled = true;
  } else {
    whoLabelEl.textContent = 'Hi, ' + (tgUser.first_name || tgUser.username || 'there') + '!';
    if (tgUser.isAdmin) {
      $('adminLinkWrap').innerHTML = '<a href="/admin">Admin</a>';
    }
    loadCredits();
  }

  async function loadCredits(){
    try {
      const res = await fetch('/api/user/get', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ initData: currentInitData() })
      });
      const data = await res.json();
      currentCredits = data.user ? (data.user.credits || 0) : 0;
      creditsNumEl.textContent = currentCredits;
    } catch(e){
      creditsNumEl.textContent = '?';
    }
  }

  textEl.addEventListener('input', () => {
    const len = textEl.value.trim().length;
    charLenEl.textContent = textEl.value.length;
    charCostEl.textContent = len;
    charCountWrap.classList.toggle('over', len > currentCredits);
  });

  function handleFile(file){
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setStatus('That file doesn\\'t look like audio.', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      refAudioBase64 = reader.result.split(',')[1];
      fileNameLabel.textContent = file.name;
      dropzone.classList.add('has-file');
      promptLine.style.display = 'block';
      updateVoiceTypeVisibility();
    };
    reader.onerror = () => setStatus('Could not read that file.', 'err');
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', () => refAudioInput.click());
  refAudioInput.addEventListener('change', e => handleFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag'); })
  );
  ['dragleave','drop'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag'); })
  );
  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  clearFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    refAudioBase64 = null;
    refAudioInput.value = '';
    fileNameLabel.textContent = 'Choose an audio file, or drop one here';
    dropzone.classList.remove('has-file');
    promptLine.style.display = 'none';
    promptTextEl.value = '';
    updateVoiceTypeVisibility();
  });

  function setStatus(msg, kind){
    statusLine.textContent = msg || '';
    statusLine.className = 'status' + (kind ? ' ' + kind : '');
  }
  function setBusy(isBusy){
    generateBtn.disabled = isBusy;
    spinner.classList.toggle('on', isBusy);
    generateLabel.textContent = isBusy ? 'Generating…' : 'Generate speech';
  }

  generateBtn.addEventListener('click', async () => {
    if (polling || !tgUser) return;

    const text = textEl.value.trim();
    if (!text) { setStatus('Write something for the voice to say.', 'err'); return; }
    if (text.length > currentCredits) {
      setStatus('Credits မလုံလောက်ပါ (လိုအပ်: ' + text.length + ', လက်ကျန်: ' + currentCredits + ')', 'err');
      return;
    }

    output.classList.remove('show');
    setBusy(true);
    setStatus('Sending request…');

    try {
      const startRes = await fetch('/api/generate', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          initData: currentInitData(),
          text,
          refAudioBase64: presetVoiceSelect.value ? undefined : (refAudioBase64 || undefined),
          promptText: promptTextEl.value.trim() || undefined,
          voiceType: voiceTypeSelect.value,
          voicePresetId: presetVoiceSelect.value || undefined
        })
      });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || 'Request failed');
      }

      // မှတ်ချက်: Credits ကို job အောင်မြင်စွာ ပြီးမြောက်မှသာ နုတ်မည်ဖြစ်၍
      // ဒီနေရာမှာ balance ကို ကြိုတင်မလျှော့ချပါ — pollForResult ပြီးမှ loadCredits() ဖြင့် sync လုပ်ပါမည်

      polling = true;
      await pollForResult(startData.jobId, startData.cost);

    } catch (err) {
      setStatus(err.message || 'Something went wrong.', 'err');
    } finally {
      setBusy(false);
      polling = false;
    }
  });

  async function pollForResult(jobId, cost){
    const started = Date.now();
    const timeoutMs = 5 * 60 * 1000;

    while (true) {
      if (Date.now() - started > timeoutMs) {
        throw new Error('Timed out waiting for the worker. Try again shortly.');
      }

      const res = await fetch('/api/generate/status', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ initData: currentInitData(), jobId })
      });
      const data = await res.json();

      if (data.status === 'IN_QUEUE') {
        setStatus('Waiting in queue…');
      } else if (data.status === 'IN_PROGRESS') {
        setStatus('Generating audio…');
      } else if (data.status === 'COMPLETED') {
        const out = data.output || {};
        if (out.error) throw new Error(out.error);
        if (!out.audio_base64) throw new Error('Finished but returned no audio.');
        await renderAudio(out);
        await loadCredits();
        setStatus('Done.', 'ok');
        return;
      } else if (data.status === 'FAILED') {
        throw new Error(data.error || 'The worker reported a failure. No credits were charged.');
      } else if (data.status === 'CANCELLED') {
        throw new Error('Job was cancelled. No credits were charged.');
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  async function renderAudio(out){
    const fmt = out.format || 'wav';
    const mime = fmt === 'mp3' ? 'audio/mpeg' : ('audio/' + fmt);
    const src = 'data:' + mime + ';base64,' + out.audio_base64;

    audioPlayer.src = src;
    outputMeta.textContent = out.sample_rate ? (out.sample_rate + ' Hz · ' + fmt.toUpperCase()) : fmt.toUpperCase();

    lastAudioBase64 = out.audio_base64;
    lastAudioFormat = fmt;

    output.classList.add('show');
    output.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  sendTelegramBtn.addEventListener('click', async () => {
    if (!lastAudioBase64 || !tgUser || !tgUser.id) return;
    const original = sendTelegramBtn.textContent;
    sendTelegramBtn.disabled = true;
    sendTelegramBtn.textContent = 'ပို့နေသည်…';
    try {
      const res = await fetch('/api/generate/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: currentInitData(), audioBase64: lastAudioBase64, format: lastAudioFormat })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('Telegram chat ထဲကို Audio ပို့ပြီးပါပြီ ✓', 'ok');
      } else {
        setStatus(data.error || 'Telegram ကို ပို့လို့ မရပါ။', 'err');
      }
    } catch (e) {
      setStatus('Network error — Telegram ကို ပို့လို့ မရပါ။', 'err');
    } finally {
      sendTelegramBtn.disabled = false;
      sendTelegramBtn.textContent = original;
    }
  });
})();
</script>

</body>
</html>`;
}

// ===========================================================================
// User-facing Plans Page (browse plans, buy with payment slip upload)
// ===========================================================================

function getPlansHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plans · Ko Paing AI Voice Studio</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  ${FAVICON}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f6f0;
      margin: 0;
      padding: 20px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .top { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .top h1 { font-size: 16px; margin: 0; letter-spacing: 0.5px; }
    a.back { font-size: 12px; color: #666; text-decoration: none; }
    .country-switch { display: flex; gap: 8px; margin: 16px 0 6px; }
    .country-switch .c-btn {
      flex: 1; padding: 9px; border-radius: 6px; border: 1px solid #ddd; background: #fff;
      font-size: 13px; cursor: pointer; color: #666;
    }
    .country-switch .c-btn.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
    .plan-card {
      background: #fff; border-radius: 8px; padding: 18px; margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee;
    }
    .plan-card h3 { margin: 0 0 6px; font-size: 16px; }
    .plan-card .price { font-size: 20px; font-weight: 600; color: #b5482f; margin-bottom: 4px; }
    .plan-card .credits { font-size: 12px; color: #7c8c7c; margin-bottom: 8px; }
    .plan-card .desc { font-size: 13px; color: #666; margin-bottom: 12px; }
    button.buy {
      width: 100%; background: #1a1a1a; color: #fff; border: none; padding: 11px;
      border-radius: 4px; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer;
    }
    .empty, .error { text-align: center; color: #999; padding: 40px 10px; }

    .modal-bg {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10;
      align-items: center; justify-content: center; padding: 20px;
    }
    .modal-bg.show { display: flex; }
    .modal {
      background: #fff; border-radius: 8px; padding: 22px; max-width: 400px; width: 100%;
    }
    .modal h3 { margin: 0 0 10px; font-size: 15px; }
    .payinfo { background: #f7f6f0; border-radius: 6px; padding: 12px; font-size: 13px; margin-bottom: 14px; line-height: 1.6; }
    .payinfo .k { color: #888; font-size: 11px; text-transform: uppercase; }
    .upload-box {
      border: 1px dashed #ccc; border-radius: 6px; padding: 16px; text-align: center;
      cursor: pointer; font-size: 12.5px; color: #888; margin-bottom: 14px;
    }
    .upload-box img { max-width: 100%; max-height: 160px; border-radius: 4px; margin-top: 8px; }
    #slipInput { display: none; }
    .modal-actions { display: flex; gap: 10px; }
    .modal-actions button { flex: 1; padding: 10px; border-radius: 4px; border: none; font-size: 13px; cursor: pointer; }
    .modal-actions .confirm { background: #1a1a1a; color: #fff; }
    .modal-actions .cancel { background: #eee; color: #333; }
    .msg { font-size: 12px; margin-top: 8px; text-align: center; }
    .msg.ok { color: #4a5d4a; }
    .msg.err { color: #d9534f; }
  </style>
</head>
<body>
  <div class="top">
    <div style="font-size:20px;">🎫</div>
    <h1>Plans / Buy Credits</h1>
  </div>
  <a href="/studio" class="back">← Back to Studio</a>

  <div class="country-switch" id="countrySwitch">
    <button class="c-btn active" data-country="MM" onclick="switchCountry('MM')">🇲🇲 Myanmar</button>
    <button class="c-btn" data-country="TH" onclick="switchCountry('TH')">🇹🇭 Thailand</button>
  </div>

  <div id="plansWrap" style="margin-top:16px;"><div class="empty">Loading…</div></div>

  <div class="modal-bg" id="modalBg">
    <div class="modal">
      <h3 id="modalPlanName">Plan</h3>
      <div class="payinfo" id="payInfoBox">Loading payment info…</div>
      <div class="upload-box" id="uploadBox">
        <div id="uploadLabel">📎 Payment slip ဓာတ်ပုံ တင်ပါ</div>
        <img id="slipPreview" style="display:none;">
      </div>
      <input type="file" id="slipInput" accept="image/*">
      <div class="modal-actions">
        <button class="cancel" onclick="closeModal()">Cancel</button>
        <button class="confirm" onclick="submitPurchase()">Submit</button>
      </div>
      <div class="msg" id="purchaseMsg"></div>
    </div>
  </div>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) { try { tg.ready(); } catch(e){} }
    let tgUser = null;
    try { tgUser = JSON.parse(sessionStorage.getItem('tg_user') || 'null'); } catch(e){}
    function currentInitData() { return tg && tg.initData ? tg.initData : null; }

    let selectedPlan = null;
    let slipBase64 = null;
    let selectedCountry = 'MM';
    let allPlans = [];

    function switchCountry(country) {
      selectedCountry = country;
      document.querySelectorAll('#countrySwitch .c-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.country === country);
      });
      renderPlans();
    }

    async function loadPlans() {
      const wrap = document.getElementById('plansWrap');
      try {
        const res = await fetch('/api/plans/list', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
        const data = await res.json();
        if (!res.ok || !data.success || !data.plans.length) {
          wrap.innerHTML = '<div class="empty">Plans မရှိသေးပါ။</div>';
          return;
        }
        allPlans = data.plans;
        renderPlans();
      } catch (err) {
        wrap.innerHTML = '<div class="error">Network error</div>';
      }
    }

    function renderPlans() {
      const wrap = document.getElementById('plansWrap');
      if (!allPlans.length) return;
      wrap.innerHTML = allPlans.map(p => \`
        <div class="plan-card">
          <h3>\${p.name}</h3>
          <div class="price">\${(selectedCountry === 'TH' ? p.price_th : p.price) || '-'}</div>
          <div class="credits">\${p.credits} credits</div>
          \${p.description ? '<div class="desc">' + p.description + '</div>' : ''}
          <button class="buy" onclick='openModal(\${JSON.stringify(p)})'>Buy Now</button>
        </div>
      \`).join('');
    }

    async function openModal(plan) {
      if (!tgUser || !tgUser.id) { alert('Telegram App ကနေ ပြန်ဝင်ပေးပါ။'); return; }
      selectedPlan = plan;
      slipBase64 = null;
      document.getElementById('modalPlanName').textContent = plan.name + ' — ' + ((selectedCountry === 'TH' ? plan.price_th : plan.price) || '-');
      document.getElementById('slipPreview').style.display = 'none';
      document.getElementById('uploadLabel').style.display = 'block';
      document.getElementById('purchaseMsg').textContent = '';
      document.getElementById('modalBg').classList.add('show');

      try {
        const res = await fetch('/api/payment-methods/list', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ country: selectedCountry }) });
        const data = await res.json();
        const p = (data.methods && data.methods[0]) || {};
        document.getElementById('payInfoBox').innerHTML = p.method ? \`
          <div><span class="k">Method:</span> \${p.method}</div>
          <div><span class="k">Account Name:</span> \${p.account_name || '-'}</div>
          <div><span class="k">Account Number:</span> \${p.account_number || '-'}</div>
          \${p.note ? '<div style="margin-top:6px;">' + p.note + '</div>' : ''}
        \` : 'Payment information မထည့်ရသေးပါ — Admin ကို ဆက်သွယ်ပါ။';
      } catch(e) {
        document.getElementById('payInfoBox').textContent = 'Payment info ရယူ၍ မရပါ။';
      }
    }

    function closeModal() {
      document.getElementById('modalBg').classList.remove('show');
    }

    document.getElementById('uploadBox').addEventListener('click', () => document.getElementById('slipInput').click());
    document.getElementById('slipInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const msg = document.getElementById('purchaseMsg');
      msg.textContent = 'ပုံ readied လုပ်နေသည်…';
      msg.className = 'msg';
      // ဖုန်းကင်မရာနဲ့ တိုက်ရိုက်ရိုက်တဲ့ ဓာတ်ပုံဟာ 3-8MB လောက် ရှိတတ်ပြီး၊ D1 database ထဲ
      // သိမ်းနိုင်တဲ့ size ထက် ကျော်လွန်တတ်ပါတယ် — ဒါကြောင့် upload မလုပ်ခင် max 1280px အထိ
      // ချုံ့ပြီး JPEG အဖြစ် ပြန် encode လုပ်ကာ file size ကို လျှော့ချပါသည် (image quality အတော်
      // အတန် ထိန်းထားနိုင်ပြီး slip ကို ဖတ်ရလွယ်ပါသေးတယ်)
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1280;
          let w = img.width, h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w >= h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
            else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          slipBase64 = canvas.toDataURL('image/jpeg', 0.72);
          const preview = document.getElementById('slipPreview');
          preview.src = slipBase64;
          preview.style.display = 'block';
          document.getElementById('uploadLabel').style.display = 'none';
          msg.textContent = '';
        };
        img.onerror = () => { msg.textContent = 'ပုံ ဖတ်၍မရပါ'; msg.className = 'msg err'; };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    async function submitPurchase() {
      const msg = document.getElementById('purchaseMsg');
      if (!slipBase64) { msg.textContent = 'Payment slip ဓာတ်ပုံ တင်ပါ'; msg.className = 'msg err'; return; }

      try {
        const res = await fetch('/api/purchase/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: currentInitData(), planId: selectedPlan.id, slipImageBase64: slipBase64 })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          msg.textContent = 'တင်ပြီးပါပြီ — Admin approve လုပ်ပေးရုံ စောင့်ပါ။';
          msg.className = 'msg ok';
          setTimeout(closeModal, 1800);
        } else {
          msg.textContent = data.error || 'Failed';
          msg.className = 'msg err';
        }
      } catch (err) {
        msg.textContent = 'Network error';
        msg.className = 'msg err';
      }
    }

    loadPlans();
  </script>
</body>
</html>`;
}

// ===========================================================================
// Profile Page (Account / Referral / API Key)
// ===========================================================================

function getProfileHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile · Ko Paing AI Voice Studio</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  ${FAVICON}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f6f0;
      margin: 0;
      padding: 20px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .top { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .top h1 { font-size: 16px; margin: 0; letter-spacing: 0.5px; }
    a.back { font-size: 12px; color: #666; text-decoration: none; }
    .card {
      background: #fff; border-radius: 8px; padding: 18px; margin: 16px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee;
    }
    .card h3 { margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .stat-row { display: flex; gap: 10px; }
    .stat-row .stat { flex: 1; background: #f7f6f0; border-radius: 6px; padding: 12px; text-align: center; }
    .stat-row .stat .n { font-size: 20px; font-weight: 600; color: #b5482f; }
    .stat-row .stat .l { font-size: 11px; color: #888; margin-top: 2px; }
    .row2 { display: flex; gap: 10px; }
    .row2 > * { flex: 1; }
    .code-box {
      background: #f7f6f0; border-radius: 6px; padding: 10px 12px; font-size: 13px;
      display: flex; align-items: center; justify-content: space-between; gap: 8px; word-break: break-all;
    }
    .code-box code { font-family: monospace; font-size: 13px; }
    button.btn {
      background: #1a1a1a; color: #fff; border: none; padding: 10px 16px; font-size: 12.5px;
      letter-spacing: 0.5px; cursor: pointer; border-radius: 4px;
    }
    button.btn.small { padding: 6px 10px; font-size: 11.5px; }
    button.btn.ghost { background: #fff; color: #1a1a1a; border: 1px solid #ccc; }
    button.btn.danger { background: #d9534f; }
    .msg { font-size: 12px; margin-top: 8px; }
    .msg.ok { color: #4a5d4a; }
    .msg.err { color: #d9534f; }
    .apikey-plain {
      background: #fff8e6; border: 1px solid #f0d98c; border-radius: 6px; padding: 12px;
      font-family: monospace; font-size: 12.5px; word-break: break-all; margin-top: 10px;
    }
    .warn { font-size: 11.5px; color: #b5482f; margin-top: 6px; }
    .empty { text-align: center; color: #999; padding: 30px 10px; }
    .req-list { display: flex; flex-direction: column; gap: 8px; }
    .req-item {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: #f7f6f0; border-radius: 6px; padding: 10px 12px;
    }
    .req-item .req-main { min-width: 0; }
    .req-item .req-text { font-size: 12.5px; color: #333; }
    .req-item .req-meta { font-size: 11px; color: #999; margin-top: 2px; }
    .req-badge {
      flex-shrink: 0; font-size: 10px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
      padding: 3px 9px; border-radius: 10px; white-space: nowrap;
    }
    .req-badge.completed { background: #eaf7ee; color: #1a7a44; }
    .req-badge.failed { background: #fdeceb; color: #c0392b; }
    .req-badge.cancelled { background: #f0f0ee; color: #888; }
    .req-badge.pending { background: #fff6e0; color: #a17a1c; }
    .req-err { font-size: 11px; color: #c0392b; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="top">
    <div style="font-size:20px;">👤</div>
    <h1>My Profile</h1>
  </div>
  <a href="/studio" class="back">← Back to Studio</a>

  <div id="wrap"><div class="empty">Loading…</div></div>

  <script>
    function escapeHtml(s) {
      if (s === null || s === undefined) return "";
      return String(s).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
    }
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) { try { tg.ready(); } catch(e){} }
    let tgUser = null;
    try { tgUser = JSON.parse(sessionStorage.getItem('tg_user') || 'null'); } catch(e){}
    function currentInitData() { return tg && tg.initData ? tg.initData : null; }

    if (!tgUser || !tgUser.id) {
      document.getElementById('wrap').innerHTML = '<div class="empty">Telegram App ကနေ ပြန်ဝင်ပေးပါ။</div>';
    } else {
      loadProfile();
    }

    let profileData = null;

    async function loadProfile() {
      const wrap = document.getElementById('wrap');
      try {
        const res = await fetch('/api/profile/get', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ initData: currentInitData() })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          wrap.innerHTML = '<div class="empty">' + (data.error || 'Failed to load profile') + '</div>';
          return;
        }
        profileData = data.user;
        renderProfile();
      } catch (err) {
        wrap.innerHTML = '<div class="empty">Network error</div>';
      }
    }

    function renderProfile() {
      const u = profileData;
      const wrap = document.getElementById('wrap');
      wrap.innerHTML = \`
        <div class="card">
          <h3>Account</h3>
          <div class="stat-row">
            <div class="stat"><div class="n">\${u.credits ?? 0}</div><div class="l">Credits</div></div>
            <div class="stat"><div class="n">\${u.referredCount ?? 0}</div><div class="l">Referred</div></div>
            <div class="stat"><div class="n">\${u.referralCreditsEarned ?? 0}</div><div class="l">Referral Credits</div></div>
          </div>
          <div style="margin-top:12px; font-size:13px; color:#555;">\${escapeHtml(u.name) || ''}\${u.username ? ' · @' + escapeHtml(u.username) : ''}</div>
        </div>

        <div class="card">
          <h3>Referral Program</h3>
          <p style="font-size:12.5px; color:#666; margin-top:0;">သင့် Referral Link ကို မိတ်ဆွေများထံ ဝေမျှပြီး App ကို ဖိတ်ခေါ်ပါ — သူတို့ ဝင်ရောက်တာနဲ့ credits ရရှိမည်ဖြစ်ပါသည်။</p>
          <div class="code-box">
            <code id="refCode">\${u.referralCode || '-'}</code>
            <button class="btn small ghost" onclick="copyText(u_referralCode())">Copy Code</button>
          </div>
          \${u.referralLink ? \`
          <div class="code-box" style="margin-top:8px;">
            <code style="font-size:11.5px;">\${u.referralLink}</code>
            <button class="btn small ghost" onclick="copyText(u_referralLink())">Copy Link</button>
          </div>\` : ''}
        </div>

        <div class="card">
          <h3>API Key</h3>
          <p style="font-size:12.5px; color:#666; margin-top:0;">သင့် website / App ကနေ တိုက်ရိုက် Voice Generate ခေါ်သုံးနိုင်ဖို့ API Key လိုအပ်ပါသည်။</p>
          <div id="apiKeyButtons"></div>
          <div id="apiKeyResult"></div>
          <div class="msg" id="apiKeyMsg"></div>
          <div style="margin-top:12px;"><a href="/api-docs" class="back">📄 View API Documentation →</a></div>
        </div>

        <div class="card">
          <h3>Request History</h3>
          <p style="font-size:12.5px; color:#666; margin-top:0;">Voice generate request တစ်ခုချင်းစီရဲ့ status (Completed/Failed/Cancelled) နဲ့ ဘယ်လောက် credits သုံးခဲ့လဲ ဒီနေရာမှာ ကြည့်နိုင်ပါသည်။</p>
          <div id="requestsBox"><div class="empty">Loading…</div></div>
        </div>
      \`;

      renderApiKeyButtons();
      loadRequests();
    }

    function renderApiKeyButtons() {
      const u = profileData;
      const box = document.getElementById('apiKeyButtons');
      box.innerHTML = u.hasApiKey ? \`
        <div class="code-box"><code>\${u.apiKeyPrefix}</code><span style="font-size:11px; color:#999;">Active</span></div>
        <div class="row2" style="margin-top:10px;">
          <button class="btn ghost" onclick="generateApiKey()">Regenerate</button>
          <button class="btn danger" onclick="revokeApiKey()">Revoke</button>
        </div>
      \` : \`
        <button class="btn" onclick="generateApiKey()">Generate API Key</button>
      \`;
    }

    function u_referralCode() { return (profileData && profileData.referralCode) || ''; }
    function u_referralLink() { return (profileData && profileData.referralLink) || ''; }

    function statusBadge(status) {
      const map = {
        COMPLETED: ['completed', 'Completed'],
        FAILED: ['failed', 'Failed'],
        CANCELLED: ['cancelled', 'Cancelled'],
        IN_PROGRESS: ['pending', 'In Progress'],
        IN_QUEUE: ['pending', 'Queued'],
      };
      const [cls, label] = map[status] || ['pending', status || 'Unknown'];
      return '<span class="req-badge ' + cls + '">' + label + '</span>';
    }

    async function loadRequests() {
      const box = document.getElementById('requestsBox');
      try {
        const res = await fetch('/api/profile/requests', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ initData: currentInitData() })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          box.innerHTML = '<div class="empty">' + (data.error || 'Failed to load requests') + '</div>';
          return;
        }
        if (!data.requests.length) {
          box.innerHTML = '<div class="empty">Request မရှိသေးပါ</div>';
          return;
        }
        box.innerHTML = '<div class="req-list">' + data.requests.map(r => \`
          <div class="req-item">
            <div class="req-main">
              <div class="req-text">\${r.text_length} characters\${r.credits_charged ? ' · ' + r.credits_charged + ' credits သုံးပြီး' : ''}</div>
              <div class="req-meta">\${r.source === 'api' ? 'Public API' : 'Voice Studio'} · \${new Date(r.created_at + 'Z').toLocaleString()}</div>
              \${r.error_message ? '<div class="req-err">' + r.error_message + '</div>' : ''}
            </div>
            \${statusBadge(r.status)}
          </div>
        \`).join('') + '</div>';
      } catch (err) {
        box.innerHTML = '<div class="empty">Network error</div>';
      }
    }

    function copyText(text) {
      if (!text) return;
      const announce = () => {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
          window.Telegram.WebApp.showAlert('Copied!');
        } else {
          alert('Copied!');
        }
      };
      const fallback = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          announce();
        } catch (e) {
          alert('Copy မရပါ — ကိုယ်တိုင် ရွေးပြီး ကူးယူပေးပါ။');
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(announce).catch(fallback);
      } else {
        fallback();
      }
    }

    let lastGeneratedApiKey = null;
    function copyGeneratedApiKey() { copyText(lastGeneratedApiKey); }

    async function generateApiKey() {
      const msg = document.getElementById('apiKeyMsg');
      const resultBox = document.getElementById('apiKeyResult');
      msg.textContent = ''; resultBox.innerHTML = '';
      try {
        const res = await fetch('/api/profile/api-key/generate', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ initData: currentInitData() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          lastGeneratedApiKey = data.apiKey;
          resultBox.innerHTML = \`
            <div class="apikey-plain">\${data.apiKey}</div>
            <button class="btn small ghost" style="margin-top:8px;" onclick="copyGeneratedApiKey()">📋 Copy API Key</button>
            <div class="warn">⚠️ ဒီ Key ကို ဒီတစ်ကြိမ်တည်းသာ ပြသပါမည် — ကူးယူ၍ လုံခြုံစွာသိမ်းထားပါ။</div>
          \`;
          profileData.hasApiKey = true;
          profileData.apiKeyPrefix = data.apiKeyPrefix;
          renderApiKeyButtons();
        } else {
          msg.textContent = data.error || 'Failed';
          msg.className = 'msg err';
        }
      } catch (err) {
        msg.textContent = 'Network error';
        msg.className = 'msg err';
      }
    }

    async function revokeApiKey() {
      if (!confirm('API Key ကို ပယ်ဖျက်မှာ သေချာပါသလား? ဒီ Key နဲ့ ချိတ်ဆက်ထားတဲ့ App/Website များ အလုပ်လုပ်တော့မည် မဟုတ်ပါ။')) return;
      try {
        const res = await fetch('/api/profile/api-key/revoke', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ initData: currentInitData() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          profileData.hasApiKey = false;
          profileData.apiKeyPrefix = null;
          document.getElementById('apiKeyResult').innerHTML = '';
          renderApiKeyButtons();
        } else {
          alert(data.error || 'Failed');
        }
      } catch (err) {
        alert('Network error');
      }
    }
  </script>
</body>
</html>`;
}

// ===========================================================================
// API Documentation Page
// ===========================================================================

function getApiDocsHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Docs · Ko Paing AI Voice Studio</title>
  ${FAVICON}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f6f0;
      margin: 0;
      padding: 20px;
      max-width: 640px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
      color: #333;
    }
    .top { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .top h1 { font-size: 16px; margin: 0; letter-spacing: 0.5px; }
    a.back { font-size: 12px; color: #666; text-decoration: none; }
    h2 { font-size: 15px; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h3 { font-size: 13px; margin-top: 20px; color: #555; }
    p { font-size: 13.5px; }
    code, pre {
      font-family: 'SF Mono', Consolas, monospace; font-size: 12.5px;
      background: #1a1a1a; color: #f5f5f0; border-radius: 6px;
    }
    code { padding: 2px 6px; }
    pre { padding: 14px; overflow-x: auto; white-space: pre; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 10px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
    th { background: #fff; color: #888; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; }
    .badge { display: inline-block; background: #1a1a1a; color: #fff; font-size: 10.5px; padding: 2px 8px; border-radius: 10px; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="top">
    <div style="font-size:20px;">📄</div>
    <h1>API Documentation</h1>
  </div>
  <a href="/profile" class="back">← Back to Profile</a>

  <p>ဒီ API ကို သင့် website သို့မဟုတ် App (Android/iOS/Web) ကနေ တိုက်ရိုက် ခေါ်သုံးနိုင်ပါတယ်။ Authenticate လုပ်ဖို့ Profile page ကနေ ရယူထားတဲ့ <strong>API Key</strong> လိုအပ်ပါသည်။</p>

  <h2>Base URL</h2>
  <pre>https://voice-studio-worker.kopaingm61.workers.dev</pre>

  <h2>Authentication</h2>
  <p>Request body ထဲမှာ <code>apiKey</code> field ပါ ထည့်ပေးပါ။ Key ကို Profile page → API Key → Generate ကနေ ရယူနိုင်ပါတယ်။ Key ကို ဒီတစ်ကြိမ်တည်းသာ ပြသမည်ဖြစ်၍ လုံခြုံစွာ သိမ်းထားပါ။</p>

  <h2>Credits</h2>
  <p>Voice တစ်ခါ Generate လုပ်တိုင်း <code>text</code> ရဲ့ character အရေအတွက်အတိုင်း credits လိုအပ်ပါသည် (လက်ကျန် စစ်ဆေးမှု ချက်ချင်းလုပ်ပါမည်)။ Credits မလုံလောက်ရင် <code>402</code> error ပြန်ပေးပါမည်။ <strong>Job အောင်မြင်စွာ ပြီးမြောက် (COMPLETED) မှသာ</strong> credits ကို အမှန်တကယ် နုတ်ယူပါသည် — Job fail/cancel ဖြစ်ရင် credits ဘာမှ မနုတ်ပါ။</p>

  <h2>1. Generate Voice</h2>
  <span class="badge">POST</span><code>/api/v1/generate</code>

  <h3>Request Body</h3>
  <pre>{
  "apiKey": "kpv_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "text": "မင်္ဂလာပါ",
  "refAudioBase64": "",        // Optional - voice cloning
  "promptText": "",            // Optional - reference audio ရဲ့ transcript
  "voiceType": "",             // Optional - "female" | "male"
  "voicePresetId": ""          // Optional - Admin ကြိုတင်တင်ထားတဲ့ Voice preset ID (refAudioBase64 ထက် priority ရှိသည်)
}</pre>

  <table>
    <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
    <tr><td>apiKey</td><td>string</td><td>Yes</td><td>Profile page ကနေ ရထားတဲ့ API Key</td></tr>
    <tr><td>text</td><td>string</td><td>Yes</td><td>ထွက်လိုတဲ့ စာသား</td></tr>
    <tr><td>refAudioBase64</td><td>string</td><td>No</td><td>Voice cloning အတွက် reference audio (base64 WAV)</td></tr>
    <tr><td>promptText</td><td>string</td><td>No</td><td>reference audio ထဲက စာသား (cloning quality တိုးစေသည်)</td></tr>
    <tr><td>voiceType</td><td>string</td><td>No</td><td>"female" or "male" (reference audio မပါရင်သာ အလုပ်လုပ်သည်)</td></tr>
    <tr><td>voicePresetId</td><td>number</td><td>No</td><td>Admin ကြိုတင် upload ထားတဲ့ voice preset ID — ဒါပါလာရင် refAudioBase64 အစား ဒီ preset ရဲ့ အသံကို သုံးပါမည်</td></tr>
  </table>

  <h3>Response (200)</h3>
  <pre>{
  "success": true,
  "jobId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "cost": 9,
  "remainingCredits": 5000
}</pre>
  <p style="font-size:12px; color:#888;">(<code>remainingCredits</code> ဟာ ဒီအချိန်အထိ လက်ကျန် balance ဖြစ်ပြီး — <code>cost</code> ကို job ပြီးမြောက်မှသာ နုတ်ပါမည်)</p>

  <h3>Error Responses</h3>
  <table>
    <tr><th>Status</th><th>Meaning</th></tr>
    <tr><td>400</td><td>text မပါ / မှား</td></tr>
    <tr><td>401</td><td>apiKey မပါ / မှား</td></tr>
    <tr><td>402</td><td>Credits မလုံလောက်</td></tr>
    <tr><td>403</td><td>Account ပိတ်ထားသည်</td></tr>
    <tr><td>500</td><td>Server / RunPod error</td></tr>
  </table>

  <h2>2. Check Generation Status</h2>
  <span class="badge">POST</span><code>/api/v1/generate/status</code>
  <p>Generate request ပြီးနောက် ရရှိလာတဲ့ <code>jobId</code> ကို 1–2 စက္ကန့်တစ်ခါ Poll လုပ်ပြီး status စစ်ပါ။</p>

  <h3>Request Body</h3>
  <pre>{
  "apiKey": "kpv_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "jobId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}</pre>
  <p style="font-size:12px; color:#888;">(status <code>COMPLETED</code> ဖြစ်မှသာ credits ကို နုတ်ယူပါမည် — ကုန်ကျမည့် cost ကို server ဘက်ကနေသာ တွက်ချက်ပါသည်, fail/cancel ဖြစ်ရင် ဘာမှ မနုတ်ပါ)</p>

  <h3>Response — Processing</h3>
  <pre>{ "id": "...", "status": "IN_PROGRESS" }</pre>

  <h3>Response — Completed</h3>
  <pre>{
  "id": "...",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "....",
    "sample_rate": 24000,
    "format": "wav"
  }
}</pre>

  <h2>Example — cURL</h2>
  <pre>curl -X POST https://voice-studio-worker.kopaingm61.workers.dev/api/v1/generate \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey":"kpv_xxxxxxxxxxxxxxxx","text":"မင်္ဂလာပါ"}'</pre>

  <h2>Example — JavaScript (fetch)</h2>
  <pre>const res = await fetch('https://voice-studio-worker.kopaingm61.workers.dev/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'kpv_xxxxxxxxxxxxxxxx', text: 'မင်္ဂလာပါ' })
});
const data = await res.json();
// data.jobId ကို /api/v1/generate/status နဲ့ Poll လုပ်ပါ</pre>

  <p style="margin-top:30px; font-size:12px; color:#999;">API Key ကို ပါးစပ်ဖြင့် မမျှဝေပါနှင့် — Key ပေါက်ကြားပါက Profile page ကနေ Regenerate/Revoke လုပ်နိုင်ပါသည်။</p>
</body>
</html>`;
}

// ===========================================================================
// Privacy Policy Page
// ===========================================================================

function getPrivacyHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy · Ko Paing AI Voice Studio</title>
  ${FAVICON}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f6f0;
      margin: 0;
      padding: 20px;
      max-width: 560px;
      margin-left: auto;
      margin-right: auto;
      color: #1c1b19;
      line-height: 1.6;
    }
    .top { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .top h1 { font-size: 18px; margin: 0; letter-spacing: 0.3px; }
    a.back { font-size: 12px; color: #666; text-decoration: none; }
    .card {
      background: #fff; border-radius: 8px; padding: 20px 22px; margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee;
    }
    .card h2 { font-size: 15px; margin: 0 0 8px; color: #b5482f; }
    .card p, .card li { font-size: 13.5px; color: #444; margin: 0 0 6px; }
    .card ul { padding-left: 18px; margin: 6px 0; }
    .notice {
      background: #fff8f6; border: 1px solid #f0d8d1; border-radius: 8px;
      padding: 16px 18px; font-size: 13.5px; color: #7a3324; margin-bottom: 14px;
    }
    .notice strong { color: #b5482f; }
    footer { text-align: center; margin-top: 30px; font-size: 11.5px; color: #a39c8c; }
  </style>
</head>
<body>
  <div class="top">
    <div style="font-size:20px;">🔒</div>
    <h1>Privacy Policy</h1>
  </div>
  <a href="/studio" class="back">← Back to Studio</a>

  <div class="card" style="margin-top:16px;">
    <h2>Information We Collect</h2>
    <ul>
      <li>Telegram User ID, username, and name (for login)</li>
      <li>The text you enter to generate voice output</li>
      <li>The reference audio file you upload for voice cloning</li>
      <li>Payment slip images submitted for credit purchases</li>
    </ul>
  </div>

  <div class="card">
    <h2>How We Use It</h2>
    <p>This information is used only to provide the Voice Studio service, manage credits, and approve payments. We do not sell or share it with third parties.</p>
  </div>

  <div class="notice">
    <strong>⚠️ Voice Cloning Notice</strong>
    <p style="margin-top:8px;">Cloning or using someone else's voice without their consent (unauthorized voice cloning) is strictly prohibited on this Studio. By uploading a reference audio file, you confirm that you have obtained permission from the owner of that voice. Violations may result in the account being suspended (banned) without prior notice.</p>
  </div>

  <div class="card">
    <h2>AI Model Usage</h2>
    <p>This Voice Studio uses the <strong>VOXCPM2</strong> AI model for voice cloning and text-to-speech generation.</p>
  </div>

  <div class="card">
    <h2>Data Retention</h2>
    <p>Generated audio output is stored temporarily so it can be downloaded, and is automatically deleted after a set period.</p>
  </div>

  <div class="card">
    <h2>Contact</h2>
    <p>If you have any questions about this Policy, you can contact the Admin - <strong>@${ADMIN_TELEGRAM_USERNAME}</strong>.</p>
  </div>

  <footer>Power By Ko Paing · AI Voice Studio</footer>
</body>
</html>`;
}
