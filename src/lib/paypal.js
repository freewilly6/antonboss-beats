// src/lib/paypal.js — SERVER ONLY.
//
// PayPal REST helpers. The environment is chosen explicitly by PAYPAL_ENV
// (sandbox | live). It used to follow NODE_ENV, which is "production" on
// Vercel preview deployments too, so previews were taking live payments.

const ENV = process.env.PAYPAL_ENV;

function base() {
  if (ENV === 'live') return 'https://api-m.paypal.com';
  if (ENV === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  throw new Error('PAYPAL_ENV must be set to "sandbox" or "live"');
}

async function token() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  return (await res.json()).access_token;
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: any, headers?: Record<string, string>, rawBody?: string }} [opts]
 */
async function call(path, { method = 'GET', body, headers = {}, rawBody } = {}) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...headers },
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const money = (n) => Number(n).toFixed(2);

/**
 * Create an order whose contents are fixed server-side: one line per
 * beat+license, priced from the database. `items` is
 * [{ beatId, name, license, price }].
 */
export async function createOrder(items) {
  const total = items.reduce((s, i) => s + Number(i.price), 0);
  const { ok, json } = await call('/v2/checkout/orders', {
    method: 'POST',
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'Anton Boss beat licenses',
          amount: {
            currency_code: 'USD',
            value: money(total),
            breakdown: { item_total: { currency_code: 'USD', value: money(total) } },
          },
          items: items.map((i) => ({
            name: `${i.name} — ${i.license}`.slice(0, 127),
            sku: `${i.beatId}:${i.license}`.slice(0, 127),
            unit_amount: { currency_code: 'USD', value: money(i.price) },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          })),
        },
      ],
      application_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'Anton Boss' },
    },
  });
  if (!ok || !json.id) throw new Error(json?.message || 'Could not create PayPal order');
  return { id: json.id, total };
}

/** Capture an approved order. Idempotent per order. */
export async function captureOrder(orderId) {
  const res = await call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `capture-${orderId}` },
    rawBody: '{}',
  });
  // Already captured (a retry, or a second tab): read the order instead.
  if (!res.ok && res.json?.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED')) return getOrder(orderId);
  if (!res.ok) throw new Error(res.json?.details?.[0]?.description || res.json?.message || 'Capture failed');
  return res.json;
}

export async function getOrder(orderId) {
  const { ok, json } = await call(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  if (!ok) throw new Error(json?.message || 'Order lookup failed');
  return json;
}

/** The first capture on an order, if any: { id, status, amount }. */
export function firstCapture(order) {
  const c = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return c ? { id: c.id, status: c.status, amount: Number(c.amount?.value) } : null;
}

/**
 * Ask PayPal whether a webhook delivery is genuine. `rawBody` must be the
 * exact bytes received: re-serialising parsed JSON can change them and fail
 * verification, so the event is spliced into the request as-is.
 */
export async function verifyWebhook(headers, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID is not set');
  const h = (name) => headers[name] || headers[name.toLowerCase()];
  const envelope = JSON.stringify({
    auth_algo: h('paypal-auth-algo'),
    cert_url: h('paypal-cert-url'),
    transmission_id: h('paypal-transmission-id'),
    transmission_sig: h('paypal-transmission-sig'),
    transmission_time: h('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: '__EVENT__',
  }).replace('"__EVENT__"', rawBody);
  const { ok, json } = await call('/v1/notifications/verify-webhook-signature', { method: 'POST', rawBody: envelope });
  return ok && json.verification_status === 'SUCCESS';
}
