// Book a Medium Night admin console. Everything people typed is shown with textContent, never as HTML.
// No passwords, keys or tokens are ever sent to this page: the server only says whether Stripe is connected.
const $ = id => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') value = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [kids].flat(Infinity)) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  if (value !== undefined) el.value = value;
  return el;
}
const money = p => '£' + ((p || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: (p || 0) % 100 ? 2 : 0, maximumFractionDigits: 2 });
const day = iso => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
const when = iso => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const pretty = n => !n ? '' : /^07/.test(n) ? n.slice(0, 5) + ' ' + n.slice(5) : /^0(1\d1|2)/.test(n) ? n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6) : n.slice(0, 5) + ' ' + n.slice(5);
const NIGHT = { split: '50/50 split or £150 minimum', bar: 'Medium keeps ticket sales', fee: 'Set fee' };
const METHODS = { card: 'Card (Stripe)', bank: 'Bank transfer', cash: 'Cash', free: 'Free / complimentary' };
const TABS = [['overview', 'Overview'], ['venues', 'Venues'], ['mediums', 'Mediums'], ['payments', 'Payments'], ['settings', 'Settings'], ['account', 'Logins & activity']];
let tab = 'overview', today = '';

async function api(method, path, body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch('/admin/api/' + path, opt); } catch { throw new Error('No connection. Check your signal and try again.'); }
  if (r.status === 401) { location.href = '/admin/login/'; throw new Error('Please log in again.'); }
  let d = {}; try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
}
function toast(msg, bad) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, bad ? 6000 : 3000); }
async function act(btn, fn, okMsg) {
  if (btn) btn.disabled = true;
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, true); return null; } finally { if (btn) btn.disabled = false; }
}
function field(label, input, hint) { return h('div', { class: 'field' }, h('label', {}, label, input), hint ? h('span', { class: 'hint' }, hint) : null); }
function confirmBtn(label, question, run, cls = 'btn btn-danger') {
  const b = h('button', { class: cls, type: 'button', onclick: () => {
    if (b.dataset.armed) { run(b); return; }
    b.dataset.armed = '1'; b.textContent = question; b.classList.add('armed');
    setTimeout(() => { delete b.dataset.armed; b.textContent = label; b.classList.remove('armed'); }, 4000);
  } }, label);
  return b;
}
const pill = (text, kind) => h('span', { class: 'pill ' + kind }, text);
const statusPill = s => s === 'live' ? pill('Live', 'ok') : s === 'pending' ? pill('Needs approval', 'warn') : pill('Hidden', 'off');
const memberPill = m => m.until && m.until >= today ? pill('Active to ' + day(m.until), 'ok') : m.until ? pill('Ended ' + day(m.until), 'off') : pill('Not paid', 'warn');

function tabs() {
  $('tabs').replaceChildren(...TABS.map(([k, l]) => h('button', { type: 'button', class: 'tab', 'aria-current': tab === k ? 'page' : null, onclick: () => go(k) }, l)));
}
function go(k) { tab = k; try { history.replaceState(null, '', '#' + k); } catch {} tabs(); render(); }
function view(...kids) { const v = $('view'); v.replaceChildren(...[kids].flat(Infinity).filter(Boolean)); v.focus({ preventScroll: true }); }

async function render() {
  view(h('p', { class: 'muted' }, 'Loading…'));
  try { await ({ overview, venues, mediums, payments, settings, account })[tab](); }
  catch (e) { view(h('div', { class: 'card' }, h('p', {}, e.message), h('button', { class: 'btn', type: 'button', onclick: render }, 'Try again'))); }
}

/* ---------------- overview ---------------- */
async function overview() {
  const d = await api('GET', 'overview');
  const stat = (n, l, sub) => h('div', { class: 'stat' }, h('strong', {}, String(n)), h('span', {}, l), sub ? h('small', {}, sub) : null);
  view(
    h('h1', {}, 'Overview'),
    !d.stripe ? h('div', { class: 'card alert' }, h('strong', {}, 'Card payments aren\'t connected yet. '), 'Mediums can still sign up, and you can activate them by hand under Mediums after they pay you. See Settings to connect Stripe.') : null,
    h('div', { class: 'stats' },
      stat(d.venues.pending, 'Venues to approve'), stat(d.venues.upcoming, 'Live venues with dates', `${d.venues.total} venue${d.venues.total === 1 ? '' : 's'} in total`),
      stat(d.mediums.active, 'Active members', `${d.mediums.unpaid} signed up, not paid`), stat(money(d.revenue.last12), 'Paid in last 12 months', `${money(d.revenue.thisYear)} this calendar year`)),
    d.mediums.expiring ? h('p', { class: 'muted' }, `${d.mediums.expiring} membership${d.mediums.expiring === 1 ? ' ends' : 's end'} within the next month.`) : null,
    h('div', { class: 'grid2' },
      h('section', { class: 'card' }, h('h2', {}, 'Waiting for approval'),
        d.pendingVenues.length ? h('ul', { class: 'list' }, d.pendingVenues.map(v => h('li', {}, h('button', { type: 'button', class: 'linkish', onclick: () => { tab = 'venues'; tabs(); openVenue(v.id); } }, v.name), h('span', { class: 'muted' }, ` ${v.postcode} · added ${day(v.createdAt)}`))))
          : h('p', { class: 'muted' }, 'Nothing waiting.')),
      h('section', { class: 'card' }, h('h2', {}, 'Recent payments'),
        d.recentPayments.length ? h('ul', { class: 'list' }, d.recentPayments.map(p => h('li', {}, h('strong', {}, money(p.amountPence)), ` ${p.name || ''} `, h('span', { class: 'muted' }, `· ${METHODS[p.method] || p.method} · ${day(p.at)}`))))
          : h('p', { class: 'muted' }, 'No payments yet.')))
  );
}

/* ---------------- venues ---------------- */
let vFilter = 'all', vSearch = '';
async function venues() {
  const d = await api('GET', 'venues'); today = d.today;
  const list = () => d.venues.filter(v => (vFilter === 'all' || v.status === vFilter) && (!vSearch || (v.name + ' ' + v.postcode + ' ' + v.town).toLowerCase().includes(vSearch.toLowerCase())));
  const body = h('div', { class: 'rows' });
  const draw = () => {
    const l = list();
    body.replaceChildren(...(l.length ? l.map(v => {
      const up = (v.dates || []).filter(x => x >= today);
      return h('button', { type: 'button', class: 'row', onclick: () => openVenue(v.id) },
        h('span', { class: 'row-main' }, h('strong', {}, v.name), h('span', { class: 'muted' }, [v.town, v.postcode].filter(Boolean).join(' · '))),
        h('span', { class: 'row-meta' }, up.length ? `Next: ${day(up[0])}${up.length > 1 ? ` +${up.length - 1}` : ''}` : 'No upcoming dates'),
        statusPill(v.status));
    }) : [h('p', { class: 'muted pad' }, 'No venues match.')]));
  };
  const counts = s => d.venues.filter(v => s === 'all' || v.status === s).length;
  view(h('h1', {}, 'Venues'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg' }, [['all', 'All'], ['pending', 'Needs approval'], ['live', 'Live'], ['hidden', 'Hidden']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(vFilter === k), onclick: e => { vFilter = k; e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target))); draw(); } }, `${l} (${counts(k)})`))),
      h('input', { type: 'search', placeholder: 'Search name or postcode', 'aria-label': 'Search venues', value: vSearch, oninput: e => { vSearch = e.target.value; draw(); } })),
    body);
  draw();
}
async function openVenue(id) {
  view(h('p', { class: 'muted' }, 'Loading…'));
  const { venue: v } = await api('GET', 'venues/' + id);
  const f = { ...v, dates: [...(v.dates || [])] };
  const inp = (k, type = 'text') => h('input', { type, value: f[k] || '', oninput: e => { f[k] = e.target.value; } });
  const dateBox = h('div', { class: 'dates' });
  const drawDates = () => dateBox.replaceChildren(...f.dates.map((d, i) => h('span', { class: 'chip' }, day(d), h('button', { type: 'button', 'aria-label': 'Remove ' + day(d), onclick: () => { f.dates.splice(i, 1); drawDates(); } }, '×'))),
    h('input', { type: 'date', 'aria-label': 'Add a date', min: today, onchange: e => { if (e.target.value && !f.dates.includes(e.target.value)) { f.dates.push(e.target.value); f.dates.sort(); drawDates(); } } }));
  drawDates();
  const setStatus = (s, msg) => async b => { if (await act(b, () => api('PUT', 'venues/' + v.id, { status: s }), msg)) openVenue(v.id); };
  view(
    h('p', {}, h('button', { type: 'button', class: 'linkish', onclick: () => go('venues') }, '← All venues')),
    h('div', { class: 'head-row' }, h('h1', {}, v.name), statusPill(v.status)),
    h('div', { class: 'actions' },
      v.status !== 'live' ? h('button', { type: 'button', class: 'btn btn-ok', onclick: e => setStatus('live', 'Venue is live')(e.target) }, v.status === 'pending' ? 'Approve and show to mediums' : 'Show to mediums') : null,
      v.status === 'live' ? h('button', { type: 'button', class: 'btn', onclick: e => setStatus('hidden', 'Venue hidden')(e.target) }, 'Hide from mediums') : null,
      confirmBtn('Delete venue', 'Tap again to delete', async b => { if (await act(b, () => api('DELETE', 'venues/' + v.id), 'Venue deleted')) go('venues'); })),
    h('div', { class: 'grid2' },
      h('section', { class: 'card' }, h('h2', {}, 'Details'),
        field('Venue name', inp('name')), field('Address', h('textarea', { rows: 2, value: f.address || '', oninput: e => { f.address = e.target.value; } })),
        h('div', { class: 'two' }, field('Postcode', inp('postcode')), field('Phone', inp('phone', 'tel'))),
        field('Email (optional)', inp('email', 'email')),
        field('Contact method', h('select', { value: f.contact, onchange: e => { f.contact = e.target.value; } }, ['Call', 'Text', 'Email'].map(c => h('option', { value: c }, c)))),
        field('Notes for mediums', h('textarea', { rows: 3, value: f.notes || '', oninput: e => { f.notes = e.target.value; } })),
        field('Type of night', h('select', { value: f.nightType, onchange: e => { f.nightType = e.target.value; } }, Object.entries(NIGHT).map(([k, l]) => h('option', { value: k }, l)))),
        field('Fee offered (set fee only)', inp('fee')),
        field('Dates', dateBox),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: async e => { if (await act(e.target, () => api('PUT', 'venues/' + v.id, f), 'Saved')) openVenue(v.id); } }, 'Save changes')),
      h('section', { class: 'card' }, h('h2', {}, 'Record'),
        h('dl', { class: 'dl' },
          h('dt', {}, 'Phone'), h('dd', {}, h('a', { href: 'tel:+44' + String(v.phone).slice(1) }, pretty(v.phone))),
          v.email ? [h('dt', {}, 'Email'), h('dd', {}, h('a', { href: 'mailto:' + v.email }, v.email))] : null,
          h('dt', {}, 'Area'), h('dd', {}, v.town || 'Unknown (postcode not found)'),
          h('dt', {}, 'Registered'), h('dd', {}, when(v.createdAt)),
          h('dt', {}, 'Consent given'), h('dd', {}, when(v.consentAt) + ` (terms ${v.termsVersion || ''})`),
          h('dt', {}, 'Last changed'), h('dd', {}, when(v.updatedAt))),
        h('p', { class: 'muted' }, 'The venue has its own private link to change or delete this listing. It is deleted automatically 3 months after its last date.')))
  );
}

/* ---------------- mediums ---------------- */
let mFilter = 'all', mSearch = '';
async function mediums() {
  const d = await api('GET', 'mediums'); today = d.today;
  const st = m => m.until && m.until >= today ? 'active' : m.until ? 'ended' : 'unpaid';
  const body = h('div', { class: 'rows' });
  const draw = () => {
    const l = d.mediums.filter(m => (mFilter === 'all' || st(m) === mFilter) && (!mSearch || (m.name + ' ' + m.email + ' ' + m.postcode).toLowerCase().includes(mSearch.toLowerCase())));
    body.replaceChildren(...(l.length ? l.map(m => h('button', { type: 'button', class: 'row', onclick: () => openMedium(m.id) },
      h('span', { class: 'row-main' }, h('strong', {}, m.name), h('span', { class: 'muted' }, `${m.email} · ${m.postcode}`)),
      h('span', { class: 'row-meta' }, 'Joined ' + day(m.createdAt)), memberPill(m))) : [h('p', { class: 'muted pad' }, 'No mediums match.')]));
  };
  const c = k => d.mediums.filter(m => k === 'all' || st(m) === k).length;
  view(h('h1', {}, 'Mediums'),
    h('div', { class: 'toolbar' },
      h('div', { class: 'seg' }, [['all', 'All'], ['active', 'Active'], ['unpaid', 'Not paid'], ['ended', 'Ended']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(mFilter === k), onclick: e => { mFilter = k; e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target))); draw(); } }, `${l} (${c(k)})`))),
      h('input', { type: 'search', placeholder: 'Search name, email, postcode', 'aria-label': 'Search mediums', value: mSearch, oninput: e => { mSearch = e.target.value; draw(); } })),
    body);
  draw();
}
async function openMedium(id) {
  view(h('p', { class: 'muted' }, 'Loading…'));
  const { medium: m, payments } = await api('GET', 'mediums/' + id);
  const f = { name: m.name, email: m.email, address: m.address, postcode: m.postcode, phone: m.phone, radius: m.radius };
  const inp = (k, type = 'text') => h('input', { type, value: f[k] ?? '', oninput: e => { f[k] = e.target.value; } });
  const pay = { amount: '100', method: 'bank', note: '' };
  const linkOut = h('div');
  view(
    h('p', {}, h('button', { type: 'button', class: 'linkish', onclick: () => go('mediums') }, '← All mediums')),
    h('div', { class: 'head-row' }, h('h1', {}, m.name), memberPill(m)),
    h('div', { class: 'grid2' },
      h('div', {},
        h('section', { class: 'card' }, h('h2', {}, 'Membership'),
          h('p', {}, m.until && m.until >= today ? `Active until ${day(m.until)}.` : m.until ? `Ended on ${day(m.until)}.` : 'Not paid yet.', m.memberSince ? ` Member since ${day(m.memberSince)}.` : ''),
          h('h3', {}, 'Record a payment'),
          h('p', { class: 'muted' }, 'Use this when they pay you by bank transfer or cash. It adds 12 months (from today, or from their end date if still active).'),
          h('div', { class: 'two' },
            field('Amount (£)', h('input', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: pay.amount, oninput: e => { pay.amount = e.target.value; } })),
            field('How they paid', h('select', { value: pay.method, onchange: e => { pay.method = e.target.value; } }, ['bank', 'cash', 'card', 'free'].map(k => h('option', { value: k }, METHODS[k]))))),
          field('Note (optional)', h('input', { type: 'text', maxlength: '140', placeholder: 'e.g. bank ref, date received', oninput: e => { pay.note = e.target.value; } })),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-ok', onclick: async e => { const r = await act(e.target, () => api('POST', `mediums/${m.id}/payment`, pay)); if (r) { toast('Active until ' + day(r.until)); openMedium(m.id); } } }, 'Record payment, add 12 months'),
            m.until && m.until >= today ? confirmBtn('End membership now', 'Tap again to end it', async b => { if (await act(b, () => api('POST', `mediums/${m.id}/deactivate`, {}), 'Membership ended')) openMedium(m.id); }, 'btn') : null),
          h('p', { class: 'muted small' }, 'Refunds for card payments are made in your Stripe dashboard. If you refund someone, end their membership here too.')),
        h('section', { class: 'card' }, h('h2', {}, 'Payments'),
          payments.length ? h('ul', { class: 'list' }, payments.map(p => h('li', {}, h('strong', {}, money(p.amountPence)), ` ${METHODS[p.method] || p.method} `, h('span', { class: 'muted' }, `· ${day(p.at)} · to ${day(p.until)}`)))) : h('p', { class: 'muted' }, 'None yet.'))),
      h('div', {},
        h('section', { class: 'card' }, h('h2', {}, 'Details'),
          field('Name', inp('name')), field('Email (their login)', inp('email', 'email')), field('Address', h('textarea', { rows: 2, value: f.address || '', oninput: e => { f.address = e.target.value; } })),
          h('div', { class: 'two' }, field('Postcode', inp('postcode')), field('Phone', inp('phone', 'tel'))),
          field('Travel radius (miles)', inp('radius', 'number')),
          h('button', { type: 'button', class: 'btn btn-primary', onclick: async e => { if (await act(e.target, () => api('PUT', 'mediums/' + m.id, f), 'Saved')) openMedium(m.id); } }, 'Save details'),
          h('dl', { class: 'dl' }, h('dt', {}, 'Phone'), h('dd', {}, h('a', { href: 'tel:+44' + String(m.phone).slice(1) }, pretty(m.phone))), h('dt', {}, 'Signed up'), h('dd', {}, when(m.createdAt)), h('dt', {}, 'Last login'), h('dd', {}, m.lastLoginAt ? when(m.lastLoginAt) : 'Never'), h('dt', {}, 'Agreed terms'), h('dd', {}, m.termsVersion || ''))),
        h('section', { class: 'card' }, h('h2', {}, 'Password reset'),
          h('p', { class: 'muted' }, 'Creates a one-time link that works for 24 hours. Send it to them yourself, by email or text. Never ask a member for their password.'),
          h('button', { type: 'button', class: 'btn', onclick: async e => { const r = await act(e.target, () => api('POST', `mediums/${m.id}/reset`, {})); if (r) linkOut.replaceChildren(h('div', { class: 'copy' }, h('input', { type: 'text', readonly: true, value: r.link, 'aria-label': 'Reset link', onclick: ev => ev.target.select() }), h('button', { type: 'button', class: 'btn', onclick: ev => { navigator.clipboard && navigator.clipboard.writeText(r.link).then(() => toast('Link copied')); } }, 'Copy'))); } }, 'Create reset link'),
          linkOut),
        h('section', { class: 'card danger' }, h('h2', {}, 'Delete account'),
          h('p', { class: 'muted' }, 'Deletes their account and login straight away (for example, if they ask you to erase their data). Payment records are kept for tax purposes.'),
          confirmBtn('Delete account', 'Tap again to delete', async b => { if (await act(b, () => api('DELETE', 'mediums/' + m.id), 'Account deleted')) go('mediums'); }))))
  );
}

/* ---------------- payments ---------------- */
async function payments() {
  const d = await api('GET', 'payments');
  const total = d.payments.reduce((s, p) => s + (p.amountPence || 0), 0);
  view(h('div', { class: 'head-row' }, h('h1', {}, 'Payments'), h('a', { class: 'btn', href: '/admin/api/payments.csv', download: '' }, 'Download CSV')),
    h('p', { class: 'muted' }, `${d.payments.length} payment${d.payments.length === 1 ? '' : 's'}, ${money(total)} in total. Records are kept for 6 years for tax purposes, then deleted automatically.`),
    d.payments.length ? h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Date', 'Medium', 'Amount', 'Method', 'Membership to'].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, d.payments.map(p => h('tr', {}, h('td', {}, day(p.at)), h('td', {}, p.mediumId ? h('button', { type: 'button', class: 'linkish', onclick: () => { tab = 'mediums'; tabs(); openMedium(p.mediumId).catch(e => toast(e.message, true)); } }, p.name || '') : p.name), h('td', {}, money(p.amountPence)), h('td', {}, METHODS[p.method] || p.method), h('td', {}, day(p.until)))))))
      : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'No payments yet.')));
}

/* ---------------- settings ---------------- */
async function settings() {
  const d = await api('GET', 'settings'); const s = { ...d.settings, price: String(d.settings.pricePence / 100) };
  const inp = (k, o = {}) => h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), rows: o.rows, value: s[k] ?? '', placeholder: o.ph, oninput: e => { s[k] = e.target.value; } });
  const save = async b => {
    const body = { ...s, pricePence: Math.round(Number(s.price) * 100) }; delete body.price;
    if (await act(b, () => api('PUT', 'settings', body), 'Settings saved')) settings();
  };
  view(h('h1', {}, 'Settings'),
    h('div', { class: 'grid2' },
      h('div', {},
        h('section', { class: 'card' }, h('h2', {}, 'Business and privacy details'),
          h('p', { class: 'muted' }, 'These appear in the privacy notice, terms and footer. The law requires the privacy notice to say who runs the site and how to contact you.'),
          field('Website name', inp('siteName')),
          field('Who runs the site', inp('operator', { ph: 'e.g. Book a Medium Night Ltd, or your names as a partnership' }), 'The person, partnership or company that is the "data controller".'),
          field('Contact email', inp('contactEmail', { type: 'email', ph: 'hello@…' }), 'Shown publicly for privacy requests, cancellations and help.'),
          field('Postal address (optional)', inp('postalAddress', { area: true, rows: 2 })),
          field('ICO registration number', inp('icoNumber', { ph: 'e.g. ZA123456' }), 'Most businesses handling personal data must pay the ICO data protection fee. Add your number once registered.')),
        h('section', { class: 'card' }, h('h2', {}, 'Membership'),
          field('Annual price (£)', inp('price', { type: 'number' })),
          h('label', { class: 'checkline' }, h('input', { type: 'checkbox', checked: s.approveVenues, onchange: e => { s.approveVenues = e.target.checked; } }), ' Check new venues before mediums can see them (recommended)'),
          field('Bank details for manual payments (optional)', inp('bankDetails', { area: true, rows: 3, ph: 'Account name, sort code, account number' }), 'Only shown to logged-in mediums who haven\'t paid, while card payments aren\'t connected.')),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: e => save(e.target) }, 'Save settings')),
      h('section', { class: 'card' }, h('h2', {}, 'Card payments (Stripe)'),
        h('dl', { class: 'dl' },
          h('dt', {}, 'Secret key'), h('dd', {}, d.stripe.ready ? pill(d.stripe.mode === 'live' ? 'Connected (live)' : 'Connected (test mode)', d.stripe.mode === 'live' ? 'ok' : 'warn') : pill('Not connected', 'off')),
          h('dt', {}, 'Webhook'), h('dd', {}, d.stripe.webhook ? pill('Connected', 'ok') : pill('Not connected', 'off'))),
        h('p', { class: 'muted' }, 'Keys are never shown here or anywhere on the website. They are stored as encrypted secrets in Cloudflare.'),
        h('ol', { class: 'steps' },
          h('li', {}, 'In Stripe, go to Developers → API keys and copy the Secret key (starts sk_live_ or sk_test_).'),
          h('li', {}, 'In Cloudflare: Workers & Pages → book-a-medium-night → Settings → Variables and Secrets → Add. Type: Secret. Name: STRIPE_SECRET_KEY. Paste the key and Deploy.'),
          h('li', {}, ['In Stripe, go to Developers → Webhooks → Add endpoint. URL: ', h('code', {}, d.webhookUrl), '. Event: checkout.session.completed.']),
          h('li', {}, 'Copy the webhook\'s Signing secret (starts whsec_) and add it in Cloudflare as a Secret named STRIPE_WEBHOOK_SECRET.')))));
}

/* ---------------- account ---------------- */
async function account() {
  const [a, lg] = await Promise.all([api('GET', 'admins'), api('GET', 'log')]);
  const pw = { current: '', password: '' }, nu = { user: '', password: '' };
  view(h('h1', {}, 'Logins & activity'),
    h('div', { class: 'grid2' },
      h('div', {},
        h('section', { class: 'card' }, h('h2', {}, 'Admin logins'),
          h('p', { class: 'muted' }, 'Give each partner their own login. Never share passwords.'),
          h('ul', { class: 'list' }, a.admins.map(x => h('li', { class: 'between' }, h('span', {}, h('strong', {}, x.user), x.you ? ' (you)' : '', h('span', { class: 'muted' }, ` · last login ${x.lastLoginAt ? when(x.lastLoginAt) : 'never'}`)),
            x.you ? null : confirmBtn('Remove', 'Tap to confirm', async b => { if (await act(b, () => api('DELETE', 'admins/' + encodeURIComponent(x.user)), 'Login removed')) account(); }, 'btn btn-small')))),
          h('h3', {}, 'Add a login'),
          h('div', { class: 'two' }, field('Username', h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'none', oninput: e => { nu.user = e.target.value; } })), field('Temporary password', h('input', { type: 'password', autocomplete: 'new-password', oninput: e => { nu.password = e.target.value; } }), 'At least 10 characters. Ask them to change it.')),
          h('button', { type: 'button', class: 'btn', onclick: async e => { if (await act(e.target, () => api('POST', 'admins', nu), 'Login added')) account(); } }, 'Add login')),
        h('section', { class: 'card' }, h('h2', {}, 'Your password'),
          field('Current password', h('input', { type: 'password', autocomplete: 'current-password', oninput: e => { pw.current = e.target.value; } })),
          field('New password', h('input', { type: 'password', autocomplete: 'new-password', oninput: e => { pw.password = e.target.value; } }), 'At least 10 characters.'),
          h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn btn-primary', onclick: async e => { if (await act(e.target, () => api('POST', 'password', pw), 'Password changed. Other devices are logged out.')) account(); } }, 'Change password'),
            h('button', { type: 'button', class: 'btn', onclick: e => act(e.target, () => api('POST', 'logout-others', {}), 'All other devices logged out') }, 'Log out other devices')))),
      h('section', { class: 'card' }, h('h2', {}, 'Activity'),
        lg.log.length ? h('ul', { class: 'log' }, lg.log.slice(0, 120).map(x => h('li', {}, h('span', { class: 'muted' }, when(x.at)), ' ', h('strong', {}, x.who), ' ', x.action, x.where ? h('span', { class: 'muted' }, ` (${x.where})`) : null))) : h('p', { class: 'muted' }, 'Nothing yet.'))));
}

/* ---------------- start ---------------- */
(async () => {
  const k = location.hash.slice(1);
  if (TABS.some(t => t[0] === k)) tab = k;
  try { today = (await api('GET', 'me')).today; } catch { return; }
  tabs(); render();
})();
