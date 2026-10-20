// Servidor da BT Veículos (Cloudflare Worker + banco D1).
//
// Público:  POST /e                 registra visita/clique vindo do site
// Painel:   POST /admin/login       troca a senha por uma sessão de 12 h
//           GET  /admin/stats       números de visitas e cliques
//           GET  /admin/stock       estoque atual (lido do GitHub)
//           POST /admin/publish     publica estoque + fotos em um único commit
//
// Segredos (wrangler secret put): ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN.

const TYPES = new Set(['visit', 'page', 'car', 'whats']);
const DEVICES = new Set(['celular', 'computador', 'tablet']);
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|python|curl|wget/i;
const SESSION_HOURS = 12;
const VEHICLE_FIELDS = {
  id: 'number', destaque: 'boolean', marca: 'string', modelo: 'string', versao: 'string',
  ano: 'number', anoModelo: 'number', km: 'number', uso: 'string', cambio: 'string',
  combustivel: 'string', cor: 'string', preco: 'number', img: 'string', heroImg: 'string',
  opcionais: 'array', desc: 'string', fotos: 'array',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/e' && request.method === 'POST') return await track(request, env, cors);
      if (url.pathname === '/admin/login' && request.method === 'POST') return await login(request, env, cors);

      if (url.pathname.startsWith('/admin/')) {
        if (!(await authorized(request, env))) return json({ erro: 'Sessão expirada. Entre de novo.' }, 401, cors);
        if (url.pathname === '/admin/stats' && request.method === 'GET') return await stats(url, env, cors);
        if (url.pathname === '/admin/stock' && request.method === 'GET') return await getStock(env, cors);
        if (url.pathname === '/admin/publish' && request.method === 'POST') return await publish(request, env, cors);
      }
      return json({ erro: 'Não encontrado' }, 404, cors);
    } catch (e) {
      return json({ erro: e.message || 'Erro interno' }, e.status || 500, cors);
    }
  },
};

// ---------------------------------------------------------------- utilidades

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Dia no fuso de São Paulo (UTC-3, sem horário de verão desde 2019)
const spDay = ts => new Date(ts - 3 * 3600 * 1000).toISOString().slice(0, 10);
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

function sameString(a, b) {
  // Comparação em tempo constante para não vazar a senha pelo tempo de resposta
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

// ---------------------------------------------------------------- eventos do site

async function track(request, env, cors) {
  if (BOT_UA.test(request.headers.get('User-Agent') || '')) return new Response(null, { status: 204, headers: cors });

  let body;
  try { body = JSON.parse(await request.text()); } catch { throw fail('JSON inválido'); }
  const type = body.t;
  const vid = body.v;
  if (!TYPES.has(type)) throw fail('Tipo inválido');
  if (typeof vid !== 'string' || !/^[a-z0-9-]{8,40}$/i.test(vid)) throw fail('Identificador inválido');

  const ts = Date.now();
  const dev = DEVICES.has(body.d) ? body.d : null;
  const ref = typeof body.r === 'string' ? body.r.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 60) || null : null;
  const car = body.c == null ? null : clip(String(body.c), 20);
  await env.DB.prepare('INSERT INTO events (ts, day, type, vid, page, target, label, dev, ref, car) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(ts, spDay(ts), type, vid, clip(body.p, 120), clip(body.g, 80), clip(body.l, 120), dev, ref, car)
    .run();
  return new Response(null, { status: 204, headers: cors });
}

// ---------------------------------------------------------------- login do painel

async function login(request, env, cors) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) throw fail('Servidor sem senha configurada', 500);
  let body;
  try { body = await request.json(); } catch { throw fail('JSON inválido'); }

  if (!sameString(body.senha || '', env.ADMIN_PASSWORD)) {
    await new Promise(r => setTimeout(r, 900)); // atrasa tentativas em sequência
    return json({ erro: 'Senha incorreta.' }, 401, cors);
  }
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600 * 1000 })));
  return json({ token: `${payload}.${await hmac(env.SESSION_SECRET, payload)}` }, 200, cors);
}

async function authorized(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !env.SESSION_SECRET) return false;
  if (!sameString(sig, await hmac(env.SESSION_SECRET, payload))) return false;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return data.exp > Date.now();
  } catch { return false; }
}

// ---------------------------------------------------------------- estatísticas

async function stats(url, env, cors) {
  const days = Math.min(Math.max(parseInt(url.searchParams.get('dias') || '30', 10) || 30, 1), 3650);
  const now = Date.now();
  const from = spDay(now - (days - 1) * 86400000);
  const prevFrom = spDay(now - (2 * days - 1) * 86400000);
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const RESUMO = `SELECT
      COUNT(DISTINCT CASE WHEN type IN ('visit','page') THEN vid END) AS visitantes,
      SUM(type = 'visit') AS visitas,
      SUM(type = 'page') AS paginas,
      SUM(type = 'car') AS cliquesCarros,
      COUNT(DISTINCT CASE WHEN type = 'car' THEN vid END) AS pessoasCarros,
      SUM(type = 'whats') AS cliquesWhats,
      COUNT(DISTINCT CASE WHEN type = 'whats' THEN vid END) AS pessoasWhats
    FROM events`;

  const [resumo, anterior, agora, porDia, carros, whatsCarro, botoes, origens, aparelhos, horas, paginas] = await env.DB.batch([
    q(`${RESUMO} WHERE day >= ?`, from),
    q(`${RESUMO} WHERE day >= ? AND day < ?`, prevFrom, from),
    q(`SELECT COUNT(DISTINCT vid) AS pessoas FROM events WHERE ts >= ?`, now - 30 * 60000),
    q(`SELECT day, COUNT(DISTINCT vid) AS visitantes, SUM(type = 'visit') AS visitas
       FROM events WHERE day >= ? AND type IN ('visit','page') GROUP BY day ORDER BY day`, from),
    q(`SELECT target AS id, MAX(label) AS nome, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'car' AND day >= ? GROUP BY target ORDER BY total DESC`, from),
    q(`SELECT COALESCE(car, label) AS chave, MAX(car) AS id, MAX(label) AS nome, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'whats' AND target = 'detalhes-veiculo' AND day >= ? AND (car IS NOT NULL OR label IS NOT NULL)
       GROUP BY chave ORDER BY total DESC`, from),
    q(`SELECT target AS botao, COUNT(*) AS total, COUNT(DISTINCT vid) AS unicos
       FROM events WHERE type = 'whats' AND day >= ? GROUP BY target ORDER BY total DESC`, from),
    q(`SELECT COALESCE(ref, 'direto') AS origem, COUNT(*) AS visitas, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY origem ORDER BY visitas DESC`, from),
    q(`SELECT COALESCE(dev, 'desconhecido') AS aparelho, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY aparelho ORDER BY pessoas DESC`, from),
    q(`SELECT CAST(((ts / 1000 - 10800) % 86400) / 3600 AS INTEGER) AS hora, COUNT(*) AS visitas
       FROM events WHERE type = 'visit' AND day >= ? GROUP BY hora`, from),
    q(`SELECT page, COUNT(*) AS total, COUNT(DISTINCT vid) AS pessoas
       FROM events WHERE type = 'page' AND day >= ? GROUP BY page ORDER BY total DESC`, from),
  ]);

  const n = v => Number(v || 0);
  const resumoDe = r => ({
    visitantes: n(r.visitantes), visitas: n(r.visitas), paginas: n(r.paginas),
    cliquesCarros: n(r.cliquesCarros), pessoasCarros: n(r.pessoasCarros),
    cliquesWhats: n(r.cliquesWhats), pessoasWhats: n(r.pessoasWhats),
  });
  const conta = (lista, ...campos) => lista.results.map(x => { for (const c of campos) x[c] = n(x[c]); return x; });
  return json({
    dias: days,
    desde: from,
    agora: n((agora.results[0] || {}).pessoas),
    resumo: resumoDe(resumo.results[0] || {}),
    anterior: resumoDe(anterior.results[0] || {}),
    porDia: porDia.results.map(d => ({ dia: d.day, visitantes: n(d.visitantes), visitas: n(d.visitas) })),
    carros: conta(carros, 'total', 'unicos'),
    whatsPorCarro: conta(whatsCarro, 'total', 'unicos'),
    botoes: conta(botoes, 'total', 'unicos'),
    origens: conta(origens, 'visitas', 'pessoas'),
    aparelhos: conta(aparelhos, 'pessoas'),
    horas: conta(horas, 'hora', 'visitas'),
    paginas: conta(paginas, 'total', 'pessoas'),
  }, 200, cors);
}

// ---------------------------------------------------------------- estoque no GitHub

async function gh(env, path, init = {}) {
  // Ler o repositório público funciona sem token; gravar exige o token
  if (!env.GITHUB_TOKEN && init.method) throw fail('Servidor sem token do GitHub configurado', 500);
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bt-veiculos-painel',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw fail(`GitHub respondeu ${res.status}${detail ? ': ' + detail.slice(0, 160) : ''}`, res.status === 409 ? 409 : 502);
  }
  return res.json();
}

function parseDataJs(text) {
  const whats = (text.match(/const\s+WHATSAPP\s*=\s*'([^']*)'/) || [])[1] || '';
  const start = text.indexOf('[', text.indexOf('VEHICLES'));
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw fail('Não consegui ler o js/data.js', 500);
  return { whatsapp: whats, vehicles: JSON.parse(text.slice(start, end + 1)) };
}

const decodeB64Utf8 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0)));

async function getStock(env, cors) {
  const file = await gh(env, `/contents/js/data.js?ref=${env.GITHUB_BRANCH}`);
  const { whatsapp, vehicles } = parseDataJs(decodeB64Utf8(file.content));
  return json({ sha: file.sha, whatsapp, vehicles }, 200, cors);
}

function cleanText(v, max) {
  // Os textos vão para a página via innerHTML: tira < e > para não virar código
  return String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function sanitizeVehicle(v, i) {
  if (!v || typeof v !== 'object') throw fail(`Veículo ${i + 1} inválido`);
  const out = {};
  for (const [k, type] of Object.entries(VEHICLE_FIELDS)) {
    const val = v[k];
    if (val === undefined || val === null) continue;
    if (type === 'number') { const n = Number(val); if (Number.isFinite(n)) out[k] = n; }
    else if (type === 'boolean') out[k] = Boolean(val);
    else if (type === 'string') out[k] = cleanText(val, k === 'desc' ? 1000 : 160);
    else if (type === 'array') out[k] = (Array.isArray(val) ? val : []).map(x => cleanText(x, 160)).filter(Boolean).slice(0, 40);
  }
  for (const req of ['marca', 'modelo', 'preco', 'ano']) {
    if (out[req] === undefined || out[req] === '') throw fail(`Veículo ${i + 1}: falta "${req}"`);
  }
  if (!out.id) out.id = Date.now() + i;
  for (const p of [out.img, out.heroImg, ...(out.fotos || [])]) {
    if (p && !/^\/carros\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(p)) throw fail(`Veículo ${i + 1}: caminho de foto inválido (${p})`);
  }
  return out;
}

async function publish(request, env, cors) {
  let body;
  try { body = await request.json(); } catch { throw fail('JSON inválido'); }
  if (!Array.isArray(body.vehicles)) throw fail('Lista de veículos ausente');
  const vehicles = body.vehicles.map(sanitizeVehicle);
  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (photos.length > 60) throw fail('Muitas fotos de uma vez (máximo 60)');
  for (const p of photos) {
    if (!/^carros\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(p.path || '')) throw fail(`Nome de foto inválido: ${p.path}`);
    if (typeof p.data !== 'string' || p.data.length > 4_000_000) throw fail(`Foto grande demais: ${p.path}`);
  }

  // Confere se ninguém publicou outra versão desde que o painel carregou
  const current = await gh(env, `/contents/js/data.js?ref=${env.GITHUB_BRANCH}`);
  if (body.baseSha && body.baseSha !== current.sha) {
    throw fail('O estoque foi alterado em outro lugar depois que você abriu o painel. Recarregue e refaça a alteração.', 409);
  }
  const { whatsapp } = parseDataJs(decodeB64Utf8(current.content));
  const content = `const WHATSAPP = '${whatsapp}';\n\nconst VEHICLES = ${JSON.stringify(vehicles, null, 2)};\n`;
  const message = cleanText(body.message || 'Atualização do estoque pelo painel', 120);

  if (env.DRY_RUN === '1') {
    return json({ ok: true, simulacao: true, veiculos: vehicles.length, fotos: photos.map(p => p.path), tamanho: content.length }, 200, cors);
  }

  // Um único commit com o data.js e todas as fotos novas (um só build do site)
  const ref = await gh(env, `/git/ref/heads/${env.GITHUB_BRANCH}`);
  const head = await gh(env, `/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const p of photos) {
    const blob = await gh(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: p.data, encoding: 'base64' }) });
    tree.push({ path: p.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const dataBlob = await gh(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding: 'utf-8' }) });
  tree.push({ path: 'js/data.js', mode: '100644', type: 'blob', sha: dataBlob.sha });

  const newTree = await gh(env, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
  const commit = await gh(env, '/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [head.sha] }) });
  await gh(env, `/git/refs/heads/${env.GITHUB_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });

  return json({ ok: true, commit: commit.sha, sha: dataBlob.sha, veiculos: vehicles.length, fotos: photos.length }, 200, cors);
}
