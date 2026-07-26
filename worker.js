// ===========================================================================
// Cloudflare Worker - Ko Paing AI Voice Studio (Backend + Frontend)
// (D1 Database Edition - Firebase removed)
// ===========================================================================

const ADMIN_TELEGRAM_USERNAME = 'kopaing209'; // @ မထည့်ပါနှင့်

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

      // ---- Admin: Purchase Approvals --------------------------------------
      if (url.pathname === '/api/admin/purchases/list' && request.method === 'POST') {
        return await handleAdminPurchasesList(request, env, corsHeaders);
      }
      if (url.pathname === '/api/admin/purchases/review' && request.method === 'POST') {
        return await handleAdminPurchaseReview(request, env, corsHeaders);
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

async function setSetting(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = ?2`
  )
    .bind(key, value)
    .run();
}

function requireAdmin(env, token) {
  return !!token && token === env.SESSION_SECRET;
}

// ===========================================================================
// Request Handlers
// ===========================================================================

async function handleTelegramAuth(request, env, corsHeaders) {
  const body = await request.json();
  const { initData } = body;

  if (!initData) {
    return json({ error: 'Missing initData' }, 400, corsHeaders);
  }

  const isValid = await verifyTelegramAuth(initData, env.TELEGRAM_BOT_TOKEN);
  if (!isValid) {
    return json({ error: 'Invalid Telegram authentication' }, 401, corsHeaders);
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));

  // Telegram username ကိုကြည့်ပြီး Admin ဟုတ်/မဟုတ် Auto Detect
  const isAdmin = (user.username || '').toLowerCase() === ADMIN_TELEGRAM_USERNAME;

  const existing = await env.DB.prepare('SELECT id, is_banned FROM users WHERE id = ?1')
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
  let initialCredits;
  if (!existing) {
    const bonus = await getSetting(env, 'signup_bonus', '0');
    initialCredits = parseInt(bonus, 10) || 0;
  }

  await upsertUser(env, user.id, {
    name: user.first_name || user.username || 'User',
    username: user.username || null,
    credits: existing ? undefined : initialCredits,
    isAdmin,
  });

  return json(
    { success: true, user: { ...user, isAdmin }, token: isAdmin ? env.SESSION_SECRET : null },
    200,
    corsHeaders
  );
}

async function handleAdminAuth(request, env, corsHeaders) {
  const body = await request.json();
  const { password } = body;

  if (!password || password !== env.ADMIN_SECRET) {
    return json({ error: 'Invalid Password' }, 401, corsHeaders);
  }

  return json({ success: true, token: env.SESSION_SECRET }, 200, corsHeaders);
}

async function handleUserSync(request, env, corsHeaders) {
  const body = await request.json();
  const { userId, userData } = body;

  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }

  await upsertUser(env, userId, {
    name: userData?.name,
    credits: userData?.credits,
  });

  return json({ success: true }, 200, corsHeaders);
}

async function handleUserGet(request, env, corsHeaders) {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }

  const row = await env.DB.prepare(
    'SELECT id, name, username, credits, is_admin FROM users WHERE id = ?1'
  )
    .bind(String(userId))
    .first();

  return json({ success: true, user: row || null }, 200, corsHeaders);
}

async function handleAdminListUsers(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  const token = body.token || (request.headers.get('Authorization') || '').replace('Bearer ', '');

  if (!token || token !== env.SESSION_SECRET) {
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

  if (!requireAdmin(env, token)) {
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

// ---- Plans: Public ---------------------------------------------------------

async function handlePlansList(request, env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT id, name, price, credits, bonus_credits, description FROM plans WHERE is_active = 1 ORDER BY credits ASC'
  ).all();

  return json({ success: true, plans: results }, 200, corsHeaders);
}

async function handlePaymentMethodsList(request, env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT id, method, account_name, account_number, note FROM payment_methods WHERE is_active = 1 ORDER BY id ASC'
  ).all();

  return json({ success: true, methods: results }, 200, corsHeaders);
}

// ---- Plans: Admin CRUD -------------------------------------------------

async function handleAdminPlansList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { results } = await env.DB.prepare('SELECT * FROM plans ORDER BY id ASC').all();
  return json({ success: true, plans: results }, 200, corsHeaders);
}

async function handleAdminPlanCreate(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { name, price, credits, bonusCredits, description } = body;
  if (!name || !credits) {
    return json({ error: 'Plan name and credits လိုအပ်ပါသည်' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `INSERT INTO plans (name, price, credits, bonus_credits, description, is_active, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'))`
  )
    .bind(name, price || '', Number(credits), Number(bonusCredits) || 0, description || '')
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPlanUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id, name, price, credits, bonusCredits, description, is_active } = body;
  if (!id) {
    return json({ error: 'Missing plan id' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `UPDATE plans SET
       name = COALESCE(?2, name),
       price = COALESCE(?3, price),
       credits = COALESCE(?4, credits),
       bonus_credits = COALESCE(?5, bonus_credits),
       description = COALESCE(?6, description),
       is_active = COALESCE(?7, is_active),
       updated_at = datetime('now')
     WHERE id = ?1`
  )
    .bind(
      id,
      name ?? null,
      price ?? null,
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
  if (!requireAdmin(env, body.token)) {
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
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const signupBonus = await getSetting(env, 'signup_bonus', '0');
  return json({ success: true, signupBonus: parseInt(signupBonus, 10) || 0 }, 200, corsHeaders);
}

async function handleAdminSettingsUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  if (body.signupBonus !== undefined) {
    await setSetting(env, 'signup_bonus', String(parseInt(body.signupBonus, 10) || 0));
  }

  return json({ success: true }, 200, corsHeaders);
}

// ---- Payment Methods: Admin CRUD -----------------------------------------

async function handleAdminPaymentMethodsList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { results } = await env.DB.prepare('SELECT * FROM payment_methods ORDER BY id ASC').all();
  return json({ success: true, methods: results }, 200, corsHeaders);
}

async function handleAdminPaymentMethodCreate(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { method, accountName, accountNumber, note } = body;
  if (!method) {
    return json({ error: 'Payment method name လိုအပ်ပါသည်' }, 400, corsHeaders);
  }

  await env.DB.prepare(
    `INSERT INTO payment_methods (method, account_name, account_number, note, is_active, updated_at)
     VALUES (?1, ?2, ?3, ?4, 1, datetime('now'))`
  )
    .bind(method, accountName || '', accountNumber || '', note || '')
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPaymentMethodUpdate(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const { id, method, accountName, accountNumber, note, is_active } = body;
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
       updated_at = datetime('now')
     WHERE id = ?1`
  )
    .bind(
      id,
      method ?? null,
      accountName ?? null,
      accountNumber ?? null,
      note ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null
    )
    .run();

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPaymentMethodDelete(request, env, corsHeaders) {
  const body = await request.json();
  if (!requireAdmin(env, body.token)) {
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
  const body = await request.json();
  const { userId, planId, slipImageBase64 } = body;

  if (!userId || !planId || !slipImageBase64) {
    return json({ error: 'userId, planId, slip image လိုအပ်ပါသည်' }, 400, corsHeaders);
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

  return json({ success: true }, 200, corsHeaders);
}

async function handleAdminPurchasesList(request, env, corsHeaders) {
  const body = await request.json().catch(() => ({}));
  if (!requireAdmin(env, body.token)) {
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
  if (!requireAdmin(env, body.token)) {
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

// Credits system: 1 character of TTS text = 1 credit.
// Credits ကို job စတင်ချိန်မှာ ပြန်နုတ်ပြီး၊ job fail/cancel ဖြစ်ရင် ပြန်ထည့်ပေးသည်။

async function handleGenerateStart(request, env, corsHeaders) {
  const body = await request.json();
  const { userId, text, refAudioBase64, promptText, controlInstruction, style, voiceType } = body;

  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }
  if (!text || !text.trim()) {
    return json({ error: 'Text to speak လိုအပ်ပါသည်' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }

  const cost = text.trim().length;

  const userRow = await env.DB.prepare('SELECT credits FROM users WHERE id = ?1')
    .bind(String(userId))
    .first();
  const currentCredits = userRow ? Number(userRow.credits || 0) : 0;

  if (currentCredits < cost) {
    return json(
      { error: `Credits မလုံလောက်ပါ။ လိုအပ်ချက်: ${cost}, လက်ကျန်: ${currentCredits}` },
      402,
      corsHeaders
    );
  }

  const input = { text: text.trim() };
  if (refAudioBase64) {
    input.reference_audio_base64 = refAudioBase64;
    if (promptText && promptText.trim()) input.prompt_text = promptText.trim();
  }
  // Speech Pace (Slow/Fast) - VoxCPM2 ရဲ့ Control Instruction (natural language) field ကနေတဆင့်
  // ပို့ပေးသည် (numeric speed parameter ကို VoxCPM2 က support မလုပ်ပါ)
  if (controlInstruction && controlInstruction.trim()) {
    input.control_instruction = controlInstruction.trim();
  }
  if (style) input.style = style;
  if (voiceType) input.voice_type = voiceType;

  const runRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input }),
  });

  const runData = await runRes.json();
  if (!runRes.ok || !runData.id) {
    return json({ error: runData.error || 'RunPod request failed' }, 500, corsHeaders);
  }

  // Job တင်ပြီးသွားမှသာ credits ကို နုတ်ပါ
  await env.DB.prepare(
    `UPDATE users SET credits = COALESCE(credits, 0) - ?1, updated_at = datetime('now') WHERE id = ?2`
  )
    .bind(cost, String(userId))
    .run();

  return json(
    { success: true, jobId: runData.id, cost, remainingCredits: currentCredits - cost },
    200,
    corsHeaders
  );
}

async function handleGenerateStatus(request, env, corsHeaders) {
  const body = await request.json();
  const { userId, jobId, cost } = body;

  if (!jobId) {
    return json({ error: 'Missing jobId' }, 400, corsHeaders);
  }
  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }

  const statusRes = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${env.RUNPOD_API_KEY}` },
  });
  const data = await statusRes.json();

  // Job fail/cancel ဖြစ်ရင် နုတ်ထားတဲ့ credits ကို ပြန်ထည့်ပေးမည်
  if ((data.status === 'FAILED' || data.status === 'CANCELLED') && userId && cost) {
    await env.DB.prepare(
      `UPDATE users SET credits = COALESCE(credits, 0) + ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(Number(cost), String(userId))
      .run();
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
  const body = await request.json();
  const { userId, audioBase64, format } = body;

  if (!audioBase64) {
    return json({ error: 'Missing audioBase64' }, 400, corsHeaders);
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
    .bind(id, userId ? String(userId) : null, format || 'wav', audioBase64)
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
  const body = await request.json();
  const { userId, audioBase64, format } = body;

  if (!userId) {
    return json({ error: 'Missing userId' }, 400, corsHeaders);
  }
  if (!audioBase64) {
    return json({ error: 'Missing audioBase64' }, 400, corsHeaders);
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
  form.append('chat_id', String(userId));
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

async function verifyTelegramAuth(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
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

  return hexSignature === hash;
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
          body: JSON.stringify({ initData: tg.initData })
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
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:22px;">🎙️</div>
    <h1>Ko Paing AI Voice Studio — Admin</h1>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="users">Users</div>
    <div class="tab" data-tab="plans">Plans</div>
    <div class="tab" data-tab="settings">Settings</div>
    <div class="tab" data-tab="purchases">Purchases</div>
  </div>

  <div class="panel active" id="panel-users"><div class="empty">Loading…</div></div>
  <div class="panel" id="panel-plans"></div>
  <div class="panel" id="panel-settings"></div>
  <div class="panel" id="panel-purchases"><div class="empty">Loading…</div></div>

  <script>
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
          <td>\${u.name || '-'}</td>
          <td>\${u.username ? '@' + u.username : '-'}</td>
          <td>\${u.credits ?? 0}</td>
          <td>\${u.is_admin ? '<span class="badge">ADMIN</span>' : ''} \${u.is_banned ? '<span class="badge banned">BANNED</span>' : ''}</td>
          <td><button class="btn small \${u.is_banned ? 'ghost' : 'danger'}" onclick="toggleBan('\${u.id}', \${u.is_banned ? 0 : 1})">\${u.is_banned ? 'Unban' : 'Ban'}</button></td>
        </tr>
      \`).join('');
      wrap.innerHTML = \`<table><thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Credits</th><th>Status</th><th>Action</th></tr></thead><tbody>\${rows}</tbody></table>\`;
    }

    async function toggleBan(userId, banned) {
      const { ok, data } = await api('/api/admin/users/ban', { userId, banned: !!banned });
      if (ok && data.success) loadUsers();
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
          <td>\${p.price}</td>
          <td>\${p.credits}</td>
          <td>\${p.description || '-'}</td>
          <td>\${p.is_active ? 'Active' : 'Hidden'}</td>
          <td>
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
            <div class="field"><label>Price</label><input id="newPlanPrice" placeholder="e.g. 5000 MMK"></div>
          </div>
          <div class="row2">
            <div class="field"><label>Credits</label><input id="newPlanCredits" type="number" placeholder="e.g. 5000"></div>
          </div>
          <div class="field"><label>Description</label><textarea id="newPlanDesc" placeholder="Optional description"></textarea></div>
          <button class="btn" onclick="createPlan()">Add Plan</button>
          <div class="msg" id="planMsg"></div>
        </div>
        <table><thead><tr><th>Name</th><th>Price</th><th>Credits</th><th>Description</th><th>Status</th><th>Action</th></tr></thead><tbody>\${rows || ''}</tbody></table>
        \${!data.plans.length ? '<div class="empty">No plans yet — add one above.</div>' : ''}
      \`;
    }

    async function createPlan() {
      const name = document.getElementById('newPlanName').value.trim();
      const price = document.getElementById('newPlanPrice').value.trim();
      const credits = document.getElementById('newPlanCredits').value.trim();
      const description = document.getElementById('newPlanDesc').value.trim();
      const msg = document.getElementById('planMsg');
      if (!name || !credits) { msg.textContent = 'Name and Credits လိုအပ်ပါသည်'; msg.className = 'msg err'; return; }

      const { ok, data } = await api('/api/admin/plans/create', { name, price, credits, description });
      if (ok && data.success) { msg.textContent = 'Added!'; msg.className = 'msg ok'; loadPlans(); }
      else { msg.textContent = data.error || 'Failed'; msg.className = 'msg err'; }
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
    async function loadSettings() {
      const wrap = document.getElementById('panel-settings');
      wrap.innerHTML = '<div class="empty">Loading…</div>';
      const { ok, data } = await api('/api/admin/settings/get');
      if (!ok || !data.success) {
        wrap.innerHTML = '<div class="error">' + (data.error || 'Failed to load settings') + '</div>';
        return;
      }
      const p = data.paymentInfo || {};
      wrap.innerHTML = \`
        <div class="card">
          <h3>Signup Bonus</h3>
          <div class="field"><label>Bonus Credits (new user တစ်ယောက်ချင်းကို auto ပေးမည့် credits)</label>
            <input id="signupBonus" type="number" value="\${data.signupBonus || 0}"></div>
          <button class="btn" onclick="saveSignupBonus()">Save</button>
          <div class="msg" id="bonusMsg"></div>
        </div>
        <div class="card">
          <h3>Payment Setup</h3>
          <div class="field"><label>Payment Method (e.g. KBZPay, Wave Pay)</label><input id="payMethod" value="\${p.method || ''}"></div>
          <div class="row2">
            <div class="field"><label>Account Name</label><input id="payName" value="\${p.account_name || ''}"></div>
            <div class="field"><label>Account Number</label><input id="payNumber" value="\${p.account_number || ''}"></div>
          </div>
          <div class="field"><label>Note / Instructions</label><textarea id="payNote">\${p.note || ''}</textarea></div>
          <button class="btn" onclick="savePaymentInfo()">Save</button>
          <div class="msg" id="paymentMsg"></div>
        </div>
      \`;
    }

    async function saveSignupBonus() {
      const signupBonus = document.getElementById('signupBonus').value;
      const msg = document.getElementById('bonusMsg');
      const { ok, data } = await api('/api/admin/settings/update', { signupBonus });
      msg.textContent = ok && data.success ? 'Saved!' : (data.error || 'Failed');
      msg.className = 'msg ' + (ok && data.success ? 'ok' : 'err');
    }

    async function savePaymentInfo() {
      const paymentInfo = {
        method: document.getElementById('payMethod').value.trim(),
        account_name: document.getElementById('payName').value.trim(),
        account_number: document.getElementById('payNumber').value.trim(),
        note: document.getElementById('payNote').value.trim()
      };
      const msg = document.getElementById('paymentMsg');
      const { ok, data } = await api('/api/admin/settings/update', { paymentInfo });
      msg.textContent = ok && data.success ? 'Saved!' : (data.error || 'Failed');
      msg.className = 'msg ' + (ok && data.success ? 'ok' : 'err');
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
${FAVICON}
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');

  :root{
    --ink:      #1c1b19;
    --paper:    #f7f4ee;
    --panel:    #ffffff;
    --line:     #e3ddd0;
    --moss:     #4a5d4a;
    --moss-dim: #7c8c7c;
    --wax:      #b5482f;
    --wax-dim:  #d9a190;
    --shadow:   0 1px 0 rgba(28,27,25,0.05);
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
    position:fixed; inset:0;
    background-image:repeating-radial-gradient(circle at 50% -40%, transparent 0 68px, rgba(28,27,25,0.018) 69px 70px);
    pointer-events:none;
    z-index:0;
  }
  .wrap{ position:relative; z-index:1; max-width:760px; margin:0 auto; padding:40px 24px 90px; }
  header{ margin-bottom:32px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
  .eyebrow{
    font-family:'IBM Plex Mono', monospace;
    font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--wax);
    display:flex; align-items:center; gap:8px; margin-bottom:14px;
  }
  .eyebrow .dot{ width:6px; height:6px; border-radius:50%; background:var(--moss-dim); display:inline-block; }
  .eyebrow .dot.live{ background:var(--wax); box-shadow:0 0 0 3px rgba(181,72,47,0.15); }
  h1{
    font-family:'Fraunces', serif; font-optical-sizing:auto; font-weight:600;
    font-size:clamp(28px, 5vw, 40px); line-height:1.05; margin:0 0 8px; letter-spacing:-0.01em;
  }
  .sub{ font-size:14px; color:#57534a; max-width:46ch; line-height:1.5; }
  .credits-box{
    background:var(--panel); border:1px solid var(--line); border-radius:2px;
    padding:14px 18px; text-align:center; flex-shrink:0; min-width:110px;
  }
  .credits-box .num{ font-family:'Fraunces', serif; font-size:24px; font-weight:600; color:var(--moss); line-height:1; }
  .credits-box .label{
    font-family:'IBM Plex Mono', monospace; font-size:9.5px; letter-spacing:0.1em;
    text-transform:uppercase; color:#a39c8c; margin-top:4px;
  }
  .adminlink{
    display:inline-block; margin-top:8px; font-family:'IBM Plex Mono', monospace; font-size:10.5px;
    letter-spacing:0.06em; text-transform:uppercase; color:var(--moss); text-decoration:none;
  }
  .adminlink:hover{ color:var(--wax); }

  .panel{ background:var(--panel); border:1px solid var(--line); border-radius:2px; box-shadow:var(--shadow); }
  .row{ padding:22px 24px; border-bottom:1px solid var(--line); }
  .row:last-child{ border-bottom:none; }
  label{
    display:flex; align-items:baseline; justify-content:space-between;
    font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:0.08em;
    text-transform:uppercase; color:#7a756a; margin-bottom:10px;
  }
  label .req{ color:var(--wax); }
  textarea{
    width:100%; background:transparent; border:none; border-bottom:1px solid var(--line);
    padding:8px 0 10px; font-family:'Fraunces', serif; font-size:17px; color:var(--ink);
    outline:none; resize:vertical; min-height:88px; line-height:1.5; transition:border-color .15s ease;
  }
  textarea:focus{ border-color:var(--moss); }
  textarea::placeholder{ color:#b7b0a2; }
  input[type="text"]{
    width:100%; background:transparent; border:none; border-bottom:1px solid var(--line);
    padding:8px 0 10px; font-family:'Inter', sans-serif; font-size:15px; color:var(--ink);
    outline:none; transition:border-color .15s ease;
  }
  input[type="text"]:focus{ border-color:var(--moss); }
  input::placeholder{ color:#b7b0a2; }
  select{
    width:100%; background:transparent; border:none; border-bottom:1px solid var(--line);
    padding:8px 0 10px; font-family:'Inter', sans-serif; font-size:14px; color:var(--ink);
    outline:none; transition:border-color .15s ease;
  }
  select:focus{ border-color:var(--moss); }
  .optionrow{ display:flex; gap:24px; flex-wrap:wrap; }
  .optionrow > div{ flex:1; min-width:150px; }
  .charcount{ text-align:right; font-family:'IBM Plex Mono', monospace; font-size:11px; color:#a39c8c; margin-top:6px; }
  .charcount.over{ color:var(--wax); }

  .dropzone{
    border:1px dashed #cfc7b6; border-radius:2px; padding:20px; display:flex; align-items:center;
    gap:14px; cursor:pointer; transition:border-color .15s ease, background .15s ease;
  }
  .dropzone:hover, .dropzone.drag{ border-color:var(--moss); background:#fbfaf6; }
  .dropzone .glyph{
    width:38px; height:38px; border-radius:50%; border:1px solid var(--line);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--moss); font-size:16px;
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
  .optional{ color:#a39c8c; font-weight:400; }

  .actions{ padding:24px; display:flex; flex-direction:column; gap:14px; }
  button.generate{
    background:var(--ink); color:var(--paper); border:none; padding:16px 20px;
    font-family:'IBM Plex Mono', monospace; font-size:13px; letter-spacing:0.1em; text-transform:uppercase;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:background .15s ease;
  }
  button.generate:hover:not(:disabled){ background:var(--wax); }
  button.generate:disabled{ background:#cfc7b6; cursor:not-allowed; }
  .spinner{
    width:13px; height:13px; border-radius:50%; border:2px solid rgba(247,244,238,0.35);
    border-top-color:var(--paper); animation:spin .7s linear infinite; display:none;
  }
  .spinner.on{ display:inline-block; }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .status{
    font-family:'IBM Plex Mono', monospace; font-size:12px; color:#7a756a;
    min-height:16px; display:flex; align-items:center; gap:8px;
  }
  .status.err{ color:var(--wax); }
  .status.ok{ color:var(--moss); }

  .output{ margin-top:28px; border:1px solid var(--line); background:var(--panel); padding:24px; display:none; }
  .output.show{ display:block; }
  .output .eyebrow{ margin-bottom:16px; }
  audio{ width:100%; height:42px; }
  .output-foot{ display:flex; justify-content:space-between; align-items:center; margin-top:16px; gap:12px; }
  .meta{ font-family:'IBM Plex Mono', monospace; font-size:11.5px; color:#8f8879; }
  .download{
    font-family:'IBM Plex Mono', monospace; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--ink); text-decoration:none; border:1px solid var(--ink); padding:10px 18px;
    display:inline-flex; align-items:center; gap:8px; transition:all .15s ease; flex-shrink:0;
    background:none; cursor:pointer;
  }
  .download:hover{ background:var(--ink); color:var(--paper); }
  .download.disabled{ opacity:0.5; pointer-events:none; }
  footer{
    text-align:center; margin-top:48px; font-family:'IBM Plex Mono', monospace;
    font-size:11px; color:#b7b0a2; letter-spacing:0.04em;
  }
  footer a{ color:#b7b0a2; text-decoration:underline; }
  footer .powered{ margin-top:6px; }
  .top-actions{
    position:absolute; top:24px; right:24px; z-index:2;
    display:flex; align-items:flex-end; flex-direction:column; gap:8px;
  }
  .top-actions .btn{
    background:var(--ink); color:var(--paper); font-family:'IBM Plex Mono', monospace;
    font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; text-decoration:none;
    padding:8px 14px; border-radius:3px; display:inline-flex; align-items:center; gap:6px;
    box-shadow:var(--shadow); transition:background .15s ease; white-space:nowrap;
  }
  .top-actions .btn:hover{ background:var(--wax); }
  @media (max-width:520px){
    .wrap{ padding:28px 16px 60px; }
    header{ flex-direction:column; }
    .row{ padding:18px 18px; }
    .output-foot{ flex-direction:column; align-items:stretch; }
    .download{ justify-content:center; }
    .top-actions{ position:static; flex-direction:row; justify-content:flex-end; margin-bottom:16px; }
  }
</style>
</head>
<body>

<div class="wrap">

  <div class="top-actions">
    <a href="/plans" class="btn">🎫 Plans / Buy</a>
    <div id="adminLinkWrap"></div>
  </div>

  <header>
    <div>
      <div class="eyebrow"><span class="dot live"></span><span id="whoLabel">Ko Paing AI Voice Studio</span></div>
      <h1>Voice Studio</h1>
      <p class="sub">Type a line, hand it a short voice sample, and the studio speaks it back in that voice.</p>
    </div>
    <div>
      <div class="credits-box">
        <div class="num" id="creditsNum">–</div>
        <div class="label">Credits</div>
      </div>
    </div>
  </header>

  <div class="panel">
    <div class="row">
      <label for="textInput">Text to speak <span class="req">*</span></label>
      <textarea id="textInput" placeholder="Write what you want the voice to say…"></textarea>
      <div class="charcount"><span id="charLen">0</span> characters = <span id="charCost">0</span> credits</div>
    </div>

    <div class="row">
      <label>Voice sample <span class="optional">(optional — for cloning)</span></label>
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

    <div class="row">
      <label for="paceSelect">Speech Pace</label>
      <select id="paceSelect">
        <option value="normal">Normal</option>
        <option value="slow">Slow</option>
        <option value="fast">Fast</option>
      </select>
    </div>

    <div class="row optionrow">
      <div>
        <label for="styleSelect">Speaking Style</label>
        <select id="styleSelect">
          <option value="normal">Normal</option>
          <option value="happy">Happy</option>
          <option value="sad">Sad</option>
          <option value="news">News</option>
          <option value="audiobook">Audio Book</option>
          <option value="calm">Calm</option>
        </select>
      </div>
      <div>
        <label for="voiceTypeSelect">Voice Type</label>
        <select id="voiceTypeSelect">
          <option value="female">အမျိုးသမီးအသံ (Female)</option>
          <option value="male">အမျိုးသားအသံ (Male)</option>
          <option value="multi">Multi Voice</option>
        </select>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="generate" id="generateBtn">
      <span class="spinner" id="spinner"></span>
      <span id="generateLabel">Generate speech</span>
    </button>
    <div class="status" id="statusLine"></div>
  </div>

  <div class="output" id="output">
    <div class="eyebrow"><span class="dot live"></span>Result</div>
    <audio id="audioPlayer" controls></audio>
    <div class="output-foot">
      <div class="meta" id="outputMeta">—</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a class="download" id="downloadLink" download="voice-output.wav">Download ⭜</a>
        <button class="download" id="sendTelegramBtn" type="button">📩 Telegram ကို ပို့ပါ</button>
      </div>
    </div>
  </div>

  <footer>
    AI Voice Studio
    <div class="powered">Power By Ko Paing · <a href="/privacy">Privacy Policy</a></div>
  </footer>
</div>

<script>
(function(){
  const $ = id => document.getElementById(id);

  let tgUser = null;
  try { tgUser = JSON.parse(sessionStorage.getItem('tg_user') || 'null'); } catch(e){}

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
  const downloadLink   = $('downloadLink');
  const sendTelegramBtn = $('sendTelegramBtn');

  const paceSelect    = $('paceSelect');
  const styleSelect   = $('styleSelect');
  const voiceTypeSelect = $('voiceTypeSelect');

  let refAudioBase64 = null;
  let currentCredits = 0;
  let polling = false;
  let savedAudioUrl = null;
  let lastAudioBase64 = null;
  let lastAudioFormat = null;
  const tgWebApp = window.Telegram && window.Telegram.WebApp;

  if (!tgUser || !tgUser.id) {
    statusLine.textContent = 'Telegram App ကနေ ပြန်ဝင်ပေးပါ။';
    statusLine.className = 'status err';
    generateBtn.disabled = true;
  } else {
    whoLabelEl.textContent = 'Hi, ' + (tgUser.first_name || tgUser.username || 'there') + '!';
    if (tgUser.isAdmin) {
      $('adminLinkWrap').innerHTML = '<a href="/admin" class="btn">🛠 Admin Panel</a>';
    }
    loadCredits();
  }

  async function loadCredits(){
    try {
      const res = await fetch('/api/user/get', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ userId: tgUser.id })
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
  });

  // Telegram Mini App ရဲ့ in-app browser ကနေ audio ကို တိုက်ရိုက် download ဆွဲမရတဲ့
  // ပြဿနာအတွက် - saved audio ရဲ့ real https URL ကို Chrome (system browser) မှာ
  // ဖွင့်ပေးပြီး အဲ့ဒီကနေ direct download ချနိုင်အောင် လုပ်ပေးသည်
  downloadLink.addEventListener('click', e => {
    if (tgWebApp && savedAudioUrl) {
      e.preventDefault();
      tgWebApp.openLink(savedAudioUrl);
    }
    // Telegram မဟုတ်ရင် (သို့) savedAudioUrl မရသေးရင် anchor ရဲ့ default download အတိုင်း လုပ်ပါစေ
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

    const paceInstructions = {
      slow: 'Speaks slowly.',
      fast: 'Speaks quickly, at a fast pace.'
    };
    const controlInstruction = paceInstructions[paceSelect.value] || undefined;

    try {
      const startRes = await fetch('/api/generate', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          userId: tgUser.id,
          text,
          refAudioBase64: refAudioBase64 || undefined,
          promptText: promptTextEl.value.trim() || undefined,
          controlInstruction,
          style: styleSelect.value,
          voiceType: voiceTypeSelect.value
        })
      });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.success) {
        throw new Error(startData.error || 'Request failed');
      }

      currentCredits = startData.remainingCredits;
      creditsNumEl.textContent = currentCredits;

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
        body: JSON.stringify({ userId: tgUser.id, jobId, cost })
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
        setStatus('Done.', 'ok');
        return;
      } else if (data.status === 'FAILED') {
        await loadCredits();
        throw new Error(data.error || 'The worker reported a failure. Credits refunded.');
      } else if (data.status === 'CANCELLED') {
        await loadCredits();
        throw new Error('Job was cancelled. Credits refunded.');
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  async function renderAudio(out){
    const fmt = out.format || 'wav';
    const mime = fmt === 'mp3' ? 'audio/mpeg' : ('audio/' + fmt);
    const src = 'data:' + mime + ';base64,' + out.audio_base64;

    audioPlayer.src = src;
    downloadLink.href = src;
    downloadLink.download = 'voice-output.' + fmt;
    outputMeta.textContent = out.sample_rate ? (out.sample_rate + ' Hz · ' + fmt.toUpperCase()) : fmt.toUpperCase();

    lastAudioBase64 = out.audio_base64;
    lastAudioFormat = fmt;

    savedAudioUrl = null;
    downloadLink.classList.add('disabled');
    downloadLink.textContent = 'Preparing…';
    try {
      const res = await fetch('/api/generate/save-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tgUser ? tgUser.id : undefined,
          audioBase64: out.audio_base64,
          format: fmt
        })
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        savedAudioUrl = location.origin + data.url;
        downloadLink.href = savedAudioUrl;
      }
    } catch (e) {
      // save-audio ရယူ၍ မရရင် data URI (src) အတိုင်းသာ download ဖြစ်ပါစေ
    } finally {
      downloadLink.classList.remove('disabled');
      downloadLink.textContent = 'Download ⭜';
    }

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
        body: JSON.stringify({ userId: tgUser.id, audioBase64: lastAudioBase64, format: lastAudioFormat })
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
    let tgUser = null;
    try { tgUser = JSON.parse(sessionStorage.getItem('tg_user') || 'null'); } catch(e){}

    let selectedPlan = null;
    let slipBase64 = null;

    async function loadPlans() {
      const wrap = document.getElementById('plansWrap');
      try {
        const res = await fetch('/api/plans/list', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
        const data = await res.json();
        if (!res.ok || !data.success || !data.plans.length) {
          wrap.innerHTML = '<div class="empty">Plans မရှိသေးပါ။</div>';
          return;
        }
        wrap.innerHTML = data.plans.map(p => \`
          <div class="plan-card">
            <h3>\${p.name}</h3>
            <div class="price">\${p.price}</div>
            <div class="credits">\${p.credits} credits</div>
            \${p.description ? '<div class="desc">' + p.description + '</div>' : ''}
            <button class="buy" onclick='openModal(\${JSON.stringify(p)})'>Buy Now</button>
          </div>
        \`).join('');
      } catch (err) {
        wrap.innerHTML = '<div class="error">Network error</div>';
      }
    }

    async function openModal(plan) {
      if (!tgUser || !tgUser.id) { alert('Telegram App ကနေ ပြန်ဝင်ပေးပါ။'); return; }
      selectedPlan = plan;
      slipBase64 = null;
      document.getElementById('modalPlanName').textContent = plan.name + ' — ' + plan.price;
      document.getElementById('slipPreview').style.display = 'none';
      document.getElementById('uploadLabel').style.display = 'block';
      document.getElementById('purchaseMsg').textContent = '';
      document.getElementById('modalBg').classList.add('show');

      try {
        const res = await fetch('/api/payment/info', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
        const data = await res.json();
        const p = data.paymentInfo || {};
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
      const reader = new FileReader();
      reader.onload = () => {
        slipBase64 = reader.result;
        const img = document.getElementById('slipPreview');
        img.src = slipBase64;
        img.style.display = 'block';
        document.getElementById('uploadLabel').style.display = 'none';
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
          body: JSON.stringify({ userId: tgUser.id, planId: selectedPlan.id, slipImageBase64: slipBase64 })
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
