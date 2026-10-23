// Server-rendered pages for Law and Son Decorators. Every value from the admin is escaped here.
import { prettyPhone, telHref, waHref } from './content.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = d => d ? MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';
const V = 'v=3';

const I = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8s-.39-.12-.55.12-.63.8-.78.96-.29.19-.53.06a6.7 6.7 0 0 1-3.3-2.9c-.25-.43.25-.4.71-1.33a.45.45 0 0 0 0-.42c-.06-.12-.55-1.33-.76-1.82s-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2 4.7 4.7 0 0 0 1 2.5 10.8 10.8 0 0 0 4.1 3.65c1.53.66 2.13.71 2.9.6a2.47 2.47 0 0 0 1.62-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.47-.28z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V17h16V7.4l-8 5.3zM5.2 7 12 11.5 18.8 7z"/></svg>',
  star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 1.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.8 13.6 4.2 10l-1.4 1.4 5 5 9.4-9.4-1.4-1.4z"/></svg>',
  ext: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6h-2V6.4l-6.3 6.3-1.4-1.4L13.6 5H11zM4 5h5v2H5v8h8v-4h2v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
  roller: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13a1 1 0 0 1 1 1v1h2v6h-8v3h1v7h-4v-7h1v-5h8V7h-1v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.4 3.3 3.3-1.4 1.4L11 13.2V6h2z"/></svg>',
  quote: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 7C7.5 9 4 13.4 4 19.2 4 23 6.4 25 9.2 25c2.6 0 4.6-2 4.6-4.6 0-2.5-1.8-4.3-4.2-4.3-.5 0-1 .1-1.3.2.6-3 3.3-5.7 6.2-7zm15 0c-5.5 2-9 6.4-9 12.2 0 3.8 2.4 5.8 5.2 5.8 2.6 0 4.6-2 4.6-4.6 0-2.5-1.8-4.3-4.2-4.3-.5 0-1 .1-1.3.2.6-3 3.3-5.7 6.2-7z"/></svg>'
};

function avg(reviews) { return reviews.length ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0; }
const stars = n => `<span class="stars" aria-label="${n} out of 5 stars">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${I.star}</span>`).join('')}</span>`;

/* ---------------- shell ---------------- */
function shell(c, o, { path, title, description, body, noindex, schema }) {
  const B = c.business, url = o.origin + (path === '404' ? '/' : path);
  const hasWork = c.gallery.length > 0;
  const nav = [['/', 'Home'], ['/services/', 'Services'], ...(hasWork ? [['/our-work/', 'Our work']] : []), ['/about/', 'About'], ['/quote/', 'Get a quote']];
  const robots = c.seo.hide || noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const bar = [
    B.phone ? `<a href="${telHref(B.phone)}">${I.phone}<span>Call</span></a>` : '',
    B.whatsapp ? `<a href="${waHref(B.whatsapp)}" rel="noopener" target="_blank">${I.wa}<span>WhatsApp</span></a>` : '',
    `<a class="go" href="/quote/">Free quote</a>`
  ].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#12235a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(o.origin)}/assets/og.png">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" as="image" href="/assets/paint-bg-sm.webp" media="(max-width: 860px)">
<link rel="preload" as="image" href="/assets/paint-bg.webp" media="(min-width: 861px)">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..900&family=Permanent+Marker&family=Source+Sans+3:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/assets/site.css?${V}">
<script src="/assets/site.js?${V}" defer></script>
${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="${bar.length ? 'has-bar' : ''}">
<a class="skip" href="#main">Skip to content</a>
${B.phone || B.hours ? `<div class="topline"><div class="wrap topline-in"><span>${I.pin}Painter &amp; decorator in ${esc(B.town)}</span>${B.hours ? `<span class="tl-hide">${I.clock}${esc(B.hours)}</span>` : ''}${B.phone ? `<a href="${telHref(B.phone)}">${I.phone}${esc(prettyPhone(B.phone))}</a>` : ''}</div></div>` : ''}
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="/" aria-label="${esc(B.name)}, home"><picture><source srcset="/assets/logo-sm.webp" type="image/webp"><img src="/assets/logo.jpg" alt="${esc(B.name)} logo" width="300" height="200"></picture></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    <nav id="nav" class="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ''}${h === '/quote/' ? ' class="nav-quote"' : ''}>${l}</a>`).join('')}
    </nav>
    <a class="btn btn-red head-quote" href="/quote/">Free quote</a>
  </div>
</header>
<main id="main">
${body}
</main>
${footer(c)}
<nav class="callbar" aria-label="Quick contact">${bar.join('')}</nav>
</body>
</html>`;
}

function footer(c) {
  const B = c.business, L = c.links;
  const socials = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['google', 'Google reviews'], ['checkatrade', 'Checkatrade'], ['mybuilder', 'MyBuilder']].filter(([k]) => L[k]);
  return `<footer class="site-foot">
  <div class="foot-paint" aria-hidden="true"></div>
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <picture><source srcset="/assets/logo-sm.webp" type="image/webp"><img src="/assets/logo.jpg" alt="" width="300" height="200" loading="lazy"></picture>
      <p>Painting and decorating in ${esc(B.town)} and nearby.</p>
      ${B.owner ? `<p class="foot-owner">${esc(B.owner)}</p>` : ''}
    </div>
    <div>
      <h2 class="foot-h">Contact</h2>
      <ul class="foot-list">
        ${B.phone ? `<li><a href="${telHref(B.phone)}">${esc(prettyPhone(B.phone))}</a></li>` : ''}
        ${B.email ? `<li><a href="mailto:${esc(B.email)}">${esc(B.email)}</a></li>` : ''}
        ${B.hours ? `<li>${esc(B.hours)}</li>` : ''}
        <li><a href="/quote/">Request a quote online</a></li>
      </ul>
    </div>
    <div>
      <h2 class="foot-h">Areas covered</h2>
      <ul class="foot-list">${c.areas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
    </div>
    ${socials.length ? `<div><h2 class="foot-h">Find us</h2><ul class="foot-list">${socials.map(([k, l]) => `<li><a href="${esc(L[k])}" rel="noopener" target="_blank">${l}</a></li>`).join('')}</ul></div>` : ''}
  </div>
  <div class="wrap foot-base">
    <span>© ${new Date().getFullYear()} ${esc(B.name)}</span>
    <a href="/privacy/">Privacy notice</a>
    <span>Website by Charlie</span>
  </div>
</footer>`;
}

/* ---------------- shared blocks ---------------- */
function trustItems(c) {
  const B = c.business, out = [];
  if (c.reviews.length) out.push(`${stars(Math.round(avg(c.reviews)))}<span><strong>${avg(c.reviews).toFixed(1)}</strong> from ${c.reviews.length} review${c.reviews.length === 1 ? '' : 's'}</span>`);
  if (B.freeQuotes) out.push(`${I.check}<span><strong>Free</strong> no-obligation quotes</span>`);
  if (B.insured) out.push(`${I.shield}<span>${esc(B.insuranceNote || 'Fully insured')}</span>`);
  if (B.yearsTrading) out.push(`${I.roller}<span><strong>${esc(B.yearsTrading)} years</strong> decorating</span>`);
  out.push(`${I.pin}<span>Local to <strong>${esc(B.town)}</strong></span>`);
  return out;
}

function photo(g, extra = '') {
  const ratio = g.w && g.h ? ` width="${g.w}" height="${g.h}"` : '';
  return `<img src="${esc(g.src)}" alt="${esc(g.caption || g.kind + ' decorating job' + (g.area ? ' in ' + g.area : ''))}"${ratio} loading="lazy" decoding="async"${extra}>`;
}
function workCard(g) {
  return `<figure class="work">${photo(g)}<figcaption><span class="work-kind">${esc(g.kind)}</span><strong>${esc(g.caption || g.kind + ' decorating')}</strong>${g.area ? `<span>${esc(g.area)}</span>` : ''}</figcaption></figure>`;
}
function beforeAfter(g) {
  return `<figure class="ba">
    <div class="ba-frame">
      ${photo(g, ' class="ba-after"')}
      <div class="ba-before"><img src="${esc(g.before)}" alt="Before: ${esc(g.caption || g.kind + ' job')}" loading="lazy" decoding="async"></div>
      <span class="ba-tag ba-l">Before</span><span class="ba-tag ba-r">After</span>
      <span class="ba-handle" aria-hidden="true"></span>
      <input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Slide to compare before and after">
    </div>
    <figcaption><strong>${esc(g.caption || g.kind + ' decorating')}</strong>${g.area ? ` · ${esc(g.area)}` : ''}</figcaption>
  </figure>`;
}
function reviewCard(r, cls = '') {
  return `<blockquote class="review ${cls}">${stars(r.rating)}<p>${esc(r.text)}</p><footer><strong>${esc(r.name)}</strong>${r.area ? `, ${esc(r.area)}` : ''}<span class="rv-src">${esc(r.source)}${r.date ? ' · ' + monthYear(r.date) : ''}</span></footer></blockquote>`;
}
function contactPanel(c, heading = 'Talk to us') {
  const B = c.business;
  const rows = [
    B.phone ? `<a class="cp-row" href="${telHref(B.phone)}">${I.phone}<span><small>Call</small>${esc(prettyPhone(B.phone))}</span></a>` : '',
    B.whatsapp ? `<a class="cp-row" href="${waHref(B.whatsapp)}" rel="noopener" target="_blank">${I.wa}<span><small>WhatsApp photos of the job</small>${esc(prettyPhone(B.whatsapp))}</span></a>` : '',
    B.email ? `<a class="cp-row" href="mailto:${esc(B.email)}">${I.mail}<span><small>Email</small>${esc(B.email)}</span></a>` : ''
  ].filter(Boolean);
  return `<aside class="contact-panel">
    <h2>${esc(heading)}</h2>
    ${rows.join('') || '<p>Use the form and we\'ll get back to you.</p>'}
    ${B.replyPromise ? `<p class="cp-note">${esc(B.replyPromise)}</p>` : ''}
    ${B.hours ? `<p class="cp-note">${esc(B.hours)}</p>` : ''}
  </aside>`;
}
function faqBlock(c) {
  if (!c.faqs.length) return '';
  return `<section class="band faq-band" id="faq"><div class="wrap faq-grid">
    <div class="faq-intro"><p class="marker">Good to know</p><h2>Questions people ask</h2><p>Something else on your mind? <a href="/quote/">Ask us</a>${c.business.phone ? ` or call <a href="${telHref(c.business.phone)}">${esc(prettyPhone(c.business.phone))}</a>` : ''}.</p></div>
    <div class="faqs">${c.faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><div>${paras(f.a)}</div></details>`).join('')}</div>
  </div></section>`;
}

/* ---------------- forms ---------------- */
function field(f, name, label, input, hint = '') {
  const err = f.errors[name];
  return `<div class="field${err ? ' has-err' : ''}"><label for="${f.p}${name}">${label}</label>${hint ? `<span class="hint" id="${f.p}h-${name}">${hint}</span>` : ''}${input}${err ? `<span class="err" id="${f.p}e-${name}">${esc(err)}</span>` : ''}</div>`;
}
const aria = (f, name, hint) => { const ids = [hint ? f.p + 'h-' + name : '', f.errors[name] ? f.p + 'e-' + name : ''].filter(Boolean).join(' '); return (ids ? ` aria-describedby="${ids}"` : '') + (f.errors[name] ? ' aria-invalid="true"' : ''); };
const inp = (f, name, type, auto, extra = '', hint = false) => `<input id="${f.p}${name}" name="${name}" type="${type}" value="${esc(f.values[name])}"${auto ? ` autocomplete="${auto}"` : ''}${extra}${aria(f, name, hint)}>`;
const sel = (f, name, opts, blank) => `<select id="${f.p}${name}" name="${name}"${aria(f, name)}>${blank ? `<option value="">${blank}</option>` : ''}${opts.map(o => `<option${f.values[name] === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
const SERVICE_OPTS = ['Interior painting', 'Exterior decorating', 'Landlord refresh', 'Commercial decorating', 'Preparation and repairs', 'Not sure yet'];

function formState(o, type, prefix) {
  const f = o.form && o.form.type === type ? o.form : null;
  return { values: f ? f.values : {}, errors: f ? f.errors : {}, p: prefix };
}
function formTop(f, type, o) {
  return `${f.errors.form ? `<p class="form-err" role="alert">${esc(f.errors.form)}</p>` : Object.keys(f.errors).length ? `<p class="form-err" role="alert">Please check the highlighted boxes.</p>` : ''}
  <input type="hidden" name="type" value="${type}"><input type="hidden" name="t" value="${esc(o.token)}">
  <div class="hp" aria-hidden="true"><label for="${f.p}website">Leave this empty</label><input id="${f.p}website" name="website" tabindex="-1" autocomplete="off"></div>`;
}
function quickForm(c, o) {
  const f = formState(o, 'quick', 'q-');
  return `<form class="form quick" method="post" action="/enquiry" novalidate id="quick-quote">
    <div class="quick-head"><p class="marker">Free quote</p><h2>Get a price for your job</h2><p>Takes 30 seconds. ${esc(c.business.replyPromise || 'We\'ll call you back.')}</p></div>
    ${formTop(f, 'quick', o)}
    ${field(f, 'name', 'Your name', inp(f, 'name', 'text', 'name', ' required'))}
    <div class="row2">${field(f, 'phone', 'Phone', inp(f, 'phone', 'tel', 'tel', ' required'))}${field(f, 'area', 'Postcode', inp(f, 'area', 'text', 'postal-code', ' required'))}</div>
    ${field(f, 'service', 'What needs doing?', sel(f, 'service', SERVICE_OPTS, 'Choose one'))}
    <button class="btn btn-red btn-big" type="submit">Request my free quote</button>
    <p class="form-small">No obligation. <a href="/privacy/">How we use your details</a>.</p>
  </form>`;
}
function quoteForm(c, o) {
  const f = formState(o, 'quote', 'f-');
  return `<form class="form" method="post" action="/enquiry" novalidate>
    ${formTop(f, 'quote', o)}
    <div class="row2">${field(f, 'name', 'Your name', inp(f, 'name', 'text', 'name', ' required'))}${field(f, 'area', 'Area or postcode', inp(f, 'area', 'text', 'postal-code', ' required'))}</div>
    <div class="row2">${field(f, 'phone', 'Phone number', inp(f, 'phone', 'tel', 'tel'))}${field(f, 'email', 'Email address', inp(f, 'email', 'email', 'email'))}</div>
    <p class="form-hint">Give a phone number, an email address, or both.</p>
    <div class="row2">${field(f, 'service', 'Type of work', sel(f, 'service', SERVICE_OPTS, 'Choose one'))}${field(f, 'property', 'Property', sel(f, 'property', ['House', 'Flat or apartment', 'Rental property', 'Office or shop', 'Other'], 'Choose one'))}</div>
    <div class="row2">${field(f, 'rooms', 'Rooms or areas', inp(f, 'rooms', 'text', '', ' placeholder="e.g. lounge, hallway and landing"'))}${field(f, 'timeline', 'When would you like it done?', inp(f, 'timeline', 'text', '', ' placeholder="e.g. next month, flexible"'))}</div>
    <div class="row2">${field(f, 'colours', 'Colours chosen?', sel(f, 'colours', ['Not yet', 'Rough idea', 'Yes, chosen'], 'Choose one'))}${field(f, 'contact', 'Best way to reach you', sel(f, 'contact', ['Phone', 'Email', 'Either'], 'Choose one'))}</div>
    ${field(f, 'details', 'About the job', `<textarea id="f-details" name="details" rows="5"${aria(f, 'details', true)}>${esc(f.values.details)}</textarea>`, 'Room sizes, the state of the walls or woodwork, access, anything we should know.')}
    <button class="btn btn-red btn-big" type="submit">Send my quote request</button>
    <p class="form-small">We only use your details to reply about your job. See our <a href="/privacy/">privacy notice</a>.</p>
  </form>`;
}
function messageForm(c, o) {
  const f = formState(o, 'message', 'm-');
  return `<form class="form form-short" method="post" action="/enquiry" novalidate id="message">
    ${formTop(f, 'message', o)}
    <div class="row2">${field(f, 'name', 'Your name', inp(f, 'name', 'text', 'name', ' required'))}${field(f, 'phone', 'Phone number', inp(f, 'phone', 'tel', 'tel'))}</div>
    ${field(f, 'email', 'Email address', inp(f, 'email', 'email', 'email'))}
    ${field(f, 'details', 'Your message', `<textarea id="m-details" name="details" rows="4"${aria(f, 'details')}>${esc(f.values.details)}</textarea>`)}
    <button class="btn btn-ink" type="submit">Send message</button>
    <p class="form-small">Give a phone number or email so we can reply. <a href="/privacy/">Privacy notice</a>.</p>
  </form>`;
}

/* ---------------- pages ---------------- */
function home(c, o) {
  const B = c.business;
  const pairs = c.gallery.filter(g => g.before);
  const work = c.gallery.filter(g => !g.before).slice(0, 7);
  const featured = c.gallery.find(g => g.featured && !g.before);
  const kindPhoto = k => c.gallery.find(g => g.kind && k.toLowerCase().startsWith(g.kind.toLowerCase()) && !g.before);
  const rv = c.reviews;
  return `
<section class="hero painted">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="marker">Clean work · Honest service · Quality finish</p>
      <h1>${esc(c.home.headline)}</h1>
      ${c.home.intro ? `<p class="lede">${esc(c.home.intro)}</p>` : ''}
      <div class="hero-actions">
        <a class="btn btn-red btn-big" href="#quick-quote">Get a free quote</a>
        ${B.phone ? `<a class="btn btn-white btn-big" href="${telHref(B.phone)}">${I.phone}<span>${esc(prettyPhone(B.phone))}</span></a>` : `<a class="btn btn-white btn-big" href="/services/">Our services</a>`}
      </div>
      ${rv.length ? `<div class="hero-proof">${stars(Math.round(avg(rv)))}<span><strong>${avg(rv).toFixed(1)}</strong> · “${esc(rv[0].text.length > 90 ? rv[0].text.slice(0, 88).trim() + '…' : rv[0].text)}” <em>${esc(rv[0].name)}</em></span></div>` : ''}
    </div>
    <div class="hero-card">${quickForm(c, o)}</div>
  </div>
  <div class="brush-edge" aria-hidden="true"></div>
</section>

<section class="trust" aria-label="Why people choose us"><div class="wrap"><ul class="trust-list">${trustItems(c).map(x => `<li>${x}</li>`).join('')}</ul></div></section>

${featured ? `<section class="band showcase"><div class="wrap showcase-in"><figure class="tilt">${photo(featured)}${featured.caption ? `<figcaption>${esc(featured.caption)}</figcaption>` : ''}</figure><div><p class="marker">Recent job</p><h2>${esc(featured.caption || 'A recent job')}</h2><p>${featured.area ? `Finished in ${esc(featured.area)}. ` : ''}Every job starts with proper preparation, so the finish looks sharp and lasts.</p><a class="link-arrow" href="/our-work/">See more of our work</a></div></div></section>` : ''}

<section class="band services-band">
  <div class="wrap">
    <div class="sec-head center"><p class="marker">What we do</p><h2 class="stroke">Decorating, inside and out</h2></div>
    <div class="svc-zig">
      ${c.services.map((s, i) => { const ph = kindPhoto(s.title); return `<article class="zig ${i % 2 ? 'rev' : ''}">
        <div class="zig-media ${ph ? '' : 'swatch sw' + (i % 4)}">${ph ? photo(ph) : `<span class="zig-word">${esc(s.title.split(' ')[0])}</span>`}</div>
        <div class="zig-copy"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.items.length ? `<ul class="ticks">${s.items.map(x => `<li>${I.check}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}<a class="link-arrow" href="/quote/">Get a quote for ${esc(s.title.toLowerCase())}</a></div>
      </article>`; }).join('')}
    </div>
  </div>
</section>

${pairs.length ? `<section class="band ba-band"><div class="wrap">
  <div class="sec-head"><div><p class="marker">Transformations</p><h2>Before &amp; after</h2></div><p class="sec-note">Drag the slider to see the difference.</p></div>
  <div class="ba-grid ${pairs.length === 1 ? 'one' : ''}">${pairs.slice(0, 4).map(beforeAfter).join('')}</div>
</div></section>` : ''}

${work.length ? `<section class="band work-band"><div class="wrap">
  <div class="sec-head"><div><p class="marker">Our work</p><h2>Recent jobs</h2></div><a class="link-arrow" href="/our-work/">See all photos</a></div>
  <div class="masonry">${work.map(workCard).join('')}</div>
</div></section>` : ''}

<section class="band why painted-soft">
  <div class="wrap why-grid">
    <div class="why-card">
      <p class="marker">Why ${esc(B.name)}</p>
      <h2>A finish you'll be happy to live with</h2>
      ${B.owner ? `<p class="why-owner">${esc(B.owner)}</p>` : ''}
      <ul class="why-list">${c.about.approach.map(a => `<li><span class="why-ic">${I.check}</span><div><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div></li>`).join('')}</ul>
    </div>
    <ol class="timeline" aria-label="How it works">
      <li><span class="tl-n">1</span><div><h3>Tell us about the job</h3><p>Use the quick form, ring${B.whatsapp ? ', or WhatsApp photos of the rooms' : ''}.</p></div></li>
      <li><span class="tl-n">2</span><div><h3>Get your quote</h3><p>${esc(B.replyPromise || 'We\'ll get back to you with a price.')}${B.freeQuotes ? ' Free, with no obligation.' : ''}</p></div></li>
      <li><span class="tl-n">3</span><div><h3>Pick a start date</h3><p>Choose a date that suits you. We prepare properly, work tidily and leave a clean finish.</p></div></li>
    </ol>
  </div>
</section>

${rv.length ? `<section class="band reviews-band"><div class="wrap">
  <div class="sec-head"><div><p class="marker">Reviews</p><h2>What customers say</h2></div>${c.links.google ? `<a class="link-arrow" href="${esc(c.links.google)}" rel="noopener" target="_blank">All our Google reviews</a>` : ''}</div>
  <div class="rv-layout">${reviewCard(rv[0], 'big')}${rv.length > 1 ? `<div class="rv-side">${rv.slice(1, 3).map(r => reviewCard(r)).join('')}</div>` : ''}</div>
</div></section>` : ''}

${faqBlock(c)}

<section class="band areas-band" id="areas"><div class="wrap areas-in">
  <div><p class="marker">Where we work</p><h2>Covering ${esc(B.town)} and nearby</h2><p>If you're just outside these areas, ask anyway.</p></div>
  <ul class="area-list">${c.areas.map(a => `<li>${I.pin}${esc(a)}</li>`).join('')}</ul>
</div></section>

<section class="band contact-band" id="contact"><div class="wrap contact-grid">
  <div><p class="marker">Got a question?</p><h2>Send us a quick message</h2><p class="muted">Not ready for a quote? Ask us anything.</p>${messageForm(c, o)}</div>
  ${contactPanel(c)}
</div></section>`;
}

function pageHead(kicker, title, lede) {
  return `<section class="page-head painted"><div class="wrap"><p class="marker">${kicker}</p><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div><div class="brush-edge" aria-hidden="true"></div></section>`;
}

function services(c) {
  return `${pageHead('Services', `Painting &amp; decorating in ${esc(c.business.town)}`, 'Interior, exterior, landlord and commercial work, carried out with proper preparation and a clean finish.')}
<section class="band"><div class="wrap svc-full">
  ${c.services.map((s, i) => `<article class="svc-row" id="s${i + 1}"><span class="svc-blob sw${i % 4}" aria-hidden="true"></span><div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>${s.items.length ? `<ul class="ticks">${s.items.map(x => `<li>${I.check}<span>${esc(x)}</span></li>`).join('')}</ul>` : '<div></div>'}</article>`).join('')}
</div></section>
<section class="band prep-band"><div class="wrap prep">
  <div><p class="marker">The bit most people skip</p><h2>Preparation comes first</h2><p>A good finish depends on what's underneath. Filling, sanding, making good and priming are part of the job, not extras.</p></div>
  <ul class="prep-list"><li>Filling</li><li>Sanding</li><li>Making good</li><li>Priming</li></ul>
</div></section>
${faqBlock(c)}
${cta(c)}`;
}

function ourWork(c, o) {
  const kinds = [...new Set(c.gallery.map(g => g.kind))];
  const want = (o.query && o.query.get('type')) || '';
  const list = kinds.includes(want) ? c.gallery.filter(g => g.kind === want) : c.gallery;
  const pairs = list.filter(g => g.before), plain = list.filter(g => !g.before);
  return `${pageHead('Our work', 'Recent decorating jobs', `Photos from jobs we've finished around ${esc(c.business.town)}.`)}
<section class="band"><div class="wrap">
  ${kinds.length > 1 ? `<nav class="filters" aria-label="Filter photos"><a href="/our-work/"${!kinds.includes(want) ? ' aria-current="true"' : ''}>All</a>${kinds.map(k => `<a href="/our-work/?type=${encodeURIComponent(k)}"${want === k ? ' aria-current="true"' : ''}>${esc(k)}</a>`).join('')}</nav>` : ''}
  ${pairs.length ? `<h2 class="sub-h">Before &amp; after</h2><div class="ba-grid ${pairs.length === 1 ? 'one' : ''}">${pairs.map(beforeAfter).join('')}</div>` : ''}
  ${plain.length ? `${pairs.length ? '<h2 class="sub-h">More jobs</h2>' : ''}<div class="masonry">${plain.map(workCard).join('')}</div>` : ''}
</div></section>
${cta(c)}`;
}

function about(c) {
  const B = c.business;
  return `${pageHead('About', `About ${esc(B.name)}`, B.owner ? esc(B.owner) : `A ${esc(B.town)} painting and decorating business working for homeowners, landlords and local businesses.`)}
<section class="band about-intro"><div class="wrap about-grid">
  <div class="about-logo"><picture><source srcset="/assets/logo.webp" type="image/webp"><img src="/assets/logo.jpg" alt="${esc(B.name)} logo" width="720" height="480" loading="lazy"></picture></div>
  <div class="prose">${c.about.story ? paras(c.about.story) : `<p>${esc(B.name)} paints and decorates homes, rental properties and business premises across ${esc(B.town)} and the surrounding areas.</p><p>From a single room to a full repaint inside and out, every job gets the same careful preparation, tidy working and clean finish.</p>`}</div>
</div></section>
${c.about.approach.length ? `<section class="band why painted-soft"><div class="wrap"><div class="why-card wide"><p class="marker">How we work</p><h2>What you can expect</h2><ul class="why-list cols">${c.about.approach.map(a => `<li><span class="why-ic">${I.check}</span><div><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div></li>`).join('')}</ul></div></div></section>` : ''}
${c.reviews.length ? `<section class="band reviews-band"><div class="wrap"><div class="sec-head"><div><p class="marker">Reviews</p><h2>What customers say</h2></div>${c.links.google ? `<a class="link-arrow" href="${esc(c.links.google)}" rel="noopener" target="_blank">More on Google</a>` : ''}</div><div class="review-grid">${c.reviews.map(r => reviewCard(r)).join('')}</div></div></section>` : ''}
<section class="band areas-band" id="areas"><div class="wrap areas-in"><div><p class="marker">Where we work</p><h2>Areas we cover</h2><p>Based in ${esc(B.town)}.</p></div><ul class="area-list">${c.areas.map(a => `<li>${I.pin}${esc(a)}</li>`).join('')}</ul></div></section>
${cta(c)}`;
}

function quote(c, o) {
  return `${pageHead('Get a quote', `Request a ${c.business.freeQuotes ? 'free ' : ''}quote`, 'Tell us about the job. The more detail you give, the more accurate the quote.')}
<section class="band"><div class="wrap quote-grid">
  <div class="form-card">${quoteForm(c, o)}</div>
  <div class="quote-side">${contactPanel(c, 'Rather talk?')}${c.reviews.length ? reviewCard(c.reviews[0], 'mini') : ''}</div>
</div></section>`;
}

function thanks(c, o) {
  const B = c.business, isMsg = o.query && o.query.get('t') === 'message';
  return `<section class="page-head painted thanks"><div class="wrap">
  <p class="marker">${isMsg ? 'Message sent' : 'Quote request sent'}</p>
  <h1>Thanks, we've got it.</h1>
  <p class="lede">${esc(B.replyPromise || 'We\'ll be in touch soon.')}</p>
  ${B.phone ? `<p>If it's urgent, call <a href="${telHref(B.phone)}">${esc(prettyPhone(B.phone))}</a>.</p>` : ''}
  ${B.whatsapp ? `<p>You can also <a href="${waHref(B.whatsapp)}" rel="noopener" target="_blank">WhatsApp us photos of the rooms</a> to speed things up.</p>` : ''}
  <p class="row-btns"><a class="btn btn-ink" href="/">Back to the home page</a></p>
</div><div class="brush-edge" aria-hidden="true"></div></section>`;
}

function privacy(c) {
  const B = c.business;
  const who = [B.owner ? esc(B.owner) : '', B.email ? `email <a href="mailto:${esc(B.email)}">${esc(B.email)}</a>` : '', B.phone ? `call ${esc(prettyPhone(B.phone))}` : ''].filter(Boolean);
  return `${pageHead('Privacy', 'Privacy notice', `How ${esc(B.name)} uses the details you send through this website.`)}
<section class="band band-white"><div class="wrap prose">
  <h2>Who we are</h2>
  <p>${esc(B.name)} is a painting and decorating business based in ${esc(B.town)}. We are responsible for the personal information you send us through this website.${who.length ? ' To contact us about your information, ' + who.join(' or ') + '.' : ' To contact us about your information, use the message form on the home page.'}</p>
  <h2>What we collect</h2>
  <p>When you use our quote or message forms we collect what you type in: your name, phone number, email address, area or postcode, and the details of your job or message.</p>
  <h2>Why we use it</h2>
  <p>Only to reply to you, prepare a quote and arrange the work if you go ahead. Our lawful basis is taking steps at your request before entering into a contract, and our legitimate interest in answering enquiries. We do not sell your details, add you to marketing lists or send you marketing.</p>
  <h2>Where it is stored and for how long</h2>
  <p>Your enquiry is stored securely by our website host, Cloudflare, which may process data on servers outside the UK under approved data protection safeguards. Only ${esc(B.name)} can read it, through a password-protected admin area. Enquiries are deleted automatically after ${c.privacy.retentionMonths} months, unless we need to keep details longer for a job we carried out, for example for accounts.</p>
  <h2>Cookies</h2>
  <p>This website does not use advertising or tracking cookies, and it does not use analytics. Fonts are loaded from Google Fonts, which receives your IP address to deliver them.</p>
  <h2>Your rights</h2>
  <p>You can ask to see the information we hold about you, ask us to correct it or ask us to delete it. If you're unhappy with how we've handled your information, you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener" target="_blank">ico.org.uk</a>.</p>
</div></section>`;
}

function notFound() {
  return `${pageHead('Page not found', 'That page isn\'t here', 'It may have moved. Try one of these instead.')}<section class="band"><div class="wrap"><p class="row-btns"><a class="btn btn-ink" href="/">Home</a><a class="btn btn-line" href="/services/">Services</a><a class="btn btn-red" href="/quote/">Get a quote</a></p></div></section>`;
}

function cta(c) {
  const B = c.business;
  return `<section class="band cta-band painted"><div class="wrap cta-in"><div><p class="marker">Ready when you are</p><h2>Need a decorator in ${esc(B.town)}?</h2></div><div class="row-btns"><a class="btn btn-red btn-big" href="/quote/">Get a ${B.freeQuotes ? 'free ' : ''}quote</a>${B.phone ? `<a class="btn btn-white btn-big" href="${telHref(B.phone)}">${I.phone}<span>${esc(prettyPhone(B.phone))}</span></a>` : ''}</div></div></section>`;
}

function schemaFor(c, o) {
  const B = c.business;
  const s = { '@context': 'https://schema.org', '@type': 'HousePainter', name: B.name, url: o.origin + '/', image: o.origin + '/assets/logo.jpg', logo: o.origin + '/assets/logo.jpg',
    areaServed: c.areas.map(a => ({ '@type': 'Place', name: a })), address: { '@type': 'PostalAddress', addressLocality: B.town, addressCountry: 'GB' } };
  if (B.phone) s.telephone = '+44' + B.phone.slice(1);
  if (B.email) s.email = B.email;
  const same = Object.values(c.links).filter(Boolean);
  if (same.length) s.sameAs = same;
  const out = [s];
  if (c.faqs.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return out;
}

export function renderPage(path, c, o = {}) {
  const B = c.business, T = t => `${t} | ${B.name}`;
  const map = {
    '/': () => ({ title: c.seo.title, description: c.seo.description, body: home(c, o), schema: schemaFor(c, o) }),
    '/services/': () => ({ title: T(`Painting and Decorating Services in ${B.town}`), description: `Interior painting, exterior decorating, landlord refreshes and commercial decorating in ${B.town} and nearby. ${B.freeQuotes ? 'Free quotes.' : ''}`.trim(), body: services(c) }),
    '/our-work/': () => ({ title: T(`Our Work: Decorating Jobs in ${B.town}`), description: `Photos of recent painting and decorating jobs by ${B.name} around ${B.town}.`, body: ourWork(c, o) }),
    '/about/': () => ({ title: T('About Us'), description: `About ${B.name}, painters and decorators in ${B.town}. Areas covered: ${c.areas.join(', ')}.`, body: about(c) }),
    '/quote/': () => ({ title: T(`Get a ${B.freeQuotes ? 'Free ' : ''}Decorating Quote`), description: `Request a painting and decorating quote from ${B.name} in ${B.town}.`, body: quote(c, o) }),
    '/privacy/': () => ({ title: T('Privacy Notice'), description: `How ${B.name} uses the details you send through this website.`, body: privacy(c) }),
    '/thanks/': () => ({ title: T('Thank You'), description: 'Thanks for getting in touch.', body: thanks(c, o), noindex: true }),
    '404': () => ({ title: T('Page Not Found'), description: 'Page not found.', body: notFound(), noindex: true })
  };
  const pg = (map[path] || map['404'])();
  return shell(c, o, { path, ...pg });
}

export function renderSitemap(c, origin) {
  if (c.seo.hide) return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
  const pages = ['/', '/services/', ...(c.gallery.length ? ['/our-work/'] : []), '/about/', '/quote/', '/privacy/'];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
}
export function renderRobots(c, origin) {
  return c.seo.hide ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /thanks/\n\nSitemap: ${origin}/sitemap.xml\n`;
}
