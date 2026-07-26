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
     VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = COALESCE(?2, users.name),
       username = COALESCE(?3, users.username),
       credits = COALESCE(?4, users.credits),
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

  await upsertUser(env, user.id, {
    name: user.first_name || user.username || 'User',
    username: user.username || null,
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
    'SELECT id, name, username, credits, is_admin, updated_at FROM users ORDER BY updated_at DESC LIMIT 500'
  ).all();

  return json({ success: true, users: results }, 200, corsHeaders);
}

// Credits system: 1 character of TTS text = 1 credit.
// Credits ကို job စတင်ချိန်မှာ ပြန်နုတ်ပြီး၊ job fail/cancel ဖြစ်ရင် ပြန်ထည့်ပေးသည်။

async function handleGenerateStart(request, env, corsHeaders) {
  const body = await request.json();
  const { userId, text, refAudioBase64, promptText } = body;

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
    `UPDATE users SET credits = credits - ?1, updated_at = datetime('now') WHERE id = ?2`
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
      `UPDATE users SET credits = credits + ?1, updated_at = datetime('now') WHERE id = ?2`
    )
      .bind(Number(cost), String(userId))
      .run();
  }

  return json(data, 200, corsHeaders);
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
      padding: 24px;
    }
    .header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .header h1 { font-size: 18px; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    th, td { padding: 12px 16px; text-align: left; font-size: 13px; border-bottom: 1px solid #eee; }
    th { background: #1a1a1a; color: #fff; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
    .badge { background: #1a1a1a; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; }
    .error, .empty { color: #999; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:24px;">🎙️</div>
    <h1>Ko Paing AI Voice Studio — Admin</h1>
  </div>
  <div id="content">Loading…</div>

  <script>
    async function loadUsers() {
      const token = sessionStorage.getItem('admin_token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          document.getElementById('content').innerHTML =
            '<div class="error">' + (data.error || 'Failed to load users') + '</div>';
          if (res.status === 401) window.location.href = '/';
          return;
        }

        if (!data.users.length) {
          document.getElementById('content').innerHTML = '<div class="empty">No users yet.</div>';
          return;
        }

        const rows = data.users.map(u => \`
          <tr>
            <td>\${u.id}</td>
            <td>\${u.name || '-'}</td>
            <td>\${u.username ? '@' + u.username : '-'}</td>
            <td>\${u.credits ?? 0}</td>
            <td>\${u.is_admin ? '<span class="badge">ADMIN</span>' : ''}</td>
            <td>\${u.updated_at || '-'}</td>
          </tr>
        \`).join('');

        document.getElementById('content').innerHTML = \`
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Username</th><th>Credits</th><th>Role</th><th>Updated</th></tr>
            </thead>
            <tbody>\${rows}</tbody>
          </table>
        \`;
      } catch (err) {
        document.getElementById('content').innerHTML = '<div class="error">Network error: ' + err.message + '</div>';
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
  a.download{
    font-family:'IBM Plex Mono', monospace; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;
    color:var(--ink); text-decoration:none; border:1px solid var(--ink); padding:10px 18px;
    display:inline-flex; align-items:center; gap:8px; transition:all .15s ease; flex-shrink:0;
  }
  a.download:hover{ background:var(--ink); color:var(--paper); }
  footer{
    text-align:center; margin-top:48px; font-family:'IBM Plex Mono', monospace;
    font-size:11px; color:#b7b0a2; letter-spacing:0.04em;
  }
  @media (max-width:520px){
    .wrap{ padding:28px 16px 60px; }
    header{ flex-direction:column; }
    .row{ padding:18px 18px; }
    .output-foot{ flex-direction:column; align-items:stretch; }
    a.download{ justify-content:center; }
  }
</style>
</head>
<body>

<div class="wrap">

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
      <div id="adminLinkWrap"></div>
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
      <a class="download" id="downloadLink" download="voice-output.wav">Download ⭜</a>
    </div>
  </div>

  <footer>Ko Paing · AI Voice Studio</footer>
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

  let refAudioBase64 = null;
  let currentCredits = 0;
  let polling = false;

  if (!tgUser || !tgUser.id) {
    statusLine.textContent = 'Telegram App ကနေ ပြန်ဝင်ပေးပါ။';
    statusLine.className = 'status err';
    generateBtn.disabled = true;
  } else {
    whoLabelEl.textContent = 'Hi, ' + (tgUser.first_name || tgUser.username || 'there') + '!';
    if (tgUser.isAdmin) {
      $('adminLinkWrap').innerHTML = '<a href="/admin" class="adminlink">🛠 Admin Panel →</a>';
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
          userId: tgUser.id,
          text,
          refAudioBase64: refAudioBase64 || undefined,
          promptText: promptTextEl.value.trim() || undefined
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
        renderAudio(out);
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

  function renderAudio(out){
    const fmt = out.format || 'wav';
    const mime = fmt === 'mp3' ? 'audio/mpeg' : ('audio/' + fmt);
    const src = 'data:' + mime + ';base64,' + out.audio_base64;

    audioPlayer.src = src;
    downloadLink.href = src;
    downloadLink.download = 'voice-output.' + fmt;
    outputMeta.textContent = out.sample_rate ? (out.sample_rate + ' Hz · ' + fmt.toUpperCase()) : fmt.toUpperCase();

    output.classList.add('show');
    output.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
})();
</script>

</body>
</html>`;
}
