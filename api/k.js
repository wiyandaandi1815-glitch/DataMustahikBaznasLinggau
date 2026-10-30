// GET /k/<KODE> → halaman kecil berisi pratinjau Open Graph (WhatsApp/Facebook) lalu diarahkan ke kabar.html#KODE
const { panggil, ID_RE } = require('./_db');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID');
module.exports = async (req, res) => {
  const id = String(req.query.id || '').toUpperCase();
  const host = (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
  const tujuan = '/kabar.html' + (ID_RE.test(id) ? '#' + id : '');
  let judul = 'Kabar Kebaikan — BAZNAS Kota Lubuklinggau', desk = 'Kabar penyaluran dan kampanye kebaikan BAZNAS Kota Lubuklinggau.', gambar = host + '/logo-baznas.jpg';
  if (ID_RE.test(id)) {
    try {
      const x = await panggil('detail_publik', { id });
      if (x.ok) {
        if (x.jenis === 'kampanye') {
          judul = x.judul + ' — ' + x.persen + '% tercapai';
          desk = rp(x.terkumpul) + ' terkumpul dari target ' + rp(x.target) + (x.status === 'Berakhir' ? ' · kampanye selesai' : ' · sisa ' + x.sisa_hari + ' hari') + '. ' + String(x.cerita || '').replace(/\s+/g, ' ').slice(0, 140);
        } else {
          judul = x.judul;
          desk = rp(x.total_nilai) + ' tersalurkan untuk ' + x.jumlah_penerima + ' penerima. ' + String(x.cerita || '').replace(/\s+/g, ' ').slice(0, 140);
        }
        if (x.foto && x.foto[0]) gambar = host + '/api/foto?id=' + encodeURIComponent(id) + '&f=' + encodeURIComponent(x.foto[0]);
      }
    } catch (e) { /* tetap tampilkan pratinjau umum */ }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(judul)}</title><meta name="description" content="${esc(desk)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="BAZNAS Kota Lubuklinggau">
<meta property="og:title" content="${esc(judul)}"><meta property="og:description" content="${esc(desk)}">
<meta property="og:image" content="${esc(gambar)}"><meta property="og:url" content="${esc(host + '/k/' + id)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(tujuan)}"></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:40px"><p>Membuka kabar BAZNAS…</p><p><a href="${esc(tujuan)}">Lanjutkan</a></p>
<script>location.replace(${JSON.stringify(tujuan)});</script></body></html>`);
};
