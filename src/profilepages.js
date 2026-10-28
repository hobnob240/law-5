// Pages for medium profiles, "Find a medium", enquiries. Everything user-supplied goes through esc().
import { esc, prettyPhone, niceDate, shortDate, todayUK } from './lib.js';
import { NIGHT_TYPES } from './data.js';
import { I, fs, field, inp, area, tick, errTop, spam, pageHead, portalNav } from './pages.js';

const initials = n => (String(n || '').replace(/\(.*?\)/g, ' ').split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]).join('') || '★').toUpperCase();
function avatar(id, name, photoV, cls = '') {
  return photoV ? `<img class="avatar ${cls}" src="/media/m/${esc(id)}.jpg?v=${esc(photoV)}" alt="" width="160" height="160" loading="lazy">`
    : `<span class="avatar avatar-i ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
}
const covers = r => `Travels up to ${esc(r)} mile${r == 1 ? '' : 's'}`;

/* ---------------- Find a medium ---------------- */
export function findPage(S, o) {
  const list = o.results;
  return `${pageHead('Find a medium', 'Find a medium for your venue', 'Browse psychics and mediums who are members of ' + esc(S.siteName) + ', and send a booking enquiry straight to the one you like. It\'s free for venues.')}
<section class="band"><div class="wrap">
  <form class="find-form card" method="get" action="/mediums/find/" role="search">
    <div class="field"><label for="find-pc">Your venue's postcode</label><span class="hint" id="find-pc-h">We'll show mediums who travel to your area.</span>
      <div class="find-row"><input id="find-pc" name="postcode" type="text" autocomplete="postal-code" autocapitalize="characters" value="${esc(o.postcode || '')}" aria-describedby="find-pc-h"><button class="btn btn-primary" type="submit">Search</button></div></div>
    ${o.error ? `<p class="err" role="alert">${esc(o.error)}</p>` : ''}
  </form>
  <div class="sec-head"><div><h2>${o.place ? `Mediums who travel to ${esc(o.place)}` : 'All mediums'}</h2><p class="muted">${list.length} medium${list.length === 1 ? '' : 's'}${o.place ? '' : '. Add your postcode to see who covers your area.'}</p></div>${o.place ? '<a class="btn btn-ghost" href="/mediums/find/">Show all mediums</a>' : ''}</div>
  ${list.length ? `<div class="medium-grid">${list.map(m => `<a class="medium-card" href="/mediums/m/${esc(m.id)}">
      ${avatar(m.id, m.stage, m.photoV)}
      <div class="mc-body"><div class="vc-top"><h3>${esc(m.stage)}</h3>${m.demo ? '<span class="demo-pill">Demo</span>' : ''}</div>
      <p class="mc-loc">${I.pin}<span>${m.distance != null ? `<strong>${m.distance < 1 ? 'Under 1 mile' : esc(m.distance) + ' mi'} away</strong> · ` : ''}${esc(m.town || 'UK')}${m.areas ? ` · ${esc(m.areas)}` : ''}</span></p>
      <p class="mc-bio">${esc(m.blurb)}${m.blurb.length >= 220 ? '…' : ''}</p>
      <span class="vc-more">View profile and enquire →</span></div></a>`).join('')}</div>`
    : `<div class="card empty"><p>${o.place ? 'No members cover that area yet. Try showing all mediums, or register your venue so mediums near you can find you.' : 'No mediums have published a profile yet. Register your venue so mediums can find you.'}</p><p><a class="btn btn-primary" href="/venues/register/">Register your venue free</a></p></div>`}
  <p class="fine find-note">Mediums listed here are paying members who have chosen to publish a profile. ${esc(S.siteName)} doesn't vet, recommend or guarantee any medium, so please agree all arrangements directly with them.</p>
</div></section>`;
}

/* ---------------- public profile + enquiry form ---------------- */
export function profilePage(S, o) {
  const m = o.medium, p = m.profile, f = fs(o, 'enq'), min = todayUK();
  const dates = [].concat(f.v.dates || []);
  const name = p.stageName || m.name;
  return `<section class="page-head profile-head"><div class="sky small" aria-hidden="true"></div><div class="wrap ph-in">
    ${avatar(m.id, name, p.photoV, 'avatar-lg')}
    <div><p class="eyebrow"><a href="/mediums/find/">← Find a medium</a></p><h1>${esc(name)}</h1>
    ${m.demo ? '<p class="demo-note">This is a demo profile for testing.</p>' : ''}
    <p class="lede">${esc(m.town || 'UK')}${p.areas ? ` · ${esc(p.areas)}` : ''} · ${covers(m.radius)}</p></div></div></section>
<section class="band"><div class="wrap form-wrap">
  <div class="stack">
    <div class="card prose"><h2>About ${esc(name)}</h2><p class="bio">${esc(p.bio)}</p>
      ${p.website || p.facebook ? `<p class="links">${p.website ? `<a class="btn btn-ghost" href="${esc(p.website)}" rel="nofollow noopener ugc" target="_blank">Website</a>` : ''}${p.facebook ? `<a class="btn btn-ghost" href="${esc(p.facebook)}" rel="nofollow noopener ugc" target="_blank">Facebook</a>` : ''}</p>` : ''}
    </div>
    <form class="form card" id="enquire" method="post" action="/mediums/m/${esc(m.id)}#enquire" novalidate>
      <h2>Send ${esc(name)} a booking enquiry</h2>
      <p class="fine">It's free and there's no obligation. ${esc(name)} will get your details and contact you to discuss the evening.</p>
      ${errTop(f)}${spam(o, 'enq')}
      ${field(f, 'venueName', 'Venue name', inp(f, 'venueName', 'text', 'organization', ' required'))}
      <div class="row2">${field(f, 'contactName', 'Your name', inp(f, 'contactName', 'text', 'name', ' required'))}${field(f, 'phone', 'Phone number', inp(f, 'phone', 'tel', 'tel', ' required'))}</div>
      <div class="row2">${field(f, 'email', 'Email <span class="opt">(optional)</span>', inp(f, 'email', 'email', 'email'))}${field(f, 'postcode', 'Venue postcode <span class="opt">(optional)</span>', inp(f, 'postcode', 'text', 'postal-code', ' autocapitalize="characters"'))}</div>
      ${field(f, 'dates', 'Dates you have in mind <span class="opt">(optional)</span>', `<div class="date-grid">${Array.from({ length: 3 }, (_, i) => `<input type="date" name="dates" min="${min}" value="${esc(dates[i] || '')}" aria-label="Date ${i + 1}"${i === 0 ? ' id="enq-dates"' : ''}>`).join('')}</div>`)}
      <fieldset class="radios"><legend class="label">Type of night <span class="opt">(optional)</span></legend><div class="option-cards">${Object.entries(NIGHT_TYPES).map(([k, t]) => `<label class="option"><input type="radio" name="nightType" value="${k}"${f.v.nightType === k ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></fieldset>
      ${field(f, 'message', 'Message <span class="opt">(optional)</span>', area(f, 'message', 4, true), 'For example: capacity, best times to call, anything they should know.')}
      ${tick(f, 'share', `I'm happy for ${esc(name)} to receive these details so they can contact me about this booking.`)}
      <p class="fine">Read our <a href="/privacy/">privacy notice</a>.</p>
      <button class="btn btn-primary btn-big" type="submit">Send enquiry</button>
    </form>
  </div>
  <aside class="side-note card"><h2>How it works</h2><ul class="ticks"><li>${I.check}<span>Free for venues, no obligation</span></li><li>${I.check}<span>${esc(name)} receives your enquiry and contacts you directly</span></li><li>${I.check}<span>Agree the date, fee and details between you</span></li><li>${I.check}<span>Suggested evening: 7.30pm start, 20-minute break around 8.15pm, finishing 9.15 to 9.30pm</span></li></ul>
    <p class="fine">Want lots of mediums to see your dates? <a href="/venues/register/">Register your venue free</a>.</p></aside>
</div></section>`;
}
export function enquirySent(S, o) {
  return `${pageHead('Enquiry sent', 'Thank you, your enquiry has been sent', `${esc(o.name)} has received your details and will be in touch to discuss your evening.`)}
<section class="band"><div class="wrap narrow center"><div class="card"><p>Want other mediums to see your dates as well?</p><p class="row-btns centered"><a class="btn btn-primary" href="/venues/register/">Register your venue free</a><a class="btn btn-ghost" href="/mediums/find/">Find another medium</a></p></div></div></section>`;
}

/* ---------------- members: my profile ---------------- */
export function myProfilePage(S, o) {
  const m = o.medium, f = fs(o, 'prof'), p = m.profile || {};
  const live = p.on && !p.hidden;
  return `<section class="portal-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Members' portal</p><h1>My public profile</h1>
  <p class="lede">Let venues find you and send you booking enquiries.</p>${portalNav('/members/profile/', o.unread)}</div></section>
<section class="band"><div class="wrap form-wrap">
  <form class="form card" method="post" action="/members/profile/" novalidate>
    ${o.saved ? '<div class="form-ok" role="status">Your profile is saved.</div>' : ''}${errTop(f)}
    ${p.hidden ? '<div class="form-err" role="alert">Your profile has been hidden by the site team. Please contact us if you think this is a mistake.</div>' : ''}
    <fieldset><legend>Show my profile</legend>
      <label class="switch"><input type="checkbox" name="on" value="yes"${f.v.on === 'yes' ? ' checked' : ''}><span>Publish my profile on "Find a medium" so venues can see it and send me enquiries</span></label>
      <p class="fine">Only what you write below is shown, plus your town and how far you travel. Your name, address, phone and email are never shown. Your profile is only visible while your membership is active. You can turn it off at any time.</p>
    </fieldset>
    <fieldset><legend>Your details</legend>
      ${field(f, 'stageName', 'Name you perform under', inp(f, 'stageName', 'text', 'off', ' maxlength="60"'))}
      ${field(f, 'areas', 'Areas you cover <span class="opt">(optional)</span>', inp(f, 'areas', 'text', 'off', ' maxlength="120" placeholder="e.g. Staffordshire, Cheshire and Derbyshire"'))}
      ${field(f, 'bio', 'About you', area(f, 'bio', 7, true), 'What kind of evenings you do, your experience, what audiences can expect. Up to 1,200 characters.')}
      <div class="row2">${field(f, 'website', 'Website <span class="opt">(optional)</span>', inp(f, 'website', 'text', 'url', ' inputmode="url" autocapitalize="none" placeholder="https://"'))}${field(f, 'facebook', 'Facebook page <span class="opt">(optional)</span>', inp(f, 'facebook', 'text', 'url', ' inputmode="url" autocapitalize="none" placeholder="https://facebook.com/…"'))}</div>
      <label class="check"><input type="checkbox" name="emailAlerts" value="yes"${f.v.emailAlerts === 'yes' ? ' checked' : ''}><span>Email me when a venue sends me an enquiry${o.emailOn ? '' : ' (email alerts aren\'t switched on for the site yet, so for now please check your Enquiries page)'}</span></label>
    </fieldset>
    <button class="btn btn-primary btn-big" type="submit">Save profile</button>
  </form>
  <aside class="side-stack">
    <div class="card center"><h2>Photo</h2>${avatar(m.id, p.stageName || m.name, p.photoV, 'avatar-lg')}
      <p class="fine">A clear, friendly photo of you. JPEG or PNG. It's resized and any hidden location data is removed.</p>
      <div class="photo-ctl"><label class="btn btn-ghost" for="photo-file">${p.photoV ? 'Change photo' : 'Add a photo'}</label><input class="sr" id="photo-file" type="file" accept="image/jpeg,image/png,image/webp"></div>
      <p class="err" id="photo-err" role="alert" hidden></p>
      ${p.photoV ? `<form method="post" action="/members/profile/"><input type="hidden" name="action" value="removephoto"><button class="linkish" type="submit">Remove photo</button></form>` : ''}
    </div>
    <div class="card"><h2>Status</h2><p>${live && o.active ? `<strong>Your profile is live.</strong> <a href="/mediums/m/${esc(m.id)}">View it</a>` : !o.active ? 'Your profile will show once your membership is active.' : 'Your profile is not published.'}</p></div>
  </aside>
</div></section>`;
}

/* ---------------- members: enquiries inbox ---------------- */
export function enquiriesPage(S, o) {
  const list = o.enquiries;
  return `<section class="portal-head"><div class="sky small" aria-hidden="true"></div><div class="wrap"><p class="eyebrow">Members' portal</p><h1>Booking enquiries</h1>
  <p class="lede">Venues that have asked you about an evening. Contact them directly to arrange it.</p>${portalNav('/members/enquiries/', o.unread)}</div></section>
<section class="band"><div class="wrap narrow-wide">
  ${o.notice ? `<div class="form-ok" role="status">${esc(o.notice)}</div>` : ''}
  ${list.length ? list.map(e => `<article class="card enquiry${e.read ? '' : ' unread'}">
    <div class="enq-top"><div><h2>${esc(e.venueName)}</h2><p class="muted">${esc(e.contactName)} · received ${esc(niceDate(e.at))}</p></div>${e.read ? '' : '<span class="new-pill">New</span>'}</div>
    <ul class="contact-list">
      <li>${I.phone}<span><small>Phone</small><a href="tel:+44${esc(e.phone.slice(1))}">${esc(prettyPhone(e.phone))}</a></span></li>
      ${e.email ? `<li>${I.mail}<span><small>Email</small><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></span></li>` : ''}
      ${e.postcode ? `<li>${I.pin}<span><small>Venue postcode</small>${esc(e.postcode)}</span></li>` : ''}
      ${e.dates && e.dates.length ? `<li>${I.cal}<span><small>Dates</small>${e.dates.map(d => esc(niceDate(d))).join(', ')}</span></li>` : ''}
      ${e.nightType ? `<li>${I.moon}<span><small>Type of night</small>${esc(NIGHT_TYPES[e.nightType] || '')}</span></li>` : ''}
    </ul>
    ${e.message ? `<p class="notes">${esc(e.message)}</p>` : ''}
    <div class="enq-actions">
      ${e.read ? '' : `<form method="post" action="/members/enquiries/"><input type="hidden" name="action" value="read"><input type="hidden" name="id" value="${esc(e.id)}"><button class="btn btn-ghost" type="submit">Mark as read</button></form>`}
      <form method="post" action="/members/enquiries/"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${esc(e.id)}"><button class="linkish" type="submit">Delete</button></form>
    </div></article>`).join('')
    : `<div class="card empty"><p>No enquiries yet.</p><p class="fine">${o.public ? 'Venues can send you enquiries from your public profile.' : 'Publish your profile so venues can find you and send enquiries.'}</p><p><a class="btn btn-primary" href="/members/profile/">${o.public ? 'View my profile' : 'Set up my profile'}</a></p></div>`}
  <p class="fine">Enquiries are deleted automatically after 12 months. Please only use venues' details to discuss their booking.</p>
</div></section>`;
}
