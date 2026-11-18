// POST /api/notif — Notification URL Midtrans. Tanda tangan SHA512 diverifikasi, status ditanyakan ulang ke API Midtrans,
// lalu diteruskan ke Apps Script dengan kunci internal. Gagal → 500 agar Midtrans mengirim ulang.
const { panggil } = require('./_db');
const M = require('./_midtrans');
const AMBIL = ['order_id', 'transaction_status', 'fraud_status', 'gross_amount', 'payment_type', 'transaction_id', 'transaction_time',
  'settlement_time', 'status_code', 'va_numbers', 'permata_va_number', 'issuer', 'acquirer'];
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('POST'); return; }
  if (!M.siap()) { res.status(503).send('belum aktif'); return; }
  const n = await M.bacaBody(req);
  if (!M.tandaTanganSah(n)) { console.warn('notif: tanda tangan tidak sah', n && n.order_id); res.status(403).send('tanda tangan tidak sah'); return; }
  try {
    const s = await M.cekStatus(n.order_id);
    if (!s || String(s.order_id) !== String(n.order_id)) throw new Error('status API tidak cocok');
    const status = {}; AMBIL.forEach(k => { if (s[k] !== undefined) status[k] = s[k]; });
    const r = await panggil('bayar_notif', { kunci_internal: process.env.GATEWAY_INTERNAL_KEY, status });
    if (!r.ok && r.kode === 'SIBUK') throw new Error('sibuk');
    res.status(200).send('OK');
  } catch (e) { console.error('notif', e.message); res.status(500).send('coba lagi'); }
};
