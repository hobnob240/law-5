// Storage for venues, mediums, memberships and payments (Cloudflare KV).
import { clean, EMAIL_RE, normPhone, normPostcode, sha256hex, randomHex, newId, todayUK, hashPassword } from './lib.js';

export const TERMS_VERSION = '2026-10';
export const NIGHT_TYPES = {
  split: '50/50 ticket split or £150 minimum, whichever is greater',
  bar: 'Medium keeps all ticket sales (venue benefits from a busy bar)',
  fee: 'Set fee offered to the medium'
};
export const CONTACT_METHODS = ['Call', 'Text', 'Email'];

export const DEFAULT_SETTINGS = {
  siteName: 'Book a Medium Night',
  operator: '',
  contactEmail: '',
  postalAddress: '',
  icoNumber: '',
  pricePence: 10000,
  approveVenues: true,
  bankDetails: ''
};
export function validSettings(input) {
  const s = input || {}, errors = [];
  const out = {
    siteName: clean(s.siteName, 60) || DEFAULT_SETTINGS.siteName,
    operator: clean(s.operator, 160),
    contactEmail: clean(s.contactEmail, 120).toLowerCase(),
    postalAddress: clean(s.postalAddress, 300),
    icoNumber: clean(s.icoNumber, 20).toUpperCase(),
    pricePence: Math.round(Number(s.pricePence)),
    approveVenues: s.approveVenues === undefined ? true : s.approveVenues === true || s.approveVenues === 'true',
    bankDetails: clean(s.bankDetails, 300)
  };
  if (out.contactEmail && !EMAIL_RE.test(out.contactEmail)) errors.push('The contact email address doesn\'t look right.');
  if (!Number.isFinite(out.pricePence) || out.pricePence < 100 || out.pricePence > 100000) errors.push('The membership price must be between £1 and £1,000.');
  if (out.icoNumber && !/^[A-Z0-9]{6,12}$/.test(out.icoNumber)) errors.push('The ICO registration number should be letters and numbers only, like ZA123456.');
  return { value: out, errors };
}
export async function getSettings(env) { const s = await env.KV.get('settings', 'json'); return s ? validSettings(s).value : { ...DEFAULT_SETTINGS }; }

/* ---------------- dates ---------------- */
export function addMonths(iso, n) {
  const d = new Date(iso + 'T12:00:00Z'); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export const isActive = m => !!(m && m.until && m.until >= todayUK());
export function parseDates(list) {
  const today = todayUK(), max = addMonths(today, 24);
  const out = [...new Set([].concat(list || []).map(d => clean(d, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && d >= today && d <= max))].sort();
  return out.slice(0, 20);
}

/* ---------------- venues ---------------- */
export function checkVenue(f, { forUpdate = false } = {}) {
  const v = {
    name: clean(f.name, 100), address: clean(f.address, 200), postcode: normPostcode(f.postcode),
    phone: normPhone(f.phone), email: clean(f.email, 120).toLowerCase(), contact: CONTACT_METHODS.includes(f.contact) ? f.contact : '',
    notes: clean(f.notes, 600), nightType: NIGHT_TYPES[f.nightType] ? f.nightType : '', fee: clean(f.fee, 60),
    dates: parseDates(f.dates)
  };
  const e = {};
  if (!v.name) e.name = 'Please add the venue name.';
  if (!v.address) e.address = 'Please add the venue address.';
  if (!v.postcode) e.postcode = 'Please add a valid UK postcode, like ST1 1AA.';
  if (!v.phone) e.phone = 'Please add a UK phone number for the venue, like 01782 123456.';
  if (f.email && !EMAIL_RE.test(v.email)) e.email = 'That email address doesn\'t look right.';
  if (!v.contact) e.contact = 'Please choose how mediums should contact you.';
  if (v.contact === 'Email' && !v.email) e.email = 'Please add an email address, as you\'ve chosen email as your contact method.';
  if (v.contact === 'Text' && !/^07/.test(v.phone)) e.phone = 'Please give a mobile number, as you\'ve chosen text messages.';
  if (!v.nightType) e.nightType = 'Please choose the type of medium night you\'d prefer.';
  if (v.nightType === 'fee' && !v.fee) e.fee = 'Please say what fee you\'re offering, for example £200.';
  if (!v.dates.length) e.dates = 'Please choose at least one date, from today up to two years ahead.';
  if (!forUpdate) {
    if (f.share !== 'yes') e.share = 'Please confirm you\'re happy for registered mediums to see these details.';
    if (f.authority !== 'yes') e.authority = 'Please confirm you\'re allowed to list this venue.';
  }
  if (v.nightType !== 'fee') v.fee = '';
  return { value: v, errors: e };
}
const vSummary = v => ({ id: v.id, status: v.status, name: v.name, town: v.town || '', postcode: v.postcode, lat: v.lat ?? null, lng: v.lng ?? null, dates: v.dates, nightType: v.nightType, fee: v.fee, createdAt: v.createdAt, updatedAt: v.updatedAt, demo: !!v.demo });
export async function venueIndex(env) { return (await env.KV.get('vidx', 'json')) || []; }
async function saveVenueIndex(env, list) { await env.KV.put('vidx', JSON.stringify(list)); }
export async function getVenue(env, id) { return /^[a-z0-9]{8,24}$/.test(String(id)) ? env.KV.get('venue:' + id, 'json') : null; }
export async function putVenue(env, v) {
  v.updatedAt = new Date().toISOString();
  await env.KV.put('venue:' + v.id, JSON.stringify(v));
  const idx = (await venueIndex(env)).filter(x => x.id !== v.id); idx.unshift(vSummary(v));
  await saveVenueIndex(env, idx);
}
export async function deleteVenue(env, id) {
  await env.KV.delete('venue:' + id);
  await saveVenueIndex(env, (await venueIndex(env)).filter(x => x.id !== id));
}
export async function createVenue(env, value, geo, approve) {
  const id = newId(), secret = randomHex(24);
  const v = { id, ...value, town: geo ? geo.town : '', lat: geo ? geo.lat : null, lng: geo ? geo.lng : null,
    status: approve ? 'pending' : 'live', createdAt: new Date().toISOString(), consentAt: new Date().toISOString(), termsVersion: TERMS_VERSION,
    tokenHash: await sha256hex(secret) };
  await putVenue(env, v);
  return { venue: v, token: id + '.' + secret };
}
export async function venueByToken(env, token) {
  const [id, secret] = String(token || '').split('.');
  if (!id || !/^[a-f0-9]{48}$/.test(secret || '')) return null;
  const v = await getVenue(env, id);
  if (!v || !v.tokenHash) return null;
  return v.tokenHash === await sha256hex(secret) ? v : null;
}

/* ---------------- mediums ---------------- */
export function checkMedium(f, { forUpdate = false } = {}) {
  const m = {
    name: clean(f.name, 80), email: clean(f.email, 120).toLowerCase(), address: clean(f.address, 200), postcode: normPostcode(f.postcode),
    phone: normPhone(f.phone), radius: Math.round(Number(f.radius))
  };
  const e = {};
  if (!m.name) e.name = 'Please add your name.';
  if (!EMAIL_RE.test(m.email)) e.email = 'Please add a valid email address. You\'ll use it to log in.';
  if (!m.address) e.address = 'Please add your address.';
  if (!m.postcode) e.postcode = 'Please add a valid UK postcode, like ST1 1AA.';
  if (!m.phone) e.phone = 'Please add a UK phone number, like 07700 900123.';
  if (!Number.isFinite(m.radius) || m.radius < 1 || m.radius > 600) e.radius = 'Please say how many miles you\'ll travel, between 1 and 600.';
  if (!forUpdate) {
    if (f.noGuarantee !== 'yes') e.noGuarantee = 'Please tick to confirm you understand membership doesn\'t guarantee bookings.';
    if (f.terms !== 'yes') e.terms = 'Please agree to the membership terms and privacy notice.';
  }
  return { value: m, errors: e };
}
const mSummary = m => ({ id: m.id, name: m.name, email: m.email, town: m.town || '', postcode: m.postcode, until: m.until || '', createdAt: m.createdAt, lastLoginAt: m.lastLoginAt || '', demo: !!m.demo });
export async function mediumIndex(env) { return (await env.KV.get('midx', 'json')) || []; }
export async function getMedium(env, id) { return /^[a-z0-9]{8,24}$/.test(String(id)) ? env.KV.get('medium:' + id, 'json') : null; }
export async function mediumByEmail(env, email) {
  const id = await env.KV.get('memail:' + await sha256hex(String(email).trim().toLowerCase()));
  return id ? getMedium(env, id) : null;
}
export async function putMedium(env, m) {
  m.updatedAt = new Date().toISOString();
  await env.KV.put('medium:' + m.id, JSON.stringify(m));
  const idx = (await mediumIndex(env)).filter(x => x.id !== m.id); idx.unshift(mSummary(m));
  await env.KV.put('midx', JSON.stringify(idx));
}
export async function setMediumEmail(env, m, oldEmail) {
  if (oldEmail && oldEmail !== m.email) await env.KV.delete('memail:' + await sha256hex(oldEmail));
  await env.KV.put('memail:' + await sha256hex(m.email), m.id);
}
export async function deleteMedium(env, m) {
  await env.KV.delete('medium:' + m.id);
  await env.KV.delete('memail:' + await sha256hex(m.email));
  await env.KV.put('midx', JSON.stringify((await mediumIndex(env)).filter(x => x.id !== m.id)));
}

/* ---------------- payments + membership ---------------- */
export async function recordPayment(env, m, { amountPence, method, ref, note }) {
  if (ref) {
    const key = 'paidref:' + await sha256hex(ref);
    if (await env.KV.get(key)) return { duplicate: true, medium: m };
    await env.KV.put(key, '1');
  }
  const today = todayUK();
  const from = isActive(m) ? m.until : today;
  m.until = addMonths(from, 12);
  if (!m.memberSince) m.memberSince = today;
  await putMedium(env, m);
  const id = String(9999999999999 - Date.now()).padStart(13, '0') + '-' + randomHex(4);
  const p = { id, mediumId: m.id, name: m.name, email: m.email, amountPence, method, ref: ref || '', note: clean(note, 140), at: new Date().toISOString(), until: m.until };
  await env.KV.put('pay:' + id, JSON.stringify(p), { metadata: { n: m.name.slice(0, 60), a: amountPence, m: method, at: p.at, u: m.until, mid: m.id } });
  return { duplicate: false, medium: m, payment: p };
}
export async function listPayments(env) {
  const out = []; let cursor;
  do { const r = await env.KV.list({ prefix: 'pay:', cursor }); for (const k of r.keys) { const md = k.metadata || {}; out.push({ id: k.name.slice(4), name: md.n, amountPence: md.a, method: md.m, at: md.at, until: md.u, mediumId: md.mid }); } cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return out;
}

/* ---------------- daily clean-up (data minimisation) ---------------- */
export async function tidy(env) {
  const today = todayUK(), now = Date.now(), done = { venues: 0, unpaid: 0, lapsed: 0, payments: 0 };
  // venues: remove 90 days after their last listed date
  for (const v of await venueIndex(env)) {
    const last = (v.dates || []).slice(-1)[0] || (v.createdAt || '').slice(0, 10);
    if (last && addMonths(last, 3) < today) { await deleteVenue(env, v.id); done.venues++; }
  }
  // mediums: never paid after 30 days, or lapsed for 24 months
  for (const s of await mediumIndex(env)) {
    const m = await getMedium(env, s.id); if (!m) continue;
    const neverPaid = !m.until && now - Date.parse(m.createdAt) > 30 * 86400000;
    const lapsed = m.until && addMonths(m.until, 24) < today;
    if (neverPaid || lapsed) { await deleteMedium(env, m); neverPaid ? done.unpaid++ : done.lapsed++; }
  }
  // payment records: kept 6 years for tax records, then deleted
  for (const p of await listPayments(env)) if (p.at && now - Date.parse(p.at) > 6 * 366 * 86400000) { await env.KV.delete('pay:' + p.id); done.payments++; }
  return done;
}

/* ---------------- demo data (for trying the site; clearly labelled, removable in one click) ---------------- */
// Phone numbers are Ofcom's reserved drama ranges (01632 960xxx, 07700 900xxx) and emails use example.com, so nobody real can be contacted.
const DEMO_VENUES = [
  { name: 'The Crown & Anchor (demo)', address: '12 Market Square, Hanley', postcode: 'ST1 1AA', town: 'Stoke-on-Trent', lat: 53.0246, lng: -2.1790, phone: '01632960101', email: 'crown-demo@example.com', contact: 'Email', notes: 'Email first please. Happy to call back between 3pm and 5pm.', nightType: 'split', fee: '', days: [24, 52, 80] },
  { name: 'The Swan Social Club (demo)', address: '4 Station Road, Stafford', postcode: 'ST16 1AA', town: 'Stafford', lat: 52.8064, lng: -2.1170, phone: '07700900102', email: '', contact: 'Text', notes: 'Text only please. We have a function room for 80 people.', nightType: 'fee', fee: '£200', days: [31, 66] },
  { name: 'The Old Mill Hotel (demo)', address: '1 Mill Lane, Leek', postcode: 'ST13 1AA', town: 'Staffordshire Moorlands', lat: 53.1053, lng: -2.0236, phone: '01632960103', email: 'oldmill-demo@example.com', contact: 'Call', notes: '', nightType: 'bar', fee: '', days: [18, 45, 101] },
  { name: 'The Railway Inn (demo)', address: '22 Nantwich Road, Crewe', postcode: 'CW1 1AA', town: 'Cheshire East', lat: 53.0979, lng: -2.4416, phone: '01632960104', email: 'railway-demo@example.com', contact: 'Call', notes: 'Weeknights only.', nightType: 'split', fee: '', days: [38] }
];
export async function createDemo(env) {
  await removeDemo(env);
  const today = todayUK(), dayPlus = n => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const venues = [];
  for (const d of DEMO_VENUES) {
    const { days, town, lat, lng, ...value } = d;
    const { venue, token } = await createVenue(env, { ...value, dates: days.map(dayPlus) }, { town, lat, lng }, false);
    venue.demo = true; await putVenue(env, venue);
    venues.push({ name: venue.name, path: '/venues/manage/' + token });
  }
  const password = 'demo-' + randomHex(5);
  const now = new Date().toISOString();
  const m = { id: newId(), name: 'Demo Medium', email: 'demo-medium@example.com', address: '1 Example Street, Stoke-on-Trent', postcode: 'ST1 1AA', phone: '07700900100', radius: 30,
    town: 'Stoke-on-Trent', lat: 53.0246, lng: -2.1790, hash: await hashPassword(password), ver: 1, until: addMonths(today, 12), memberSince: today,
    createdAt: now, consentAt: now, termsVersion: TERMS_VERSION, demo: true };
  await putMedium(env, m); await setMediumEmail(env, m);
  const u = { ...m, id: newId(), name: 'Demo Unpaid Medium', email: 'demo-unpaid@example.com', until: '', memberSince: '' };
  await putMedium(env, u); await setMediumEmail(env, u);
  await env.KV.put('demoinfo', JSON.stringify({ createdAt: now }));
  return { email: m.email, unpaidEmail: u.email, password, venues };
}
export async function removeDemo(env) {
  let n = 0;
  for (const v of await venueIndex(env)) if (v.demo) { await deleteVenue(env, v.id); n++; }
  for (const s of await mediumIndex(env)) if (s.demo) { const m = await getMedium(env, s.id); if (m) { await deleteMedium(env, m); n++; } }
  await env.KV.delete('demoinfo');
  return n;
}
