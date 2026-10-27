// Stripe Checkout for the annual membership. Keys live only in Cloudflare secrets (env), never in pages or code.
import { hmacHex, safeEqual } from './lib.js';

export const stripeReady = env => /^sk_(test|live)_[A-Za-z0-9]+$/.test(String(env.STRIPE_SECRET_KEY || ''));
export const stripeMode = env => String(env.STRIPE_SECRET_KEY || '').startsWith('sk_live_') ? 'live' : 'test';

async function stripe(env, method, path, params) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
    body: params ? new URLSearchParams(params).toString() : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Stripe error ' + r.status);
  return d;
}

export async function createCheckout(env, { origin, medium, pricePence, siteName }) {
  return stripe(env, 'POST', 'checkout/sessions', {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': String(pricePence),
    'line_items[0][price_data][product_data][name]': `${siteName} membership (12 months)`,
    customer_email: medium.email,
    client_reference_id: medium.id,
    'metadata[medium_id]': medium.id,
    'metadata[purpose]': 'membership',
    success_url: origin + '/members/paid/?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/members/?payment=cancelled'
  });
}
export async function getCheckout(env, id) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) throw new Error('Unknown payment');
  return stripe(env, 'GET', 'checkout/sessions/' + id);
}

// Verify the Stripe-Signature header (t=timestamp,v1=signature) for a webhook body.
export async function verifyWebhook(env, body, header, toleranceSec = 300) {
  if (!env.STRIPE_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(String(header || '').split(',').map(p => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }).filter(x => x[0]));
  const t = parts.t;
  if (!/^\d{9,11}$/.test(t || '')) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const want = await hmacHex(env.STRIPE_WEBHOOK_SECRET, t + '.' + body);
  const given = String(header).split(',').map(p => p.trim()).filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  for (const g of given) if (await safeEqual(g, want)) return true;
  return false;
}
