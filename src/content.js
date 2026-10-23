// Website content: the starting text (taken from Law and Son's existing site) and the rules every save must pass.
// Anything we don't know for certain (phone, names, reviews, photos, insurance) starts empty and stays hidden until it's filled in from the admin.

export const KINDS = ['Interior', 'Exterior', 'Landlord', 'Commercial'];
export const SOURCES = ['Google', 'Facebook', 'Checkatrade', 'MyBuilder', 'Rated People', 'Word of mouth', 'Other'];

export const DEFAULTS = {
  business: {
    name: 'Law and Son Decorators',
    owner: '',
    phone: '',
    whatsapp: '',
    email: '',
    town: 'Wolverhampton',
    hours: '',
    yearsTrading: '',
    insured: false,
    insuranceNote: '',
    freeQuotes: true,
    replyPromise: 'We aim to reply within 1 working day.'
  },
  links: { facebook: '', instagram: '', google: '', checkatrade: '', mybuilder: '' },
  home: {
    headline: 'Painting and decorating in Wolverhampton',
    intro: 'Interior and exterior decorating for homeowners, landlords and businesses across Wolverhampton. From a single room to a full repaint, every job gets careful preparation, tidy work and a clean finish.'
  },
  about: {
    story: '',
    approach: [
      { title: 'Proper preparation', text: 'Filling, sanding, making good and priming where needed, so the finish looks better and lasts longer.' },
      { title: 'Tidy working', text: 'Floors and furniture covered, clean edges and even coverage, and the room left as we found it, only better.' },
      { title: 'Clear quotes', text: 'Each quote is based on the size of the job, the condition of the surfaces and the finish you want.' }
    ]
  },
  services: [
    { title: 'Interior painting', text: 'Room refreshes and full home redecorating.', items: ['Bedrooms and living rooms', 'Hallways, stairs and landings', 'Kitchens and bathrooms', 'Ceilings, doors, skirting and woodwork'] },
    { title: 'Exterior decorating', text: 'Outside surfaces prepared and finished to last.', items: ['Render and masonry', 'Fascias, windows and doors', 'Fences, gates and sheds', 'Garage doors and outdoor woodwork'] },
    { title: 'Landlord refreshes', text: 'Rental properties made ready for viewings and new tenants.', items: ['Between-tenant repainting', 'Touch-ups and full redecoration', 'Repeat work for landlords with several properties'] },
    { title: 'Commercial decorating', text: 'Business spaces that look clean and well kept.', items: ['Shops and offices', 'Communal areas and hallways', 'Small business premises'] }
  ],
  areas: ['Wolverhampton', 'Tettenhall', 'Bilston', 'Wombourne', 'Willenhall'],
  gallery: [],
  reviews: [],
  seo: {
    siteUrl: '',
    title: 'Painter and Decorator in Wolverhampton | Law and Son Decorators',
    description: 'Law and Son Decorators: interior and exterior painting and decorating in Wolverhampton, Tettenhall, Bilston, Wombourne and Willenhall. Free, no-obligation quotes.',
    hide: false
  },
  privacy: { retentionMonths: 12 }
};

export const LIMITS = { services: 8, items: 10, areas: 20, gallery: 60, reviews: 40, approach: 6 };
const MEDIA_SRC = /^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

const str = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const bool = v => v === true || v === 'true';
const httpsUrl = v => { const s = str(v, 300); if (!s) return ''; try { const u = new URL(s); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; } };

export function cleanPhone(v) {
  const s = str(v, 30);
  if (!s) return '';
  const digits = s.replace(/[^\d+]/g, '');
  const n = digits.startsWith('+44') ? '0' + digits.slice(3) : digits.startsWith('44') && digits.length === 12 ? '0' + digits.slice(2) : digits;
  return /^0\d{9,10}$/.test(n) ? n : null;
}
export const prettyPhone = n => !n ? '' : /^07/.test(n) ? n.slice(0, 5) + ' ' + n.slice(5) : /^01\d1/.test(n) || /^02/.test(n) ? n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6) : n.slice(0, 5) + ' ' + n.slice(5);
export const telHref = n => 'tel:+44' + String(n).slice(1);
export const waHref = n => 'https://wa.me/44' + String(n).slice(1);

// Returns { value, errors } — value is always safe to store and render.
export function validateContent(input) {
  const c = input && typeof input === 'object' ? input : {};
  const errors = [];
  const b = c.business || {}, D = DEFAULTS;
  const phone = cleanPhone(b.phone), wa = cleanPhone(b.whatsapp);
  if (phone === null) errors.push('The phone number should be a UK number, like 07700 900123 or 01902 123456.');
  if (wa === null) errors.push('The WhatsApp number should be a UK mobile number, like 07700 900123.');
  const email = str(b.email, 120);
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email)) errors.push('The email address doesn\'t look right.');
  const value = {
    business: {
      name: str(b.name, 80) || D.business.name,
      owner: str(b.owner, 300),
      phone: phone || '', whatsapp: wa || '', email: errors.some(e => e.includes('email')) ? '' : email,
      town: str(b.town, 60) || D.business.town,
      hours: str(b.hours, 200),
      yearsTrading: str(b.yearsTrading, 4).replace(/\D/g, ''),
      insured: bool(b.insured),
      insuranceNote: str(b.insuranceNote, 200),
      freeQuotes: b.freeQuotes === undefined ? true : bool(b.freeQuotes),
      replyPromise: str(b.replyPromise, 140)
    },
    links: {},
    home: { headline: str((c.home || {}).headline, 90) || D.home.headline, intro: str((c.home || {}).intro, 500) },
    about: {
      story: str((c.about || {}).story, 3000),
      approach: (Array.isArray((c.about || {}).approach) ? c.about.approach : []).slice(0, LIMITS.approach)
        .map(a => ({ title: str(a && a.title, 60), text: str(a && a.text, 300) })).filter(a => a.title)
    },
    services: (Array.isArray(c.services) ? c.services : []).slice(0, LIMITS.services).map(s => ({
      title: str(s && s.title, 60), text: str(s && s.text, 300),
      items: (Array.isArray(s && s.items) ? s.items : []).map(i => str(i, 100)).filter(Boolean).slice(0, LIMITS.items)
    })).filter(s => s.title),
    areas: [...new Set((Array.isArray(c.areas) ? c.areas : []).map(a => str(a, 40)).filter(Boolean))].slice(0, LIMITS.areas),
    gallery: (Array.isArray(c.gallery) ? c.gallery : []).slice(0, LIMITS.gallery).map(g => ({
      src: MEDIA_SRC.test(String(g && g.src)) ? g.src : '',
      caption: str(g && g.caption, 140), area: str(g && g.area, 40),
      kind: KINDS.includes(g && g.kind) ? g.kind : 'Interior',
      featured: bool(g && g.featured),
      w: Math.max(0, Math.min(10000, parseInt(g && g.w, 10) || 0)), h: Math.max(0, Math.min(10000, parseInt(g && g.h, 10) || 0))
    })).filter(g => g.src),
    reviews: (Array.isArray(c.reviews) ? c.reviews : []).slice(0, LIMITS.reviews).map(r => ({
      name: str(r && r.name, 60), area: str(r && r.area, 40), text: str(r && r.text, 1200),
      rating: Math.max(1, Math.min(5, parseInt(r && r.rating, 10) || 5)),
      source: SOURCES.includes(r && r.source) ? r.source : 'Google',
      date: /^\d{4}-\d{2}$/.test(String(r && r.date)) ? r.date : ''
    })).filter(r => r.name && r.text),
    seo: {
      siteUrl: '',
      title: str((c.seo || {}).title, 70) || D.seo.title,
      description: str((c.seo || {}).description, 170) || D.seo.description,
      hide: bool((c.seo || {}).hide)
    },
    privacy: { retentionMonths: [3, 6, 12, 24].includes(parseInt((c.privacy || {}).retentionMonths, 10)) ? parseInt(c.privacy.retentionMonths, 10) : 12 }
  };
  for (const k of Object.keys(D.links)) {
    const u = httpsUrl((c.links || {})[k]);
    if (u === null) errors.push(`The ${k === 'google' ? 'Google reviews' : k} link must be a full web address starting with https://`);
    value.links[k] = u || '';
  }
  const site = str((c.seo || {}).siteUrl, 100).replace(/\/+$/, '');
  if (site) { if (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(site)) value.seo.siteUrl = site.toLowerCase(); else errors.push('The website address should look like https://www.lawandsondecorators.co.uk'); }
  if (!value.services.length) errors.push('Keep at least one service.');
  if (!value.areas.length) errors.push('Keep at least one area you cover.');
  return { value, errors };
}

export const withDefaults = raw => raw ? validateContent(raw).value : validateContent(DEFAULTS).value;
