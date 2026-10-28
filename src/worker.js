// Book a Medium Night: public site, members' portal, Stripe membership payments and admin console.
// Secrets (SETUP_CODE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) live only in Cloudflare and are never sent to browsers.
import {
  PUBLIC_CSP, ADMIN_CSP, esc, clean, EMAIL_RE, todayUK, json, secure, html, redirect, sameOrigin, readJson, readForm,
  prettyPhone, randomHex, sha256hex, safeEqual, hashPassword, verifyPassword, passwordProblem, createSession, getSession, endSession,
  limit, formToken, checkToken, log, lookupPostcode, miles
} from './lib.js';
import {
  TERMS_VERSION, NIGHT_TYPES, validSettings, getSettings, isActive, addMonths, checkVenue, venueIndex, getVenue, putVenue,
  deleteVenue, createVenue, venueByToken, checkMedium, mediumIndex, getMedium, mediumByEmail, putMedium, setMediumEmail,
  deleteMedium, recordPayment, listPayments, tidy, createDemo, removeDemo
} from './data.js';
import { stripeReady, stripeMode, createCheckout, getCheckout, verifyWebhook } from './stripe.js';
import * as P from './pages.js';

const PAGES = new Set(['/', '/about/', '/venues/', '/venues/register/', '/mediums/', '/mediums/join/', '/members/', '/members/login/',
  '/members/account/', '/members/paid/', '/privacy/', '/terms/', '/admin/', '/admin/login/', '/admin/setup/']);

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      return await route(req, env, ctx, url);
    } catch (e) {
      console.error('Unhandled error', e && e.stack || e);
      if (url.pathname.startsWith('/admin/api/')) return json({ error: 'Something went wrong. Please try again.' }, 500);
      return html('<!DOCTYPE html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sorry</title><link rel="stylesheet" href="/assets/site.css"><body><main class="wrap band"><h1>Sorry, something went wrong</h1><p>Please try again in a moment.</p><p><a class="btn btn-primary" href="/">Home</a></p></main></body></html>', url, { status: 500, noindex: true });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => { const r = await tidy(env); if (r.venues || r.unpaid || r.lapsed || r.payments) await log(env, null, 'system', `Automatic clean-up: removed ${r.venues} old venue(s), ${r.unpaid} unpaid account(s), ${r.lapsed} lapsed account(s), ${r.payments} old payment record(s)`); })());
  }
};

async function route(req, env, ctx, url) {
  const path = url.pathname, method = req.method === 'HEAD' ? 'GET' : req.method;

  // Stripe webhook is the only cross-site POST we accept; it is authenticated by its signature instead.
  if (path === '/stripe/webhook') return method === 'POST' ? stripeWebhook(req, env) : new Response('Method not allowed', { status: 405 });
  if (method !== 'GET' && !sameOrigin(req, url)) return new Response('Forbidden', { status: 403 });
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) return new Response('Method not allowed', { status: 405 });

  // static files
  if (path.startsWith('/assets/') || /^\/admin\/(app\.js|admin\.css)$/.test(path)) {
    if (method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const r = await env.ASSETS.fetch(new Request(url.origin + path, { method: req.method }));
    if (!r.ok) return notFound(env, url);
    const out = secure(r, url);
    out.headers.set('Cache-Control', url.search ? 'public, max-age=604800' : 'public, max-age=3600');
    return out;
  }
  if (path === '/robots.txt') return new Response(`User-agent: *\nDisallow: /admin/\nDisallow: /members/\nDisallow: /venues/manage/\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  if (path === '/sitemap.xml') {
    const urls = ['/', '/venues/', '/venues/register/', '/mediums/', '/mediums/join/', '/about/', '/privacy/', '/terms/'];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${esc(url.origin + u)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  if (path === '/favicon.ico') return redirect('/assets/favicon.svg', 301);
  if (!path.endsWith('/') && PAGES.has(path + '/')) return redirect(path + '/' + url.search, 308);

  if (path.startsWith('/admin/')) return admin(req, env, url, method);

  const S = await getSettings(env);
  const m = await currentMember(req, env);
  const page = (o, opts = {}) => html(P.shell({ S, origin: url.origin, path, member: !!m, ...o }), url, opts);

  switch (path) {
    case '/': return method === 'GET' ? page({ title: `${S.siteName} | Psychic & mediumship evenings for pubs, clubs and venues`, description: 'Free for venues: list your dates and let registered psychics and mediums contact you. Mediums: find venues looking to host mediumship evenings.', body: P.homePage(S) }, { cache: 'no-cache' }) : notAllowed();
    case '/about/': return page({ title: `Our mission | ${S.siteName}`, description: 'Bringing venues and mediums together, making mediumship evenings easier to organise for everyone.', body: P.aboutPage(S) }, { cache: 'no-cache' });
    case '/venues/': return page({ title: `For venues | ${S.siteName}`, description: 'Host a psychic or mediumship evening. Register your venue and dates for free, with no obligation to book.', body: P.venuesPage(S) }, { cache: 'no-cache' });
    case '/mediums/': return page({ title: `For mediums | ${S.siteName}`, description: `Find venues looking to host psychic and mediumship evenings. Annual membership, no commission on bookings.`, body: P.mediumsPage(S) }, { cache: 'no-cache' });
    case '/privacy/': return page({ title: `Privacy notice | ${S.siteName}`, description: `How ${S.siteName} uses personal information.`, body: P.privacyPage(S) }, { cache: 'no-cache' });
    case '/terms/': return page({ title: `Terms | ${S.siteName}`, description: `Terms of use and membership for ${S.siteName}.`, body: P.termsPage(S) }, { cache: 'no-cache' });
    case '/venues/register/': return venueRegister(req, env, url, method, S, page);
    case '/mediums/join/': return join(req, env, url, method, S, page, m);
    case '/members/login/': return memberLogin(req, env, url, method, S, page, m);
    case '/members/logout/': {
      if (method !== 'POST') return redirect('/members/');
      return redirect('/', 303, [await endSession(req, env, 'member')]);
    }
    case '/members/': return portal(req, env, url, method, S, page, m);
    case '/members/account/': return account(req, env, url, method, S, page, m);
    case '/members/account/data': return myData(env, url, m);
    case '/members/checkout/': return checkout(req, env, url, method, S, m);
    case '/members/paid/': return paid(req, env, url, S, m);
  }
  let mm;
  if ((mm = /^\/venues\/manage\/([a-z0-9]{8,24}\.[a-f0-9]{48})$/.exec(path))) return venueManage(req, env, url, method, S, page, mm[1]);
  if ((mm = /^\/members\/venues\/([a-z0-9]{8,24})$/.exec(path))) return venueDetail(env, url, S, page, m, mm[1]);
  if ((mm = /^\/members\/reset\/([a-f0-9]{64})$/.exec(path))) return memberReset(req, env, url, method, S, page, mm[1]);
  if (path.startsWith('/venues/manage/')) {
    const rl = await limit(env, req, 'manage', 30, 3600); await rl.hit();
    return page({ title: `Link not recognised | ${S.siteName}`, noindex: true, body: `${pageHeadSimple('Your listing', 'That link isn\'t recognised', 'The listing may have been removed, or the link may be incomplete. Please copy the whole link and try again.')}` }, { status: 404, noindex: true, noReferrer: true });
  }
  return notFound(env, url, S, m);
}

const notAllowed = () => new Response('Method not allowed', { status: 405 });
const pageHeadSimple = (e, t, l) => `<section class="page-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">${esc(e)}</p><h1>${esc(t)}</h1><p class="lede">${esc(l)}</p></div></section>`;
async function notFound(env, url, S, m) {
  S = S || await getSettings(env);
  return html(P.shell({ S, origin: url.origin, path: url.pathname, member: !!m, title: `Page not found | ${S.siteName}`, noindex: true, body: P.notFound() }), url, { status: 404, noindex: true });
}

/* ================= venues ================= */
async function spamCheck(env, f) {
  if (!f) return 'Your form couldn\'t be read. Please try again.';
  if (f.website) return 'spam';
  if (!await checkToken(env, f.t)) return 'This form expired or was sent too quickly. Please check your details and send it again.';
  const used = 'ftok:' + await sha256hex(String(f.t));
  if (await env.KV.get(used)) return 'This form has already been sent.';
  return '';
}
const markTokenUsed = async (env, t) => env.KV.put('ftok:' + await sha256hex(String(t)), '1', { expirationTtl: 3 * 86400 });

async function venueRegister(req, env, url, method, S, page) {
  const title = `Register your venue free | ${S.siteName}`, description = 'Register your pub, club or venue for free and let registered mediums contact you about hosting a mediumship evening.';
  if (method === 'GET') return page({ title, description, body: P.venueForm(S, { token: await formToken(env) }) }, { cache: 'no-store' });
  if (method !== 'POST') return notAllowed();
  const f = await readForm(req);
  const again = async (errors) => page({ title, description, body: P.venueForm(S, { token: await formToken(env), form: { type: 'venue', values: f || {}, errors } }) }, { status: 400 });
  const sp = await spamCheck(env, f);
  if (sp === 'spam') return redirect('/');
  if (sp) return again({ form: sp });
  const rl = await limit(env, req, 'venue', 6, 3600);
  if (rl.blocked) return again({ form: 'Too many registrations from this connection. Please try again in an hour.' });
  const { value, errors } = checkVenue(f);
  if (Object.keys(errors).length) return again(errors);
  await rl.hit();
  await markTokenUsed(env, f.t);
  const geo = await lookupPostcode(value.postcode);
  const { venue, token } = await createVenue(env, value, geo, S.approveVenues);
  await log(env, req, 'public', `New venue registered: ${venue.name} (${venue.postcode})${venue.status === 'pending' ? ', waiting for approval' : ''}`);
  return page({ title: `Thank you | ${S.siteName}`, noindex: true, body: P.venueThanks(S, { origin: url.origin, token, pending: venue.status === 'pending' }) }, { noindex: true, noReferrer: true });
}

const venueValues = v => ({ name: v.name, address: v.address, postcode: v.postcode, phone: prettyPhone(v.phone), email: v.email, contact: v.contact, notes: v.notes, nightType: v.nightType, fee: v.fee, dates: v.dates });

async function venueManage(req, env, url, method, S, page, token) {
  const rl = await limit(env, req, 'manage', 30, 3600);
  if (rl.blocked) return new Response('Too many attempts. Please try again later.', { status: 429 });
  const v = await venueByToken(env, token);
  const opts = { noindex: true, noReferrer: true };
  if (!v) { await rl.hit(); return page({ title: `Link not recognised | ${S.siteName}`, noindex: true, body: pageHeadSimple('Your listing', 'That link isn\'t recognised', 'The listing may have been removed, or the link may be incomplete. Please copy the whole link and try again.') }, { ...opts, status: 404 }); }
  const title = `Manage your listing | ${S.siteName}`;
  if (method === 'GET') return page({ title, noindex: true, body: P.venueManage(S, { venue: v, token, values: venueValues(v), saved: url.searchParams.get('saved') === '1' }) }, opts);
  if (method !== 'POST') return notAllowed();
  const f = await readForm(req);
  if (!f) return redirect(url.pathname);
  if (f.action === 'delete') {
    if (f.confirm !== 'yes') return page({ title, noindex: true, body: P.venueManage(S, { venue: v, token, values: venueValues(v) }) }, opts);
    await deleteVenue(env, v.id);
    await log(env, req, 'venue', `Venue deleted its own listing: ${v.name}`);
    return page({ title: `Listing removed | ${S.siteName}`, noindex: true, body: P.venueRemoved() }, opts);
  }
  const { value, errors } = checkVenue(f, { forUpdate: true });
  if (Object.keys(errors).length) return page({ title, noindex: true, body: P.venueManage(S, { venue: v, token, form: { type: 'venue', values: f, errors } }) }, { ...opts, status: 400 });
  if (value.postcode !== v.postcode) { const g = await lookupPostcode(value.postcode); v.town = g ? g.town : ''; v.lat = g ? g.lat : null; v.lng = g ? g.lng : null; }
  Object.assign(v, value);
  await putVenue(env, v);
  await log(env, req, 'venue', `Venue updated its listing: ${v.name}`);
  return redirect(url.pathname + '?saved=1');
}

/* ================= mediums ================= */
async function currentMember(req, env) {
  const s = await getSession(req, env, 'member');
  if (!s) return null;
  const m = await getMedium(env, s.mid);
  if (!m || (m.ver || 1) !== s.ver) return null;
  return m;
}
async function memberCookie(env, m) { return createSession(env, 'member', { mid: m.id, ver: m.ver || 1 }); }

async function join(req, env, url, method, S, page, current) {
  const title = `Become a member | ${S.siteName}`, description = 'Create your medium account and find venues looking for psychic and mediumship evenings.';
  if (current) return redirect('/members/');
  if (method === 'GET') return page({ title, description, body: P.joinForm(S, { token: await formToken(env) }) }, { cache: 'no-store' });
  if (method !== 'POST') return notAllowed();
  const f = await readForm(req);
  const again = async errors => page({ title, description, body: P.joinForm(S, { token: await formToken(env), form: { type: 'join', values: { ...(f || {}), password: '' }, errors } }) }, { status: 400 });
  const sp = await spamCheck(env, f);
  if (sp === 'spam') return redirect('/');
  if (sp) return again({ form: sp });
  const rl = await limit(env, req, 'join', 6, 3600);
  if (rl.blocked) return again({ form: 'Too many sign-ups from this connection. Please try again in an hour.' });
  const { value, errors } = checkMedium(f);
  const pw = String(f.password || '');
  const pp = passwordProblem(pw, value.name, value.email.split('@')[0]);
  if (pp) errors.password = pp;
  if (!errors.email && await mediumByEmail(env, value.email)) errors.email = 'There\'s already an account with this email. Please log in instead.';
  if (Object.keys(errors).length) return again(errors);
  await rl.hit();
  await markTokenUsed(env, f.t);
  const geo = await lookupPostcode(value.postcode);
  const now = new Date().toISOString();
  const m = { id: (Date.now().toString(36) + randomHex(5)), ...value, town: geo ? geo.town : '', lat: geo ? geo.lat : null, lng: geo ? geo.lng : null,
    hash: await hashPassword(pw), ver: 1, until: '', createdAt: now, consentAt: now, termsVersion: TERMS_VERSION, noGuaranteeAckAt: now };
  await putMedium(env, m);
  await setMediumEmail(env, m);
  await log(env, req, 'public', `New medium account: ${m.name}`);
  return redirect('/members/', 303, [await memberCookie(env, m)]);
}

async function memberLogin(req, env, url, method, S, page, current) {
  const title = `Member login | ${S.siteName}`;
  if (current) return redirect('/members/');
  const notice = url.searchParams.get('reset') === '1' ? 'Your password is changed. Please log in.' : url.searchParams.get('deleted') === '1' ? 'Your account has been deleted.' : '';
  if (method === 'GET') return page({ title, noindex: false, description: 'Log in to the members\' portal.', body: P.loginPage(S, { notice }) });
  if (method !== 'POST') return notAllowed();
  const f = (await readForm(req)) || {};
  const fail = msg => page({ title, body: P.loginPage(S, { form: { type: 'login', values: { email: clean(f.email, 120) }, errors: { form: msg } } }) }, { status: 400 });
  const rl = await limit(env, req, 'mlogin', 10, 900);
  if (rl.blocked) return fail('Too many attempts. Please wait 15 minutes and try again.');
  const email = clean(f.email, 120).toLowerCase();
  const m = EMAIL_RE.test(email) ? await mediumByEmail(env, email) : null;
  const ok = await verifyPassword(String(f.password || '').slice(0, 200), m ? m.hash : '');
  if (!m || !ok) { await rl.hit(); return fail('That email and password don\'t match. Please try again.'); }
  await rl.clear();
  m.lastLoginAt = new Date().toISOString();
  await putMedium(env, m);
  return redirect('/members/', 303, [await memberCookie(env, m)]);
}

async function memberReset(req, env, url, method, S, page, token) {
  const key = 'mreset:' + await sha256hex(token);
  const mid = await env.KV.get(key);
  const m = mid ? await getMedium(env, mid) : null;
  const title = `Choose a new password | ${S.siteName}`, opts = { noindex: true, noReferrer: true };
  if (method === 'GET') return page({ title, noindex: true, body: P.resetPage(S, { valid: !!m, token }) }, opts);
  if (method !== 'POST') return notAllowed();
  if (!m) return page({ title, noindex: true, body: P.resetPage(S, { valid: false, token }) }, opts);
  const f = (await readForm(req)) || {};
  const pw = String(f.password || '');
  const pp = passwordProblem(pw, m.name, m.email.split('@')[0]);
  if (pp) return page({ title, noindex: true, body: P.resetPage(S, { valid: true, token, form: { type: 'reset', values: {}, errors: { password: pp } } }) }, { ...opts, status: 400 });
  m.hash = await hashPassword(pw); m.ver = (m.ver || 1) + 1;
  await putMedium(env, m);
  await env.KV.delete(key);
  await log(env, req, 'member', `${m.name} set a new password with a reset link`);
  return redirect('/members/login/?reset=1');
}

function upcomingFor(m, list, all) {
  const today = todayUK();
  return list.filter(v => v.status === 'live').map(v => ({ ...v, upcoming: (v.dates || []).filter(d => d >= today), distance: miles(m, v) }))
    .filter(v => v.upcoming.length && (all || (v.distance != null && v.distance <= m.radius)))
    .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) || a.upcoming[0].localeCompare(b.upcoming[0]));
}

async function portal(req, env, url, method, S, page, m) {
  if (!m) return redirect('/members/login/');
  if (method !== 'GET') return notAllowed();
  const notices = { paid: 'Thank you. Your membership is now active.', cancelled: 'Payment cancelled. You haven\'t been charged.' };
  const notice = url.searchParams.get('notice') === 'paid' ? notices.paid : url.searchParams.get('payment') === 'cancelled' ? notices.cancelled : '';
  const error = url.searchParams.get('error') === 'pay' ? 'We couldn\'t start the payment. Please try again, or contact us.' : url.searchParams.get('error') === 'pending' ? 'We couldn\'t confirm your payment yet. If you were charged, it will show here shortly. Please refresh in a minute.' : '';
  const showAll = url.searchParams.get('all') === '1';
  const all = await venueIndex(env);
  const venues = isActive(m) ? upcomingFor(m, all, showAll) : [];
  // before paying: show how many venues are within reach (town and date only, no names or contact details)
  const preview = isActive(m) ? [] : upcomingFor(m, all, false).map(v => ({ town: v.town, distance: v.distance, next: v.upcoming[0], count: v.upcoming.length }));
  return page({ title: `Members' portal | ${S.siteName}`, noindex: true, body: P.portalPage(S, { medium: m, venues, preview, showAll, notice, error, stripe: stripeReady(env) }) }, { noindex: true });
}

async function venueDetail(env, url, S, page, m, id) {
  if (!m) return redirect('/members/login/');
  if (!isActive(m)) return redirect('/members/');
  const v = await getVenue(env, id);
  if (!v || v.status !== 'live') return notFound(env, url, S, m);
  return page({ title: `${v.name} | ${S.siteName}`, noindex: true, body: P.venueDetail(S, { venue: v, distance: miles(m, v), medium: m }) }, { noindex: true });
}

const mediumValues = m => ({ name: m.name, email: m.email, address: m.address, postcode: m.postcode, phone: m.phone, radius: m.radius });

async function account(req, env, url, method, S, page, m) {
  if (!m) return redirect('/members/login/');
  const title = `My account | ${S.siteName}`;
  const show = (o, status = 200, cookies = []) => page({ title, noindex: true, body: P.accountPage(S, { medium: m, values: mediumValues(m), ...o }) }, { noindex: true, status, cookies });
  if (method === 'GET') return show({ saved: ['details', 'password'].includes(url.searchParams.get('saved')) ? url.searchParams.get('saved') : '' });
  if (method !== 'POST') return notAllowed();
  const f = (await readForm(req)) || {};
  if (f.action === 'details') {
    const { value, errors } = checkMedium(f, { forUpdate: true });
    if (!errors.email && value.email !== m.email && await mediumByEmail(env, value.email)) errors.email = 'Another account already uses this email.';
    if (Object.keys(errors).length) return show({ form: { type: 'account', values: f, errors } }, 400);
    const oldEmail = m.email;
    if (value.postcode !== m.postcode) { const g = await lookupPostcode(value.postcode); m.town = g ? g.town : ''; m.lat = g ? g.lat : null; m.lng = g ? g.lng : null; }
    Object.assign(m, value);
    await putMedium(env, m);
    if (oldEmail !== m.email) await setMediumEmail(env, m, oldEmail);
    return redirect('/members/account/?saved=details');
  }
  if (f.action === 'password') {
    const rl = await limit(env, req, 'mpass', 10, 900);
    if (rl.blocked) return show({ form: { type: 'password', values: {}, errors: { form: 'Too many attempts. Please wait 15 minutes.' } } }, 429);
    if (!await verifyPassword(String(f.current || '').slice(0, 200), m.hash)) { await rl.hit(); return show({ form: { type: 'password', values: {}, errors: { current: 'Your current password isn\'t right.' } } }, 400); }
    const pp = passwordProblem(String(f.password || ''), m.name, m.email.split('@')[0]);
    if (pp) return show({ form: { type: 'password', values: {}, errors: { password: pp } } }, 400);
    m.hash = await hashPassword(String(f.password)); m.ver = (m.ver || 1) + 1;
    await putMedium(env, m);
    await endSession(req, env, 'member');
    return redirect('/members/account/?saved=password', 303, [await memberCookie(env, m)]);
  }
  if (f.action === 'delete') {
    const rl = await limit(env, req, 'mpass', 10, 900);
    if (rl.blocked) return show({ deleteError: 'Too many attempts. Please wait 15 minutes.' }, 429);
    if (!await verifyPassword(String(f.password || '').slice(0, 200), m.hash)) { await rl.hit(); return show({ deleteError: 'That password isn\'t right.' }, 400); }
    await deleteMedium(env, m);
    await log(env, req, 'member', `${m.name} deleted their own account`);
    return redirect('/members/login/?deleted=1', 303, [await endSession(req, env, 'member')]);
  }
  return redirect('/members/account/');
}

async function myData(env, url, m) {
  if (!m) return redirect('/members/login/');
  const { hash, ver, ...mine } = m;
  const payments = (await listPayments(env)).filter(p => p.mediumId === m.id).map(({ id, mediumId, ...p }) => p);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: mine, payments, note: 'Location (lat/lng/town) is an approximate point for your postcode, used to work out distances to venues.' }, null, 2);
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="my-data-${todayUK()}.json"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/* ================= payments ================= */
async function checkout(req, env, url, method, S, m) {
  if (method !== 'POST') return redirect('/members/');
  if (!m) return redirect('/members/login/');
  if (!stripeReady(env)) return redirect('/members/?error=pay');
  const rl = await limit(env, req, 'checkout', 10, 3600);
  if (rl.blocked) return redirect('/members/?error=pay');
  await rl.hit();
  try {
    const s = await createCheckout(env, { origin: url.origin, medium: m, pricePence: S.pricePence, siteName: S.siteName });
    if (!s.url || !s.url.startsWith('https://checkout.stripe.com/')) throw new Error('Unexpected checkout URL');
    return redirect(s.url, 303);
  } catch (e) { console.error('checkout', e.message); return redirect('/members/?error=pay'); }
}

function paidSession(s, mediumId) {
  return s && s.payment_status === 'paid' && Number(s.amount_total) > 0 && s.mode === 'payment' && String(s.currency).toLowerCase() === 'gbp' && s.metadata && s.metadata.purpose === 'membership' && (!mediumId || s.metadata.medium_id === mediumId);
}

async function paid(req, env, url, S, m) {
  if (!m) return redirect('/members/login/');
  const id = url.searchParams.get('session_id') || '';
  if (!stripeReady(env)) return redirect('/members/');
  try {
    const s = await getCheckout(env, id);
    if (!paidSession(s, m.id)) return redirect('/members/?error=pending');
    const r = await recordPayment(env, m, { amountPence: s.amount_total, method: 'card', ref: s.id, note: 'Stripe ' + (s.payment_intent || s.id) });
    if (!r.duplicate) await log(env, req, 'stripe', `Membership paid by card: ${m.name}, £${(s.amount_total / 100).toFixed(2)}, active until ${r.medium.until}`);
    return redirect('/members/?notice=paid');
  } catch (e) { console.error('paid', e.message); return redirect('/members/?error=pending'); }
}

async function stripeWebhook(req, env) {
  const body = await req.text();
  if (body.length > 256 * 1024 || !await verifyWebhook(env, body, req.headers.get('stripe-signature'))) return new Response('Invalid signature', { status: 400 });
  let ev; try { ev = JSON.parse(body); } catch { return new Response('Bad JSON', { status: 400 }); }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type)) {
    const s = ev.data && ev.data.object;
    if (paidSession(s)) {
      const m = await getMedium(env, s.metadata.medium_id);
      if (m) {
        const r = await recordPayment(env, m, { amountPence: s.amount_total, method: 'card', ref: s.id, note: 'Stripe ' + (s.payment_intent || s.id) });
        if (!r.duplicate) await log(env, null, 'stripe', `Membership paid by card: ${m.name}, £${(s.amount_total / 100).toFixed(2)}, active until ${r.medium.until}`);
      } else await log(env, null, 'stripe', `Card payment ${s.id} received for an account that no longer exists. Check Stripe and refund if needed.`);
    }
  }
  return json({ received: true });
}

/* ================= admin ================= */
async function currentAdmin(req, env) {
  const s = await getSession(req, env, 'admin');
  if (!s) return null;
  const a = await env.KV.get('admin:' + s.user, 'json');
  if (!a || (a.ver || 1) !== s.ver) return null;
  return a;
}
async function adminList(env) { return (await env.KV.get('admins', 'json')) || []; }
const USER_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const adminPage = (url, title, inner, status = 200, cookies = []) => html(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)} | Admin</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/admin/admin.css?v=1"></head><body class="auth"><main class="auth-card"><img src="/assets/logo.svg" alt="Book a Medium Night" width="292" height="64"><h1>${esc(title)}</h1>${inner}</main></body></html>`, url, { status, cookies, noindex: true });
const err = m => m ? `<p class="auth-err" role="alert">${esc(m)}</p>` : '';

async function admin(req, env, url, method) {
  const path = url.pathname;
  const respond = r => { const o = new Response(r.body, r); o.headers.set('Content-Security-Policy', ADMIN_CSP); o.headers.set('X-Robots-Tag', 'noindex, nofollow'); o.headers.set('Referrer-Policy', 'same-origin'); return o; };

  if (path === '/admin/setup/') {
    const admins = await adminList(env);
    if (admins.length) return respond(adminPage(url, 'Setup complete', '<p>An admin login already exists. <a href="/admin/login/">Log in</a>.</p>'));
    if (!env.SETUP_CODE || String(env.SETUP_CODE).length < 8) return respond(adminPage(url, 'Set up admin', '<p>Add a <strong>SETUP_CODE</strong> secret (8 or more characters) to this Worker in Cloudflare, then reload this page.</p>'));
    const form = (e = '', u = '') => adminPage(url, 'Create your admin login', `${err(e)}<form method="post" action="/admin/setup/"><label for="code">Setup code</label><input id="code" name="code" type="password" autocomplete="off" required><label for="user">Choose a username</label><input id="user" name="user" value="${esc(u)}" autocomplete="username" autocapitalize="none" required><span class="hint">2 to 32 characters: lower-case letters, numbers, dots, dashes.</span><label for="pw">Choose a password</label><input id="pw" name="password" type="password" autocomplete="new-password" required><span class="hint">At least 10 characters.</span><button type="submit">Create login</button></form>`, e ? 400 : 200);
    if (method === 'GET') return respond(form());
    const rl = await limit(env, req, 'setup', 5, 3600);
    if (rl.blocked) return respond(form('Too many attempts. Please wait an hour.'));
    const f = (await readForm(req)) || {};
    const user = clean(f.user, 32).toLowerCase();
    if (!await safeEqual(String(f.code || ''), String(env.SETUP_CODE))) { await rl.hit(); return respond(form('That setup code isn\'t right.', user)); }
    if (!USER_RE.test(user)) return respond(form('Please choose a username of 2 to 32 lower-case letters or numbers.', user));
    const pp = passwordProblem(String(f.password || ''), user); if (pp) return respond(form(pp, user));
    await env.KV.put('admin:' + user, JSON.stringify({ user, hash: await hashPassword(String(f.password)), ver: 1, createdAt: new Date().toISOString() }));
    await env.KV.put('admins', JSON.stringify([user]));
    await log(env, req, user, 'Created the first admin login');
    return respond(redirect('/admin/', 303, [await createSession(env, 'admin', { user, ver: 1 })]));
  }

  if (path === '/admin/login/') {
    if (!(await adminList(env)).length) return respond(redirect('/admin/setup/'));
    if (await currentAdmin(req, env)) return respond(redirect('/admin/'));
    const form = (e = '', u = '') => adminPage(url, 'Admin login', `${err(e)}<form method="post" action="/admin/login/"><label for="user">Username</label><input id="user" name="user" value="${esc(u)}" autocomplete="username" autocapitalize="none" required><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required><button type="submit">Log in</button></form>`, e ? 400 : 200);
    if (method === 'GET') return respond(form());
    const f = (await readForm(req)) || {};
    const user = clean(f.user, 32).toLowerCase();
    const rl = await limit(env, req, 'alogin', 8, 900);
    const lockKey = 'afail:' + await sha256hex(user);
    const fails = parseInt(await env.KV.get(lockKey), 10) || 0;
    if (rl.blocked || fails >= 10) return respond(form('Too many attempts. Please wait 15 minutes and try again.', user));
    const a = USER_RE.test(user) ? await env.KV.get('admin:' + user, 'json') : null;
    const ok = await verifyPassword(String(f.password || '').slice(0, 200), a ? a.hash : '');
    if (!a || !ok) { await rl.hit(); await env.KV.put(lockKey, String(fails + 1), { expirationTtl: 900 }); await log(env, req, user || '(blank)', 'Failed admin login'); return respond(form('That username and password don\'t match.', user)); }
    await rl.clear(); await env.KV.delete(lockKey);
    a.lastLoginAt = new Date().toISOString(); await env.KV.put('admin:' + user, JSON.stringify(a));
    await log(env, req, user, 'Logged in');
    return respond(redirect('/admin/', 303, [await createSession(env, 'admin', { user, ver: a.ver || 1 })]));
  }

  const a = await currentAdmin(req, env);
  if (path === '/admin/logout/') {
    if (method !== 'POST') return respond(redirect('/admin/'));
    if (a) await log(env, req, a.user, 'Logged out');
    return respond(redirect('/admin/login/', 303, [await endSession(req, env, 'admin')]));
  }
  if (path === '/admin/' || path === '/admin/index.html' || path === '/admin/app.html') {
    if (!a) return respond(redirect((await adminList(env)).length ? '/admin/login/' : '/admin/setup/'));
    const r = await env.ASSETS.fetch(new Request(url.origin + '/admin/app.html'));
    return respond(secure(new Response(r.body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }), url, ADMIN_CSP));
  }
  if (path.startsWith('/admin/api/')) {
    if (!a) return json({ error: 'Please log in again.', login: true }, 401);
    if (method !== 'GET' && !(req.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'Bad request' }, 415);
    return respond(await api(req, env, url, method, a, path.slice('/admin/api/'.length)));
  }
  return respond(redirect('/admin/'));
}

const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
function csvCell(v) { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

async function api(req, env, url, method, a, p) {
  const body = method === 'GET' ? null : (await readJson(req)) || {};
  const today = todayUK();
  let mm;

  if (p === 'me' && method === 'GET') {
    const S = await getSettings(env);
    return json({ user: a.user, siteName: S.siteName, today });
  }
  if (p === 'overview' && method === 'GET') {
    const [vi, mi, pays] = await Promise.all([venueIndex(env), mediumIndex(env), listPayments(env)]);
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const thisYear = today.slice(0, 4);
    return json({
      venues: { total: vi.length, pending: vi.filter(v => v.status === 'pending').length, live: vi.filter(v => v.status === 'live').length, upcoming: vi.filter(v => v.status === 'live' && (v.dates || []).some(d => d >= today)).length },
      mediums: { total: mi.length, active: mi.filter(m => m.until && m.until >= today).length, unpaid: mi.filter(m => !m.until).length, expiring: mi.filter(m => m.until && m.until >= today && m.until <= addMonths(today, 1)).length },
      revenue: { last12: pays.filter(x => x.at >= yearAgo).reduce((s, x) => s + (x.amountPence || 0), 0), thisYear: pays.filter(x => String(x.at).startsWith(thisYear)).reduce((s, x) => s + (x.amountPence || 0), 0), count: pays.length },
      stripe: stripeReady(env),
      pendingVenues: vi.filter(v => v.status === 'pending').slice(0, 10),
      recentPayments: pays.slice(0, 5)
    });
  }

  /* venues */
  if (p === 'venues' && method === 'GET') return json({ venues: await venueIndex(env), today });
  if ((mm = /^venues\/([a-z0-9]{8,24})$/.exec(p))) {
    const v = await getVenue(env, mm[1]);
    if (!v) return json({ error: 'That venue no longer exists.' }, 404);
    if (method === 'GET') { const { tokenHash, ...rest } = v; return json({ venue: rest }); }
    if (method === 'PUT') {
      if (body.status !== undefined) {
        if (!['live', 'hidden', 'pending'].includes(body.status)) return json({ error: 'Unknown status' }, 400);
        v.status = body.status; await putVenue(env, v);
        await log(env, req, a.user, `${body.status === 'live' ? 'Approved / showed' : body.status === 'hidden' ? 'Hid' : 'Set to pending'} venue ${v.name}`);
        return json({ ok: true });
      }
      const { value, errors } = checkVenue(body, { forUpdate: true });
      if (Object.keys(errors).length) return json({ error: Object.values(errors)[0], errors }, 400);
      if (value.postcode !== v.postcode) { const g = await lookupPostcode(value.postcode); v.town = g ? g.town : ''; v.lat = g ? g.lat : null; v.lng = g ? g.lng : null; }
      Object.assign(v, value); await putVenue(env, v);
      await log(env, req, a.user, `Edited venue ${v.name}`);
      return json({ ok: true });
    }
    if (method === 'DELETE') { await deleteVenue(env, v.id); await log(env, req, a.user, `Deleted venue ${v.name}`); return json({ ok: true }); }
  }

  /* mediums */
  if (p === 'mediums' && method === 'GET') return json({ mediums: await mediumIndex(env), today });
  if ((mm = /^mediums\/([a-z0-9]{8,24})(?:\/(payment|deactivate|reset))?$/.exec(p))) {
    const m = await getMedium(env, mm[1]);
    if (!m) return json({ error: 'That account no longer exists.' }, 404);
    const action = mm[2];
    if (!action && method === 'GET') {
      const payments = (await listPayments(env)).filter(x => x.mediumId === m.id);
      return json({ medium: pick(m, ['id', 'name', 'email', 'address', 'postcode', 'town', 'phone', 'radius', 'until', 'memberSince', 'createdAt', 'lastLoginAt', 'termsVersion']), payments });
    }
    if (!action && method === 'PUT') {
      const { value, errors } = checkMedium(body, { forUpdate: true });
      if (!errors.email && value.email !== m.email && await mediumByEmail(env, value.email)) errors.email = 'Another account already uses this email.';
      if (Object.keys(errors).length) return json({ error: Object.values(errors)[0], errors }, 400);
      const old = m.email;
      if (value.postcode !== m.postcode) { const g = await lookupPostcode(value.postcode); m.town = g ? g.town : ''; m.lat = g ? g.lat : null; m.lng = g ? g.lng : null; }
      Object.assign(m, value); await putMedium(env, m); if (old !== m.email) await setMediumEmail(env, m, old);
      await log(env, req, a.user, `Edited medium ${m.name}`);
      return json({ ok: true });
    }
    if (!action && method === 'DELETE') {
      await deleteMedium(env, m);
      await log(env, req, a.user, `Deleted medium account ${m.name}`);
      return json({ ok: true });
    }
    if (action === 'payment' && method === 'POST') {
      const pence = Math.round(Number(body.amount) * 100);
      const methodName = ['bank', 'cash', 'card', 'free'].includes(body.method) ? body.method : '';
      if (!methodName) return json({ error: 'Choose how they paid.' }, 400);
      if (!Number.isFinite(pence) || pence < 0 || pence > 100000 || (methodName !== 'free' && pence === 0)) return json({ error: 'Enter the amount paid in pounds, for example 100.' }, 400);
      const r = await recordPayment(env, m, { amountPence: methodName === 'free' ? 0 : pence, method: methodName, ref: '', note: clean(body.note, 140) + ` (added by ${a.user})` });
      await log(env, req, a.user, `Recorded ${methodName} payment for ${m.name}: £${(pence / 100).toFixed(2)}, active until ${r.medium.until}`);
      return json({ ok: true, until: r.medium.until });
    }
    if (action === 'deactivate' && method === 'POST') {
      if (!isActive(m)) return json({ error: 'This membership isn\'t active.' }, 400);
      const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1);
      m.until = d.toISOString().slice(0, 10); await putMedium(env, m);
      await log(env, req, a.user, `Ended membership for ${m.name}`);
      return json({ ok: true });
    }
    if (action === 'reset' && method === 'POST') {
      const token = randomHex(32);
      await env.KV.put('mreset:' + await sha256hex(token), m.id, { expirationTtl: 86400 });
      await log(env, req, a.user, `Created a password reset link for ${m.name}`);
      return json({ ok: true, link: url.origin + '/members/reset/' + token });
    }
  }

  /* payments */
  if (p === 'payments' && method === 'GET') return json({ payments: await listPayments(env) });
  if (p === 'payments.csv' && method === 'GET') {
    const rows = [['Date', 'Name', 'Amount (£)', 'Method', 'Membership until', 'Record ID']].concat((await listPayments(env)).map(x => [String(x.at).slice(0, 10), x.name, ((x.amountPence || 0) / 100).toFixed(2), x.method, x.until, x.id]));
    return new Response(rows.map(r => r.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="payments-${today}.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }

  /* settings */
  if (p === 'settings' && method === 'GET') return json({ settings: await getSettings(env), stripe: { ready: stripeReady(env), mode: stripeReady(env) ? stripeMode(env) : '', webhook: !!env.STRIPE_WEBHOOK_SECRET }, webhookUrl: url.origin + '/stripe/webhook' });
  if (p === 'settings' && method === 'PUT') {
    const { value, errors } = validSettings(body);
    if (errors.length) return json({ error: errors[0] }, 400);
    await env.KV.put('settings', JSON.stringify(value));
    await log(env, req, a.user, 'Changed settings');
    return json({ ok: true, settings: value });
  }

  /* admin accounts */
  if (p === 'admins' && method === 'GET') {
    const list = await adminList(env);
    const out = [];
    for (const u of list) { const x = await env.KV.get('admin:' + u, 'json'); if (x) out.push({ user: x.user, createdAt: x.createdAt, lastLoginAt: x.lastLoginAt || '', you: x.user === a.user }); }
    return json({ admins: out });
  }
  if (p === 'admins' && method === 'POST') {
    const user = clean(body.user, 32).toLowerCase();
    if (!USER_RE.test(user)) return json({ error: 'Usernames are 2 to 32 lower-case letters, numbers, dots or dashes.' }, 400);
    const list = await adminList(env);
    if (list.includes(user)) return json({ error: 'That username is taken.' }, 400);
    if (list.length >= 10) return json({ error: 'You can have up to 10 admin logins.' }, 400);
    const pp = passwordProblem(String(body.password || ''), user); if (pp) return json({ error: pp }, 400);
    await env.KV.put('admin:' + user, JSON.stringify({ user, hash: await hashPassword(String(body.password)), ver: 1, createdAt: new Date().toISOString(), createdBy: a.user }));
    await env.KV.put('admins', JSON.stringify(list.concat(user)));
    await log(env, req, a.user, `Added admin login "${user}"`);
    return json({ ok: true });
  }
  if ((mm = /^admins\/([a-z0-9._-]{2,32})$/.exec(p)) && method === 'DELETE') {
    if (mm[1] === a.user) return json({ error: 'You can\'t remove your own login.' }, 400);
    const list = await adminList(env);
    if (!list.includes(mm[1])) return json({ error: 'Not found' }, 404);
    await env.KV.delete('admin:' + mm[1]);
    await env.KV.put('admins', JSON.stringify(list.filter(u => u !== mm[1])));
    await log(env, req, a.user, `Removed admin login "${mm[1]}"`);
    return json({ ok: true });
  }
  if (p === 'password' && method === 'POST') {
    const rl = await limit(env, req, 'apass', 8, 900);
    if (rl.blocked) return json({ error: 'Too many attempts. Please wait 15 minutes.' }, 429);
    if (!await verifyPassword(String(body.current || '').slice(0, 200), a.hash)) { await rl.hit(); return json({ error: 'Your current password isn\'t right.' }, 400); }
    const pp = passwordProblem(String(body.password || ''), a.user); if (pp) return json({ error: pp }, 400);
    a.hash = await hashPassword(String(body.password)); a.ver = (a.ver || 1) + 1;
    await env.KV.put('admin:' + a.user, JSON.stringify(a));
    await endSession(req, env, 'admin');
    await log(env, req, a.user, 'Changed password (other devices logged out)');
    return json({ ok: true }, 200, { 'Set-Cookie': await createSession(env, 'admin', { user: a.user, ver: a.ver }) });
  }
  if (p === 'logout-others' && method === 'POST') {
    a.ver = (a.ver || 1) + 1;
    await env.KV.put('admin:' + a.user, JSON.stringify(a));
    await endSession(req, env, 'admin');
    await log(env, req, a.user, 'Logged out all other devices');
    return json({ ok: true }, 200, { 'Set-Cookie': await createSession(env, 'admin', { user: a.user, ver: a.ver }) });
  }
  if (p === 'demo' && method === 'GET') return json({ demo: await env.KV.get('demoinfo', 'json') });
  if (p === 'demo' && method === 'POST') {
    const r = await createDemo(env);
    await log(env, req, a.user, 'Created demo data (4 demo venues, 2 demo medium logins)');
    return json({ ok: true, ...r, venues: r.venues.map(v => ({ name: v.name, link: url.origin + v.path })), loginUrl: url.origin + '/members/login/' });
  }
  if (p === 'demo' && method === 'DELETE') {
    const n = await removeDemo(env);
    await log(env, req, a.user, `Removed demo data (${n} records)`);
    return json({ ok: true, removed: n });
  }
  if (p === 'log' && method === 'GET') return json({ log: (await env.KV.get('log', 'json')) || [] });

  return json({ error: 'Not found' }, 404);
}
