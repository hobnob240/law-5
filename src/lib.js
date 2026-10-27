// Shared helpers: responses, security headers, hashing, sessions, rate limits.

export const PUBLIC_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self' https://checkout.stripe.com";
export const ADMIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
export const EMAIL_RE = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[a-z]{2,}$/i;
export const POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
export function normPostcode(v) { const m = POSTCODE_RE.exec(clean(v, 12).toUpperCase()); return m ? m[1] + ' ' + m[2] : ''; }
export function normPhone(v) {
  const d = clean(v, 30).replace(/[^\d+]/g, '');
  const n = d.startsWith('+44') ? '0' + d.slice(3) : d.startsWith('44') && d.length === 12 ? '0' + d.slice(2) : d;
  return /^0\d{9,10}$/.test(n) ? n : '';
}
export const prettyPhone = n => !n ? '' : /^07/.test(n) ? n.slice(0, 5) + ' ' + n.slice(5) : /^0(1\d1|2)/.test(n) ? n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6) : n.slice(0, 5) + ' ' + n.slice(5);
export const todayUK = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const niceDate = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
export const shortDate = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

/* ---------- responses ---------- */
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...extra } });
}
export function secure(res, url, csp = PUBLIC_CSP) {
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  out.headers.set('X-Frame-Options', 'DENY');
  out.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()');
  out.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (csp && (out.headers.get('Content-Type') || '').includes('text/html')) out.headers.set('Content-Security-Policy', csp);
  if (url.protocol === 'https:') out.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return out;
}
export function html(body, url, { status = 200, cache = 'no-store', cookies = [], noindex = false, noReferrer = false } = {}) {
  const res = new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache } });
  for (const c of cookies) res.headers.append('Set-Cookie', c);
  if (noindex) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  const out = secure(res, url);
  if (noReferrer) out.headers.set('Referrer-Policy', 'same-origin'); // never sent to other sites; 'no-referrer' would make browsers send Origin: null on form posts
  return out;
}
export function redirect(to, status = 303, cookies = []) {
  const res = new Response(null, { status, headers: { Location: to, 'Cache-Control': 'no-store' } });
  for (const c of cookies) res.headers.append('Set-Cookie', c);
  return res;
}
export function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  if (o) return o === url.origin;
  const r = req.headers.get('referer');
  return !!r && r.startsWith(url.origin + '/');
}
export async function readJson(req) { try { const t = await req.text(); if (t.length > 512 * 1024) return null; const v = JSON.parse(t); return v && typeof v === 'object' ? v : null; } catch { return null; } }
export async function readForm(req) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > 64 * 1024) return null;
  try { const f = await req.formData(); const o = {}; for (const [k, v] of f.entries()) if (typeof v === 'string') { if (o[k] === undefined) o[k] = v; else o[k] = [].concat(o[k], v); } return o; } catch { return null; }
}

/* ---------- crypto ---------- */
const enc = new TextEncoder();
export const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
export function randomHex(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return hex(b); }
export function newId() { return Date.now().toString(36) + randomHex(5); }
export async function sha256hex(s) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }
export async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg))));
}
export function bytesEqual(a, b) { if (a.length !== b.length || !a.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
export async function safeEqual(a, b) {
  const ha = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(a))));
  const hb = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(b))));
  return bytesEqual(ha, hb) && String(a).length > 0;
}
const b64e = b => btoa(String.fromCharCode(...b));
function b64d(s) { try { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); } catch { return new Uint8Array(0); } }
async function pbkdf2(pw, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), it = 100000;
  return `pbkdf2$${it}$${b64e(salt)}$${b64e(await pbkdf2(pw, salt, it))}`;
}
export async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') { await pbkdf2(String(pw), new Uint8Array(16), 100000); return false; }
  return bytesEqual(await pbkdf2(String(pw), b64d(parts[2]), Math.min(parseInt(parts[1], 10) || 1, 100000)), b64d(parts[3]));
}
export function passwordProblem(pw, ...avoid) {
  if (String(pw).length < 10) return 'Use a password of at least 10 characters.';
  if (String(pw).length > 200) return 'That password is too long.';
  for (const a of avoid) if (a && a.length > 2 && String(pw).toLowerCase().includes(String(a).toLowerCase())) return "Your password can't contain your name or email.";
  if (/^(password|1234567890|qwertyuiop)/i.test(pw)) return 'Choose a less common password.';
  return '';
}

/* ---------- sessions (separate cookie + key prefix per role, so one can never be used as the other) ---------- */
export const ROLES = {
  admin: { cookie: '__Host-bmn_admin', prefix: 'asess:', ttl: 12 * 3600 },
  member: { cookie: '__Host-bmn_member', prefix: 'msess:', ttl: 14 * 86400 }
};
export function readCookie(req, name) {
  for (const part of (req.headers.get('cookie') || '').split(';')) { const i = part.indexOf('='); if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim(); }
  return null;
}
export async function createSession(env, role, data) {
  const R = ROLES[role], id = randomHex(32);
  await env.KV.put(R.prefix + await sha256hex(id), JSON.stringify({ ...data, role, exp: Date.now() + R.ttl * 1000 }), { expirationTtl: R.ttl });
  return `${R.cookie}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${R.ttl}`;
}
export async function getSession(req, env, role) {
  const R = ROLES[role], id = readCookie(req, R.cookie);
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const s = await env.KV.get(R.prefix + await sha256hex(id), 'json');
  if (!s || s.role !== role || s.exp < Date.now()) return null;
  return s;
}
export async function endSession(req, env, role) {
  const R = ROLES[role], id = readCookie(req, R.cookie);
  if (id && /^[a-f0-9]{64}$/.test(id)) await env.KV.delete(R.prefix + await sha256hex(id));
  return `${R.cookie}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* ---------- rate limiting ---------- */
export async function limit(env, req, bucket, max, seconds) {
  const key = 'rl:' + bucket + ':' + await sha256hex(req.headers.get('cf-connecting-ip') || 'unknown');
  const n = parseInt(await env.KV.get(key), 10) || 0;
  return { blocked: n >= max, left: Math.max(0, max - n - 1), hit: () => env.KV.put(key, String(n + 1), { expirationTtl: seconds }), clear: () => env.KV.delete(key) };
}

/* ---------- spam token for public forms ---------- */
async function formKey(env) { let k = await env.KV.get('formkey'); if (!k) { k = randomHex(32); await env.KV.put('formkey', k); } return k; }
export async function formToken(env) { const ts = String(Date.now()); return ts + '.' + (await hmacHex(await formKey(env), ts)).slice(0, 32); }
export async function checkToken(env, tok, minMs = 3000) {
  const [ts, sig] = String(tok || '').split('.');
  if (!/^\d{13}$/.test(ts || '') || !sig) return false;
  const age = Date.now() - Number(ts);
  if (age < minMs || age > 2 * 86400000) return false;
  return safeEqual(sig, (await hmacHex(await formKey(env), ts)).slice(0, 32));
}

/* ---------- activity log ---------- */
export async function log(env, req, who, action) {
  try {
    const cf = (req && req.cf) || {};
    const cur = (await env.KV.get('log', 'json')) || [];
    cur.unshift({ at: new Date().toISOString(), who: String(who || '').slice(0, 60), action: String(action).slice(0, 160), where: [cf.city, cf.country].filter(Boolean).join(', ') });
    await env.KV.put('log', JSON.stringify(cur.slice(0, 300)));
  } catch (e) { console.error('log failed', e); }
}

/* ---------- distances ---------- */
export async function lookupPostcode(pc) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc), { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json(); const x = d && d.result;
    if (!x || typeof x.latitude !== 'number') return null;
    return { lat: Math.round(x.latitude * 1e4) / 1e4, lng: Math.round(x.longitude * 1e4) / 1e4, town: String(x.admin_district || x.parish || '').slice(0, 60) };
  } catch { return null; }
}
export function miles(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 3958.8, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
