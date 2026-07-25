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
      if (url.pathname === '/api/admin/users' && request.method === 'POST') {
        return await handleAdminListUsers(request, env, corsHeaders);
      }
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env, corsHeaders);
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

async function handleGenerate(request, env, corsHeaders) {
  const body = await request.json();
  const { prompt, voiceId } = body;

  if (!env.RUNPOD_API_KEY || !env.RUNPOD_ENDPOINT_ID) {
    return json({ error: 'RunPod environment variables missing' }, 500, corsHeaders);
  }

  const runpodUrl = `https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/runsync`;
  const res = await fetch(runpodUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: { prompt, voice_id: voiceId } }),
  });

  const data = await res.json();
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
  <style>${BASE_STYLE}</style>
</head>
<body>
  <div class="card">
    <div class="brand-icon">🎙️</div>
    <h2>Welcome</h2>
    <div class="subtitle" id="who">AI Voice Studio</div>
    <p style="font-size:13px;color:#777;">Voice generation UI ကို ဒီနေရာမှာ ဆက်တည်ဆောက်ပါမယ်။</p>
    <div id="adminBtnWrap"></div>
  </div>

  <script>
    const stored = sessionStorage.getItem('tg_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        document.getElementById('who').innerText = 'Hi, ' + (u.first_name || u.username || 'there') + '!';

        if (u.isAdmin) {
          const wrap = document.getElementById('adminBtnWrap');
          wrap.innerHTML = '<button id="adminBtn" style="margin-top:16px;">🛠 Go to Admin Panel</button>';
          document.getElementById('adminBtn').onclick = function () {
            const token = sessionStorage.getItem('admin_token');
            if (token) sessionStorage.setItem('admin_token', token);
            window.location.href = '/admin';
          };
        }
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}
