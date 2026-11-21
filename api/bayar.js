// POST /api/bayar {kode_kampanye | layanan:'zakat'|'infak', nilai, nama, wa, email, doa, anonim, setuju} → {ok, token, client_key, snap_js, order_id}
// Nominal & nomor order ditentukan server (Apps Script); kunci Midtrans tetap di server.
const { panggil } = require('./_db');
const M = require('./_midtrans');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).send('Gunakan POST'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (!M.siap()) { res.status(200).send(JSON.stringify({ ok: false, pesan: 'Pembayaran online belum diaktifkan.' })); return; }
  const b = await M.bacaBody(req);
  const data = { kode_kampanye: b.kode_kampanye, nilai: b.nilai, nama: b.nama, wa: b.wa, email: b.email, doa: b.doa, anonim: b.anonim === true, setuju: b.setuju === true,
    layanan: b.layanan, niat: b.niat === true, npwp: b.npwp, nik: b.nik, alamat: b.alamat,   // v47 zakat/infak umum
    kelas: b.kelas, jiwa: Array.isArray(b.jiwa) ? b.jiwa.slice(0, 25) : undefined, hari: b.hari, atas_nama: b.atas_nama };   // v48 fitrah/fidyah
  try {
    const o = await panggil('bayar_siapkan', { kunci_internal: process.env.GATEWAY_INTERNAL_KEY, data });
    if (!o.ok) { res.status(200).send(JSON.stringify({ ok: false, pesan: o.pesan })); return; }
    const situs = process.env.SITE_URL || ('https://' + (req.headers['x-forwarded-host'] || req.headers.host));
    const s = await M.buatSnap(o, situs + '/kabar.html#bayar-' + o.order_id);
    // v62: simpan token agar tagihan yang sama bisa dibuka lagi (tombol Lanjutkan Pembayaran); gagal simpan tidak menghentikan pembayaran
    try { await panggil('bayar_token', { kunci_internal: process.env.GATEWAY_INTERNAL_KEY, order_id: o.order_id, token: s.token }); } catch (e) { console.error('bayar_token', e.message); }
    res.status(200).send(JSON.stringify({ ok: true, order_id: o.order_id, token: s.token, client_key: process.env.MIDTRANS_CLIENT_KEY,
      snap_js: M.BASE.snap + '/snap/snap.js', sandbox: !M.PROD }));
  } catch (e) { console.error('bayar', e.message); res.status(200).send(JSON.stringify({ ok: false, pesan: 'Gagal membuat transaksi. Coba lagi beberapa saat.' })); }
};
