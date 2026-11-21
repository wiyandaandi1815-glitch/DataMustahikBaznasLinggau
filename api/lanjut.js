// v62 — POST /api/lanjut {order_id} → {ok, token, client_key, snap_js}: membuka kembali tagihan Snap yang sama selama masih Menunggu & < 24 jam.
// Token diambil dari Apps Script dengan kunci internal; Server Key tetap di server.
const { panggil } = require('./_db');
const M = require('./_midtrans');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).send('Gunakan POST'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (!M.siap()) { res.status(200).send(JSON.stringify({ ok: false, pesan: 'Pembayaran online belum diaktifkan.' })); return; }
  const b = await M.bacaBody(req), order = String(b.order_id || '');
  if (!/^ONL-\d{6}-[A-Z0-9]{8}$/.test(order)) { res.status(200).send(JSON.stringify({ ok: false, pesan: 'Nomor transaksi tidak valid.' })); return; }
  try {
    const o = await panggil('bayar_lanjut', { kunci_internal: process.env.GATEWAY_INTERNAL_KEY, order_id: order });
    if (!o.ok) { res.status(200).send(JSON.stringify({ ok: false, kode: o.kode || '', pesan: o.pesan })); return; }
    res.status(200).send(JSON.stringify({ ok: true, order_id: order, token: o.token, client_key: process.env.MIDTRANS_CLIENT_KEY, snap_js: M.BASE.snap + '/snap/snap.js', sandbox: !M.PROD }));
  } catch (e) { console.error('lanjut', e.message); res.status(200).send(JSON.stringify({ ok: false, pesan: 'Gagal membuka tagihan. Coba lagi beberapa saat.' })); }
};
