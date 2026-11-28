// GET /api/foto?id=KMP-2027-RAMADAN&f=<id foto> → gambar (hanya konten Tayang/Berakhir; dicek Apps Script)
// v90: permintaan foto yang sama secara serentak digabung (1 panggilan Apps Script), simpanan memori singkat per instans,
// cache browser 1 hari agar pengunjung lama tidak memanggil ulang setelah situs diunggah.
const { panggil, ID_RE } = require('./_db');
const MEM = new Map(), JALAN = new Map(), MEM_MAKS = 40, MEM_UMUR = 10 * 60 * 1000;
function ambil(id, f) {
  const k = id + '|' + f, m = MEM.get(k);
  if (m && Date.now() - m.t < MEM_UMUR) return Promise.resolve(m.r);
  if (JALAN.has(k)) return JALAN.get(k);
  const p = panggil('foto_publik', { id, foto: f }).then(r => {
    if (r && r.ok) { MEM.set(k, { r, t: Date.now() }); if (MEM.size > MEM_MAKS) MEM.delete(MEM.keys().next().value); }
    return r;
  }).finally(() => JALAN.delete(k));
  JALAN.set(k, p);
  return p;
}
module.exports = async (req, res) => {
  const id = String(req.query.id || '').toUpperCase(), f = String(req.query.f || '');
  if (!ID_RE.test(id) || !/^[A-Za-z0-9_-]{10,80}$/.test(f)) { res.status(400).send('Permintaan tidak valid'); return; }
  try {
    const r = await ambil(id, f);
    if (!r.ok) { res.setHeader('Cache-Control', 'public, s-maxage=60'); res.status(404).send('Foto tidak tersedia'); return; }
    res.setHeader('Content-Type', /^image\//.test(r.mime) ? r.mime : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(Buffer.from(r.base64, 'base64'));
  } catch (e) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Retry-After', '5'); res.status(502).send('Server data sedang sibuk'); }
};
