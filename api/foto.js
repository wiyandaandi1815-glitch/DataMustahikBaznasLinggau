// GET /api/foto?id=KMP-2027-RAMADAN&f=<id foto> → gambar (hanya konten Tayang/Berakhir; dicek Apps Script)
const { panggil, ID_RE } = require('./_db');
module.exports = async (req, res) => {
  const id = String(req.query.id || '').toUpperCase(), f = String(req.query.f || '');
  if (!ID_RE.test(id) || !/^[A-Za-z0-9_-]{10,80}$/.test(f)) { res.status(400).send('Permintaan tidak valid'); return; }
  try {
    const r = await panggil('foto_publik', { id, foto: f });
    if (!r.ok) { res.setHeader('Cache-Control', 'public, s-maxage=60'); res.status(404).send('Foto tidak tersedia'); return; }
    res.setHeader('Content-Type', /^image\//.test(r.mime) ? r.mime : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(Buffer.from(r.base64, 'base64'));
  } catch (e) { res.status(502).send('Server data sedang sibuk'); }
};
