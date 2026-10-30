/* Kabar BAZNAS Kota Lubuklinggau — halaman publik (hanya membaca lewat aksi API; tanpa data pribadi).
   Konfigurasi lewat window.KABAR_CONFIG = { api, foto, bagikan, cekSetoran, laporanKeuangan } */
(function () {
  const C = Object.assign({ api: '', foto: '/api/foto', bagikan: '/k/', cekSetoran: 'pengajuan.html#setoran', laporanKeuangan: 'https://kotalubuklinggau.baznas.go.id/' }, window.KABAR_CONFIG || {});
  const app = document.getElementById('kabar-app');
  const gerakMinim = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data = null, tabAktif = 'kampanye', sudahHitung = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = n => 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID');
  const rpRingkas = n => { n = +n || 0; return n >= 1e9 ? 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M' : n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : rp(n); };
  const tgl = s => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const relatif = s => { const d = new Date(s); if (isNaN(d)) return ''; const m = Math.round((Date.now() - d) / 60000); if (m < 60) return m <= 1 ? 'baru saja' : m + ' menit lalu'; const j = Math.round(m / 60); if (j < 24) return j + ' jam lalu'; const h = Math.round(j / 24); return h < 7 ? h + ' hari lalu' : tgl(s); };
  const programKelas = p => { p = String(p || '').toLowerCase(); return /didik|beasiswa|sekolah|kuliah|santri/.test(p) ? 'pend' : /usaha|modal|ekonomi|chicken|produktif|auto/.test(p) ? 'eko' : /sehat|obat|rumah sakit|berobat/.test(p) ? 'kes' : /sembako|pangan|bencana|kemanusiaan|lansia|fakir|miskin/.test(p) ? 'sos' : 'lain'; };
  const ikon = { pend: '🎓', eko: '🏪', sos: '🤲', kes: '🩺', lain: '💚' };

  async function api(aksi, d) {
    const r = await fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ aksi, data: d || {} }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  // Foto: lewat fungsi Vercel (gambar ber-cache); bila tidak tersedia → ambil base64 lewat API.
  function fotoSrc(id, f) { return C.foto ? C.foto + '?id=' + encodeURIComponent(id) + '&f=' + encodeURIComponent(f) : ''; }
  function pasangFoto(root) {
    root.querySelectorAll('img[data-f]').forEach(img => {
      const id = img.dataset.id, f = img.dataset.f;
      img.onerror = async () => { img.onerror = null; try { const r = await api('foto_publik', { id, foto: f }); if (r.ok) img.src = 'data:' + r.mime + ';base64,' + r.base64; } catch (e) { } };
      const src = fotoSrc(id, f);
      if (src) img.src = src; else img.onerror();
    });
  }
  function animasiBar(root) {
    const bars = root.querySelectorAll('.kb-bar>i[data-w]');
    const set = () => bars.forEach(b => { b.style.width = b.dataset.w + '%'; });
    if (gerakMinim) return set();
    requestAnimationFrame(() => requestAnimationFrame(set));
    if (sudahHitung) return; sudahHitung = true;
    root.querySelectorAll('[data-hitung]').forEach(el => {
      const akhir = +el.dataset.hitung, mulai = performance.now(), fmt = el.dataset.fmt === 'rp' ? rp : (n => Math.round(n).toLocaleString('id-ID'));
      const t = now => { const k = Math.min(1, (now - mulai) / 1000); el.textContent = fmt(akhir * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(t); };
      requestAnimationFrame(t);
    });
  }
  const tautan = id => location.origin + C.bagikan + encodeURIComponent(id);
  function waLink(judul, id, ekor) { return 'https://wa.me/?text=' + encodeURIComponent(judul + (ekor ? ' — ' + ekor : '') + '\n' + tautan(id)); }

  function kartuKampanye(k) {
    const akhir = k.status === 'Berakhir', kls = programKelas(k.program);
    return `<article class="kb-kmp${akhir ? ' akhir' : ''}">
      <a class="kb-foto" href="#${esc(k.id)}" aria-label="${esc(k.judul)}">${k.foto ? `<img data-id="${esc(k.id)}" data-f="${esc(k.foto)}" alt="Kegiatan: ${esc(k.judul)}" loading="lazy">` : `<span class="kb-ph">${ikon[kls]}</span>`}
        <span class="kb-label kiri">${akhir ? 'Selesai' : 'Sisa ' + k.sisa_hari + ' hari'}</span><span class="kb-label kanan">${esc(k.jenis_dana)}</span></a>
      <div class="kb-isi">
        <h3><a href="#${esc(k.id)}" style="color:inherit;text-decoration:none">${esc(k.judul)}</a></h3>
        <p class="kb-ajak">${esc(k.ringkas)}</p>
        <div class="kb-bar" role="progressbar" aria-valuenow="${k.persen}" aria-valuemin="0" aria-valuemax="100" aria-label="Tercapai ${k.persen}%"><i data-w="${Math.min(100, k.persen)}"></i></div>
        <div class="kb-kumpul"><span><b data-hitung="${k.terkumpul}" data-fmt="rp">${rp(k.terkumpul)}</b> terkumpul</span><span>${k.persen}%</span></div>
        <div class="kb-tiga"><div><b>${rpRingkas(k.target)}</b><small>Target</small></div><div><b>${k.donatur.toLocaleString('id-ID')}</b><small>Donatur</small></div><div><b>${akhir ? '—' : k.sisa_hari}</b><small>Hari lagi</small></div></div>
        ${akhir ? `<div class="kb-hasil">✅ Terkumpul ${rp(k.terkumpul)} dari ${k.donatur} donatur. Jazakumullah khairan.</div>` :
        `<div class="kb-aksi"><button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Cara berdonasi</button>
          <a class="kb-btn wa" href="${waLink(k.judul, k.id, k.persen + '% tercapai')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}</a></div>`}
      </div></article>`;
  }
  function kartuKabar(x) {
    const kls = programKelas(x.program);
    return `<a class="kb-kabar" href="#${esc(x.id)}">
      <div class="kb-mini kb-prog-${kls}">${x.foto ? `<img data-id="${esc(x.id)}" data-f="${esc(x.foto)}" alt="" loading="lazy">` : ikon[kls]}</div>
      <div><small>${esc(relatif(x.waktu_tayang))}${x.kecamatan ? ' · ' + esc(x.kecamatan) : ''}</small>
      <h4>${esc(x.judul)}</h4>
      <div class="kb-rp">${rp(x.total_nilai)} tersalurkan · ${x.jumlah_penerima} penerima</div></div></a>`;
  }
  const svgWa = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4 5.1 5.1 0 003.2.7 2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';

  function render() {
    if (!data) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (/^(KMP|PUB)-/.test(h)) return detail(h);
    const tayang = data.kampanye.filter(k => k.status === 'Tayang'), selesai = data.kampanye.filter(k => k.status === 'Berakhir');
    const bln = new Date(data.bulan_ini.bulan + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long' });
    app.innerHTML = `
      <section class="kb-dampak" aria-label="Dampak tahun ${esc(data.dampak.tahun)}">
        <div><strong data-hitung="${data.dampak.penerima}">${data.dampak.penerima.toLocaleString('id-ID')}</strong><small>penerima manfaat</small></div>
        <div class="emas"><strong>${rpRingkas(data.dampak.tersalurkan)}</strong><small>tersalurkan</small></div>
        <div class="kb-cap">Sepanjang tahun ${esc(data.dampak.tahun)} · data langsung dari pembukuan BAZNAS</div>
      </section>
      <div class="kb-tabs" role="tablist">
        <button role="tab" aria-selected="${tabAktif === 'kampanye'}" data-tab="kampanye">Kampanye${tayang.length ? ' (' + tayang.length + ')' : ''}</button>
        <button role="tab" aria-selected="${tabAktif === 'kabar'}" data-tab="kabar">Kabar Penyaluran</button>
      </div>
      <div id="kb-panel">${tabAktif === 'kampanye' ?
        (tayang.length ? `<div class="kb-grid">${tayang.map(kartuKampanye).join('')}</div>` : '<div class="kb-kosong">Belum ada kampanye yang berjalan. Pantau terus halaman ini.</div>') +
        (selesai.length ? `<div class="kb-judul-bag">Kampanye selesai</div><div class="kb-grid">${selesai.map(kartuKampanye).join('')}</div>` : '')
        : `<div class="kb-ringkas"><div class="h"><strong data-hitung="${data.bulan_ini.penerima}">${data.bulan_ini.penerima}</strong><small>Penerima bulan ${esc(bln)}</small></div>
           <div class="e"><strong>${rpRingkas(data.bulan_ini.tersalurkan)}</strong><small>Disalurkan bulan ${esc(bln)}</small></div></div>` +
          (data.kabar.length ? data.kabar.map(kartuKabar).join('') : '<div class="kb-kosong">Belum ada kabar penyaluran.</div>')}</div>`;
    pasangFoto(app); animasiBar(app);
    document.title = 'Kabar Kebaikan — BAZNAS Kota Lubuklinggau';
  }

  async function detail(id) {
    app.innerHTML = '<a class="kb-kembali" href="#">← Semua kabar</a><div class="kb-skel"></div>';
    let x;
    try { x = await api('detail_publik', { id }); } catch (e) { app.innerHTML = '<a class="kb-kembali" href="#">← Kembali</a><div class="kb-kosong">Gagal memuat. Periksa koneksi lalu coba lagi.</div>'; return; }
    if (!x.ok) { app.innerHTML = `<a class="kb-kembali" href="#">← Kembali</a><div class="kb-kosong">${esc(x.pesan)}</div>`; return; }
    const kmp = x.jenis === 'kampanye', akhir = x.status === 'Berakhir', kls = programKelas(x.program);
    const fotoUtama = x.foto[0];
    app.innerHTML = `<a class="kb-kembali" href="#">← Semua kabar</a>
    <article class="kb-kmp kb-detail${akhir ? ' akhir' : ''}">
      <div class="kb-foto">${fotoUtama ? `<img data-id="${esc(x.id)}" data-f="${esc(fotoUtama)}" alt="Kegiatan: ${esc(x.judul)}">` : `<span class="kb-ph">${ikon[kls]}</span>`}
        ${kmp ? `<span class="kb-label kiri">${akhir ? 'Selesai' : 'Sisa ' + x.sisa_hari + ' hari'}</span><span class="kb-label kanan">${esc(x.jenis_dana)}</span>` : ''}</div>
      <div class="kb-isi">
        <span class="kb-chip kb-prog-${kls}">${esc(x.program)}</span>
        <h3 style="font-size:20px">${esc(x.judul)}</h3>
        ${kmp ? `<div class="kb-bar" role="progressbar" aria-valuenow="${x.persen}" aria-valuemin="0" aria-valuemax="100"><i data-w="${Math.min(100, x.persen)}"></i></div>
          <div class="kb-kumpul"><span><b data-hitung="${x.terkumpul}" data-fmt="rp">${rp(x.terkumpul)}</b> terkumpul</span><span>${x.persen}%</span></div>
          <div class="kb-tiga"><div><b>${rpRingkas(x.target)}</b><small>Target</small></div><div><b>${x.donatur}</b><small>Donatur</small></div><div><b>${akhir ? '—' : x.sisa_hari}</b><small>Hari lagi</small></div></div>
          <small style="color:var(--kb-redup)">${tgl(x.tanggal_mulai)} – ${tgl(x.tanggal_berakhir)} · untuk ${esc(x.program)}</small>`
        : `<div class="kb-ringkas" style="margin-top:8px"><div class="h"><strong>${x.jumlah_penerima}</strong><small>penerima</small></div><div class="e"><strong>${rpRingkas(x.total_nilai)}</strong><small>tersalurkan</small></div></div>
          <small style="color:var(--kb-redup)">${tgl(x.tanggal_kegiatan)}${x.kecamatan ? ' · ' + esc(x.kecamatan) : ''}</small>`}
        ${x.cerita ? `<div class="kb-cerita">${esc(x.cerita)}</div>` : ''}
        ${x.kutipan ? `<blockquote class="kb-kutip">${esc(x.kutipan)}</blockquote>` : ''}
        ${x.foto.length > 1 ? `<div class="kb-galeri">${x.foto.slice(1).map(f => `<img data-id="${esc(x.id)}" data-f="${esc(f)}" alt="Dokumentasi kegiatan" loading="lazy">`).join('')}</div>` : ''}
        ${x.testimoni ? `<div class="kb-testi">💬 “${esc(x.testimoni)}”<br><small style="color:var(--kb-redup)">— penerima manfaat (dimuat dengan izin)</small></div>` : ''}
        <div class="kb-aksi" style="margin-top:12px">
          ${kmp && !akhir ? `<button class="kb-btn utama" type="button" data-donasi="${esc(x.id)}">Cara berdonasi</button>` : `<a class="kb-btn utama" href="#">Lihat kabar lainnya</a>`}
          <a class="kb-btn wa" href="${waLink(x.judul, x.id, kmp ? x.persen + '% tercapai' : rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}</a></div>
      </div></article>`;
    if (kmp) cacheDetail[x.id] = x;
    pasangFoto(app); animasiBar(app);
    document.title = x.judul + ' — BAZNAS Kota Lubuklinggau';
    window.scrollTo({ top: 0 });
  }
  const cacheDetail = {};

  async function bukaDonasi(id) {
    const l = document.getElementById('kb-lembar'), isi = l.querySelector('.kb-lembar-isi');
    isi.innerHTML = '<div class="kb-skel" style="height:140px"></div>'; l.classList.add('buka');
    let x = cacheDetail[id];
    if (!x) { try { x = await api('detail_publik', { id }); } catch (e) { x = null; } if (x && x.ok) cacheDetail[id] = x; }
    if (!x || !x.ok) { isi.innerHTML = '<p>Gagal memuat informasi rekening. Coba lagi.</p>'; return; }
    const noRek = (String(x.rekening_tujuan).match(/\d[\d\s.-]{6,}\d/) || [''])[0].replace(/[\s.-]/g, '');
    isi.innerHTML = `<h3 style="margin:0 0 4px">Cara berdonasi</h3><p style="margin:0;color:var(--kb-redup);font-size:14px">${esc(x.judul)}</p>
      ${x.rekening_tujuan ? `<div class="kb-rek">${esc(x.rekening_tujuan)}</div>` : ''}
      ${noRek ? `<button class="kb-btn garis" type="button" style="width:100%" data-salin="${esc(noRek)}">📋 Salin nomor rekening</button>` : ''}
      ${x.qris ? `<p style="text-align:center;margin:14px 0 0;font-weight:700">atau pindai QRIS resmi</p><img class="kb-qris" data-id="${esc(x.id)}" data-f="${esc(x.qris)}" alt="QRIS resmi BAZNAS Kota Lubuklinggau">` : ''}
      <p style="font-size:13px;color:var(--kb-redup);margin-top:12px">Tuliskan berita transfer: <b>${esc(x.id)}</b> agar donasi tercatat untuk kampanye ini. Konfirmasi ke kantor BAZNAS 0812-7144-8282. BAZNAS tidak pernah meminta transfer ke rekening pribadi.</p>
      <button class="kb-btn utama" type="button" style="width:100%;margin-top:6px" data-tutup>Tutup</button>`;
    pasangFoto(isi);
  }

  async function muat() {
    app.innerHTML = '<div class="kb-skel" style="height:110px;margin-top:-42px"></div><div class="kb-skel"></div><div class="kb-skel"></div>';
    try { data = await api('daftar_publik'); if (!data.ok) throw new Error(data.pesan); render(); }
    catch (e) { app.innerHTML = '<div class="kb-kosong" style="margin-top:-30px;background:var(--kb-kartu);border-radius:14px">Gagal memuat data. Periksa koneksi internet lalu <a href="javascript:location.reload()">muat ulang</a>.</div>'; }
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-donasi],[data-salin],[data-tutup]');
    if (!t) { if (e.target.id === 'kb-lembar') e.target.classList.remove('buka'); return; }
    if (t.dataset.tab) { tabAktif = t.dataset.tab; render(); }
    else if (t.dataset.donasi) bukaDonasi(t.dataset.donasi);
    else if (t.dataset.salin) { (navigator.clipboard ? navigator.clipboard.writeText(t.dataset.salin) : Promise.reject()).then(() => { t.textContent = '✓ Nomor rekening disalin'; }).catch(() => prompt('Salin nomor rekening:', t.dataset.salin)); }
    else if (t.hasAttribute('data-tutup')) document.getElementById('kb-lembar').classList.remove('buka');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('kb-lembar').classList.remove('buka'); });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (!h) { render(); window.scrollTo({ top: 0 }); } else if (/^(KMP|PUB)-/.test(decodeURIComponent(h))) render(); });
  muat();
})();
