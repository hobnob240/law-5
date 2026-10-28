// Public medium profiles (opt-in) and booking enquiries sent from venues to a specific medium.
import { clean, line, EMAIL_RE, normPhone, normPostcode, randomHex } from './lib.js';
import { isActive, parseDates, NIGHT_TYPES } from './data.js';

export const isPublic = m => !!(m && m.profile && m.profile.on && !m.profile.hidden && isActive(m));
export const displayName = m => (m.profile && m.profile.stageName) || m.name;

function cleanUrl(v) {
  const s = clean(v, 200);
  if (!s) return { ok: true, url: '' };
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || u.username || u.password) return { ok: false };
    return { ok: true, url: u.toString() };
  } catch { return { ok: false }; }
}

export function checkProfile(f) {
  const web = cleanUrl(f.website), fb = cleanUrl(f.facebook);
  const v = {
    on: f.on === 'yes', stageName: line(f.stageName, 60), areas: line(f.areas, 120), bio: clean(f.bio, 1200),
    website: web.url || '', facebook: fb.url || '', emailAlerts: f.emailAlerts === 'yes'
  };
  const e = {};
  if (!web.ok) e.website = 'That website address doesn\'t look right. It should start with https://';
  if (!fb.ok) e.facebook = 'That link doesn\'t look right. Copy the full address of your Facebook page.';
  if (v.on) {
    if (!v.stageName) e.stageName = 'Please add the name you perform under.';
    if (v.bio.length < 40) e.bio = 'Please write a short introduction (at least a couple of sentences) so venues know about you.';
  }
  return { value: v, errors: e };
}

export function checkEnquiry(f) {
  const v = {
    venueName: line(f.venueName, 100), contactName: line(f.contactName, 80), phone: normPhone(f.phone), email: line(f.email, 120).toLowerCase(),
    postcode: normPostcode(f.postcode), dates: parseDates(f.dates), nightType: NIGHT_TYPES[f.nightType] ? f.nightType : '', message: clean(f.message, 1000)
  };
  const e = {};
  if (!v.venueName) e.venueName = 'Please add the venue name.';
  if (!v.contactName) e.contactName = 'Please add your name.';
  if (!v.phone) e.phone = 'Please add a UK phone number the medium can reach you on.';
  if (f.email && !EMAIL_RE.test(v.email)) e.email = 'That email address doesn\'t look right.';
  if (f.postcode && !v.postcode) e.postcode = 'Please add a valid UK postcode, like ST1 1AA, or leave it blank.';
  if (f.share !== 'yes') e.share = 'Please confirm you\'re happy for this medium to receive your details.';
  return { value: v, errors: e };
}

export async function addEnquiry(env, mid, value) {
  const id = String(9999999999999 - Date.now()).padStart(13, '0') + '-' + randomHex(4);
  const at = new Date().toISOString();
  await env.KV.put(`enq:${mid}:${id}`, JSON.stringify({ ...value, id, at }), { metadata: { at, venue: value.venueName.slice(0, 60), read: 0 } });
  return id;
}
export async function listEnquiries(env, mid) {
  const out = []; let cursor;
  do { const r = await env.KV.list({ prefix: `enq:${mid}:`, cursor }); for (const k of r.keys) out.push({ id: k.name.slice(`enq:${mid}:`.length), ...(k.metadata || {}) }); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return out;
}
export async function getEnquiries(env, mid) {
  const list = await listEnquiries(env, mid), out = [];
  for (const x of list.slice(0, 100)) { const e = await env.KV.get(`enq:${mid}:${x.id}`, 'json'); if (e) out.push({ ...e, read: !!x.read }); }
  return out;
}
export async function unreadCount(env, mid) { return (await listEnquiries(env, mid)).filter(x => !x.read).length; }
const EID = /^\d{13}-[a-f0-9]{8}$/;
export async function markRead(env, mid, eid) {
  if (!EID.test(eid)) return;
  const key = `enq:${mid}:${eid}`, e = await env.KV.get(key, 'json');
  if (e) await env.KV.put(key, JSON.stringify(e), { metadata: { at: e.at, venue: e.venueName.slice(0, 60), read: 1 } });
}
export async function deleteEnquiry(env, mid, eid) { if (EID.test(eid)) await env.KV.delete(`enq:${mid}:${eid}`); }

// Keep only image data: remove EXIF/XMP/comments (which can contain GPS location) from a JPEG.
export function stripJpeg(b) {
  if (!(b instanceof Uint8Array) || b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) return null;
  const out = [b.subarray(0, 2)]; let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xFF) return null;
    const marker = b[i + 1];
    if (marker === 0xDA) { out.push(b.subarray(i)); break; } // start of scan: rest is image data
    if (marker === 0xD9) { out.push(b.subarray(i, i + 2)); break; }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    const drop = (marker >= 0xE1 && marker <= 0xEF) || marker === 0xFE;
    if (!drop) out.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const total = out.reduce((n, x) => n + x.length, 0), res = new Uint8Array(total); let o = 0;
  for (const x of out) { res.set(x, o); o += x.length; }
  return res;
}
