// Law and Son Decorators — website, enquiry inbox and admin, in one Cloudflare Worker.
import { DEFAULTS, validateContent, withDefaults, cleanPhone } from './content.js';
import { renderPage, renderSitemap, renderRobots } from './render.js';

const SESSION_TTL = 12 * 60 * 60;
const COOKIE = '__Host-ls_admin';
const MAX_FAILS = 5, LOCK_SECONDS = 15 * 60;
const MAX_UPLOAD = 4 * 1024 * 1024;
const KEEP_LOG = 200;
const MEDIA_ID = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const ENQ_ID = /^\d{13}-[a-f0-9]{8}$/;
const PUBLIC_CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";
const ADMIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
const OLD_URLS = { '/index.html': '/', '/about.html': '/about/', '/services.html': '/services/', '/gallery.html': '/our-work/', '/areas.html': '/about/#areas', '/enquiry.html': '/quote/' };
const PAGES = ['/', '/services/', '/our-work/', '/about/', '/quote/', '/privacy/', '/thanks/'];

export default {
  async fetch(request, env, ctx) {
    try { return await route(request, env, ctx); }
    catch (err) { console.error(err && err.stack || err); return json({ error: 'Something went wrong on our side. Please try again.' }, 500); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(tidyUp(env)); }
};

async function route(req, env, ctx) {
  const url = new URL(req.url), m = req.method;
  let p = url.pathname;

  // one address for Google: send the free workers.dev copy and www/non-www twins to the main address
  const c0 = needsContent(p) ? await content(env) : null;
  const site = c0 && c0.seo.siteUrl ? new URL(c0.seo.siteUrl) : null;
  if (site && url.host !== site.host && (url.hostname.endsWith('.workers.dev') || url.host === 'www.' + site.host || 'www.' + url.host === site.host))
    return Response.redirect(site.origin + p + url.search, 301);

  if (OLD_URLS[p]) return Response.redirect(url.origin + OLD_URLS[p], 301);
  if (p === '/media' || p.startsWith('/media/')) return m === 'GET' || m === 'HEAD' ? media(p.slice(7), env, m) : notAllowed();

  if (p === '/enquiry') return m === 'POST' ? enquiry(req, env, url) : Response.redirect(url.origin + '/quote/', 302);
  if (p === '/sitemap.xml') return withPublic(new Response(renderSitemap(c0, origin(c0, url)), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }), url);
  if (p === '/robots.txt') return withPublic(new Response(renderRobots(c0, origin(c0, url)), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }), url);

  if (!p.startsWith('/api/') && !p.startsWith('/admin') && !p.startsWith('/assets/') && !p.includes('.') && !p.endsWith('/')) return Response.redirect(url.origin + p + '/' + url.search, 301);
  if (PAGES.includes(p) && (m === 'GET' || m === 'HEAD')) {
    if (p === '/our-work/' && !c0.gallery.length) return Response.redirect(url.origin + '/', 302);
    const html = renderPage(p, c0, { origin: origin(c0, url), token: p === '/quote/' || p === '/' ? await formToken(env) : '', query: url.searchParams });
    const res = page(m === 'HEAD' ? null : html, url);
    if (p === '/thanks/') res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  }

  // ---- admin ----
  if (p === '/api/setup-state' && m === 'GET') { const cr = await credentials(env); return json({ needsSetup: !cr.hash, hasCode: !!env.SETUP_CODE }); }
  if (p === '/api/setup') return m === 'POST' ? setup(req, env, url) : notAllowed();
  if (p === '/api/login') return m === 'POST' ? login(req, env, url) : notAllowed();
  if (p === '/api/logout') return m === 'POST' ? logout(req, env, url) : notAllowed();
  if (p.startsWith('/api/admin/')) {
    const s = await getSession(req, env);
    if (!s) return json({ error: 'Your session has ended. Please log in again.' }, 401);
    if (m !== 'GET' && !sameOrigin(req, url)) return json({ error: 'Request blocked for security reasons.' }, 403);
    return adminApi(req, env, p.slice(11), m, s, url);
  }
  if (p.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
  if (p === '/admin') return redirect(url.origin + '/admin/');
  if (p === '/admin/app' || p === '/admin/app.html') {
    if (!(await getSession(req, env))) return redirect(url.origin + '/admin/');
    return adminHeaders(await env.ASSETS.fetch(new Request(url.origin + '/admin/app', { headers: req.headers })));
  }
  if (p.startsWith('/admin/')) return adminHeaders(await env.ASSETS.fetch(req));

  const res = await env.ASSETS.fetch(req);
  if (res.status === 404) return page(renderPage('404', c0 || await content(env), { origin: url.origin }), url, 404);
  const out = withPublic(res, url);
  if (p.startsWith('/assets/')) out.headers.set('Cache-Control', 'public, max-age=86400');
  return out;
}

const needsContent = p => !p.startsWith('/api/') && !p.startsWith('/assets/') && !p.startsWith('/media/');
const origin = (c, url) => (c && c.seo.siteUrl) || url.origin;
async function content(env) { return withDefaults(await env.KV.get('content', 'json')); }

/* ---------------- public forms ---------------- */
const SERVICES_IN = ['Interior painting', 'Exterior decorating', 'Landlord refresh', 'Commercial decorating', 'Preparation and repairs', 'Not sure yet'];
const PROPERTY_IN = ['House', 'Flat or apartment', 'Rental property', 'Office or shop', 'Other'];
const CONTACT_IN = ['Phone', 'Email', 'Either'];
const COLOURS_IN = ['Not yet', 'Rough idea', 'Yes, chosen'];

async function enquiry(req, env, url) {
  if (!sameOrigin(req, url)) return new Response('Request blocked for security reasons.', { status: 403 });
  let f;
  try { f = await req.formData(); } catch { return new Response('Bad request', { status: 400 }); }
  const g = k => String(f.get(k) || '').replace(/\r/g, '').trim();
  const type = g('type') === 'message' ? 'message' : 'quote';
  const back = type === 'message' ? '/' : '/quote/';
  const c = await content(env);
  // bots: hidden field filled in, form sent too fast, or an old/forged form
  if (g('website') || !(await checkToken(env, g('t')))) return Response.redirect(url.origin + '/thanks/?t=' + type, 303);

  const v = {
    type, name: g('name').slice(0, 80), email: g('email').slice(0, 120), phone: g('phone').slice(0, 30),
    contact: CONTACT_IN.includes(g('contact')) ? g('contact') : '', area: g('area').slice(0, 60),
    service: SERVICES_IN.includes(g('service')) ? g('service') : '', property: PROPERTY_IN.includes(g('property')) ? g('property') : '',
    rooms: g('rooms').slice(0, 120), timeline: g('timeline').slice(0, 80), colours: COLOURS_IN.includes(g('colours')) ? g('colours') : '',
    details: g('details').slice(0, 3000)
  };
  const errors = {};
  if (!v.name) errors.name = 'Please add your name.';
  if (v.email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(v.email)) errors.email = 'That email address doesn\'t look right.';
  const ph = v.phone ? cleanPhone(v.phone) : '';
  if (v.phone && !ph) errors.phone = 'Please give a UK phone number, like 07700 900123.';
  if (!v.email && !v.phone) errors.email = 'Please give an email address or a phone number so we can reply.';
  if (type === 'quote' && !v.area) errors.area = 'Please add your area or postcode.';
  if (!v.details) errors.details = type === 'message' ? 'Please write your message.' : 'Please tell us a little about the job.';
  if (Object.keys(errors).length) {
    const html = renderPage(back, c, { origin: origin(c, url), token: await formToken(env), form: { type, values: v, errors } });
    return page(html, url, 422);
  }
  const ipKey = 'erl:' + await sha256hex(req.headers.get('cf-connecting-ip') || 'unknown');
  const n = parseInt(await env.KV.get(ipKey), 10) || 0;
  if (n >= 6) {
    const html = renderPage(back, c, { origin: origin(c, url), token: await formToken(env), form: { type, values: v, errors: { form: 'You\'ve sent a few messages already. Please wait an hour, or ring us instead.' } } });
    return page(html, url, 429);
  }
  await env.KV.put(ipKey, String(n + 1), { expirationTtl: 3600 });
  if (ph) v.phone = ph;
  const now = Date.now(), id = String(9999999999999 - now).padStart(13, '0') + '-' + randomHex(4);
  const rec = { id, at: new Date(now).toISOString(), status: 'new', notes: '', ...v };
  await env.KV.put('enq:' + id, JSON.stringify(rec), { metadata: enqMeta(rec) });
  return Response.redirect(url.origin + '/thanks/?t=' + type, 303);
}
const enqMeta = r => ({ t: r.type, s: r.status, n: r.name.slice(0, 60), at: r.at, sv: r.service || '', ar: (r.area || '').slice(0, 40), ex: (r.details || '').slice(0, 90) });

async function formKey(env) {
  let k = await env.KV.get('formkey');
  if (!k) { k = randomHex(32); await env.KV.put('formkey', k); }
  return k;
}
async function formToken(env) { const ts = String(Date.now()); return ts + '.' + (await hmac(await formKey(env), ts)).slice(0, 32); }
async function checkToken(env, tok) {
  const [ts, sig] = String(tok).split('.');
  if (!/^\d{13}$/.test(ts || '') || !sig) return false;
  const age = Date.now() - Number(ts);
  if (age < 3000 || age > 2 * 86400000) return false;
  return bytesEqual(new TextEncoder().encode(sig), new TextEncoder().encode((await hmac(await formKey(env), ts)).slice(0, 32)));
}
async function hmac(keyHex, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))));
}

/* ---------------- admin API ---------------- */
async function adminApi(req, env, path, m, s, url) {
  if (path === 'me' && m === 'GET') return json({ username: s.u, expires: s.exp, unread: (await listEnquiries(env)).filter(e => e.status === 'new').length });
  if (path === 'content' && m === 'GET') {
    const raw = await env.KV.get('content', 'json');
    return json({ content: withDefaults(raw), meta: await env.KV.get('content:meta', 'json') });
  }
  if (path === 'content' && m === 'PUT') {
    const body = await readJson(req);
    if (!body) return json({ error: "That didn't look like valid website content. Reload the page and try again." }, 400);
    const { value, errors } = validateContent(body);
    if (errors.length) return json({ error: 'Not saved. Please fix the following:', details: errors }, 422);
    const before = withDefaults(await env.KV.get('content', 'json'));
    await env.KV.put('content', JSON.stringify(value));
    await env.KV.put('content:meta', JSON.stringify({ savedAt: new Date().toISOString(), savedBy: s.u }));
    const keep = new Set(value.gallery.map(g => g.src));
    for (const g of before.gallery) if (!keep.has(g.src)) await env.KV.delete('media:' + g.src.slice(7));
    await log(env, req, s.u, body.__note ? 'Saved: ' + String(body.__note).slice(0, 60) : 'Saved changes');
    return json({ ok: true, content: value, savedAt: new Date().toISOString() });
  }
  if (path === 'enquiries' && m === 'GET') return json({ enquiries: await listEnquiries(env) });
  if (path.startsWith('enquiries/')) {
    const id = path.slice(10);
    if (!ENQ_ID.test(id)) return json({ error: 'That enquiry could not be found.' }, 404);
    const rec = await env.KV.get('enq:' + id, 'json');
    if (!rec) return json({ error: 'That enquiry could not be found. It may have been deleted.' }, 404);
    if (m === 'GET') return json({ enquiry: rec });
    if (m === 'PATCH') {
      const b = (await readJson(req)) || {};
      if (b.status !== undefined) { if (!['new', 'read', 'replied', 'archived'].includes(b.status)) return json({ error: 'Unknown status.' }, 422); rec.status = b.status; }
      if (b.notes !== undefined) rec.notes = String(b.notes).replace(/\r/g, '').slice(0, 2000);
      await env.KV.put('enq:' + id, JSON.stringify(rec), { metadata: enqMeta(rec) });
      return json({ ok: true, enquiry: rec });
    }
    if (m === 'DELETE') { await env.KV.delete('enq:' + id); await log(env, req, s.u, 'Deleted an enquiry from ' + rec.name.slice(0, 40)); return json({ ok: true }); }
    return notAllowed();
  }
  if (path === 'upload' && m === 'POST') return upload(req, env, s);
  if (path === 'activity' && m === 'GET') return json({ log: (await env.KV.get('log', 'json')) || [] });
  if (path === 'account' && m === 'POST') {
    const b = (await readJson(req)) || {};
    const creds = await credentials(env);
    if (!(await verifyPassword(String(b.current || ''), creds.hash))) { await log(env, req, s.u, 'Failed attempt to change login details'); return json({ error: 'Your current password is wrong.' }, 403); }
    const newUser = String(b.username || '').trim(), newPass = String(b.password || '');
    const err = checkNewLogin(newUser || creds.user, newPass, !!newPass);
    if (newUser && !/^[A-Za-z0-9._@-]{3,60}$/.test(newUser)) return json({ error: 'Usernames can use letters, numbers, dots, dashes and @, from 3 to 60 characters.' }, 422);
    if (newPass && err) return json({ error: err }, 422);
    if (!newUser && !newPass) return json({ error: 'Enter a new username, a new password, or both.' }, 422);
    if (newPass) await env.KV.put('auth:hash', await hashPassword(newPass));
    if (newUser) await env.KV.put('auth:user', newUser);
    const cookie = await bumpGeneration(env, newUser || s.u);
    await log(env, req, newUser || s.u, newPass && newUser ? 'Changed username and password' : newPass ? 'Changed password' : 'Changed username');
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  }
  if (path === 'logout-others' && m === 'POST') {
    const cookie = await bumpGeneration(env, s.u);
    await log(env, req, s.u, 'Logged out all other devices');
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  }
  return json({ error: 'Not found.' }, 404);
}

async function listEnquiries(env) {
  const out = [];
  let cursor;
  do {
    const r = await env.KV.list({ prefix: 'enq:', cursor });
    for (const k of r.keys) { const md = k.metadata || {}; out.push({ id: k.name.slice(4), type: md.t, status: md.s, name: md.n, at: md.at, service: md.sv, area: md.ar, excerpt: md.ex }); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

async function log(env, req, user, action) {
  try {
    const cf = req.cf || {};
    const cur = (await env.KV.get('log', 'json')) || [];
    cur.unshift({ at: new Date().toISOString(), user: user || '', action, where: [cf.city, cf.country].filter(Boolean).join(', ') });
    await env.KV.put('log', JSON.stringify(cur.slice(0, KEEP_LOG)));
  } catch (e) { console.error('log failed', e); }
}

async function upload(req, env, s) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_UPLOAD + 64 * 1024) return json({ error: 'That photo is too large. The limit is 4 MB.' }, 413);
  let form;
  try { form = await req.formData(); } catch { return json({ error: "The upload didn't come through. Please try again." }, 400); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Choose a photo to upload.' }, 400);
  if (file.size > MAX_UPLOAD) return json({ error: 'That photo is too large. The limit is 4 MB.' }, 413);
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return json({ error: "That file isn't a JPEG, PNG or WebP photo." }, 415);
  const id = crypto.randomUUID() + '.' + kind.ext;
  const w = parseInt(form.get('w'), 10) || 0, h = parseInt(form.get('h'), 10) || 0;
  await env.KV.put('media:' + id, buf, { metadata: { type: kind.type, size: buf.length, uploaded: new Date().toISOString(), w, h } });
  await log(env, req, s.u, 'Uploaded a photo');
  return json({ ok: true, src: '/media/' + id, w, h });
}
function sniff(b) {
  if (b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return { ext: 'jpg', type: 'image/jpeg' };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}
async function media(id, env, method) {
  if (!MEDIA_ID.test(id)) return new Response('Not found', { status: 404 });
  const r = await env.KV.getWithMetadata('media:' + id, 'arrayBuffer');
  if (!r || !r.value) return new Response('Not found', { status: 404 });
  return new Response(method === 'HEAD' ? null : r.value, { headers: {
    'Content-Type': (r.metadata && r.metadata.type) || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
}

// daily: delete enquiries older than the privacy setting, and photos uploaded but never used
async function tidyUp(env) {
  const c = await content(env);
  const cutoff = Date.now() - c.privacy.retentionMonths * 30.44 * 86400000;
  for (const e of await listEnquiries(env)) if (e.at && Date.parse(e.at) < cutoff) await env.KV.delete('enq:' + e.id);
  const used = new Set(c.gallery.map(g => g.src.slice(7)));
  let cursor;
  do {
    const r = await env.KV.list({ prefix: 'media:', cursor });
    for (const k of r.keys) { const id = k.name.slice(6); const up = Date.parse((k.metadata || {}).uploaded || 0) || 0; if (!used.has(id) && Date.now() - up > 2 * 86400000) await env.KV.delete(k.name); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
}

/* ---------------- setup, login and sessions ---------------- */
async function credentials(env) {
  const [u, h] = await Promise.all([env.KV.get('auth:user'), env.KV.get('auth:hash')]);
  return { user: String(u || '').trim(), hash: String(h || '').trim() };
}
function checkNewLogin(user, pass) {
  if (pass.length < 12) return 'The password must be at least 12 characters.';
  if (pass.length > 200) return 'The password is too long.';
  if (user && pass.toLowerCase().includes(user.toLowerCase())) return "The password can't contain your username.";
  return '';
}
async function rateLimited(env, req) {
  const key = 'rl:' + await sha256hex(req.headers.get('cf-connecting-ip') || 'unknown');
  const rl = (await env.KV.get(key, 'json')) || { n: 0 };
  return { key, n: rl.n, blocked: rl.n >= MAX_FAILS };
}
async function fail(env, rl) { await env.KV.put(rl.key, JSON.stringify({ n: rl.n + 1 }), { expirationTtl: LOCK_SECONDS }); return MAX_FAILS - rl.n - 1; }

async function setup(req, env, url) {
  if (!sameOrigin(req, url)) return json({ error: 'Request blocked for security reasons.' }, 403);
  if ((await credentials(env)).hash) return json({ error: 'The admin login is already set up. Log in instead.' }, 409);
  if (!env.SETUP_CODE || String(env.SETUP_CODE).length < 8) return json({ error: 'Add a secret called SETUP_CODE (at least 8 characters) in Cloudflare first.' }, 503);
  const rl = await rateLimited(env, req);
  if (rl.blocked) return json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);
  const b = (await readJson(req)) || {};
  if (!(await safeEqual(String(b.code || ''), String(env.SETUP_CODE)))) { const left = await fail(env, rl); return json({ error: left > 0 ? `That setup code is wrong. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Please wait 15 minutes and try again.' }, left > 0 ? 403 : 429); }
  const user = String(b.username || '').trim(), pass = String(b.password || '');
  if (!/^[A-Za-z0-9._@-]{3,60}$/.test(user)) return json({ error: 'Usernames can use letters, numbers, dots, dashes and @, from 3 to 60 characters.' }, 422);
  const err = checkNewLogin(user, pass);
  if (err) return json({ error: err }, 422);
  await env.KV.put('auth:user', user);
  await env.KV.put('auth:hash', await hashPassword(pass));
  await env.KV.delete(rl.key);
  await log(env, req, user, 'Set up the admin login');
  return json({ ok: true }, 200, { 'Set-Cookie': await newSession(env, user) });
}

const generation = async env => parseInt(await env.KV.get('auth:gen'), 10) || 0;
async function newSession(env, user) {
  const id = randomHex(32), exp = Date.now() + SESSION_TTL * 1000, gen = await generation(env);
  await env.KV.put('sess:' + await sha256hex(id), JSON.stringify({ u: user, exp, gen }), { expirationTtl: SESSION_TTL });
  return `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL}`;
}
async function bumpGeneration(env, user) { await env.KV.put('auth:gen', String((await generation(env)) + 1)); return newSession(env, user); }

async function login(req, env, url) {
  if (!sameOrigin(req, url)) return json({ error: 'Request blocked for security reasons.' }, 403);
  const creds = await credentials(env);
  if (!creds.user || !creds.hash) return json({ error: "The admin login hasn't been set up yet.", setup: true }, 503);
  const rl = await rateLimited(env, req);
  if (rl.blocked) return json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);
  const body = (await readJson(req)) || {};
  const u = String(body.username || '').slice(0, 100), pw = String(body.password || '').slice(0, 200);
  const okUser = await safeEqual(u.trim().toLowerCase(), creds.user.toLowerCase());
  const okPass = await verifyPassword(pw, creds.hash);
  if (!(okUser && okPass)) {
    const left = await fail(env, rl);
    await log(env, req, u.slice(0, 40), 'Failed login');
    return left > 0 ? json({ error: `Wrong username or password. ${left} attempt${left === 1 ? '' : 's'} left.` }, 401) : json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);
  }
  await env.KV.delete(rl.key);
  await log(env, req, creds.user, 'Logged in');
  return json({ ok: true }, 200, { 'Set-Cookie': await newSession(env, creds.user) });
}
async function logout(req, env, url) {
  if (!sameOrigin(req, url)) return json({ error: 'Request blocked for security reasons.' }, 403);
  const id = readCookie(req);
  if (id) await env.KV.delete('sess:' + await sha256hex(id));
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
}
async function getSession(req, env) {
  const id = readCookie(req);
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const s = await env.KV.get('sess:' + await sha256hex(id), 'json');
  if (!s || s.exp < Date.now()) return null;
  if ((s.gen || 0) !== (await generation(env))) return null;
  return s;
}
function readCookie(req) {
  for (const part of (req.headers.get('cookie') || '').split(';')) { const i = part.indexOf('='); if (i > -1 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim(); }
  return null;
}
function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  if (o) return o === url.origin;
  const r = req.headers.get('referer');
  return !!r && r.startsWith(url.origin + '/');
}

/* password hash format: pbkdf2$<iterations>$<salt b64>$<hash b64> */
async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), it = 100000;
  return `pbkdf2$${it}$${b64e(salt)}$${b64e(await pbkdf2(pw, salt, it))}`;
}
async function verifyPassword(pw, stored) {
  const parts = String(stored || '').trim().split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') { await pbkdf2(pw, new Uint8Array(16), 100000); return false; }
  const it = Math.min(parseInt(parts[1], 10) || 1, 100000);
  return bytesEqual(await pbkdf2(pw, b64d(parts[2]), it), b64d(parts[3]));
}
async function pbkdf2(pw, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
async function safeEqual(a, b) {
  const ha = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)));
  const hb = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(b)));
  return bytesEqual(ha, hb) && a.length > 0;
}
function bytesEqual(a, b) { if (a.length !== b.length || !a.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
async function sha256hex(s) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }
function randomHex(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return hex(b); }
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const b64e = b => btoa(String.fromCharCode(...b));
function b64d(s) { try { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); } catch { return new Uint8Array(0); } }

/* ---------------- helpers ---------------- */
async function readJson(req) { try { const t = await req.text(); if (t.length > 1024 * 1024) return null; const v = JSON.parse(t); return v && typeof v === 'object' ? v : null; } catch { return null; } }
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...extra } });
}
const redirect = to => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store' } });
const notAllowed = () => json({ error: 'Method not allowed.' }, 405);
function page(html, url, status = 200) {
  return withPublic(new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': PUBLIC_CSP } }), url);
}
function withPublic(res, url) {
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  out.headers.set('X-Frame-Options', 'DENY');
  out.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (url.protocol === 'https:') out.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return out;
}
function adminHeaders(res) {
  const r = new Response(res.body, res);
  r.headers.set('Content-Security-Policy', ADMIN_CSP);
  r.headers.set('X-Frame-Options', 'DENY');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  r.headers.set('Referrer-Policy', 'same-origin');
  r.headers.set('Cache-Control', 'no-store');
  r.headers.set('X-Content-Type-Options', 'nosniff');
  return r;
}
export { DEFAULTS };
