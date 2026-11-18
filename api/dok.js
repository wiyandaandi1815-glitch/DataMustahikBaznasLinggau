// GET /api/dok?id=DOK-2611-0001 → PDF dokumen PPID (hanya status Terbuka & aktif; dicek Apps Script)
const { panggil } = require('./_db');
module.exports = async (req, res) => {
  const id = String(req.query.id || '').toUpperCase();
  if (!/^DOK-\d{4}-\d{4}$/.test(id)) { res.status(400).send('Permintaan tidak valid'); return; }
  try {
    const r = await panggil('ppid_dok_file', { id });
    if (!r.ok) { res.setHeader('Cache-Control', 'public, s-maxage=60'); res.status(404).send(r.pesan || 'Dokumen tidak tersedia'); return; }
    const nama = String(r.nama || id + '.pdf').replace(/[^\w.\- ]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + nama + '"');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(Buffer.from(r.base64, 'base64'));
  } catch (e) { res.status(502).send('Server data sedang sibuk'); }
};
