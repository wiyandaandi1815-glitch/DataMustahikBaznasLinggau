// v46 — Midtrans (server). Kunci HANYA dari Environment Variables Vercel; tidak pernah dikirim ke browser kecuali Client Key (memang publik).
// MIDTRANS_SERVER_KEY · MIDTRANS_CLIENT_KEY · MIDTRANS_PRODUCTION ("true" untuk produksi) · GATEWAY_INTERNAL_KEY (sama dengan SYS_KUNCI_GATEWAY di Apps Script)
const crypto = require('crypto');
const PROD = String(process.env.MIDTRANS_PRODUCTION || '').toLowerCase() === 'true';
const BASE = {
  snap: process.env.MIDTRANS_SNAP_BASE || (PROD ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'),
  api: process.env.MIDTRANS_API_BASE || (PROD ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com')
};
const SK = () => process.env.MIDTRANS_SERVER_KEY || '';
const siap = () => !!(SK() && process.env.MIDTRANS_CLIENT_KEY && (process.env.GATEWAY_INTERNAL_KEY || '').length >= 24);
const auth = () => 'Basic ' + Buffer.from(SK() + ':').toString('base64');
async function bacaBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const b = await new Promise((ok) => { let s = ''; req.on('data', c => { s += c; if (s.length > 1e5) req.destroy(); }); req.on('end', () => ok(s)); req.on('error', () => ok('')); });
  try { return JSON.parse(b || '{}'); } catch (e) { return {}; }
}
function bersihCust(c) { const o = {}; c = c || {};
  if (c.first_name) o.first_name = String(c.first_name).slice(0, 50);
  if (c.phone) o.phone = String(c.phone);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || '').trim())) o.email = String(c.email).trim();
  return o; }
async function buatSnap(o, finishUrl) {
  const r = await fetch(BASE.snap + '/snap/v1/transactions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth() },
    body: JSON.stringify({ transaction_details: { order_id: o.order_id, gross_amount: o.gross_amount }, item_details: [o.item],
      customer_details: bersihCust(o.customer), callbacks: { finish: finishUrl }, expiry: { unit: 'hour', duration: 24 }, credit_card: { secure: true } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) throw new Error('Snap ' + r.status + ' ' + (j.error_messages || []).join('; '));
  return j;
}
async function cekStatus(orderId) {
  const r = await fetch(BASE.api + '/v2/' + encodeURIComponent(orderId) + '/status', { headers: { Accept: 'application/json', Authorization: auth() } });
  return r.json();
}
// v63: batalkan transaksi pending di Midtrans (tagihan lama yang diganti donasi ulang). 404 = donatur belum memilih metode (cukup dibatalkan di buku).
async function batalkan(orderId) {
  const r = await fetch(BASE.api + '/v2/' + encodeURIComponent(orderId) + '/cancel', { method: 'POST', headers: { Accept: 'application/json', Authorization: auth() } });
  return r.json().catch(() => ({}));
}
function tandaTanganSah(n) {
  if (!n || !n.signature_key) return false;
  const h = crypto.createHash('sha512').update(String(n.order_id) + String(n.status_code) + String(n.gross_amount) + SK()).digest('hex');
  const a = Buffer.from(h), b = Buffer.from(String(n.signature_key));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = { PROD, BASE, siap, bacaBody, buatSnap, cekStatus, tandaTanganSah, batalkan };
