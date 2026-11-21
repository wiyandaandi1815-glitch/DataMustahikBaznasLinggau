// v63 — POST /api/sinkron {order_ids:[…]} → cocokkan status transaksi Menunggu dengan Midtrans (dipakai tombol "Sinkronkan" WK III).
// Status selalu diambil dari API Midtrans sendiri (tidak bisa dipalsukan pemanggil), lalu diteruskan ke Apps Script dengan kunci internal.
const { panggil } = require('./_db');
const M = require('./_midtrans');
const AMBIL = ['order_id', 'transaction_status', 'fraud_status', 'gross_amount', 'payment_type', 'transaction_id', 'transaction_time',
  'settlement_time', 'status_code', 'va_numbers', 'permata_va_number', 'issuer', 'acquirer'];
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).send('Gunakan POST'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (!M.siap()) { res.status(200).send(JSON.stringify({ ok: false, pesan: 'Pembayaran online belum diaktifkan.' })); return; }
  const b = await M.bacaBody(req), K = process.env.GATEWAY_INTERNAL_KEY;
  const ids = (Array.isArray(b.order_ids) ? b.order_ids : []).map(String).filter(x => /^ONL-\d{6}-[A-Z0-9]{8}$/.test(x)).slice(0, 30);
  const hasil = [];
  for (const id of ids) {
    try {
      const s = await M.cekStatus(id);
      if (s && String(s.order_id) === id && s.transaction_status) {
        const status = {}; AMBIL.forEach(k => { if (s[k] !== undefined) status[k] = s[k]; });
        const r = await panggil('bayar_notif', { kunci_internal: K, status });
        hasil.push({ order_id: id, midtrans: s.transaction_status, status: r.status || '', ok: !!r.ok });
      } else if (s && String(s.status_code) === '404') {
        const r = await panggil('bayar_kedaluwarsa', { kunci_internal: K, order_id: id });
        hasil.push({ order_id: id, midtrans: 'tidak dikenal', status: r.status || '', ok: !!r.ok });
      } else hasil.push({ order_id: id, ok: false });
    } catch (e) { console.error('sinkron', id, e.message); hasil.push({ order_id: id, ok: false }); }
  }
  res.status(200).send(JSON.stringify({ ok: true, hasil }));
};
