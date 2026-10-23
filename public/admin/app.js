// Law and Son admin console. Everything a visitor typed is shown with textContent, never as HTML.
const $ = id => document.getElementById(id);
const deep = o => JSON.parse(JSON.stringify(o));
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
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  if (value !== undefined) el.value = value;
  return el;
}
const fmt = iso => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const ago = iso => { const m = (Date.now() - Date.parse(iso)) / 60000; if (m < 1) return 'just now'; if (m < 60) return Math.floor(m) + ' min ago'; if (m < 1440) return Math.floor(m / 60) + ' h ago'; if (m < 10080) return Math.floor(m / 1440) + ' d ago'; return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
const tel = n => 'tel:+44' + String(n).slice(1);
const pretty = n => !n ? '' : /^07/.test(n) ? n.slice(0, 5) + ' ' + n.slice(5) : /^0(1\d1|2)/.test(n) ? n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6) : n.slice(0, 5) + ' ' + n.slice(5);

const TABS = [['overview', 'Overview'], ['inbox', 'Enquiries'], ['photos', 'Photos'], ['reviews', 'Reviews'], ['details', 'Business details'], ['text', 'Website text'], ['seo', 'Google & privacy'], ['account', 'Account']];
const KINDS = ['Interior', 'Exterior', 'Landlord', 'Commercial'];
const SOURCES = ['Google', 'Facebook', 'Checkatrade', 'MyBuilder', 'Rated People', 'Word of mouth', 'Other'];
let saved = null, draft = null, me = {}, enqs = [], tab = 'overview', filter = 'new', openId = null, openRec = null, confirmDel = null;

async function api(method, path, body, raw) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) { if (raw) opt.body = body; else { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); } }
  let r;
  try { r = await fetch('/api/admin/' + path, opt); } catch { throw new Error('No connection. Check your signal and try again.'); }
  if (r.status === 401) { location.href = '/admin/'; throw new Error('Logged out'); }
  let d = {}; try { d = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(d.error || 'Something went wrong. Please try again.'); e.details = d.details; throw e; }
  return d;
}
function toast(msg, bad) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, bad ? 6000 : 3000); }
const dirty = () => saved && JSON.stringify(draft) !== JSON.stringify(saved);
function changed() { $('savebar').hidden = !dirty(); }

/* ---------- form helpers bound to the draft ---------- */
function text(obj, key, label, o = {}) {
  const id = 'f-' + Math.random().toString(36).slice(2, 8);
  const tag = o.area ? 'textarea' : 'input';
  const count = o.max ? h('span', { class: 'count' }) : null;
  const upd = v => { if (count) { count.textContent = v.length + ' / ' + o.max; count.classList.toggle('over', v.length > o.max); } };
  const el = h(tag, { id, type: o.type || (o.area ? null : 'text'), value: obj[key] == null ? '' : obj[key], placeholder: o.ph, rows: o.rows, inputmode: o.inputmode, autocomplete: 'off', maxlength: o.max ? o.max + 50 : null,
    oninput: e => { obj[key] = e.target.value; upd(e.target.value); changed(); } });
  upd(String(obj[key] || ''));
  return h('div', { class: 'field' }, h('label', { for: id }, label, count), o.hint ? h('span', { class: 'hint' }, o.hint) : null, el);
}
function select(obj, key, label, options) {
  const id = 'f-' + Math.random().toString(36).slice(2, 8);
  return h('div', { class: 'field' }, h('label', { for: id }, label),
    h('select', { id, value: String(obj[key]), onchange: e => { obj[key] = typeof obj[key] === 'number' ? Number(e.target.value) : e.target.value; changed(); } },
      options.map(o => Array.isArray(o) ? h('option', { value: o[0] }, o[1]) : h('option', { value: o }, o))));
}
function tick(obj, key, label, hint) {
  return h('div', { class: 'field' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!obj[key], onchange: e => { obj[key] = e.target.checked; changed(); } }), h('span', null, label, hint ? h('span', { class: 'hint' }, hint) : null)));
}
function lines(obj, key, label, hint) {
  const id = 'f-' + Math.random().toString(36).slice(2, 8);
  return h('div', { class: 'field' }, h('label', { for: id }, label), hint ? h('span', { class: 'hint' }, hint) : null,
    h('textarea', { id, rows: Math.max(3, obj[key].length + 1), value: obj[key].join('\n'), oninput: e => { obj[key] = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); changed(); } }));
}
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; changed(); render(); }
function removeBtn(key, onYes, label = 'Remove') {
  if (confirmDel === key) return h('span', { class: 'tools' }, h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: () => { confirmDel = null; onYes(); } }, 'Yes, remove'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { confirmDel = null; render(); } }, 'Keep'));
  return h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: () => { confirmDel = key; render(); } }, label);
}

/* ---------- shell ---------- */
function setTab(t) {
  tab = t; openId = null; confirmDel = null;
  history.replaceState(null, '', '#' + t);
  render(); $('view').focus({ preventScroll: true }); window.scrollTo(0, 0);
  if (t === 'inbox' || t === 'overview') refreshInbox();
}
function render() {
  const unread = enqs.filter(e => e.status === 'new').length;
  $('tabs').replaceChildren(...TABS.map(([k, l]) => h('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': String(k === tab), onclick: () => setTab(k) }, l, k === 'inbox' && unread ? h('span', { class: 'badge', 'aria-label': unread + ' new' }, unread) : null)));
  const v = { overview, inbox, photos, reviews, details, websiteText, seo, account }[tab === 'text' ? 'websiteText' : tab] || overview;
  $('view').replaceChildren(...[v()].flat(Infinity).filter(x => x != null && x !== false));
  changed();
}
const head = (title, sub, ...right) => h('div', { class: 'page-h' }, h('h1', null, title), ...right, sub ? h('p', null, sub) : null);

/* ---------- overview ---------- */
function overview() {
  const B = draft.business, unread = enqs.filter(e => e.status === 'new');
  const todo = [
    [!!B.phone, 'Add a phone number', 'Most people want to ring a decorator. It puts a Call button on every page.', 'details'],
    [!!B.email, 'Add an email address', 'Shown on the contact panel and privacy notice.', 'details'],
    [!!B.owner, 'Say who runs the business', 'For example "Run by Mark Law and his son Tom". It builds trust.', 'details'],
    [draft.gallery.length >= 6, `Add photos of real jobs (${draft.gallery.length} of 6)`, 'Phone photos of finished rooms are fine. Only use your own work.', 'photos'],
    [draft.reviews.length >= 3, `Add customer reviews (${draft.reviews.length} of 3)`, 'Copy real reviews from Google, Facebook or Checkatrade.', 'reviews'],
    [!!draft.links.google, 'Link your Google reviews', 'Adds a "Read our Google reviews" link.', 'details'],
    [!!draft.seo.siteUrl, 'Set the website address', 'Once the domain is connected, so Google uses the right address.', 'seo']
  ];
  const done = todo.filter(t => t[0]).length;
  return [
    head('Hello' + (me.username ? ', ' + me.username : ''), 'Changes you save go live on the website straight away.'),
    h('div', { class: 'grid2' },
      h('div', { class: 'card stat' }, h('span', { class: 'muted' }, 'New enquiries'), h('strong', null, unread.length), h('div', null, h('button', { class: 'btn btn-red btn-sm', type: 'button', onclick: () => { filter = unread.length ? 'new' : 'open'; setTab('inbox'); } }, 'Open enquiries'))),
      h('div', { class: 'card stat' }, h('span', { class: 'muted' }, 'Checklist done'), h('strong', null, done + ' / ' + todo.length), h('span', { class: 'small muted' }, done === todo.length ? 'All done. Nice.' : 'Finish these to win more work.'))),
    unread.length ? h('div', { class: 'card' }, h('h2', null, 'Latest new enquiries'), h('div', { class: 'list' }, unread.slice(0, 3).map(enqRow))) : null,
    h('div', { class: 'card' }, h('h2', null, 'Website checklist'),
      todo.map(([ok, title, why, go]) => h('div', { class: 'todo' }, h('span', { class: 'dot' + (ok ? ' done' : ''), 'aria-label': ok ? 'Done' : 'To do' }, ok ? '✓' : ''), h('div', { class: 'grow' }, h('strong', null, title), h('div', { class: 'small muted' }, why)), ok ? null : h('button', { class: 'btn btn-sm', type: 'button', onclick: () => setTab(go) }, 'Do it'))))
  ];
}

/* ---------- inbox ---------- */
async function refreshInbox() {
  try { enqs = (await api('GET', 'enquiries')).enquiries; if (tab === 'inbox' || tab === 'overview') { if (!openId) render(); else renderTabsOnly(); } else renderTabsOnly(); } catch (e) { /* keep last list */ }
}
function renderTabsOnly() { const unread = enqs.filter(e => e.status === 'new').length; const b = $('tabs').children[1]; if (b) b.replaceChildren('Enquiries', unread ? h('span', { class: 'badge' }, unread) : ''); }
const FILTERS = [['new', 'New', e => e.status === 'new'], ['open', 'All open', e => e.status !== 'archived'], ['quote', 'Quote requests', e => e.type === 'quote' && e.status !== 'archived'], ['message', 'Messages', e => e.type === 'message' && e.status !== 'archived'], ['archived', 'Archived', e => e.status === 'archived']];
function enqRow(e) {
  return h('button', { class: 'enq' + (e.status === 'new' ? ' is-new' : ''), type: 'button', onclick: () => openEnquiry(e.id) },
    h('span', { class: 'icon', 'aria-hidden': 'true' }, e.type === 'message' ? 'MSG' : 'QTE'),
    h('span', null, h('span', { class: 'who' }, e.name || 'No name'), h('span', { class: 'pill ' + e.status }, e.status === 'new' ? 'New' : e.status === 'replied' ? 'Replied' : e.status === 'archived' ? 'Archived' : 'Read')),
    h('span', { class: 'when' }, ago(e.at)),
    h('span', { class: 'ex' }, [e.type === 'quote' ? (e.service || 'Quote request') : 'Message', e.area, e.excerpt].filter(Boolean).join(' · ')));
}
function inbox() {
  if (openId) return enquiryDetail();
  const f = FILTERS.find(x => x[0] === filter) || FILTERS[0];
  const list = enqs.filter(f[2]);
  return [
    head('Enquiries', 'Quote requests and messages sent through the website. Newest first.', h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => { await refreshInbox(); toast('Up to date'); } }, 'Refresh')),
    h('div', { class: 'filters', role: 'group', 'aria-label': 'Show' }, FILTERS.map(([k, l, fn]) => { const n = enqs.filter(fn).length; return h('button', { type: 'button', 'aria-pressed': String(k === filter), onclick: () => { filter = k; render(); } }, l + (n ? ' (' + n + ')' : '')); })),
    list.length ? h('div', { class: 'list' }, list.map(enqRow)) : h('div', { class: 'empty' }, filter === 'new' ? 'No new enquiries. New ones show up here as soon as someone sends the form.' : 'Nothing here.')
  ];
}
async function openEnquiry(id) {
  openId = id; openRec = null; confirmDel = null; if (tab !== 'inbox') { tab = 'inbox'; history.replaceState(null, '', '#inbox'); }
  render(); window.scrollTo(0, 0);
  try {
    openRec = (await api('GET', 'enquiries/' + id)).enquiry;
    if (openRec.status === 'new') { openRec = (await api('PATCH', 'enquiries/' + id, { status: 'read' })).enquiry; const e = enqs.find(x => x.id === id); if (e) e.status = 'read'; }
  } catch (e) { toast(e.message, true); openId = null; }
  render();
}
async function setStatus(status, msg) {
  try { openRec = (await api('PATCH', 'enquiries/' + openId, { status })).enquiry; const e = enqs.find(x => x.id === openId); if (e) e.status = status; toast(msg); render(); } catch (e) { toast(e.message, true); }
}
function enquiryDetail() {
  const back = h('button', { class: 'back', type: 'button', onclick: () => { openId = null; render(); } }, '← All enquiries');
  if (!openRec) return [back, h('p', { class: 'muted' }, 'Loading…')];
  const r = openRec, first = (r.name || '').split(' ')[0];
  const isMob = /^07/.test(r.phone || '');
  const rows = [['Received', fmt(r.at)], ['Type', r.type === 'message' ? 'Message' : 'Quote request'], ['Phone', pretty(r.phone)], ['Email', r.email], ['Prefers', r.contact], ['Area', r.area], ['Work', r.service], ['Property', r.property], ['Rooms or areas', r.rooms], ['When', r.timeline], ['Colours chosen', r.colours], [r.type === 'message' ? 'Message' : 'Job details', r.details]].filter(x => x[1]);
  const mailBody = `Hi ${first},\n\nThanks for getting in touch with ${draft.business.name}.\n\n`;
  const waText = `Hi ${first}, it's ${draft.business.name}. Thanks for your enquiry through our website.`;
  return [
    back,
    h('div', { class: 'card detail' },
      h('div', { class: 'page-h' }, h('h1', null, r.name || 'No name'), h('span', { class: 'pill ' + r.status }, { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived' }[r.status])),
      h('div', { class: 'acts' },
        r.phone ? h('a', { class: 'btn btn-red', href: tel(r.phone) }, 'Call ' + pretty(r.phone)) : null,
        isMob ? h('a', { class: 'btn', href: 'https://wa.me/44' + r.phone.slice(1) + '?text=' + encodeURIComponent(waText), target: '_blank', rel: 'noopener' }, 'WhatsApp') : null,
        r.email ? h('a', { class: 'btn', href: 'mailto:' + r.email + '?subject=' + encodeURIComponent('Your decorating enquiry') + '&body=' + encodeURIComponent(mailBody) }, 'Email') : null),
      h('dl', null, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
      h('div', { class: 'acts' },
        r.status !== 'replied' ? h('button', { class: 'btn btn-ink', type: 'button', onclick: () => setStatus('replied', 'Marked as replied') }, 'Mark as replied') : null,
        r.status !== 'archived' ? h('button', { class: 'btn', type: 'button', onclick: () => setStatus('archived', 'Archived') }, 'Archive') : h('button', { class: 'btn', type: 'button', onclick: () => setStatus('read', 'Moved back to open') }, 'Move back to open'),
        confirmDel === 'enq' ? [h('button', { class: 'btn btn-danger', type: 'button', onclick: delEnquiry }, 'Yes, delete for good'), h('button', { class: 'btn', type: 'button', onclick: () => { confirmDel = null; render(); } }, 'Keep it')]
          : h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { confirmDel = 'enq'; render(); } }, 'Delete'))),
    noteCard(r)
  ];
}
function noteCard(r) {
  const ta = h('textarea', { id: 'note', rows: 3, value: r.notes || '', placeholder: 'e.g. Rang back Tue, quoted £850, starting 3 Nov' });
  return h('div', { class: 'card' }, h('label', { for: 'note' }, 'Private notes'), h('span', { class: 'hint' }, 'Only you can see these.'), ta,
    h('div', { class: 'acts' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => { try { openRec = (await api('PATCH', 'enquiries/' + openId, { notes: ta.value })).enquiry; toast('Note saved'); } catch (e) { toast(e.message, true); } } }, 'Save note')));
}
async function delEnquiry() {
  try { await api('DELETE', 'enquiries/' + openId); enqs = enqs.filter(e => e.id !== openId); openId = null; confirmDel = null; toast('Deleted'); render(); } catch (e) { toast(e.message, true); }
}

/* ---------- photos ---------- */
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be opened as a photo.')); i.src = url; });
    let w = img.naturalWidth, hgt = img.naturalHeight; const s = Math.min(1, 1600 / Math.max(w, hgt)); w = Math.round(w * s); hgt = Math.round(hgt * s);
    const c = document.createElement('canvas'); c.width = w; c.height = hgt; c.getContext('2d').drawImage(img, 0, 0, w, hgt);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    if (!blob) throw new Error('That photo could not be prepared.');
    return { blob, w, h: hgt };
  } finally { URL.revokeObjectURL(url); }
}
async function addPhotos(files, status) {
  files = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
  if (!files.length) return;
  const room = 60 - draft.gallery.length;
  if (room <= 0) return toast('You can have up to 60 photos. Remove some first.', true);
  files = files.slice(0, room);
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    status.textContent = `Uploading ${i + 1} of ${files.length}…`;
    try {
      const s = await shrink(files[i]);
      const fd = new FormData(); fd.append('file', s.blob, 'photo.jpg'); fd.append('w', s.w); fd.append('h', s.h);
      const r = await api('POST', 'upload', fd, true);
      draft.gallery.unshift({ src: r.src, caption: '', area: '', kind: 'Interior', featured: false, w: s.w, h: s.h }); ok++;
    } catch (e) { toast(files[i].name + ': ' + e.message, true); }
  }
  render();
  if (ok) toast(ok === 1 ? 'Photo added. Add a caption, then Save.' : ok + ' photos added. Add captions, then Save.');
}
async function addBefore(g, file) {
  try {
    toast('Uploading the before photo…');
    const s = await shrink(file);
    const fd = new FormData(); fd.append('file', s.blob, 'before.jpg'); fd.append('w', s.w); fd.append('h', s.h);
    const r = await api('POST', 'upload', fd, true);
    g.before = r.src; g.featured = false; changed(); render(); toast('Before photo added. Save to show the slider on the website.');
  } catch (e) { toast(e.message, true); }
}
function beforeTools(g, i) {
  const pick = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'bf' + i, onchange: e => { if (e.target.files[0]) addBefore(g, e.target.files[0]); } });
  if (g.before) return h('div', { class: 'before-row' }, h('img', { src: g.before, alt: 'Before photo', class: 'before-thumb' }), h('span', { class: 'small' }, h('strong', null, 'Before & after slider'), h('br'), h('span', { class: 'muted' }, 'This photo shows as the "after".')), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { g.before = ''; changed(); render(); } }, 'Remove before'));
  return h('div', null, pick, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => $('bf' + i).click() }, '+ Add a "before" photo'), h('span', { class: 'hint' }, 'Makes a before & after slider. Take it from the same spot.'));
}
function photos() {
  const status = h('p', { class: 'small muted', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, id: 'pick', hidden: true, onchange: async e => { const zone = e.target.closest('.drop'); zone.classList.add('busy'); await addPhotos(e.target.files, status); e.target.value = ''; } });
  const zone = h('div', { class: 'drop', ondragover: e => e.preventDefault(), ondrop: e => { e.preventDefault(); addPhotos(e.dataTransfer.files, status); } },
    h('strong', null, 'Add photos of finished jobs'), h('span', { class: 'small muted' }, 'Straight from your phone camera is fine. They\'re resized automatically so the site stays fast.'),
    input, h('button', { class: 'btn btn-red', type: 'button', onclick: () => $('pick').click() }, 'Choose photos'), status);
  const G = draft.gallery;
  return [
    head('Photos', 'Only use photos of your own work. Photos also appear next to the matching service on the home page (by Type). Add a "before" photo to make a before & after slider.'),
    zone, h('p', { class: 'small muted' }, `${G.length} of 60 photos.`),
    G.length ? h('div', { class: 'photos' }, G.map((g, i) => h('div', { class: 'ph' },
      h('img', { src: g.src, alt: g.caption || 'Uploaded photo ' + (i + 1), loading: 'lazy' }),
      h('div', { class: 'body' },
        text(g, 'caption', 'Caption', { ph: 'e.g. Lounge repaint in soft grey', max: 140 }),
        h('div', { class: 'row2' }, text(g, 'area', 'Area', { ph: 'e.g. Tettenhall', max: 40 }), select(g, 'kind', 'Type', KINDS)),
        beforeTools(g, i),
        g.before ? null : h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: g.featured, onchange: e => { G.forEach(x => x.featured = false); g.featured = e.target.checked; changed(); render(); } }), 'Show at the top of the home page'),
        h('div', { class: 'tools' }, h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': 'Move earlier', onclick: () => move(G, i, -1), disabled: i === 0 }, '↑'), h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': 'Move later', onclick: () => move(G, i, 1), disabled: i === G.length - 1 }, '↓'),
          removeBtn('ph' + i, () => { G.splice(i, 1); changed(); render(); })))))) : h('div', { class: 'empty' }, 'No photos yet. Until you add some, the website shows painted colour panels instead.')
  ];
}

/* ---------- reviews ---------- */
function reviews() {
  const R = draft.reviews;
  return [
    head('Reviews', 'Only add real reviews that customers have given you, word for word, with their permission to show their first name.',
      h('button', { class: 'btn btn-red', type: 'button', onclick: () => { R.unshift({ name: '', area: '', text: '', rating: 5, source: 'Google', date: '' }); changed(); render(); } }, 'Add a review')),
    R.length ? R.map((r, i) => h('div', { class: 'item' },
      h('div', { class: 'item-h' }, h('strong', null, r.name || 'New review'), h('span', { class: 'tools' }, h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': 'Move up', onclick: () => move(R, i, -1), disabled: i === 0 }, '↑'), removeBtn('rv' + i, () => { R.splice(i, 1); changed(); render(); }))),
      h('div', { class: 'row2' }, text(r, 'name', 'Customer name', { ph: 'e.g. Sarah B.', max: 60 }), text(r, 'area', 'Area', { ph: 'e.g. Bilston', max: 40 })),
      h('div', { class: 'row2' }, select(r, 'rating', 'Stars', [[5, '5 stars'], [4, '4 stars'], [3, '3 stars'], [2, '2 stars'], [1, '1 star']]), select(r, 'source', 'Where it was left', SOURCES)),
      text(r, 'date', 'Month', { type: 'month', hint: 'Optional.' }),
      text(r, 'text', 'Review', { area: true, rows: 4, max: 1200 }))) : h('div', { class: 'empty' }, 'No reviews yet. The reviews section stays hidden until you add one.')
  ];
}

/* ---------- business details ---------- */
function details() {
  const B = draft.business, L = draft.links;
  return [
    head('Business details', 'Anything left blank is simply hidden on the website.'),
    h('div', { class: 'card' }, h('h2', null, 'Contact'),
      h('div', { class: 'row2' }, text(B, 'phone', 'Phone number', { type: 'tel', inputmode: 'tel', ph: '07700 900123', hint: 'Adds Call buttons on every page.' }), text(B, 'whatsapp', 'WhatsApp number', { type: 'tel', inputmode: 'tel', ph: '07700 900123', hint: 'Optional. A UK mobile.' })),
      text(B, 'email', 'Email address', { type: 'email', inputmode: 'email', ph: 'you@example.co.uk' }),
      text(B, 'hours', 'Opening hours', { ph: 'e.g. Mon to Fri 8am to 5pm', max: 200, hint: 'Optional.' }),
      text(B, 'replyPromise', 'How quickly you reply', { max: 140, hint: 'Shown after someone sends a form.' })),
    h('div', { class: 'card' }, h('h2', null, 'About the business'),
      text(B, 'name', 'Business name', { max: 80 }),
      text(B, 'owner', 'Who runs it', { area: true, rows: 2, max: 300, ph: 'e.g. Run by Mark Law and his son Tom, decorating in Wolverhampton since 2009.', hint: 'Shown on the About page and in the footer.' }),
      h('div', { class: 'row2' }, text(B, 'town', 'Main town', { max: 60 }), text(B, 'yearsTrading', 'Years decorating', { inputmode: 'numeric', ph: 'e.g. 15', hint: 'Optional. Numbers only.' })),
      tick(B, 'freeQuotes', 'You give free, no-obligation quotes'),
      tick(B, 'insured', 'You have public liability insurance', 'Only tick this if it\'s true and current.'),
      B.insured ? text(B, 'insuranceNote', 'How to describe it', { ph: 'e.g. Fully insured, £2m public liability', max: 200 }) : null),
    h('div', { class: 'card' }, h('h2', null, 'Links'), h('p', { class: 'small muted' }, 'Full web addresses starting with https://'),
      text(L, 'google', 'Google reviews link', { type: 'url', ph: 'https://g.page/r/…' }), text(L, 'facebook', 'Facebook page', { type: 'url' }), text(L, 'instagram', 'Instagram', { type: 'url' }),
      text(L, 'checkatrade', 'Checkatrade profile', { type: 'url' }), text(L, 'mybuilder', 'MyBuilder profile', { type: 'url' }))
  ];
}

/* ---------- website text ---------- */
function websiteText() {
  const S = draft.services, A = draft.about.approach;
  return [
    head('Website text'),
    h('div', { class: 'card' }, h('h2', null, 'Home page'),
      text(draft.home, 'headline', 'Main headline', { max: 90 }),
      text(draft.home, 'intro', 'Introduction', { area: true, rows: 4, max: 500 })),
    h('div', { class: 'card' }, h('h2', null, 'Services'),
      S.map((s, i) => h('div', { class: 'item' },
        h('div', { class: 'item-h' }, h('strong', null, s.title || 'New service'), h('span', { class: 'tools' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => move(S, i, -1), disabled: i === 0, 'aria-label': 'Move up' }, '↑'), S.length > 1 ? removeBtn('sv' + i, () => { S.splice(i, 1); changed(); render(); }) : null)),
        text(s, 'title', 'Name', { max: 60 }), text(s, 'text', 'Short description', { max: 300 }), lines(s, 'items', 'What it includes', 'One per line.'))),
      S.length < 8 ? h('button', { class: 'btn', type: 'button', onclick: () => { S.push({ title: '', text: '', items: [] }); changed(); render(); } }, 'Add a service') : null),
    h('div', { class: 'card' }, h('h2', null, 'About page'),
      text(draft.about, 'story', 'Your story', { area: true, rows: 7, max: 3000, hint: 'Optional. How you started, who does the work, what you\'re proud of. Leave a blank line between paragraphs.' }),
      h('h3', null, 'How you work'),
      A.map((a, i) => h('div', { class: 'item' }, h('div', { class: 'item-h' }, h('strong', null, a.title || 'New point'), removeBtn('ap' + i, () => { A.splice(i, 1); changed(); render(); })), text(a, 'title', 'Heading', { max: 60 }), text(a, 'text', 'Text', { max: 300 }))),
      A.length < 6 ? h('button', { class: 'btn', type: 'button', onclick: () => { A.push({ title: '', text: '' }); changed(); render(); } }, 'Add a point') : null),
    h('div', { class: 'card' }, h('h2', null, 'Questions people ask (FAQ)'), h('p', { class: 'small muted' }, 'Shown on the home and services pages. Google can show these in search results too.'),
      draft.faqs.map((f, i) => h('div', { class: 'item' }, h('div', { class: 'item-h' }, h('strong', null, f.q || 'New question'), h('span', { class: 'tools' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => move(draft.faqs, i, -1), disabled: i === 0, 'aria-label': 'Move up' }, '↑'), removeBtn('fq' + i, () => { draft.faqs.splice(i, 1); changed(); render(); }))),
        text(f, 'q', 'Question', { max: 160 }), text(f, 'a', 'Answer', { area: true, rows: 3, max: 1200 }))),
      draft.faqs.length < 12 ? h('button', { class: 'btn', type: 'button', onclick: () => { draft.faqs.push({ q: '', a: '' }); changed(); render(); } }, 'Add a question') : null),
    h('div', { class: 'card' }, h('h2', null, 'Areas covered'), lines(draft, 'areas', 'Towns and areas', 'One per line, most important first.'))
  ];
}

/* ---------- google & privacy ---------- */
function seo() {
  const S = draft.seo;
  return [
    head('Google & privacy'),
    h('div', { class: 'card' }, h('h2', null, 'Google'),
      text(S, 'siteUrl', 'Website address', { type: 'url', ph: 'https://www.lawandsondecorators.co.uk', hint: 'Fill this in once the domain is connected. Visitors to other addresses are sent here.' }),
      text(S, 'title', 'Title in Google results', { max: 70 }),
      text(S, 'description', 'Description in Google results', { area: true, rows: 3, max: 170 }),
      tick(S, 'hide', 'Hide the whole website from Google', 'Only while you\'re still setting it up.')),
    h('div', { class: 'card' }, h('h2', null, 'Privacy'),
      select(draft.privacy, 'retentionMonths', 'Delete enquiries automatically after', [[3, '3 months'], [6, '6 months'], [12, '12 months'], [24, '24 months']]),
      h('p', { class: 'small muted' }, 'This is stated in the website\'s privacy notice, so keep it to what you actually need.'))
  ];
}

/* ---------- account ---------- */
function account() {
  const log = h('div', null, h('p', { class: 'muted' }, 'Loading…'));
  api('GET', 'activity').then(d => log.replaceChildren(...(d.log.length ? d.log.slice(0, 40).map(l => h('div', { class: 'logrow' }, h('span', { class: 'muted' }, fmt(l.at)), h('span', null, l.action + (l.user ? ' · ' + l.user : '') + (l.where ? ' · ' + l.where : '')))) : [h('p', { class: 'muted' }, 'Nothing yet.')]))).catch(() => {});
  const cur = h('input', { type: 'password', id: 'a-cur', autocomplete: 'current-password' });
  const user = h('input', { id: 'a-user', autocomplete: 'username', autocapitalize: 'none', placeholder: me.username });
  const pw = h('input', { type: 'password', id: 'a-new', autocomplete: 'new-password' });
  const pw2 = h('input', { type: 'password', id: 'a-new2', autocomplete: 'new-password' });
  const msg = h('div', { class: 'msg err', role: 'alert', hidden: true });
  return [
    head('Account'),
    h('form', { class: 'card', onsubmit: async e => {
      e.preventDefault(); msg.hidden = true;
      if (pw.value !== pw2.value) { msg.textContent = 'The two new passwords don\'t match.'; msg.hidden = false; return; }
      try { await api('POST', 'account', { current: cur.value, username: user.value.trim(), password: pw.value }); toast('Login details changed'); me.username = user.value.trim() || me.username; render(); }
      catch (x) { msg.textContent = x.message; msg.hidden = false; }
    } },
      h('h2', null, 'Change your login'), msg,
      h('div', { class: 'field' }, h('label', { for: 'a-cur' }, 'Current password'), cur),
      h('div', { class: 'field' }, h('label', { for: 'a-user' }, 'New username'), h('span', { class: 'hint' }, 'Leave blank to keep it.'), user),
      h('div', { class: 'row2' }, h('div', { class: 'field' }, h('label', { for: 'a-new' }, 'New password'), h('span', { class: 'hint' }, '12 characters or more.'), pw), h('div', { class: 'field' }, h('label', { for: 'a-new2' }, 'New password again'), h('span', { class: 'hint' }, ' '), pw2)),
      h('button', { class: 'btn btn-ink', type: 'submit' }, 'Change login')),
    h('div', { class: 'card' }, h('h2', null, 'Security'),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { await api('POST', 'logout-others'); toast('All other devices logged out'); } catch (e) { toast(e.message, true); } } }, 'Log out other devices'),
        h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => { if (dirty() && !confirmLeave()) return; await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); location.href = '/admin/'; } }, 'Log out'))),
    h('div', { class: 'card' }, h('h2', null, 'Recent activity'), log)
  ];
}
function confirmLeave() { toast('Save or discard your changes first.', true); return false; }

/* ---------- save ---------- */
$('save').addEventListener('click', async () => {
  const b = $('save'); b.disabled = true; b.textContent = 'Saving…';
  try {
    const r = await api('PUT', 'content', draft);
    saved = deep(r.content); draft = deep(r.content); confirmDel = null;
    toast('Saved. The website is updated.'); render();
  } catch (e) {
    toast(e.details && e.details.length ? e.details.join(' ') : e.message, true);
  } finally { b.disabled = false; b.textContent = 'Save changes'; }
});
$('discard').addEventListener('click', () => { draft = deep(saved); confirmDel = null; render(); toast('Changes discarded'); });
window.addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && saved) refreshInbox(); });

(async function start() {
  try {
    const [m, c, q] = await Promise.all([api('GET', 'me'), api('GET', 'content'), api('GET', 'enquiries')]);
    me = m; saved = deep(c.content); draft = deep(c.content); enqs = q.enquiries;
    const want = location.hash.slice(1);
    tab = TABS.some(t => t[0] === want) ? want : (enqs.some(e => e.status === 'new') ? 'inbox' : 'overview');
    render();
  } catch (e) { if (e.message !== 'Logged out') $('view').replaceChildren(h('div', { class: 'card' }, h('p', null, e.message), h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Try again'))); }
})();
