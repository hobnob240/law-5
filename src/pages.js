// Server-rendered pages for Book a Medium Night. Everything user-supplied goes through esc().
import { esc, prettyPhone, niceDate, shortDate, todayUK } from './lib.js';
import { NIGHT_TYPES, CONTACT_METHODS, isActive } from './data.js';

const V = 'v=1';
const money = p => '£' + (p / 100).toFixed(p % 100 ? 2 : 0);
const I = {
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.8 9.8 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.4 6.9H22l-6 4.4 2.3 7L12 16l-6.3 4.3 2.3-7-6-4.4h7.6z"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.8 13.6 4.2 10l-1.4 1.4 5 5 9.4-9.4-1.4-1.4z"/></svg>',
  venue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9l9-6 9 6v12h-6v-6H9v6zm2-2h2v-6h10v6h2v-9.9l-7-4.7-7 4.7z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm12 8H5v9h14zM5 8h14V6H5z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V17h16V7.4l-8 5.3zM5.2 7 12 11.5 18.8 7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>',
  pound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3A5 5 0 0 0 9 8v3H6v2h3v4.5a2.5 2.5 0 0 1-1.5 2.3V21H18v-2h-8.3a4.5 4.5 0 0 0 1.3-3.2V13h4v-2h-4V8a3 3 0 0 1 5.6-1.5l1.7-1A5 5 0 0 0 14.5 3z"/></svg>'
};

/* ---------------- shell ---------------- */
export function shell({ S, origin, path, title, description, body, member, noindex }) {
  const nav = [['/', 'Home'], ['/venues/', 'For venues'], ['/mediums/', 'For mediums'], ['/about/', 'About']];
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || '')}">
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}">
<link rel="canonical" href="${esc(origin + path)}">
<meta name="theme-color" content="#16112f">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(S.siteName)}"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description || '')}"><meta property="og:url" content="${esc(origin + path)}"><meta property="og:image" content="${esc(origin)}/assets/og.png"><meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/lora.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/site.css?${V}">
<script src="/assets/site.js?${V}" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="/" aria-label="${esc(S.siteName)}, home"><img src="/assets/logo.svg" alt="${esc(S.siteName)}" width="292" height="64"></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    <nav id="nav" class="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}"${path === h || (h !== '/' && path.startsWith(h)) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
      ${member ? `<a class="nav-cta" href="/members/">${I.user}My portal</a>` : `<a class="nav-login" href="/members/login/">Member login</a>`}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand"><img src="/assets/logo-light.svg" alt="" width="292" height="64" loading="lazy"><p>Bringing venues and mediums together.</p></div>
    <div><h2 class="foot-h">Venues</h2><ul class="foot-list"><li><a href="/venues/register/">Register your venue free</a></li><li><a href="/venues/">How it works</a></li></ul></div>
    <div><h2 class="foot-h">Mediums</h2><ul class="foot-list"><li><a href="/mediums/join/">Become a member</a></li><li><a href="/members/login/">Member login</a></li></ul></div>
    <div><h2 class="foot-h">About</h2><ul class="foot-list"><li><a href="/about/">Our mission</a></li><li><a href="/privacy/">Privacy notice</a></li><li><a href="/terms/">Terms</a></li>${S.contactEmail ? `<li><a href="mailto:${esc(S.contactEmail)}">Contact us</a></li>` : ''}</ul></div>
  </div>
  <div class="wrap foot-base"><span>© ${new Date().getFullYear()} ${esc(S.siteName)}${S.operator ? ` · ${esc(S.operator)}` : ''}</span><span>No tracking or advertising cookies</span></div>
</footer>
</body>
</html>`;
}

/* ---------------- form helpers ---------------- */
function fs(o, type) { const f = o.form && o.form.type === type ? o.form : null; return { v: f ? f.values : (o.values || {}), e: f ? f.errors : {}, t: type }; }
function field(f, name, label, input, hint) {
  const err = f.e[name];
  return `<div class="field${err ? ' has-err' : ''}"><label for="${f.t}-${name}">${label}</label>${hint ? `<span class="hint" id="${f.t}-${name}-h">${hint}</span>` : ''}${input}${err ? `<span class="err" id="${f.t}-${name}-e">${esc(err)}</span>` : ''}</div>`;
}
function ad(f, name, hint) { const ids = [hint ? `${f.t}-${name}-h` : '', f.e[name] ? `${f.t}-${name}-e` : ''].filter(Boolean).join(' '); return (ids ? ` aria-describedby="${ids}"` : '') + (f.e[name] ? ' aria-invalid="true"' : ''); }
const inp = (f, name, type, auto, extra = '', hint) => `<input id="${f.t}-${name}" name="${name}" type="${type}" value="${esc(f.v[name] ?? '')}"${auto ? ` autocomplete="${auto}"` : ''}${extra}${ad(f, name, hint)}>`;
const area = (f, name, rows, hint) => `<textarea id="${f.t}-${name}" name="${name}" rows="${rows}"${ad(f, name, hint)}>${esc(f.v[name] ?? '')}</textarea>`;
function tick(f, name, label) {
  const err = f.e[name];
  return `<div class="field tick${err ? ' has-err' : ''}"><label class="check"><input type="checkbox" name="${name}" value="yes"${f.v[name] === 'yes' ? ' checked' : ''}${err ? ` aria-invalid="true" aria-describedby="${f.t}-${name}-e"` : ''}><span>${label}</span></label>${err ? `<span class="err" id="${f.t}-${name}-e">${esc(err)}</span>` : ''}</div>`;
}
function errTop(f) { return Object.keys(f.e).length ? `<div class="form-err" role="alert">${f.e.form ? esc(f.e.form) : 'Please check the highlighted items below.'}</div>` : ''; }
const spam = (o, t) => `<input type="hidden" name="t" value="${esc(o.token)}"><div class="hp" aria-hidden="true"><label for="${t}-website">Leave empty</label><input id="${t}-website" name="website" tabindex="-1" autocomplete="off"></div>`;

/* ---------------- public pages ---------------- */
function hero(S) {
  return `<section class="hero">
  <div class="sky" aria-hidden="true"><span class="moon"></span></div>
  <div class="wrap hero-in">
    <p class="eyebrow">Welcome to ${esc(S.siteName)}</p>
    <h1>Connecting pubs, clubs &amp; venues with psychics and mediums</h1>
    <p class="lede">${esc(S.siteName)} makes it easy to find mediums who are available to perform at your venue, helping you create memorable evenings that attract customers and bring something different to your entertainment calendar.</p>
    <div class="paths">
      <a class="path" href="/venues/register/"><span class="path-ic">${I.venue}</span><span><small>Own a venue?</small><strong>Register for free</strong><em>List your dates and let mediums contact you</em></span><span class="arrow" aria-hidden="true">→</span></a>
      <a class="path gold" href="/mediums/"><span class="path-ic">${I.star}</span><span><small>Are you a medium?</small><strong>Find venues near you</strong><em>Get in touch with venues looking for you now</em></span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
  </div>
</section>`;
}
export function homePage(S) {
  return `${hero(S)}
<section class="band">
  <div class="wrap split">
    <div>
      <p class="eyebrow dark">For venues</p>
      <h2>Host a mediumship evening, without the hassle</h2>
      <p class="big">Whether you're planning a one-off event or looking to introduce regular mediumship evenings, we're here to help. Simply register your venue, choose your preferred dates and let registered mediums discover your opportunity.</p>
      <p><strong>Register your details now and let ${esc(S.siteName)} do the rest.</strong></p>
      <a class="btn btn-primary" href="/venues/register/">Register your venue free</a>
    </div>
    <ul class="feature-list">
      <li><span class="fi">${I.check}</span><div><h3>Completely free for venues</h3><p>It costs nothing to register and advertise your available dates.</p></div></li>
      <li><span class="fi">${I.check}</span><div><h3>No complicated booking process</h3><p>Mediums contact you directly, in the way you prefer.</p></div></li>
      <li><span class="fi">${I.check}</span><div><h3>No obligation to book</h3><p>You decide which medium, which date and which terms suit you.</p></div></li>
    </ul>
  </div>
</section>

<section class="band band-night">
  <div class="sky small" aria-hidden="true"></div>
  <div class="wrap">
    <div class="sec-head center"><p class="eyebrow">How it works</p><h2>Three simple steps</h2></div>
    <ol class="steps">
      <li><span class="n">1</span><h3>Register your venue</h3><p>Tell us about your venue, the dates you'd like and the type of night you prefer.</p></li>
      <li><span class="n">2</span><h3>Mediums discover you</h3><p>Your listing is shown to registered mediums looking for venues in your area.</p></li>
      <li><span class="n">3</span><h3>Agree it directly</h3><p>Mediums contact you to arrange the evening on your terms. No middleman.</p></li>
    </ol>
  </div>
</section>

<section class="band band-soft">
  <div class="wrap split rev">
    <div>
      <p class="eyebrow dark">For mediums</p>
      <h2>Get more bookings with ${esc(S.siteName)}</h2>
      <p class="big">Are you a psychic or spiritualist medium looking for more venues, new audiences and exciting opportunities to showcase your abilities? Connect with pubs, clubs and venues actively looking to host psychic and mediumship evenings.</p>
      <div class="row-btns"><a class="btn btn-primary" href="/mediums/join/">Become a member</a><a class="btn btn-ghost" href="/mediums/">Membership details</a></div>
    </div>
    <div class="price-card">
      <p class="eyebrow dark">Membership</p>
      <p class="price">${money(S.pricePence)}<span> per year</span></p>
      <ul class="ticks">
        <li>${I.check}<span>12 months' access from the date you join</span></li>
        <li>${I.check}<span>Browse venues and dates seeking your services</span></li>
        <li>${I.check}<span>Contact venues directly</span></li>
        <li>${I.check}<span>No commission on your bookings</span></li>
      </ul>
      <p class="fine">Membership gives access to potential opportunities but doesn't guarantee bookings.</p>
    </div>
  </div>
</section>

<section class="band mission">
  <div class="wrap narrow center">
    <p class="eyebrow dark">Our mission</p>
    <h2>Bringing venues and mediums together</h2>
    <p class="big">Our mission is simple: to make organising mediumship evenings easier for everyone. Whether you're a venue owner searching for entertainment, or a medium looking for new venues, ${esc(S.siteName)} is the place to connect.</p>
  </div>
</section>
${ctaBand()}`;
}
function ctaBand() {
  return `<section class="band cta"><div class="sky small" aria-hidden="true"></div><div class="wrap cta-in">
  <div><p class="eyebrow">Ready to get started?</p><h2>Own a venue, or are you a medium?</h2></div>
  <div class="row-btns"><a class="btn btn-gold" href="/venues/register/">Register your venue free</a><a class="btn btn-light" href="/mediums/join/">Become a member</a></div>
</div></section>`;
}
function pageHead(eyebrow, title, lede) {
  return `<section class="page-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div></section>`;
}

export function aboutPage(S) {
  return `${pageHead('Mission statement', 'Bringing venues and mediums together', 'Our mission is simple: to make organising mediumship evenings easier for everyone.')}
<section class="band"><div class="wrap narrow prose">
  <p class="big">Whether you're a venue owner searching for entertainment, or a medium looking for new venues, ${esc(S.siteName)} is the place to connect.</p>
  <div class="two-cards">
    <div class="card"><span class="card-ic">${I.venue}</span><h2>Own a venue?</h2><p>Register your venue and preferred dates for free.</p><a class="btn btn-primary" href="/venues/register/">Register your venue</a></div>
    <div class="card"><span class="card-ic gold">${I.star}</span><h2>Are you a medium?</h2><p>Become a member and explore potential booking opportunities.</p><a class="btn btn-primary" href="/mediums/join/">Become a member</a></div>
  </div>
</div></section>`;
}

export function venuesPage(S) {
  return `${pageHead('For venues', 'Host a psychic or mediumship evening', 'Register your venue, choose your preferred dates and let registered mediums contact you. It\'s completely free, with no obligation to book.')}
<section class="band"><div class="wrap split">
  <div class="prose">
    <h2>How it works</h2>
    <ol class="numbered"><li>Register your venue and the dates you'd like.</li><li>We check your listing, then show it to registered mediums.</li><li>Mediums contact you directly, during office hours, in the way you prefer.</li><li>You agree the evening, the fee and the details directly with the medium.</li></ol>
    <h2>A typical evening</h2>
    <p>We normally suggest a <strong>7.30pm start</strong>, with a break around <strong>8.15pm for 20 minutes</strong>, and the second half finishing around <strong>9.15 to 9.30pm</strong>.</p>
  </div>
  <div class="price-card">
    <p class="eyebrow dark">Choose your type of night</p>
    <ul class="night-types">${Object.values(NIGHT_TYPES).map(t => `<li>${I.moon}<span>${esc(t)}</span></li>`).join('')}</ul>
    <a class="btn btn-primary wide" href="/venues/register/">Register your venue free</a>
  </div>
</div></section>`;
}

export function venueForm(S, o) {
  const f = fs(o, 'venue');
  const dates = [].concat(f.v.dates || []);
  const min = todayUK();
  return `${pageHead('Register your venue', 'List your venue for free', 'It\'s completely free to register and you have no obligation to book. Registered mediums will be able to contact you directly and offer their services on your terms, on the dates you need.')}
<section class="band"><div class="wrap form-wrap">
  <form class="form card" method="post" action="/venues/register/" novalidate>
    ${errTop(f)}${spam(o, 'venue')}
    <fieldset><legend>Your venue</legend>
      ${field(f, 'name', 'Venue name', inp(f, 'name', 'text', 'organization', ' required'))}
      ${field(f, 'address', 'Venue address', area(f, 'address', 2))}
      <div class="row2">${field(f, 'postcode', 'Postcode', inp(f, 'postcode', 'text', 'postal-code', ' required'))}${field(f, 'phone', 'Venue contact number', inp(f, 'phone', 'tel', 'tel', ' required', true), 'Mediums will only contact you during office hours.')}</div>
      ${field(f, 'email', 'Email address <span class="opt">(optional)</span>', inp(f, 'email', 'email', 'email'))}
    </fieldset>
    <fieldset><legend>Dates and contact</legend>
      ${field(f, 'dates', 'Preferred dates', `<div class="date-grid">${Array.from({ length: 6 }, (_, i) => `<input type="date" name="dates" min="${min}" value="${esc(dates[i] || '')}" aria-label="Preferred date ${i + 1}"${i === 0 ? ` id="venue-dates"` : ''}${ad(f, 'dates', true)}>`).join('')}</div>`, 'Add up to six dates. You can change them later.')}
      <fieldset class="radios${f.e.contact ? ' has-err' : ''}"><legend class="label">Preferred contact method</legend>
        <div class="radio-row">${CONTACT_METHODS.map(c => `<label class="pill"><input type="radio" name="contact" value="${c}"${f.v.contact === c ? ' checked' : ''}><span>${c}</span></label>`).join('')}</div>
        ${f.e.contact ? `<span class="err">${esc(f.e.contact)}</span>` : ''}</fieldset>
      ${field(f, 'notes', 'Notes for mediums <span class="opt">(optional)</span>', area(f, 'notes', 3, true), 'For example: text only, or only call between 3pm and 5pm.')}
    </fieldset>
    <fieldset class="radios${f.e.nightType ? ' has-err' : ''}"><legend>Preferred medium night</legend>
      <div class="option-cards">${Object.entries(NIGHT_TYPES).map(([k, t]) => `<label class="option"><input type="radio" name="nightType" value="${k}"${f.v.nightType === k ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>
      ${f.e.nightType ? `<span class="err">${esc(f.e.nightType)}</span>` : ''}
      ${field(f, 'fee', 'Fee you\'re offering <span class="opt">(only for a set fee)</span>', inp(f, 'fee', 'text', '', ' placeholder="e.g. £200"'))}
    </fieldset>
    <fieldset><legend>Your agreement</legend>
      ${tick(f, 'share', "I'm happy for these venue details, including the phone number and email, to be shown to registered mediums so they can contact me about bookings.")}
      ${tick(f, 'authority', 'I own or manage this venue, or I have permission to list it.')}
      <p class="fine">We use these details only to list your venue and put you in touch with mediums. Read our <a href="/privacy/">privacy notice</a> and <a href="/terms/">terms</a>. You can change or remove your listing at any time.</p>
    </fieldset>
    <button class="btn btn-primary btn-big" type="submit">Register my venue free</button>
  </form>
  <aside class="side-note card">
    <h2>Good to know</h2>
    <ul class="ticks"><li>${I.check}<span>Completely free, no obligation to book</span></li><li>${I.check}<span>Mediums contact you during office hours</span></li><li>${I.check}<span>Suggested evening: 7.30pm start, 20-minute break around 8.15pm, finishing 9.15 to 9.30pm</span></li><li>${I.check}<span>You'll get a private link to edit or remove your listing</span></li></ul>
  </aside>
</div></section>`;
}

export function venueThanks(S, o) {
  const link = o.origin + '/venues/manage/' + o.token;
  return `${pageHead('Thank you', 'Your venue is registered', 'Thank you for registering your details. Registered mediums will be able to contact you directly and offer their services on your terms, on the dates you need.')}
<section class="band"><div class="wrap narrow">
  <div class="card notice">
    ${o.pending ? `<p><strong>What happens next:</strong> we'll quickly check your listing, then it will be shown to registered mediums.</p>` : `<p><strong>Your listing is now live</strong> for registered mediums.</p>`}
    <h2>Save your private link</h2>
    <p>Use this link to change your dates or remove your listing at any time. Keep it private: anyone with the link can edit your listing. We can't show it to you again.</p>
    <div class="copy-box"><input id="manage-link" type="text" readonly value="${esc(link)}" aria-label="Your private link"><button class="btn btn-primary" type="button" data-copy="manage-link">Copy link</button></div>
    <p class="fine">Lost the link? Contact us${S.contactEmail ? ` at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : ''} and we'll help.</p>
  </div>
  <p class="center"><a class="btn btn-ghost" href="/">Back to the home page</a></p>
</div></section>`;
}

export function venueManage(S, o) {
  const f = fs(o, 'venue');
  const dates = [].concat(f.v.dates || []), min = todayUK();
  const v = o.venue;
  return `${pageHead('Your listing', esc(v.name), v.status === 'pending' ? 'Your listing is waiting to be checked. You can still make changes.' : v.status === 'hidden' ? 'Your listing is currently hidden from mediums.' : 'Your listing is live for registered mediums.')}
<section class="band"><div class="wrap form-wrap">
  <form class="form card" method="post" action="/venues/manage/${esc(o.token)}" novalidate>
    ${o.saved ? '<div class="form-ok" role="status">Your changes are saved.</div>' : ''}${errTop(f)}
    <input type="hidden" name="action" value="save">
    ${field(f, 'name', 'Venue name', inp(f, 'name', 'text', 'organization'))}
    ${field(f, 'address', 'Venue address', area(f, 'address', 2))}
    <div class="row2">${field(f, 'postcode', 'Postcode', inp(f, 'postcode', 'text', 'postal-code'))}${field(f, 'phone', 'Venue contact number', inp(f, 'phone', 'tel', 'tel'))}</div>
    ${field(f, 'email', 'Email address <span class="opt">(optional)</span>', inp(f, 'email', 'email', 'email'))}
    ${field(f, 'dates', 'Preferred dates', `<div class="date-grid">${Array.from({ length: 6 }, (_, i) => `<input type="date" name="dates" min="${min}" value="${esc(dates[i] || '')}" aria-label="Preferred date ${i + 1}"${i === 0 ? ' id="venue-dates"' : ''}>`).join('')}</div>`)}
    <fieldset class="radios${f.e.contact ? ' has-err' : ''}"><legend class="label">Preferred contact method</legend><div class="radio-row">${CONTACT_METHODS.map(c => `<label class="pill"><input type="radio" name="contact" value="${c}"${f.v.contact === c ? ' checked' : ''}><span>${c}</span></label>`).join('')}</div>${f.e.contact ? `<span class="err">${esc(f.e.contact)}</span>` : ''}</fieldset>
    ${field(f, 'notes', 'Notes for mediums <span class="opt">(optional)</span>', area(f, 'notes', 3))}
    <fieldset class="radios${f.e.nightType ? ' has-err' : ''}"><legend class="label">Preferred medium night</legend><div class="option-cards">${Object.entries(NIGHT_TYPES).map(([k, t]) => `<label class="option"><input type="radio" name="nightType" value="${k}"${f.v.nightType === k ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>${f.e.nightType ? `<span class="err">${esc(f.e.nightType)}</span>` : ''}
    ${field(f, 'fee', 'Fee you\'re offering <span class="opt">(only for a set fee)</span>', inp(f, 'fee', 'text', ''))}</fieldset>
    <button class="btn btn-primary btn-big" type="submit">Save changes</button>
  </form>
  <aside class="side-note card danger-zone">
    <h2>Remove your listing</h2>
    <p>This deletes your venue and its details straight away. Mediums will no longer see it.</p>
    <form method="post" action="/venues/manage/${esc(o.token)}"><input type="hidden" name="action" value="delete">
      <label class="check"><input type="checkbox" name="confirm" value="yes" required><span>Yes, delete my listing for good</span></label>
      <button class="btn btn-danger" type="submit">Delete listing</button></form>
  </aside>
</div></section>`;
}

export function venueRemoved() {
  return `${pageHead('Listing removed', 'Your listing has been deleted', 'Your venue and its details have been removed. Thank you for using the service.')}<section class="band"><div class="wrap center"><a class="btn btn-primary" href="/">Back to the home page</a></div></section>`;
}

export function mediumsPage(S) {
  const benefits = [
    ['Access to potential bookings', 'Discover venues looking to host mediumship evenings.'],
    ['New venue opportunities', 'Connect with pubs, clubs, hotels and event organisers across the UK.'],
    ['Direct contact with venues', 'Discuss availability, fees and event arrangements directly.'],
    ['Flexible bookings', 'Choose opportunities that suit your location, availability and schedule.'],
    ['Grow your audience', 'Perform at new venues and introduce your mediumship and psychic abilities to a new audience.'],
    ['Year-round opportunities', 'Access newly advertised venue dates throughout your membership.']
  ];
  return `${pageHead('Medium registration', `Get more bookings with ${esc(S.siteName)}`, 'Are you a psychic or spiritualist medium looking for more venues, new audiences and exciting opportunities to showcase your abilities?')}
<section class="band"><div class="wrap">
  <p class="big intro">Welcome to ${esc(S.siteName)}, the platform connecting you to local pubs, clubs and event venues across the UK. We make it easier for mediums to discover local venues actively looking to host psychic and mediumship evenings.</p>
  <div class="sec-head"><h2>Why join ${esc(S.siteName)}</h2></div>
  <div class="benefits">${benefits.map(([h, p]) => `<div class="benefit"><span class="fi">${I.star}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
</div></section>
<section class="band band-soft"><div class="wrap split">
  <div class="price-card big-card">
    <p class="eyebrow dark">Membership</p>
    <p class="price">Just ${money(S.pricePence)}<span> per year</span></p>
    <p>For an annual subscription of ${money(S.pricePence)} you'll receive 12 months' access to our platform and available venue booking opportunities, from the date you join.</p>
    <ul class="ticks"><li>${I.check}<span><strong>No commission on bookings.</strong> Any performance fees are agreed directly between you and the venue.</span></li><li>${I.check}<span>One payment. It doesn't renew automatically.</span></li></ul>
    <p class="fine"><strong>Please note:</strong> membership provides access to potential opportunities but does not guarantee bookings.</p>
    <a class="btn btn-primary wide" href="/mediums/join/">Join today</a>
  </div>
  <div>
    <h2>How it works</h2>
    <ol class="steps-list">
      <li><span class="n">1</span><div><h3>Register</h3><p>Complete your details and create your medium profile.</p></div></li>
      <li><span class="n">2</span><div><h3>Activate your membership</h3><p>Pay your annual subscription to access our members' portal.</p></div></li>
      <li><span class="n">3</span><div><h3>Explore venues</h3><p>Browse venues and dates seeking your services.</p></div></li>
      <li><span class="n">4</span><div><h3>Arrange your booking</h3><p>Contact venues, discuss your requirements and confirm arrangements directly.</p></div></li>
    </ol>
  </div>
</div></section>
${ctaBand()}`;
}

export function joinForm(S, o) {
  const f = fs(o, 'join');
  return `${pageHead('Become a member', 'Create your medium account', `Join today and take the next step towards growing your mediumship business. ${money(S.pricePence)} annual membership, 12 months' access from the date you join.`)}
<section class="band"><div class="wrap form-wrap">
  <form class="form card" method="post" action="/mediums/join/" novalidate>
    ${errTop(f)}${spam(o, 'join')}
    <fieldset><legend>Your details</legend>
      ${field(f, 'name', 'Name', inp(f, 'name', 'text', 'name', ' required'))}
      ${field(f, 'address', 'Address', area(f, 'address', 2))}
      <div class="row2">${field(f, 'postcode', 'Postcode', inp(f, 'postcode', 'text', 'postal-code', ' required'))}${field(f, 'phone', 'Contact number', inp(f, 'phone', 'tel', 'tel', ' required'))}</div>
      ${field(f, 'radius', 'How far are you willing to travel?', `<div class="suffix">${inp(f, 'radius', 'number', '', ' min="1" max="600" inputmode="numeric" required', true)}<span>miles</span></div>`, 'We use this to show you venues within reach.')}
    </fieldset>
    <fieldset><legend>Your login</legend>
      ${field(f, 'email', 'Email', inp(f, 'email', 'email', 'email', ' required autocapitalize="none" spellcheck="false"'))}
      ${field(f, 'password', 'Choose a password', `<input id="join-password" name="password" type="password" autocomplete="new-password" required${ad(f, 'password', true)}>`, 'At least 10 characters. Three random words works well.')}
    </fieldset>
    <fieldset><legend>Membership</legend>
      ${tick(f, 'noGuarantee', `I understand the annual membership costs ${money(S.pricePence)} and does not guarantee bookings.`)}
      ${tick(f, 'terms', 'I agree to the <a href="/terms/" target="_blank" rel="noopener">membership terms</a> and have read the <a href="/privacy/" target="_blank" rel="noopener">privacy notice</a>.')}
      <p class="fine">Next, you'll be asked to pay your membership to unlock the members' portal. If you're a consumer you can cancel within 14 days for a full refund (see the terms).</p>
    </fieldset>
    <button class="btn btn-primary btn-big" type="submit">Create my account</button>
    <p class="fine center">Already a member? <a href="/members/login/">Log in</a></p>
  </form>
  <aside class="side-note card"><h2>${money(S.pricePence)} per year</h2><ul class="ticks"><li>${I.check}<span>12 months' access from the date you join</span></li><li>${I.check}<span>No commission on bookings</span></li><li>${I.check}<span>Contact venues directly</span></li><li>${I.check}<span>Doesn't renew automatically</span></li></ul><p class="fine">Membership doesn't guarantee bookings.</p></aside>
</div></section>`;
}

export function loginPage(S, o) {
  const f = fs(o, 'login');
  return `${pageHead('Members', 'Member login', 'Log in to see venues looking for mediums.')}
<section class="band"><div class="wrap narrow-form">
  <form class="form card" method="post" action="/members/login/" novalidate>
    ${o.notice ? `<div class="form-ok" role="status">${esc(o.notice)}</div>` : ''}${errTop(f)}
    ${field(f, 'email', 'Email', inp(f, 'email', 'email', 'email', ' required autocapitalize="none" spellcheck="false"'))}
    ${field(f, 'password', 'Password', `<input id="login-password" name="password" type="password" autocomplete="current-password" required>`)}
    <button class="btn btn-primary btn-big wide" type="submit">Log in</button>
    <p class="fine center">Forgotten your password? Contact us${S.contactEmail ? ` at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : ''} and we'll send you a reset link.</p>
    <p class="fine center">Not a member yet? <a href="/mediums/join/">Create an account</a></p>
  </form>
</div></section>`;
}

export function resetPage(S, o) {
  const f = fs(o, 'reset');
  return `${pageHead('Members', 'Choose a new password', o.valid ? 'Enter a new password for your account.' : '')}
<section class="band"><div class="wrap narrow-form">${o.valid ? `
  <form class="form card" method="post" action="/members/reset/${esc(o.token)}" novalidate>${errTop(f)}
    ${field(f, 'password', 'New password', `<input id="reset-password" name="password" type="password" autocomplete="new-password" required${ad(f, 'password', true)}>`, 'At least 10 characters.')}
    <button class="btn btn-primary btn-big wide" type="submit">Save new password</button></form>` : `<div class="card"><p>This reset link has expired or has already been used. Please ask us for a new one.</p><p><a class="btn btn-primary" href="/members/login/">Go to login</a></p></div>`}
</div></section>`;
}

/* ---------------- members' portal ---------------- */
function portalNav(path) {
  const items = [['/members/', 'Venues'], ['/members/account/', 'My account']];
  return `<nav class="portal-nav" aria-label="Members">${items.map(([h, l]) => `<a href="${h}"${path === h ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<form method="post" action="/members/logout/"><button class="linkish" type="submit">Log out</button></form></nav>`;
}
export function portalPage(S, o) {
  const m = o.medium, active = isActive(m);
  const head = `<section class="portal-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Members' portal</p><h1>Hello, ${esc(m.name.split(' ')[0])}</h1>
    <p class="lede">${active ? `Your membership is active until <strong>${shortDate(m.until)}</strong>.` : m.until ? `Your membership ended on ${shortDate(m.until)}.` : 'Activate your membership to see venues looking for mediums.'}</p>${portalNav('/members/')}</div></section>`;
  if (!active) {
    return `${head}<section class="band"><div class="wrap narrow">
      ${o.notice ? `<div class="form-ok" role="status">${esc(o.notice)}</div>` : ''}${o.error ? `<div class="form-err" role="alert">${esc(o.error)}</div>` : ''}
      <div class="card activate">
        <p class="eyebrow dark">${m.until ? 'Renew your membership' : 'Activate your membership'}</p>
        <p class="price">${money(S.pricePence)}<span> for 12 months</span></p>
        <p>Unlock venue listings and contact details for 12 months. One payment, no automatic renewal. Membership doesn't guarantee bookings.</p>
        ${o.stripe ? `<form method="post" action="/members/checkout/"><button class="btn btn-primary btn-big" type="submit">${I.lock}Pay ${money(S.pricePence)} securely</button></form><p class="fine">You'll pay on Stripe's secure checkout page. We never see or store your card details.</p>`
          : `<div class="manual-pay"><p><strong>Card payments are being set up.</strong> To activate your membership now, please contact us${S.contactEmail ? ` at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : ''}.</p>${S.bankDetails ? `<p>You can pay by bank transfer:</p><p class="bank">${esc(S.bankDetails)}</p><p class="fine">Use your email address as the reference. We'll activate your membership as soon as the payment arrives.</p>` : ''}</div>`}
      </div>
    </div></section>`;
  }
  const venues = o.venues;
  const showAll = o.showAll;
  return `${head}<section class="band"><div class="wrap">
    ${o.notice ? `<div class="form-ok" role="status">${esc(o.notice)}</div>` : ''}
    <div class="sec-head"><div><h2>Venues looking for mediums</h2><p class="muted">${showAll ? 'Showing every venue with upcoming dates.' : `Showing venues within ${esc(m.radius)} miles of ${esc(m.postcode)}.`}</p></div>
    <div class="toggle">${showAll ? `<a class="btn btn-ghost" href="/members/">Only within ${esc(m.radius)} miles</a>` : `<a class="btn btn-ghost" href="/members/?all=1">Show all venues</a>`}</div></div>
    ${venues.length ? `<div class="venue-grid">${venues.map(v => `<a class="venue-card" href="/members/venues/${esc(v.id)}">
      <div class="vc-top"><h3>${esc(v.name)}</h3>${v.distance != null ? `<span class="dist">${v.distance} mi</span>` : ''}</div>
      <p class="vc-loc">${I.pin}${esc([v.town, v.postcode].filter(Boolean).join(' · '))}</p>
      <p class="vc-dates">${I.cal}${v.upcoming.slice(0, 3).map(d => esc(niceDate(d))).join(', ')}${v.upcoming.length > 3 ? ` +${v.upcoming.length - 3} more` : ''}</p>
      <p class="vc-type">${I.moon}${esc(NIGHT_TYPES[v.nightType] || '')}${v.nightType === 'fee' && v.fee ? `: ${esc(v.fee)}` : ''}</p>
      <span class="vc-more">View contact details →</span></a>`).join('')}</div>`
      : `<div class="card empty"><p>${showAll ? 'There are no venues with upcoming dates right now. New venues are added all the time, so check back soon.' : `No venues within ${esc(m.radius)} miles right now.`}</p>${showAll ? '' : '<p><a class="btn btn-primary" href="/members/?all=1">Show all venues</a></p>'}</div>`}
  </div></section>`;
}
export function venueDetail(S, o) {
  const v = o.venue, upcoming = (v.dates || []).filter(d => d >= todayUK());
  return `<section class="portal-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow"><a href="/members/">← All venues</a></p><h1>${esc(v.name)}</h1><p class="lede">${esc([v.town, v.postcode].filter(Boolean).join(' · '))}${o.distance != null ? ` · ${o.distance} miles from you` : ''}</p></div></section>
<section class="band"><div class="wrap split detail">
  <div class="card">
    <h2>Contact the venue</h2>
    <p class="fine">Please contact venues during office hours only${v.contact ? `. They prefer: <strong>${esc(v.contact.toLowerCase())}</strong>` : ''}.</p>
    <ul class="contact-list">
      <li>${I.phone}<span><small>Phone</small><a href="tel:+44${esc(v.phone.slice(1))}">${esc(prettyPhone(v.phone))}</a></span></li>
      ${v.email ? `<li>${I.mail}<span><small>Email</small><a href="mailto:${esc(v.email)}">${esc(v.email)}</a></span></li>` : ''}
      <li>${I.pin}<span><small>Address</small>${esc(v.address)}<br>${esc(v.postcode)}</span></li>
    </ul>
    ${v.notes ? `<h3>Notes from the venue</h3><p class="notes">${esc(v.notes)}</p>` : ''}
  </div>
  <div class="card">
    <h2>Dates wanted</h2>
    <ul class="date-list">${upcoming.map(d => `<li>${I.cal}${esc(niceDate(d))}</li>`).join('') || '<li>No upcoming dates.</li>'}</ul>
    <h2>Type of night</h2>
    <p>${esc(NIGHT_TYPES[v.nightType] || '')}${v.nightType === 'fee' && v.fee ? `: <strong>${esc(v.fee)}</strong>` : ''}</p>
    <p class="fine">Suggested evening: 7.30pm start, 20-minute break around 8.15pm, finishing 9.15 to 9.30pm. Agree the details directly with the venue.</p>
  </div>
</div></section>`;
}
export function accountPage(S, o) {
  const m = o.medium, f = fs(o, 'account'), pf = fs(o, 'password');
  return `<section class="portal-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Members' portal</p><h1>My account</h1>${portalNav('/members/account/')}</div></section>
<section class="band"><div class="wrap form-wrap">
  <div>
    <form class="form card" method="post" action="/members/account/" novalidate>
      <input type="hidden" name="action" value="details">
      <h2>Your details</h2>
      ${o.saved === 'details' ? '<div class="form-ok" role="status">Your details are saved.</div>' : ''}${errTop(f)}
      ${field(f, 'name', 'Name', inp(f, 'name', 'text', 'name'))}
      ${field(f, 'email', 'Email', inp(f, 'email', 'email', 'email', ' autocapitalize="none"'))}
      ${field(f, 'address', 'Address', area(f, 'address', 2))}
      <div class="row2">${field(f, 'postcode', 'Postcode', inp(f, 'postcode', 'text', 'postal-code'))}${field(f, 'phone', 'Contact number', inp(f, 'phone', 'tel', 'tel'))}</div>
      ${field(f, 'radius', 'How far are you willing to travel?', `<div class="suffix">${inp(f, 'radius', 'number', '', ' min="1" max="600" inputmode="numeric"')}<span>miles</span></div>`)}
      <button class="btn btn-primary" type="submit">Save details</button>
    </form>
    <form class="form card" method="post" action="/members/account/" novalidate>
      <input type="hidden" name="action" value="password">
      <h2>Change password</h2>
      ${o.saved === 'password' ? '<div class="form-ok" role="status">Your password is changed. Other devices have been logged out.</div>' : ''}${errTop(pf)}
      ${field(pf, 'current', 'Current password', '<input id="password-current" name="current" type="password" autocomplete="current-password">')}
      ${field(pf, 'password', 'New password', '<input id="password-password" name="password" type="password" autocomplete="new-password">', 'At least 10 characters.')}
      <button class="btn btn-primary" type="submit">Change password</button>
    </form>
  </div>
  <aside class="side-stack">
    <div class="card"><h2>Membership</h2><p>${isActive(m) ? `Active until <strong>${shortDate(m.until)}</strong>.` : m.until ? `Ended ${shortDate(m.until)}. <a href="/members/">Renew</a>` : 'Not active yet. <a href="/members/">Activate</a>'}</p>${m.memberSince ? `<p class="fine">Member since ${shortDate(m.memberSince)}.</p>` : ''}</div>
    <div class="card"><h2>Your data</h2><p>Download a copy of everything we hold about you.</p><a class="btn btn-ghost" href="/members/account/data">Download my data</a></div>
    <div class="card danger-zone"><h2>Delete account</h2><p>This permanently deletes your account and logs you out. Payment records are kept for 6 years because the law requires it for tax purposes. Deleting your account doesn't give a refund after the 14-day cancellation period.</p>
      ${o.deleteError ? `<div class="form-err" role="alert">${esc(o.deleteError)}</div>` : ''}
      <form method="post" action="/members/account/"><input type="hidden" name="action" value="delete">
        <div class="field"><label for="del-pass">Enter your password to confirm</label><input id="del-pass" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-danger" type="submit">Delete my account</button></form></div>
  </aside>
</div></section>`;
}

/* ---------------- legal ---------------- */
export function privacyPage(S) {
  const who = S.operator || `the team behind ${S.siteName}`;
  return `${pageHead('Privacy', 'Privacy notice', `How ${esc(S.siteName)} collects, uses and protects personal information.`)}
<section class="band"><div class="wrap narrow prose">
  <p class="fine">Last updated: October 2026</p>
  <h2>Who we are</h2>
  <p>${esc(S.siteName)} is run by ${esc(who)}${S.postalAddress ? `, ${esc(S.postalAddress)}` : ''}. We are the "controller" of the personal information described here.${S.contactEmail ? ` Contact us about privacy at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>.` : ''}${S.icoNumber ? ` We are registered with the Information Commissioner's Office under number ${esc(S.icoNumber)}.` : ''}</p>
  <h2>What we collect and why</h2>
  <h3>Venues</h3>
  <p>When you register a venue we collect the venue name, address and postcode, a contact phone number, an optional email address, your preferred dates, contact preferences, notes and the type of night you'd like. We use this to show your listing to registered mediums so they can contact you. Our lawful basis is your consent, which you give when you tick the box on the form, and our legitimate interest in running the service. You can withdraw consent at any time by deleting your listing with your private link, or by contacting us.</p>
  <h3>Mediums</h3>
  <p>When you create an account we collect your name, address, postcode, phone number, email address, how far you'll travel and a password (stored only in scrambled, "hashed" form). We use this to provide your membership, show you venues within reach and contact you about your account. Our lawful basis is the contract between us (your membership). We keep a record of membership payments to meet our legal obligations for tax and accounts.</p>
  <h3>Payments</h3>
  <p>Card payments are handled by Stripe. We never see or store your card details. Stripe processes your payment information under its own privacy policy, and tells us whether the payment succeeded.</p>
  <h2>Who can see your information</h2>
  <ul><li><strong>Venue details</strong> are shown only to mediums with an active membership, and to us.</li><li><strong>Mediums' details</strong> are not shown to venues or other members. Only we can see them.</li><li><strong>Service providers:</strong> Cloudflare (website hosting and data storage), Stripe (card payments) and postcodes.io (we send it a postcode only, to work out approximate distances). Some of these may process data outside the UK, protected by approved safeguards such as the UK International Data Transfer Addendum.</li></ul>
  <p>We never sell your information or use it for advertising.</p>
  <h2>How long we keep it</h2>
  <ul><li>Venue listings are deleted automatically 3 months after the last date listed, or straight away if you delete your listing.</li><li>Medium accounts that are never activated are deleted after 30 days. Accounts are deleted 24 months after membership ends, or straight away if you delete your account.</li><li>Payment records are kept for 6 years, then deleted.</li><li>Website security logs are kept for a short period to protect against misuse.</li></ul>
  <h2>Cookies</h2>
  <p>We only use cookies that are strictly necessary: one to keep members logged in, and one for our administrators. We don't use analytics, advertising or tracking cookies, and our fonts are hosted on this website, not by a third party. This is why we don't need to ask for cookie consent.</p>
  <h2>Your rights</h2>
  <p>You have the right to access, correct, delete or restrict the use of your personal information, to object to how we use it, to withdraw consent and to receive your data in a portable format. Members can download or delete their data from "My account". To make any other request, contact us${S.contactEmail ? ` at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : ''}. We'll reply within one month.</p>
  <p>If you're unhappy with how we've handled your information, you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener" target="_blank">ico.org.uk</a> or on 0303 123 1113.</p>
  <h2>Security</h2>
  <p>The website uses encrypted connections, passwords are stored hashed, logins are rate-limited, and venue contact details are only available to logged-in, active members.</p>
</div></section>`;
}
export function termsPage(S) {
  return `${pageHead('Terms', 'Terms of use and membership', `The terms for using ${esc(S.siteName)}.`)}
<section class="band"><div class="wrap narrow prose">
  <p class="fine">Version ${'2026-10'} · Last updated: October 2026</p>
  <h2>1. About the service</h2>
  <p>${esc(S.siteName)}${S.operator ? `, run by ${esc(S.operator)},` : ''} is an introduction service. Venues list dates when they would like to host a psychic or mediumship evening, and members (mediums) can see those listings and contact venues directly. We are not a party to any booking between a medium and a venue.</p>
  <h2>2. For venues</h2>
  <p>Registering a venue is free and there is no obligation to book. You confirm that you own or manage the venue, or have permission to list it, and that the details you give are accurate. You agree that your listing, including contact details, will be shown to members. You can change or delete your listing at any time with your private link. We may decline, hide or remove listings.</p>
  <h2>3. Membership for mediums</h2>
  <ul>
    <li>Membership costs ${money(S.pricePence)} (including any VAT that applies) and gives 12 months' access to venue listings from the date your payment is received. It is a single payment and does not renew automatically.</li>
    <li><strong>Membership gives access to potential opportunities but does not guarantee bookings</strong>, any number of venues, or any income.</li>
    <li>We charge no commission. Fees and arrangements are agreed directly between you and the venue.</li>
    <li>You must contact venues only about performing at their venue, during office hours and in the way they prefer. You must not copy, share, resell or publish venue details, or use them for marketing.</li>
    <li>You are responsible for your own performances, including any insurance, licences and compliance with consumer protection law, such as making clear that demonstrations are for entertainment purposes where appropriate.</li>
    <li>We may suspend or end a membership if these terms are broken, for example misuse of venue details. If we end it without good reason, we'll refund the unused part.</li>
  </ul>
  <h2>4. Cancellation and refunds</h2>
  <p>If you're a consumer, you have the right to cancel your membership within 14 days of paying, for a full refund. To cancel, contact us${S.contactEmail ? ` at <a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : ''}. Refunds are made to the original payment method within 14 days. After the 14-day period, membership fees are not refundable, except as required by law. This does not affect your statutory rights.</p>
  <h2>5. Our responsibility</h2>
  <p>We take reasonable care to run the service, but we can't guarantee venue listings are accurate or that venues will respond. We are not responsible for arrangements, payments, cancellations or disputes between mediums and venues. Nothing in these terms limits liability that cannot be limited by law, including for death or personal injury caused by negligence, or fraud.</p>
  <h2>6. Accounts and security</h2>
  <p>Keep your password private. Accounts are for one person only and must not be shared.</p>
  <h2>7. Privacy</h2>
  <p>Our <a href="/privacy/">privacy notice</a> explains how we use personal information.</p>
  <h2>8. Changes and law</h2>
  <p>We may update these terms. Changes won't affect a membership you've already paid for unless the law requires it. These terms are governed by the law of England and Wales.</p>
</div></section>`;
}

export function notFound() {
  return `${pageHead('Page not found', 'We couldn\'t find that page', 'It may have moved. Try one of these instead.')}<section class="band"><div class="wrap center row-btns centered"><a class="btn btn-primary" href="/">Home</a><a class="btn btn-ghost" href="/venues/register/">Register a venue</a><a class="btn btn-ghost" href="/mediums/">For mediums</a></div></section>`;
}
