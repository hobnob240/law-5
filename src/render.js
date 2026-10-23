// Server-rendered pages for Law and Son Decorators. Every value from the admin is escaped here.
import { prettyPhone, telHref, waHref } from './content.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = d => d ? MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';

const I = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8s-.39-.12-.55.12-.63.8-.78.96-.29.19-.53.06a6.7 6.7 0 0 1-3.3-2.9c-.25-.43.25-.4.71-1.33a.45.45 0 0 0 0-.42c-.06-.12-.55-1.33-.76-1.82s-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2 4.7 4.7 0 0 0 1 2.5 10.8 10.8 0 0 0 4.1 3.65c1.53.66 2.13.71 2.9.6a2.47 2.47 0 0 0 1.62-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.47-.28z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.4V17h16V7.4l-8 5.3zM5.2 7 12 11.5 18.8 7z"/></svg>',
  star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 1.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/></svg>',
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.8 13.6 4.2 10l-1.4 1.4 5 5 9.4-9.4-1.4-1.4z"/></svg>',
  ext: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6h-2V6.4l-6.3 6.3-1.4-1.4L13.6 5H11zM4 5h5v2H5v8h8v-4h2v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>'
};

function avg(reviews) { return reviews.length ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0; }
const stars = n => `<span class="stars" aria-label="${n} out of 5 stars">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${I.star}</span>`).join('')}</span>`;

/* ---------------- shell ---------------- */
function shell(c, o, { path, title, description, body, noindex, schema }) {
  const B = c.business, url = o.origin + (path === '404' ? '/' : path);
  const hasWork = c.gallery.length > 0;
  const nav = [['/', 'Home'], ['/services/', 'Services'], ...(hasWork ? [['/our-work/', 'Our work']] : []), ['/about/', 'About'], ['/quote/', 'Get a quote']];
  const robots = c.seo.hide || noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const phone = B.phone ? `<a class="btn btn-call" href="${telHref(B.phone)}">${I.phone}<span>${esc(prettyPhone(B.phone))}</span></a>` : '';
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
<meta name="theme-color" content="#14213d">
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
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..900&family=Source+Sans+3:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/assets/site.css?v=1">
<script src="/assets/site.js?v=1" defer></script>
${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body class="${bar.length ? 'has-bar' : ''}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-in">
    <a class="brand" href="/" aria-label="${esc(B.name)}, home">${brandMark(B.name)}<span class="brand-sub">Decorators · ${esc(B.town)}</span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    <nav id="nav" class="nav" aria-label="Main">
      ${nav.map(([h, l]) => `<a href="${h}"${h === path ? ' aria-current="page"' : ''}${h === '/quote/' ? ' class="nav-quote"' : ''}>${l}</a>`).join('')}
    </nav>
    <div class="head-cta">${phone}<a class="btn btn-red" href="/quote/">Free quote</a></div>
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

// "Law and Son Decorators" -> LAW & SON wordmark; any other name is shown as written
function brandMark(name) {
  const m = /^(.*?)\s+and\s+(sons?)\b/i.exec(name);
  return m ? `<span class="brand-word">${esc(m[1])}<span class="amp">&amp;</span>${esc(m[2])}</span>` : `<span class="brand-word">${esc(name)}</span>`;
}

function footer(c) {
  const B = c.business, L = c.links;
  const socials = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['google', 'Google reviews'], ['checkatrade', 'Checkatrade'], ['mybuilder', 'MyBuilder']].filter(([k]) => L[k]);
  return `<footer class="site-foot">
  <div class="wrap foot-grid">
    <div>
      <div class="foot-name">${esc(B.name)}</div>
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
function trustChips(c) {
  const B = c.business, chips = [];
  if (c.reviews.length) chips.push(`${stars(Math.round(avg(c.reviews)))}<span>${avg(c.reviews).toFixed(1)} from ${c.reviews.length} review${c.reviews.length === 1 ? '' : 's'}</span>`);
  if (B.freeQuotes) chips.push(`${I.check}<span>Free, no-obligation quotes</span>`);
  if (B.insured) chips.push(`${I.check}<span>${esc(B.insuranceNote || 'Fully insured')}</span>`);
  if (B.yearsTrading) chips.push(`${I.check}<span>${esc(B.yearsTrading)} years decorating</span>`);
  return chips.length ? `<ul class="chips">${chips.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
}

function colourCard(c) {
  return `<figure class="colour-card" aria-label="Services">
    <div class="cc-top"><span>${esc(c.business.name)}</span><span>Services</span></div>
    ${c.services.slice(0, 4).map((s, i) => `<div class="cc-chip sw${i % 8}"><span class="cc-name">${esc(s.title)}</span><span class="cc-note">${esc(s.items[0] || s.text)}</span></div>`).join('')}
    <figcaption>${esc(c.areas.slice(0, 3).join(' · '))}${c.areas.length > 3 ? ' · and nearby' : ''}</figcaption>
  </figure>`;
}

function photo(g, sizes = '') {
  const ratio = g.w && g.h ? ` width="${g.w}" height="${g.h}"` : '';
  return `<img src="${esc(g.src)}" alt="${esc(g.caption || g.kind + ' decorating job' + (g.area ? ' in ' + g.area : ''))}"${ratio} loading="lazy" decoding="async"${sizes}>`;
}
function workCard(g) {
  return `<figure class="work">${photo(g)}<figcaption><strong>${esc(g.caption || g.kind + ' decorating')}</strong>${g.area ? `<span>${esc(g.area)}</span>` : ''}</figcaption></figure>`;
}
function reviewCard(r) {
  return `<blockquote class="review">${stars(r.rating)}<p>${esc(r.text)}</p><footer><strong>${esc(r.name)}</strong>${r.area ? `, ${esc(r.area)}` : ''}<span class="rv-src">${esc(r.source)}${r.date ? ' · ' + monthYear(r.date) : ''}</span></footer></blockquote>`;
}

function contactPanel(c, heading = 'Talk to us') {
  const B = c.business;
  const rows = [
    B.phone ? `<a class="cp-row" href="${telHref(B.phone)}">${I.phone}<span><small>Call</small>${esc(prettyPhone(B.phone))}</span></a>` : '',
    B.whatsapp ? `<a class="cp-row" href="${waHref(B.whatsapp)}" rel="noopener" target="_blank">${I.wa}<span><small>WhatsApp</small>${esc(prettyPhone(B.whatsapp))}</span></a>` : '',
    B.email ? `<a class="cp-row" href="mailto:${esc(B.email)}">${I.mail}<span><small>Email</small>${esc(B.email)}</span></a>` : ''
  ].filter(Boolean);
  return `<aside class="contact-panel">
    <h2>${esc(heading)}</h2>
    ${rows.join('') || '<p>Use the form and we\'ll get back to you.</p>'}
    ${B.replyPromise ? `<p class="cp-note">${esc(B.replyPromise)}</p>` : ''}
    ${B.hours ? `<p class="cp-note">${esc(B.hours)}</p>` : ''}
  </aside>`;
}

/* ---------------- forms ---------------- */
function field(f, name, label, input, hint = '') {
  const err = f.errors[name];
  return `<div class="field${err ? ' has-err' : ''}"><label for="f-${name}">${label}</label>${hint ? `<span class="hint" id="h-${name}">${hint}</span>` : ''}${input}${err ? `<span class="err" id="e-${name}">${esc(err)}</span>` : ''}</div>`;
}
const aria = (f, name, hint) => { const ids = [hint ? 'h-' + name : '', f.errors[name] ? 'e-' + name : ''].filter(Boolean).join(' '); return (ids ? ` aria-describedby="${ids}"` : '') + (f.errors[name] ? ' aria-invalid="true"' : ''); };
const inp = (f, name, type, auto, extra = '', hint = false) => `<input id="f-${name}" name="${name}" type="${type}" value="${esc(f.values[name])}"${auto ? ` autocomplete="${auto}"` : ''}${extra}${aria(f, name, hint)}>`;
const sel = (f, name, opts, blank) => `<select id="f-${name}" name="${name}"${aria(f, name)}>${blank ? `<option value="">${blank}</option>` : ''}${opts.map(o => `<option${f.values[name] === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;

function formState(o, type) {
  const f = o.form && o.form.type === type ? o.form : null;
  return { values: f ? f.values : {}, errors: f ? f.errors : {} };
}
function formTop(f, type, o) {
  return `${f.errors.form ? `<p class="form-err" role="alert">${esc(f.errors.form)}</p>` : Object.keys(f.errors).length ? `<p class="form-err" role="alert">Please check the highlighted boxes.</p>` : ''}
  <input type="hidden" name="type" value="${type}"><input type="hidden" name="t" value="${esc(o.token)}">
  <div class="hp" aria-hidden="true"><label for="f-website-${type}">Leave this empty</label><input id="f-website-${type}" name="website" tabindex="-1" autocomplete="off"></div>`;
}
function quoteForm(c, o) {
  const f = formState(o, 'quote');
  return `<form class="form" method="post" action="/enquiry" novalidate>
    ${formTop(f, 'quote', o)}
    <div class="row2">${field(f, 'name', 'Your name', inp(f, 'name', 'text', 'name', ' required'))}${field(f, 'area', 'Area or postcode', inp(f, 'area', 'text', 'postal-code', ' required'))}</div>
    <div class="row2">${field(f, 'phone', 'Phone number', inp(f, 'phone', 'tel', 'tel'))}${field(f, 'email', 'Email address', inp(f, 'email', 'email', 'email'))}</div>
    <p class="form-hint">Give a phone number, an email address, or both.</p>
    <div class="row2">${field(f, 'service', 'Type of work', sel(f, 'service', ['Interior painting', 'Exterior decorating', 'Landlord refresh', 'Commercial decorating', 'Preparation and repairs', 'Not sure yet'], 'Choose one'))}${field(f, 'property', 'Property', sel(f, 'property', ['House', 'Flat or apartment', 'Rental property', 'Office or shop', 'Other'], 'Choose one'))}</div>
    <div class="row2">${field(f, 'rooms', 'Rooms or areas', inp(f, 'rooms', 'text', '', ' placeholder="e.g. lounge, hallway and landing"'))}${field(f, 'timeline', 'When would you like it done?', inp(f, 'timeline', 'text', '', ' placeholder="e.g. next month, flexible"'))}</div>
    <div class="row2">${field(f, 'colours', 'Colours chosen?', sel(f, 'colours', ['Not yet', 'Rough idea', 'Yes, chosen'], 'Choose one'))}${field(f, 'contact', 'Best way to reach you', sel(f, 'contact', ['Phone', 'Email', 'Either'], 'Choose one'))}</div>
    ${field(f, 'details', 'About the job', `<textarea id="f-details" name="details" rows="5"${aria(f, 'details', true)}>${esc(f.values.details)}</textarea>`, 'Room sizes, the state of the walls or woodwork, access, anything we should know.')}
    <button class="btn btn-red btn-big" type="submit">Send my quote request</button>
    <p class="form-small">We only use your details to reply about your job. See our <a href="/privacy/">privacy notice</a>.</p>
  </form>`;
}
function messageForm(c, o) {
  const f = formState(o, 'message');
  return `<form class="form form-short" method="post" action="/enquiry" novalidate id="message">
    ${formTop(f, 'message', o)}
    <div class="row2">${field(f, 'name', 'Your name', inp(f, 'name', 'text', 'name', ' required'))}${field(f, 'phone', 'Phone number', inp(f, 'phone', 'tel', 'tel'))}</div>
    ${field(f, 'email', 'Email address', inp(f, 'email', 'email', 'email'))}
    ${field(f, 'details', 'Your message', `<textarea id="f-details" name="details" rows="4"${aria(f, 'details')}>${esc(f.values.details)}</textarea>`)}
    <button class="btn btn-ink" type="submit">Send message</button>
    <p class="form-small">Give a phone number or email so we can reply. <a href="/privacy/">Privacy notice</a>.</p>
  </form>`;
}

/* ---------------- pages ---------------- */
function home(c, o) {
  const B = c.business, featured = c.gallery.find(g => g.featured) || c.gallery[0];
  const work = c.gallery.slice(0, 6);
  return `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">Painter and decorator · ${esc(B.town)}</p>
      <h1>${esc(c.home.headline)}</h1>
      ${c.home.intro ? `<p class="lede">${esc(c.home.intro)}</p>` : ''}
      <div class="hero-actions">
        <a class="btn btn-red btn-big" href="/quote/">Get a free quote</a>
        ${B.phone ? `<a class="btn btn-line btn-big" href="${telHref(B.phone)}">${I.phone}<span>Call ${esc(prettyPhone(B.phone))}</span></a>` : ''}
      </div>
      ${trustChips(c)}
    </div>
    <div class="hero-side">${featured ? `<figure class="hero-photo">${photo(featured, ' fetchpriority="high"').replace(' loading="lazy"', '')}${featured.caption ? `<figcaption>${esc(featured.caption)}${featured.area ? ' · ' + esc(featured.area) : ''}</figcaption>` : ''}</figure>` : colourCard(c)}</div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <div class="sec-head"><h2>What we do</h2><a class="more" href="/services/">All services</a></div>
    <div class="svc-grid">
      ${c.services.map((s, i) => `<article class="svc"><span class="chip-sw sw${i % 8}"></span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.items.length ? `<ul>${s.items.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</article>`).join('')}
    </div>
  </div>
</section>

${work.length ? `<section class="band band-white">
  <div class="wrap">
    <div class="sec-head"><h2>Recent work</h2>${c.gallery.length > 6 ? `<a class="more" href="/our-work/">See all ${c.gallery.length} photos</a>` : `<a class="more" href="/our-work/">Our work</a>`}</div>
    <div class="work-grid">${work.map(workCard).join('')}</div>
  </div>
</section>` : ''}

${c.reviews.length ? `<section class="band">
  <div class="wrap">
    <div class="sec-head"><h2>What customers say</h2>${c.links.google ? `<a class="more" href="${esc(c.links.google)}" rel="noopener" target="_blank">Read our Google reviews ${I.ext}</a>` : ''}</div>
    <div class="review-grid">${c.reviews.slice(0, 3).map(reviewCard).join('')}</div>
  </div>
</section>` : ''}

<section class="band ${work.length || c.reviews.length ? 'band-white' : ''}">
  <div class="wrap">
    <div class="sec-head"><h2>How it works</h2></div>
    <ol class="steps">
      <li><h3>Tell us about the job</h3><p>Ring, message or use the <a href="/quote/">quote form</a>. Rooms, surfaces and timings all help.</p></li>
      <li><h3>Get your quote</h3><p>${esc(B.replyPromise || 'We\'ll get back to you with a price.')} ${B.freeQuotes ? 'Quotes are free with no obligation.' : ''}</p></li>
      <li><h3>Book a date</h3><p>Pick a start date that suits you. We prepare properly, work tidily and leave a clean finish.</p></li>
    </ol>
  </div>
</section>

<section class="band band-ink" id="areas">
  <div class="wrap areas-in">
    <div><h2>Areas we cover</h2><p>Based in ${esc(B.town)}. If you're just outside these areas, ask anyway.</p></div>
    <ul class="area-list">${c.areas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
  </div>
</section>

<section class="band" id="contact">
  <div class="wrap contact-grid">
    <div><h2>Send us a quick message</h2><p class="muted">Not ready for a quote? Ask a question and we'll get back to you.</p>${messageForm(c, o)}</div>
    ${contactPanel(c)}
  </div>
</section>`;
}

function services(c) {
  return `
<section class="page-head"><div class="wrap"><p class="kicker">Services</p><h1>Painting and decorating services in ${esc(c.business.town)}</h1><p class="lede">Interior, exterior, landlord and commercial work, carried out with proper preparation and a clean finish.</p></div></section>
<section class="band"><div class="wrap svc-full">
  ${c.services.map((s, i) => `<article class="svc-row" id="s${i + 1}"><span class="chip-sw big sw${i % 8}"></span><div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>${s.items.length ? `<ul class="ticks">${s.items.map(x => `<li>${I.check}<span>${esc(x)}</span></li>`).join('')}</ul>` : '<div></div>'}</article>`).join('')}
</div></section>
<section class="band band-white"><div class="wrap prep">
  <div><h2>Preparation comes first</h2><p>A good finish depends on what's underneath. Filling, sanding, making good and priming are part of the job, not extras.</p></div>
  <ul class="prep-list"><li>Filling</li><li>Sanding</li><li>Making good</li><li>Priming</li></ul>
</div></section>
${cta(c)}`;
}

function ourWork(c, o) {
  const kinds = [...new Set(c.gallery.map(g => g.kind))];
  const want = (o.query && o.query.get('type')) || '';
  const list = kinds.includes(want) ? c.gallery.filter(g => g.kind === want) : c.gallery;
  return `
<section class="page-head"><div class="wrap"><p class="kicker">Our work</p><h1>Recent decorating jobs</h1><p class="lede">Photos from jobs we've finished around ${esc(c.business.town)}.</p></div></section>
<section class="band"><div class="wrap">
  ${kinds.length > 1 ? `<nav class="filters" aria-label="Filter photos"><a href="/our-work/"${!kinds.includes(want) ? ' aria-current="true"' : ''}>All</a>${kinds.map(k => `<a href="/our-work/?type=${encodeURIComponent(k)}"${want === k ? ' aria-current="true"' : ''}>${esc(k)}</a>`).join('')}</nav>` : ''}
  <div class="work-grid">${list.map(workCard).join('')}</div>
</div></section>
${cta(c)}`;
}

function about(c) {
  const B = c.business;
  return `
<section class="page-head"><div class="wrap"><p class="kicker">About</p><h1>About ${esc(B.name)}</h1>${B.owner ? `<p class="lede">${esc(B.owner)}</p>` : `<p class="lede">A ${esc(B.town)} painting and decorating business working for homeowners, landlords and local businesses.</p>`}</div></section>
${c.about.story ? `<section class="band band-white"><div class="wrap prose">${paras(c.about.story)}</div></section>` : ''}
${c.about.approach.length ? `<section class="band"><div class="wrap"><div class="sec-head"><h2>How we work</h2></div><div class="approach">${c.about.approach.map(a => `<div><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div>`).join('')}</div></div></section>` : ''}
${c.reviews.length ? `<section class="band band-white"><div class="wrap"><div class="sec-head"><h2>Reviews</h2>${c.links.google ? `<a class="more" href="${esc(c.links.google)}" rel="noopener" target="_blank">More on Google ${I.ext}</a>` : ''}</div><div class="review-grid">${c.reviews.map(reviewCard).join('')}</div></div></section>` : ''}
<section class="band band-ink" id="areas"><div class="wrap areas-in"><div><h2>Areas we cover</h2><p>Based in ${esc(B.town)}.</p></div><ul class="area-list">${c.areas.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></section>
${cta(c)}`;
}

function quote(c, o) {
  return `
<section class="page-head"><div class="wrap"><p class="kicker">Get a quote</p><h1>Request a ${c.business.freeQuotes ? 'free ' : ''}quote</h1><p class="lede">Tell us about the job. The more detail you give, the more accurate the quote.</p></div></section>
<section class="band"><div class="wrap quote-grid">
  <div class="form-card">${quoteForm(c, o)}</div>
  ${contactPanel(c, 'Rather talk?')}
</div></section>`;
}

function thanks(c, o) {
  const B = c.business, isMsg = o.query && o.query.get('t') === 'message';
  return `
<section class="page-head thanks"><div class="wrap">
  <p class="kicker">${isMsg ? 'Message sent' : 'Quote request sent'}</p>
  <h1>Thanks, we've got it.</h1>
  <p class="lede">${esc(B.replyPromise || 'We\'ll be in touch soon.')}</p>
  ${B.phone ? `<p>If it's urgent, call <a href="${telHref(B.phone)}">${esc(prettyPhone(B.phone))}</a>.</p>` : ''}
  <p><a class="btn btn-ink" href="/">Back to the home page</a></p>
</div></section>`;
}

function privacy(c) {
  const B = c.business;
  const who = [B.owner ? esc(B.owner) : '', B.email ? `email <a href="mailto:${esc(B.email)}">${esc(B.email)}</a>` : '', B.phone ? `call ${esc(prettyPhone(B.phone))}` : ''].filter(Boolean);
  return `
<section class="page-head"><div class="wrap"><p class="kicker">Privacy</p><h1>Privacy notice</h1><p class="lede">How ${esc(B.name)} uses the details you send through this website.</p></div></section>
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

function notFound(c) {
  return `<section class="page-head"><div class="wrap"><p class="kicker">Page not found</p><h1>That page isn't here</h1><p class="lede">It may have moved. Try one of these instead.</p><p class="row-btns"><a class="btn btn-ink" href="/">Home</a><a class="btn btn-line" href="/services/">Services</a><a class="btn btn-red" href="/quote/">Get a quote</a></p></div></section>`;
}

function cta(c) {
  const B = c.business;
  return `<section class="band band-red"><div class="wrap cta-in"><h2>Need a decorator in ${esc(B.town)}?</h2><div class="row-btns"><a class="btn btn-white btn-big" href="/quote/">Get a ${B.freeQuotes ? 'free ' : ''}quote</a>${B.phone ? `<a class="btn btn-ghost btn-big" href="${telHref(B.phone)}">${I.phone}<span>${esc(prettyPhone(B.phone))}</span></a>` : ''}</div></div></section>`;
}

function schemaFor(c, o) {
  const B = c.business;
  const s = { '@context': 'https://schema.org', '@type': 'HousePainter', name: B.name, url: o.origin + '/', image: o.origin + '/assets/og.png',
    areaServed: c.areas.map(a => ({ '@type': 'Place', name: a })), address: { '@type': 'PostalAddress', addressLocality: B.town, addressCountry: 'GB' } };
  if (B.phone) s.telephone = '+44' + B.phone.slice(1);
  if (B.email) s.email = B.email;
  const same = Object.values(c.links).filter(Boolean);
  if (same.length) s.sameAs = same;
  return s;
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
    '404': () => ({ title: T('Page Not Found'), description: 'Page not found.', body: notFound(c), noindex: true })
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
