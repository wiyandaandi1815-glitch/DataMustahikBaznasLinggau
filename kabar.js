/* Kabar BAZNAS Kota Lubuklinggau — halaman publik (hanya membaca lewat aksi API; tanpa data pribadi).
   Konfigurasi lewat window.KABAR_CONFIG = { api, foto, bagikan, cekSetoran, laporanKeuangan } */
(function () {
  const C = Object.assign({ api: '', foto: '/api/foto', bagikan: '/k/', cekSetoran: 'pengajuan.html#setoran', laporanKeuangan: 'https://kotalubuklinggau.baznas.go.id/',
    muzaki: 'muzaki.html', ketua: 'Marjianto, S.H., M.H.', nisabBulan: 7640144, nisabSumber: 'SK Ketua BAZNAS No. 15 Tahun 2026' }, window.KABAR_CONFIG || {});
  const app = document.getElementById('kabar-app');
  const gerakMinim = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data = null, tabAktif = '', sudahHitung = false;
  const F = { kec: '', kat: '', cari: '' };   // v18: filter kabar penyaluran
  const KEC = ['Barat I', 'Barat II', 'Selatan I', 'Selatan II', 'Timur I', 'Timur II', 'Utara I', 'Utara II'];
  const kunciKec = s => String(s || '').toLowerCase().replace(/lubuk\s*linggau|lubuklinggau|kecamatan|kec\./g, '').replace(/[^a-z0-9]/g, '');
  const LABEL_KLS = { pend: 'Pendidikan', sos: 'Kemanusiaan', eko: 'Ekonomi', kes: 'Kesehatan', lain: 'Umum' };
  const kategori = p => /infak|sedekah|infaq/i.test(p || '') ? 'Infak' : /zakat/i.test(p || '') && programKelas(p) === 'lain' ? 'Zakat' : LABEL_KLS[programKelas(p)];

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
        <p class="kb-ajak">${esc(k.ringkas)}</p>${ringkasBea(k)}
        <div class="kb-bar" role="progressbar" aria-valuenow="${k.persen}" aria-valuemin="0" aria-valuemax="100" aria-label="Tercapai ${k.persen}%"><i data-w="${Math.min(100, k.persen)}"></i></div>
        <div class="kb-kumpul"><span><b data-hitung="${k.terkumpul}" data-fmt="rp">${rp(k.terkumpul)}</b> terkumpul</span><span>${k.persen}%</span></div>
        <div class="kb-tiga"><div><b>${rpRingkas(k.target)}</b><small>Target</small></div><div><b>${k.donatur.toLocaleString('id-ID')}</b><small>Donatur</small></div><div><b>${akhir ? '—' : k.sisa_hari}</b><small>Hari lagi</small></div></div>
        ${k.donatur ? `<a class="kb-ke-donatur" href="#${esc(k.id)}" data-ke-donatur>👥 Lihat daftar ${k.donatur.toLocaleString('id-ID')} donatur →</a>` : ''}
        ${akhir ? `<div class="kb-hasil">✅ Terkumpul ${rp(k.terkumpul)} dari ${k.donatur} donatur. Jazakumullah khairan.</div>
          <button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-bagi="${esc(k.id)}" data-judul="${esc(k.judul)}">${svgBagi} Bagikan kabar baik ini</button>` :
        `<div class="kb-aksi"><button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Cara berdonasi</button>
          <a class="kb-btn wa" href="${waLink(k.judul, k.id, k.persen + '% tercapai')}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan lewat WhatsApp">${svgWa}</a>
          <button class="kb-btn garis" type="button" data-bagi="${esc(k.id)}" data-judul="${esc(k.judul)}" aria-label="Bagikan ke Facebook, Instagram, X, dan lainnya">${svgBagi}</button></div>`}
      </div></article>`;
  }
  // v12: ringkasan & tab Perkembangan Beasiswa — hanya agregat (kelompok < 3 tampil "<3"), tanpa nama/nilai/sekolah perorangan
  function ringkasBea(k) {
    const b = data && data.beasiswa;
    if (!b || programKelas(k.program) !== 'pend') return '';
    return `<div class="kb-bea-mini">🎓 <b>${esc(b.binaan_aktif)}</b> penerima beasiswa aktif${b.persen_naik_kelas != null ? ' · <b>' + b.persen_naik_kelas + '%</b> naik kelas' : ''} · <a href="#" data-tab="beasiswa">Lihat perkembangan</a></div>`;
  }
  function panelBeasiswa() {
    const b = data.beasiswa;
    if (!b) return '<div class="kb-kosong">Data perkembangan beasiswa belum tersedia.</div>';
    const maks = Math.max(1, ...b.per_jenjang.map(j => typeof j.jumlah === 'number' ? j.jumlah : 2));
    const tr = b.tren_nilai || [];
    return `<div class="kb-bea">
      <div class="kb-ringkas"><div class="h"><strong>${esc(b.binaan_aktif)}</strong><small>penerima beasiswa aktif</small></div>
        <div class="e"><strong>${b.persen_naik_kelas != null ? b.persen_naik_kelas + '%' : '—'}</strong><small>naik kelas${b.persen_naik_kelas != null ? ' (dari ' + esc(b.dasar_naik_kelas) + ' laporan)' : ' — data belum cukup'}</small></div></div>
      <div class="kb-ringkas"><div class="h"><strong>${esc(b.lulus_jenjang)}</strong><small>lulus jenjang</small></div><div class="e"><strong>${esc(b.lanjut_jenjang)}</strong><small>lanjut ke jenjang berikutnya</small></div></div>
      <div class="kb-judul-bag">Penerima per jenjang</div>
      ${b.per_jenjang.length ? b.per_jenjang.map(j => `<div class="kb-jen"><span>${esc(j.jenjang)}</span><div class="kb-bar"><i data-w="${Math.round((typeof j.jumlah === 'number' ? j.jumlah : 2) / maks * 100)}"></i></div><b>${esc(j.jumlah)}</b></div>`).join('') : '<div class="kb-kosong">Belum ada data.</div>'}
      <div class="kb-judul-bag">Tren rata-rata nilai</div>
      ${tr.length ? `<div class="kb-tren">${tr.map(t => `<div><div class="kb-tren-bt" style="height:${Math.max(8, Math.round(t.rata))}%"><b>${t.rata}</b></div><small>${esc(t.semester)}</small></div>`).join('')}</div>`
        : '<div class="kb-kosong" style="padding:14px">Tren ditampilkan setelah minimal 3 laporan per semester.</div>'}
      <div class="kb-judul-bag">Cerita pilihan</div>
      ${b.cerita.length ? b.cerita.map(c => `<article class="kb-cerita-bea"><small>${esc(c.jenjang)} · ${esc(new Date(c.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))}</small><h4>${esc(c.judul)}</h4><p>${esc(c.cerita)}</p><small>— ${esc(c.nama_samaran)} (nama samaran)</small></article>`).join('')
        : '<div class="kb-kosong" style="padding:14px">Belum ada cerita yang ditayangkan.</div>'}
      <p class="kb-cap" style="margin-top:12px">Angka agregat dari laporan semester yang telah diverifikasi petugas. Kelompok di bawah 3 orang ditampilkan "&lt;3". Nama, nilai, dan sekolah penerima tidak ditampilkan.</p>
    </div>`;
  }
  function kecOk(x) { if (!F.kec) return true; const k = kunciKec(F.kec); return String(x.kecamatan || '').split(/[,;/]/).some(p => kunciKec(p) === k); }
  function kabarTersaring() {
    const q = F.cari.trim().toLowerCase();
    return data.kabar.filter(x => kecOk(x) && (!F.kat || kategori(x.program) === F.kat) && (!q || (x.judul + ' ' + (x.ringkas || '') + ' ' + (x.program || '')).toLowerCase().includes(q)));
  }
  function kartuKabar(x) {
    const kls = programKelas(x.program), kapan = x.tanggal_kegiatan ? tgl(x.tanggal_kegiatan) : relatif(x.waktu_tayang);
    return `<article class="kb-kartu">
      <a class="kb-kabar" href="#${esc(x.id)}">
        <div class="kb-kfoto kb-prog-${kls}">${x.foto ? `<img data-id="${esc(x.id)}" data-f="${esc(x.foto)}" alt="Dokumentasi: ${esc(x.judul)}" loading="lazy">` : `<span aria-hidden="true">${ikon[kls]}</span>`}</div>
        <div class="kb-kisi">
          <div class="kb-meta"><span class="kb-chip kb-prog-${kls}">${esc(kategori(x.program))}</span><time>${esc(kapan)}</time></div>
          <h4>${esc(x.judul)}</h4>
          ${x.kecamatan ? `<div class="kb-lok">${svgPin}${esc(x.kecamatan)}</div>` : ''}
          ${x.ringkas ? `<p>${esc(x.ringkas)}</p>` : ''}
          <div class="kb-rp">${rp(x.total_nilai)} tersalurkan · ${x.jumlah_penerima} penerima</div>
          <span class="kb-baca">Baca selengkapnya →</span>
        </div></a>
      <a class="kb-bagi" href="${waLink(x.judul, x.id, rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan lewat WhatsApp">${svgWa}</a>
    </article>`;
  }
  function filterKabar() {
    const n = k => data.kabar.filter(x => (!F.kat || kategori(x.program) === F.kat) && (!k || String(x.kecamatan || '').split(/[,;/]/).some(p => kunciKec(p) === kunciKec(k)))).length;
    const kat = [...new Set(data.kabar.map(x => kategori(x.program)))];
    const chip = (attr, nilai, label, aktif) => `<button type="button" class="kb-pil" ${attr}="${esc(nilai)}" aria-pressed="${aktif}">${label}</button>`;
    return `<div class="kb-saring" role="search">
      <div class="kb-saring-baris"><span class="kb-saring-lbl">Kecamatan</span><div class="kb-pils">${chip('data-kec', '', 'Semua <small>' + n('') + '</small>', !F.kec)}${KEC.map(k => chip('data-kec', k, esc(k) + ' <small>' + n(k) + '</small>', F.kec === k)).join('')}</div></div>
      ${kat.length > 1 ? `<div class="kb-saring-baris"><span class="kb-saring-lbl">Kategori</span><div class="kb-pils">${chip('data-kat', '', 'Semua', !F.kat)}${kat.map(k => chip('data-kat', k, esc(k), F.kat === k)).join('')}</div></div>` : ''}
      <label class="kb-cari"><span class="kb-saring-lbl">Cari kabar</span><input type="search" id="kb-cari" value="${esc(F.cari)}" placeholder="mis. modal usaha, beasiswa" autocomplete="off"></label>
    </div>`;
  }
  function isiKabar() {
    const box = document.getElementById('kb-kabar-grid'); if (!box) return;
    const xs = kabarTersaring();
    const sorot = !F.kec && !F.kat && !F.cari.trim();   // v39: kabar terbaru tampil besar bila tanpa saringan
    box.innerHTML = xs.length ? xs.map((x, i) => i === 0 && sorot && xs.length > 2 ? kartuKabar(x).replace('<article class="kb-kartu">', '<article class="kb-kartu kb-kartu-utama"><span class="kb-terbaru">Kabar terbaru</span>') : kartuKabar(x)).join('') : `<div class="kb-kosong kb-span">Belum ada kabar${F.kec ? ' di Kecamatan Lubuklinggau ' + esc(F.kec) : ''} untuk pilihan ini. <button type="button" class="kb-tautan" data-reset>Tampilkan semua</button></div>`;
    const sum = document.getElementById('kb-jml'); if (sum) sum.textContent = xs.length + ' kabar';
    document.querySelectorAll('[data-kec]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.kec || '') === F.kec)));
    document.querySelectorAll('[data-kat]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.kat || '') === F.kat)));
    pasangFoto(box);
  }
  // ── v18: hero "Highlight minggu ini" ──
  function hero(tayang) {
    const k = tayang.find(x => x.foto) || tayang[0];
    if (k) {
      return `<section class="kb-hero" aria-label="Highlight minggu ini">
        <a class="kb-hfoto" href="#${esc(k.id)}">${k.foto ? `<img data-id="${esc(k.id)}" data-f="${esc(k.foto)}" alt="Kampanye: ${esc(k.judul)}">` : `<span class="kb-ph">${ikon[programKelas(k.program)]}</span>`}</a>
        <div class="kb-hisi">
          <div class="kb-meta"><span class="kb-sorot">Highlight minggu ini</span><span class="kb-chip kb-prog-${programKelas(k.program)}">${esc(k.jenis_dana)}</span><span>Sisa ${k.sisa_hari} hari</span></div>
          <h2 class="kb-hjudul"><a href="#${esc(k.id)}">${esc(k.judul)}</a></h2>
          <p>${esc(k.ringkas)}</p>
          <div class="kb-bar" role="progressbar" aria-valuenow="${k.persen}" aria-valuemin="0" aria-valuemax="100" aria-label="Tercapai ${k.persen}%"><i data-w="${Math.min(100, k.persen)}"></i></div>
          <div class="kb-kumpul"><span><b>${rp(k.terkumpul)}</b> terkumpul dari ${rpRingkas(k.target)}</span><span>${k.persen}%</span></div>
          <div class="kb-hangka"><div><b>${k.donatur.toLocaleString('id-ID')}</b><small>donatur</small></div><div><b>${k.sisa_hari}</b><small>hari lagi</small></div><div><b>${esc(k.program)}</b><small>tujuan dana</small></div></div>
          <div class="kb-aksi"><button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Cara berdonasi</button>
            <a class="kb-btn wa" href="${waLink(k.judul, k.id, k.persen + '% tercapai')}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan lewat WhatsApp">${svgWa}<span class="kb-hp-sembunyi">WhatsApp</span></a>
            <button class="kb-btn garis" type="button" data-bagi="${esc(k.id)}" data-judul="${esc(k.judul)}" aria-label="Bagikan ke media sosial lain">${svgBagi}</button></div>
        </div></section>`;
    }
    const x = data.kabar.find(z => z.foto) || data.kabar[0];
    if (!x) return '';
    const kls = programKelas(x.program);
    return `<section class="kb-hero" aria-label="Highlight minggu ini">
      <a class="kb-hfoto kb-prog-${kls}" href="#${esc(x.id)}">${x.foto ? `<img data-id="${esc(x.id)}" data-f="${esc(x.foto)}" alt="Dokumentasi: ${esc(x.judul)}">` : `<span class="kb-ph">${ikon[kls]}</span>`}</a>
      <div class="kb-hisi">
        <div class="kb-meta"><span class="kb-sorot">Highlight minggu ini</span><span class="kb-chip kb-prog-${kls}">${esc(kategori(x.program))}</span><span>${esc(x.tanggal_kegiatan ? tgl(x.tanggal_kegiatan) : relatif(x.waktu_tayang))}</span></div>
        <h2 class="kb-hjudul"><a href="#${esc(x.id)}">${esc(x.judul)}</a></h2>
        ${x.ringkas ? `<p>${esc(x.ringkas)}</p>` : ''}
        <div class="kb-hangka"><div><b>${x.jumlah_penerima}</b><small>penerima</small></div><div><b>${rpRingkas(x.total_nilai)}</b><small>tersalurkan</small></div><div><b>${esc(x.kecamatan || 'Kota Lubuklinggau')}</b><small>lokasi</small></div></div>
        <div class="kb-aksi"><a class="kb-btn utama" href="#${esc(x.id)}">Baca selengkapnya</a>
          <a class="kb-btn wa" href="${waLink(x.judul, x.id, rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan lewat WhatsApp">${svgWa}<span class="kb-hp-sembunyi">WhatsApp</span></a>
          <button class="kb-btn garis" type="button" data-bagi="${esc(x.id)}" data-judul="${esc(x.judul)}" aria-label="Bagikan ke media sosial lain">${svgBagi}</button></div>
      </div></section>`;
  }
  // ── v40: banner geser Highlight — slide manual (admin) + kampanye berjalan, maks 5 ──
  const svgKiri = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const svgKanan = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  const urlAman = u => /^(https:\/\/[^\s<>"'`]+|[a-z0-9_\-]+\.html(#[A-Za-z0-9_\-]*)?|#[A-Za-z0-9_\-]+)$/.test(String(u || '')) ? u : '';
  function slider(tayang) {
    const hl = (data.highlight || []).map(h => ({ jenis: 'hl', id: h.id, foto: h.foto, judul: h.judul, label: h.label, teks: h.teks, tt: h.tombol_teks, url: urlAman(h.tombol_url) }));
    const km = tayang.map(k => ({ jenis: 'kmp', id: k.id, foto: k.foto, judul: k.judul, label: 'Kampanye · ' + k.jenis_dana, teks: k.ringkas, k }));
    const S = hl.concat(km).slice(0, 5);
    if (!S.length) return '';
    const titik = i => `<div class="kb-titik" role="tablist" aria-label="Pilih slide">${S.map((_, j) => `<button type="button" role="tab" data-ke="${j}" aria-label="Slide ${j + 1}" aria-selected="${j === i}"></button>`).join('')}</div>`;
    const tombol = x => {
      if (x.jenis === 'kmp') return `<button class="kb-sbtn" type="button" data-donasi="${esc(x.id)}" data-hl="${esc(x.id)}">Cara berdonasi →</button><a class="kb-sbtn garis" href="#${esc(x.id)}" data-hl="${esc(x.id)}">Lihat detail</a><button class="kb-sbtn garis kb-sbagi" type="button" data-bagi="${esc(x.id)}" data-judul="${esc(x.judul)}" aria-label="Bagikan">${svgBagi}</button>`;
      if (!x.url) return '';
      const luar = /^https:/.test(x.url);
      return `<a class="kb-sbtn" href="${esc(x.url)}" data-hl="${esc(x.id)}"${luar ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(x.tt || 'Selengkapnya')} →</a>`;
    };
    return `<section class="kb-slider" aria-roledescription="carousel" aria-label="Highlight BAZNAS Kota Lubuklinggau" data-n="${S.length}">
      <div class="kb-slides">${S.map((x, i) => `<article class="kb-slide${i ? '' : ' aktif'}" role="group" aria-roledescription="slide" aria-label="${i + 1} dari ${S.length}"${i ? ' aria-hidden="true"' : ''}>
        <div class="kb-sfoto${x.foto ? '' : ' kosong'}">${x.foto ? `<img data-id="${esc(x.id)}" data-f="${esc(x.foto)}" alt="${esc(x.judul)}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>` : `<span class="kb-ph">${ikon[programKelas(x.k ? x.k.program : '')]}</span>`}${S.length > 1 ? titik(i) : ''}</div>
        <div class="kb-steks">
          ${x.label ? `<span class="kb-slabel">${esc(x.label)}</span>` : ''}
          <h2 class="kb-hjudul">${esc(x.judul)}</h2>
          ${x.teks ? `<p>${esc(x.teks)}</p>` : ''}
          ${x.k ? `<div class="kb-sprog"><div class="kb-bar" role="progressbar" aria-valuenow="${x.k.persen}" aria-valuemin="0" aria-valuemax="100" aria-label="Tercapai ${x.k.persen}%"><i data-w="${Math.min(100, x.k.persen)}"></i></div>
            <span><b>${rp(x.k.terkumpul)}</b> terkumpul · ${x.k.persen}% · sisa ${x.k.sisa_hari} hari</span></div>` : ''}
          <div class="kb-saksi">${tombol(x)}</div>
        </div></article>`).join('')}</div>
      ${S.length > 1 ? `<div class="kb-snav"><button type="button" class="kb-panah" data-geser="-1" aria-label="Slide sebelumnya">${svgKiri}</button>${titik(0)}<button type="button" class="kb-panah" data-geser="1" aria-label="Slide berikutnya">${svgKanan}</button></div>` : ''}
    </section>`;
  }
  let slAktif = 0, slTimer = null, slJeda = false;
  function slKe(i) {
    const sl = document.querySelector('.kb-slider'); if (!sl) return;
    const xs = sl.querySelectorAll('.kb-slide'), n = xs.length; if (!n) return;
    slAktif = (i + n) % n;
    xs.forEach((x, j) => { x.classList.toggle('aktif', j === slAktif); if (j === slAktif) x.removeAttribute('aria-hidden'); else x.setAttribute('aria-hidden', 'true'); });
    sl.querySelectorAll('.kb-titik').forEach(t => t.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-selected', String(j === slAktif))));
  }
  function slMulai() {
    clearInterval(slTimer); slAktif = 0;
    const sl = document.querySelector('.kb-slider'); if (!sl || +sl.dataset.n < 2) return;
    if (!gerakMinim) slTimer = setInterval(() => { if (!slJeda && !document.hidden) slKe(slAktif + 1); }, 6000);
    sl.addEventListener('mouseenter', () => { slJeda = true; }); sl.addEventListener('mouseleave', () => { slJeda = false; });
    sl.addEventListener('focusin', () => { slJeda = true; }); sl.addEventListener('focusout', () => { slJeda = false; });
    sl.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') slKe(slAktif - 1); else if (e.key === 'ArrowRight') slKe(slAktif + 1); });
    let x0 = null;
    sl.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; slJeda = true; }, { passive: true });
    sl.addEventListener('touchend', e => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) slKe(slAktif + (dx < 0 ? 1 : -1)); } x0 = null; slJeda = false; }, { passive: true });
  }
  // v40: statistik pengunjung (GA4, bila dipasang) — hanya nama tombol/ID konten, tanpa data pribadi
  const lacak = (nama, p) => { try { if (typeof window.gtag === 'function') window.gtag('event', nama, p || {}); } catch (e) { } };
  // ── v18: kalkulator zakat penghasilan + CTA ──
  function samping() {
    return `<aside class="kb-samping" id="zakat" aria-label="Kalkulator zakat">
      <div class="kb-kalk">
        <h2>Kalkulator zakat penghasilan</h2>
        <p class="kb-kecil">Nisab ${rp(C.nisabBulan)}/bulan · kadar 2,5% (${esc(C.nisabSumber)})</p>
        <label>Penghasilan per bulan<span class="kb-rpin"><span>Rp</span><input id="kb-gaji" inputmode="numeric" autocomplete="off" placeholder="0"></span></label>
        <label>Pendapatan lain per bulan <small>(opsional: bonus, sewa, usaha)</small><span class="kb-rpin"><span>Rp</span><input id="kb-lain" inputmode="numeric" autocomplete="off" placeholder="0"></span></label>
        <div class="kb-hasilz" id="kb-hasilz" aria-live="polite"><small>Isi penghasilan untuk menghitung</small><b>Rp 0</b><span>Dihitung dari penghasilan bruto per bulan.</span></div>
        ${data && data.online_umum ? `<button class="kb-cta" type="button" data-ol-umum="zakat" style="width:100%;border:0;cursor:pointer">💳 Bayar Zakat Online</button>
        <button class="kb-btn garis" type="button" data-ol-umum="infak" style="width:100%;margin-top:8px">Infak/Sedekah online</button>
        <p class="kb-kecil" style="margin:6px 0 0;text-align:center">QRIS · Virtual Account · e-wallet · e-BSZ langsung terbit</p>` : `<a class="kb-cta" href="${esc(C.muzaki)}">Tunaikan Zakat Sekarang</a>`}
        ${data && data.online_khusus && (data.online_khusus.fitrah || data.online_khusus.fidyah) ? `<div class="kb-ol-ram">${data.online_khusus.fitrah ? `<button class="kb-btn utama" type="button" data-ol-umum="fitrah" style="width:100%;margin-top:10px">🌙 Zakat Fitrah ${esc(data.online_khusus.fitrah.tahun_hijriah)} H — ${rp(data.online_khusus.fitrah.kelas[0].nominal)}/jiwa</button>` : ''}
          ${data.online_khusus.fidyah ? `<button class="kb-btn garis" type="button" data-ol-umum="fidyah" style="width:100%;margin-top:8px">Fidyah — ${rp(data.online_khusus.fidyah.kelas[0].nominal)}/hari</button>` : ''}</div>` : ''}
        <p class="kb-aman">${svgPerisai}<span>Transfer hanya ke rekening atas nama <b>BAZNAS Kota Lubuklinggau</b>. Bukti Setor Zakat (BSZ) dapat menjadi pengurang penghasilan kena pajak.</span></p>
      </div>
      <nav class="kb-transparan" aria-label="Transparansi"><b>Transparansi</b>
        <a href="${esc(C.laporanKeuangan)}" rel="noopener noreferrer">Laporan keuangan →</a>
        <a href="${esc(C.cekSetoran)}">Cek setoran &amp; verifikasi BSZ →</a>
        <a href="pengajuan.html">Ajukan bantuan →</a>
        <a href="${esc(C.muzaki)}">Daftar muzaki / donatur →</a></nav>
    </aside>`;
  }
  function hitungZakat() {
    const g = document.getElementById('kb-gaji'), l = document.getElementById('kb-lain'), o = document.getElementById('kb-hasilz'); if (!g || !o) return;
    const angka = el => { const v = (el.value || '').replace(/\D/g, '').slice(0, 13); el.value = v ? (+v).toLocaleString('id-ID') : ''; return +v || 0; };
    const t = angka(g) + angka(l);
    o.classList.toggle('wajib', t >= C.nisabBulan);
    clearTimeout(hitungZakat.t); if (t) hitungZakat.t = setTimeout(() => lacak('hitung_zakat', { capai_nisab: t >= C.nisabBulan }), 1500);
    o.innerHTML = !t ? '<small>Isi penghasilan untuk menghitung</small><b>Rp 0</b><span>Dihitung dari penghasilan bruto per bulan.</span>'
      : t >= C.nisabBulan ? `<small>Zakat penghasilan Anda per bulan</small><b>${rp(t * 0.025)}</b><span>2,5% × ${rp(t)} — sudah mencapai nisab.</span>`
      : `<small>Belum mencapai nisab bulanan</small><b>Infak semampunya</b><span>${rp(t)} di bawah nisab ${rp(C.nisabBulan)}. Anda tetap dapat berinfak/bersedekah berapa pun.</span>`;
  }
  const svgPin = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const svgBagi = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  const svgPerisai = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
  const svgWa = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4 5.1 5.1 0 003.2.7 2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';

  function render() {
    if (!data) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (/^(KMP|PUB)-/.test(h)) return detail(h);
    if (h === 'beasiswa' || h === 'kabar' || h === 'kampanye') tabAktif = h;
    const tayang = data.kampanye.filter(k => k.status === 'Tayang'), selesai = data.kampanye.filter(k => k.status === 'Berakhir');
    if (!tabAktif) tabAktif = tayang.length ? 'kampanye' : 'kabar';
    const bln = new Date(data.bulan_ini.bulan + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long' });
    document.body.classList.remove('kb-mode-detail');
    app.innerHTML = `${slider(tayang) || hero(tayang)}
      <section class="kb-dampak kb-dampak4${data.himpun_bulan_ini ? ' kb-dampak5' : ''}" aria-label="Ringkasan penghimpunan & penyaluran">
        <div><small>Penerima manfaat ${esc(data.dampak.tahun)}</small><strong data-hitung="${data.dampak.penerima}">${data.dampak.penerima.toLocaleString('id-ID')}</strong></div>
        <div class="emas"><small>Dana tersalurkan ${esc(data.dampak.tahun)}</small><strong>${rpRingkas(data.dampak.tersalurkan)}</strong></div>
        <div><small>Penerima bulan ${esc(bln)}</small><strong>${(+data.bulan_ini.penerima || 0).toLocaleString('id-ID')}</strong></div>
        <div><small>Kampanye berjalan</small><strong>${tayang.length}</strong></div>
        ${data.himpun_bulan_ini ? `<div class="kb-himpun"><small>Donasi online ${esc(bln)}</small><strong>${rpRingkas(+data.himpun_bulan_ini.nilai || 0)}</strong><span>${(+data.himpun_bulan_ini.transaksi || 0).toLocaleString('id-ID')} transaksi</span></div>` : ''}
        <div class="kb-cap">Data langsung dari pembukuan BAZNAS Kota Lubuklinggau · diperbarui otomatis</div>
      </section>
      <div class="kb-tata">
      <div class="kb-utama">
      <div class="kb-tabs" role="tablist">
        <button role="tab" aria-selected="${tabAktif === 'kampanye'}" data-tab="kampanye">Kampanye${tayang.length ? ' (' + tayang.length + ')' : ''}</button>
        <button role="tab" aria-selected="${tabAktif === 'kabar'}" data-tab="kabar">Kabar Penyaluran</button>
        ${data.beasiswa ? `<button role="tab" aria-selected="${tabAktif === 'beasiswa'}" data-tab="beasiswa">Perkembangan Beasiswa</button>` : ''}
      </div>
      <div id="kb-panel">${tabAktif === 'beasiswa' ? panelBeasiswa() : tabAktif === 'kampanye' ?
        (tayang.length ? `<div class="kb-grid">${tayang.map(kartuKampanye).join('')}</div>` : '<div class="kb-kosong">Belum ada kampanye yang berjalan. Pantau terus halaman ini.</div>') +
        (selesai.length ? `<div class="kb-judul-bag">Kampanye selesai</div><div class="kb-grid">${selesai.map(kartuKampanye).join('')}</div>` : '')
        : `<div class="kb-ringkas"><div class="h"><strong data-hitung="${data.bulan_ini.penerima}">${data.bulan_ini.penerima}</strong><small>Penerima bulan ${esc(bln)}</small></div>
           <div class="e"><strong>${rpRingkas(data.bulan_ini.tersalurkan)}</strong><small>Disalurkan bulan ${esc(bln)}</small></div></div>` +
          (data.kabar.length ? filterKabar() + '<div class="kb-judul-bag">Kabar penyaluran terbaru · <span id="kb-jml"></span></div><div class="kb-grid" id="kb-kabar-grid"></div>' : '<div class="kb-kosong">Belum ada kabar penyaluran.</div>')}</div>
      </div>
      ${samping()}
      </div>`;
    isiKabar();
    pasangFoto(app); animasiBar(app); slMulai();
    document.title = 'Kabar Kebaikan — BAZNAS Kota Lubuklinggau';
  }

  // v53: daftar donatur kampanye (tanggal, nama, jumlah). Setoran lewat petugas disamarkan; pilihan Hamba Allah dihormati.
  let keDonatur = false;
  const tglP = s => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
  function donaturBaris(d) { return `<li><span class="t">${tglP(d.tanggal)}</span><span class="n">${esc(d.nama)}</span><span class="j">${rp(d.nilai)}</span></li>`; }
  function donaturHtml(x) {
    const L = x.daftar_donatur || [], n = L.length + (x.daftar_donatur_lebih || 0);
    if (!L.length) return `<section class="kb-donatur" id="kb-donatur"><h4>Donatur</h4><p class="kb-donatur-kosong">Belum ada donasi tercatat. Jadilah donatur pertama 🤲</p></section>`;
    return `<section class="kb-donatur" id="kb-donatur"><h4>Donatur <small>(${n.toLocaleString('id-ID')})</small></h4>
      <div class="kb-donatur-kepala"><span>Tanggal</span><span>Nama</span><span>Jumlah</span></div>
      <ol class="kb-donatur-daftar" data-id="${esc(x.id)}">${L.slice(0, 10).map(donaturBaris).join('')}</ol>
      ${L.length > 10 ? `<button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-donatur-lagi="${esc(x.id)}">Tampilkan lebih banyak</button>` : ''}
      ${x.daftar_donatur_lebih ? `<small class="kb-donatur-cat">Menampilkan ${L.length} donasi terbaru.</small>` : ''}
      <small class="kb-donatur-cat">Nama donatur yang menyetor melalui petugas ditampilkan tersamar untuk menjaga privasi.</small></section>`;
  }
  async function detail(id) {
    app.innerHTML = '<a class="kb-kembali" href="#">← Semua kabar</a><div class="kb-skel"></div>';
    let x;
    try { x = await api('detail_publik', { id }); } catch (e) { app.innerHTML = '<a class="kb-kembali" href="#">← Kembali</a><div class="kb-kosong">Gagal memuat. Periksa koneksi lalu coba lagi.</div>'; return; }
    if (!x.ok) { app.innerHTML = `<a class="kb-kembali" href="#">← Kembali</a><div class="kb-kosong">${esc(x.pesan)}</div>`; return; }
    const kmp = x.jenis === 'kampanye', akhir = x.status === 'Berakhir', kls = programKelas(x.program);
    document.body.classList.add('kb-mode-detail');
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
        ${kmp ? '' : ctaSerupa(kls, x.id)}
        <div class="kb-aksi" style="margin-top:12px">
          ${kmp && !akhir ? `<button class="kb-btn utama" type="button" data-donasi="${esc(x.id)}">Cara berdonasi</button>` : `<a class="kb-btn utama" href="#">Lihat kabar lainnya</a>`}
          <a class="kb-btn wa" href="${waLink(x.judul, x.id, kmp ? x.persen + '% tercapai' : rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan lewat WhatsApp">${svgWa}</a>
          <button class="kb-btn garis" type="button" data-bagi="${esc(x.id)}" data-judul="${esc(x.judul)}" aria-label="Bagikan ke media sosial lain">${svgBagi}</button></div>
        ${kmp ? donaturHtml(x) : ''}
      </div></article>${samping()}`;
    if (kmp) cacheDetail[x.id] = x;
    pasangFoto(app); animasiBar(app);
    if (keDonatur) { keDonatur = false; const dn = document.getElementById('kb-donatur'); if (dn) { setTimeout(() => dn.scrollIntoView({ block: 'start' }), 50); document.title = x.judul + ' — BAZNAS Kota Lubuklinggau'; return; } }
    document.title = x.judul + ' — BAZNAS Kota Lubuklinggau';
    window.scrollTo({ top: 0 });
  }
  const cacheDetail = {};
  // v39: ajakan sesuai kategori kabar — kampanye berjalan dengan program serupa, bila tidak ada → kalkulator zakat
  function ctaSerupa(kls, id) {
    const k = data && data.kampanye.find(z => z.status === 'Tayang' && z.id !== id && programKelas(z.program) === kls);
    return k ? `<div class="kb-serupa"><small>Bantu program serupa</small><b>${esc(k.judul)}</b><span>${rp(k.terkumpul)} terkumpul · ${k.persen}% · sisa ${k.sisa_hari} hari</span>
        <button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Ikut berdonasi</button></div>`
      : `<div class="kb-serupa"><small>Ingin ikut menebar manfaat seperti ini?</small><b>Tunaikan zakat, infak, dan sedekah Anda melalui BAZNAS Kota Lubuklinggau</b>
        <a class="kb-btn utama" href="#zakat" data-ke-zakat>Hitung &amp; tunaikan zakat</a></div>`;
  }

  async function bukaDonasi(id) {
    const l = document.getElementById('kb-lembar'), isi = l.querySelector('.kb-lembar-isi');
    isi.innerHTML = '<div class="kb-skel" style="height:140px"></div>'; l.classList.add('buka');
    let x = cacheDetail[id];
    if (!x) { try { x = await api('detail_publik', { id }); } catch (e) { x = null; } if (x && x.ok) cacheDetail[id] = x; }
    if (!x || !x.ok) { isi.innerHTML = '<p>Gagal memuat informasi rekening. Coba lagi.</p>'; return; }
    const noRek = (String(x.rekening_tujuan).match(/\d[\d\s.-]{6,}\d/) || [''])[0].replace(/[\s.-]/g, '');
    isi.innerHTML = `<h3 style="margin:0 0 4px">Cara berdonasi</h3><p style="margin:0;color:var(--kb-redup);font-size:14px">${esc(x.judul)}</p>
      ${x.online ? `<button class="kb-btn utama" type="button" style="width:100%;margin-top:12px" data-online="${esc(x.id)}">💳 Donasi online — QRIS · Virtual Account · e-wallet</button>
        <p class="kb-ol-ket">Tercatat otomatis, tanpa konfirmasi manual. Tidak ada biaya tambahan.</p><div class="kb-ol-atau">atau transfer manual</div>` : ''}
      ${x.rekening_tujuan ? `<div class="kb-rek">${esc(x.rekening_tujuan)}</div>` : ''}
      ${noRek ? `<button class="kb-btn garis" type="button" style="width:100%" data-salin="${esc(noRek)}">📋 Salin nomor rekening</button>` : ''}
      ${x.qris ? `<p style="text-align:center;margin:14px 0 0;font-weight:700">atau pindai QRIS resmi</p><img class="kb-qris" data-id="${esc(x.id)}" data-f="${esc(x.qris)}" alt="QRIS resmi BAZNAS Kota Lubuklinggau">` : ''}
      <p style="font-size:13px;color:var(--kb-redup);margin-top:12px">Tuliskan berita transfer: <b>${esc(x.id)}</b> agar donasi tercatat untuk kampanye ini. Konfirmasi ke kantor BAZNAS 0812-7144-8282. BAZNAS tidak pernah meminta transfer ke rekening pribadi.</p>
      <button class="kb-btn utama" type="button" style="width:100%;margin-top:6px" data-tutup>Tutup</button>`;
    pasangFoto(isi);
  }

  async function muat() {
    app.innerHTML = '<div class="kb-skel" style="height:110px"></div><div class="kb-skel"></div><div class="kb-skel"></div>';
    try { data = await api('daftar_publik'); if (!data.ok) throw new Error(data.pesan); render(); }
    catch (e) { app.innerHTML = '<div class="kb-kosong" style="background:var(--kb-kartu);border-radius:14px">Gagal memuat data. Periksa koneksi internet lalu <a href="javascript:location.reload()">muat ulang</a>.</div>'; }
  }

  document.addEventListener('click', e => {
    const g = e.target.closest('[data-geser],[data-ke]');
    if (g) { slKe(g.dataset.geser ? slAktif + +g.dataset.geser : +g.dataset.ke); slJeda = true; return; }
    const hlk = e.target.closest('[data-hl]'); if (hlk) lacak('klik_highlight', { konten_id: hlk.dataset.hl });
    if (e.target.closest('.kb-btn.wa,.kb-bagi')) lacak('bagikan_wa', { konten_id: (e.target.closest('[href]') || {}).href ? decodeURIComponent(e.target.closest('[href]').href).split('/k/')[1] || '' : '' });
    if (e.target.closest('[data-ke-donatur]')) keDonatur = true;
    const dl = e.target.closest('[data-donatur-lagi]');
    if (dl) { const x = cacheDetail[dl.dataset.donaturLagi], ol = document.querySelector('.kb-donatur-daftar'); if (x && ol) { const n = ol.children.length; ol.insertAdjacentHTML('beforeend', x.daftar_donatur.slice(n, n + 20).map(donaturBaris).join('')); if (ol.children.length >= x.daftar_donatur.length) dl.remove(); } return; }
    const f = e.target.closest('[data-kec],[data-kat],[data-reset],[data-bagi]');
    if (f) {
      if (f.hasAttribute('data-kec')) F.kec = f.dataset.kec || '';
      else if (f.hasAttribute('data-kat')) F.kat = f.dataset.kat || '';
      else if (f.hasAttribute('data-reset')) { F.kec = ''; F.kat = ''; F.cari = ''; const c = document.getElementById('kb-cari'); if (c) c.value = ''; }
      else { bagikan(f.dataset.bagi, f.dataset.judul, f); return; }
      isiKabar(); return;
    }
    const ol = e.target.closest('[data-online],[data-ol-nom],[data-ol-lanjut],[data-ol-kembali],[data-ol-bayar],[data-ol-umum],[data-ol-jenis],[data-ebsz],[data-ol-kelas],[data-ol-tambah-jiwa],[data-ol-hapus-jiwa],[data-ol-lanjutkan],[data-ol-ulang]');
    if (ol) { olKlik(ol); return; }
    const t = e.target.closest('[data-tab],[data-donasi],[data-salin],[data-tutup]');
    if (!t) { if (e.target.id === 'kb-lembar') e.target.classList.remove('buka'); return; }
    if (t.dataset.tab) { e.preventDefault(); tabAktif = t.dataset.tab; if (location.hash) history.replaceState(null, '', location.pathname); render(); const tb = document.querySelector('.kb-tabs'); if (tb && (tabAktif === 'beasiswa' || t.closest('.kb-nav'))) tb.scrollIntoView({ behavior: gerakMinim ? 'auto' : 'smooth' }); }
    else if (t.dataset.donasi) { lacak('cara_berdonasi', { konten_id: t.dataset.donasi }); bukaDonasi(t.dataset.donasi); }
    else if (t.dataset.salin) { (navigator.clipboard ? navigator.clipboard.writeText(t.dataset.salin) : Promise.reject()).then(() => { lacak(/^https?:/.test(t.dataset.salin) ? 'salin_tautan' : 'salin_rekening'); t.textContent = /^https?:/.test(t.dataset.salin) ? '✓ Tautan disalin' : '✓ Nomor rekening disalin'; }).catch(() => prompt('Salin nomor rekening:', t.dataset.salin)); }
    else if (t.hasAttribute('data-tutup')) document.getElementById('kb-lembar').classList.remove('buka');
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'kb-cari') { F.cari = e.target.value; isiKabar(); }
    else if (e.target.id === 'kb-gaji' || e.target.id === 'kb-lain') hitungZakat();
  });
  // bagikan: lembar bagikan bawaan HP (WA, FB, IG, Telegram…) bila ada; di komputer salin tautan
  // v53: lembar bagikan media sosial — WA, Facebook, X, Telegram, Threads, LinkedIn, Email, Instagram/TikTok (salin teks), aplikasi lain (HP)
  function bagikan(id, judul, tombol) {
    const url = tautan(id), x = cacheDetail[id] || (data && [...(data.kampanye || []), ...(data.kabar || [])].find(k => k.id === id)) || {};
    const kmp = /^KMP-/.test(id) && x.status !== 'Berakhir';
    const ajak = kmp ? (x.persen > 0 ? `Sudah ${x.persen}% tercapai. ` : '') + 'Yuk ikut berdonasi melalui BAZNAS Kota Lubuklinggau 🤲' : 'Kabar kebaikan dari BAZNAS Kota Lubuklinggau 💚';
    const teks = `${judul}\n${ajak}`, cap = `${teks}\n${url}\n\n#BAZNASLubuklinggau #KabarKebaikan #ZakatInfakSedekah`;
    const e = encodeURIComponent, L = {
      wa: waLink(judul, id, kmp && x.persen != null ? x.persen + '% tercapai' : ''),
      fb: 'https://www.facebook.com/sharer/sharer.php?u=' + e(url),
      x: 'https://twitter.com/intent/tweet?text=' + e(teks) + '&url=' + e(url) + '&hashtags=BAZNASLubuklinggau',
      tg: 'https://t.me/share/url?url=' + e(url) + '&text=' + e(teks),
      th: 'https://www.threads.net/intent/post?text=' + e(teks + '\n' + url),
      li: 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url),
      em: 'mailto:?subject=' + e(judul) + '&body=' + e(teks + '\n\n' + url) };
    const btn = (k, kelas, ikon, nama) => `<a class="kb-sos ${kelas}" href="${L[k]}" target="_blank" rel="noopener noreferrer" data-sos="${k}"><span class="ik">${ikon}</span>${nama}</a>`;
    const l = document.getElementById('kb-lembar'), isi = l.querySelector('.kb-lembar-isi');
    isi.innerHTML = `<h3 style="margin:0 0 4px">Bagikan ${kmp ? 'kampanye' : 'kabar'} ini</h3><p style="margin:0 0 12px;color:var(--kb-redup);font-size:14px">${esc(judul)}</p>
      <div class="kb-sos-grid">${btn('wa', 'wa', svgWa, 'WhatsApp')}${btn('fb', 'fb', '<b>f</b>', 'Facebook')}${btn('x', 'xx', '<b>𝕏</b>', 'X')}${btn('tg', 'tg', '<b>✈</b>', 'Telegram')}
        ${btn('th', 'th', '<b>@</b>', 'Threads')}${btn('li', 'li', '<b>in</b>', 'LinkedIn')}${btn('em', 'em', '<b>✉</b>', 'Email')}
        <button type="button" class="kb-sos ig" data-sos-ig><span class="ik"><b>◎</b></span>Instagram / TikTok</button></div>
      <div class="kb-sos-ig" id="kb-sos-ig" hidden><b>Instagram & TikTok</b> belum menyediakan tombol bagikan dari situs web. Caranya:
        <ol><li>Salin teks di bawah (sudah berisi tautan).</li><li>Buka Instagram/TikTok → buat Story atau Postingan → tempel teks, atau pakai stiker <b>Tautan</b> di Story.</li></ol></div>
      <textarea class="kb-sos-teks" readonly rows="4" aria-label="Teks untuk dibagikan">${esc(cap)}</textarea>
      <div class="kb-bagi-daftar" style="margin-top:8px"><button class="kb-btn garis" type="button" data-salin-teks="${esc(cap)}">📋 Salin teks + tautan</button>
        <button class="kb-btn garis" type="button" data-salin="${esc(url)}">🔗 Salin tautan saja</button></div>
      ${navigator.share ? '<button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-sos-lain>📱 Aplikasi lain di HP (Instagram, TikTok, Line…)</button>' : ''}
      <button class="kb-btn utama" type="button" style="width:100%;margin-top:12px" data-tutup>Tutup</button>`;
    isi.onclick = async ev => {
      const a = ev.target.closest('[data-sos]'); if (a) { lacak('bagikan', { metode: a.dataset.sos, konten_id: id }); return; }
      if (ev.target.closest('[data-sos-ig]')) { const k = document.getElementById('kb-sos-ig'); k.hidden = !k.hidden; lacak('bagikan', { metode: 'instagram', konten_id: id }); return; }
      const st = ev.target.closest('[data-salin-teks]');
      if (st) { try { await navigator.clipboard.writeText(cap); st.textContent = '✓ Teks disalin'; } catch (er) { const ta = isi.querySelector('.kb-sos-teks'); ta.select(); document.execCommand && document.execCommand('copy'); st.textContent = '✓ Teks dipilih — tekan salin'; } lacak('bagikan', { metode: 'salin_teks', konten_id: id }); return; }
      if (ev.target.closest('[data-sos-lain]')) { try { await navigator.share({ title: judul, text: teks, url }); lacak('bagikan', { metode: 'aplikasi_lain', konten_id: id }); } catch (er) { } }
    };
    l.classList.add('buka');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('kb-lembar').classList.remove('buka'); });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (!h) { render(); window.scrollTo({ top: 0 }); } else if (/^(KMP|PUB)-/.test(decodeURIComponent(h)) || /^(kabar|kampanye|beasiswa)$/.test(h)) { render(); if (!/^(KMP|PUB)-/.test(h)) { const tb = document.querySelector('.kb-tabs'); if (tb) tb.scrollIntoView(); } } });
  // v39: menu HP (☰) & dropdown Transparansi
  (function () {
    const bg = document.getElementById('kb-burger'), mn = document.getElementById('kb-menu'), dd = document.getElementById('kb-dd');
    const tutupMenu = () => { if (mn) mn.classList.remove('buka'); if (bg) bg.setAttribute('aria-expanded', 'false'); };
    const tutupDd = () => { if (dd) { dd.classList.remove('buka'); dd.firstElementChild.setAttribute('aria-expanded', 'false'); } };
    if (bg) bg.addEventListener('click', e => { e.stopPropagation(); const b = mn.classList.toggle('buka'); bg.setAttribute('aria-expanded', String(b)); });
    if (dd) dd.firstElementChild.addEventListener('click', e => { e.stopPropagation(); const b = dd.classList.toggle('buka'); dd.firstElementChild.setAttribute('aria-expanded', String(b)); });
    document.addEventListener('click', e => { if (!e.target.closest('#kb-dd')) tutupDd(); if (!e.target.closest('#kb-menu,#kb-burger') || e.target.closest('#kb-menu a')) tutupMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { tutupDd(); tutupMenu(); } });
  })();
  // ═══ v46: Donasi online (Midtrans) — tahap 1 infak/sedekah terikat per kampanye. Kunci rahasia hanya di server. ═══
  const OL = { x: null, d: {} };
  const lembar = () => { const l = document.getElementById('kb-lembar'); l.classList.add('buka'); return l.querySelector('.kb-lembar-isi'); };
  const UMUM = { zakat: { judul: 'Zakat Mal', jenis: 'Zakat Mal' }, infak: { judul: 'Infak/Sedekah', jenis: 'Infak/Sedekah (tidak terikat)' },
    fitrah: { judul: 'Zakat Fitrah', jenis: 'Zakat Fitrah' }, fidyah: { judul: 'Fidyah', jenis: 'Fidyah (untuk fakir miskin)' } };
  // v48: zakat fitrah (per jiwa) & fidyah (per hari) — tarif dari SK penetapan, total dihitung ulang di server
  const tarifK = j => (data && data.online_khusus && data.online_khusus[j]) || null;
  const olTotal = () => { const t = tarifK(OL.x.umum), d = OL.d; if (!t) return 0; const k = t.kelas[d.kelas || 0] || t.kelas[0];
    return k.nominal * (OL.x.umum === 'fitrah' ? (d.jiwa || []).filter(n => n.trim().length >= 2).length : (+d.hari || 0)); };
  function olFormKhusus() {
    const x = OL.x, d = OL.d, isi = lembar(), fit = x.umum === 'fitrah', t = tarifK(x.umum);
    if (!t) { isi.innerHTML = '<p>Layanan ini sedang tidak dibuka.</p><button class="kb-btn utama" type="button" style="width:100%" data-tutup>Tutup</button>'; return; }
    if (fit && !(d.jiwa && d.jiwa.length)) d.jiwa = [d.nama || ''];
    if (!fit && !d.hari) d.hari = 1;
    isi.innerHTML = `<div class="kb-ol-langkah"><b>1 · ${fit ? 'Jiwa' : 'Hari'} &amp; data</b><span>2 · Periksa</span><span>3 · Bayar</span></div>
      <h3 style="margin:6px 0 2px">${fit ? 'Zakat fitrah' : 'Fidyah'} ${esc(t.tahun_hijriah)} H</h3><p style="margin:0 0 10px;color:var(--kb-redup);font-size:13px">Tarif sesuai ${esc(t.sk)} · dibuka s.d. ${esc(tgl(t.sampai))}</p>
      ${t.kelas.length > 1 ? `<div class="kb-ol-nom" style="grid-template-columns:repeat(${t.kelas.length},1fr)">${t.kelas.map((k, i) => `<button type="button" data-ol-kelas="${i}" class="${(d.kelas || 0) === i ? 'on' : ''}">${esc(k.kelas)}<br><b>${rp(k.nominal)}</b></button>`).join('')}</div>` : `<p class="kb-ol-ket" style="text-align:left">${esc(t.kelas[0].kelas)}: <b>${rp(t.kelas[0].nominal)}</b> per ${fit ? 'jiwa' : 'hari'}</p>`}
      ${fit ? `<div class="kb-ol-f"><b>Nama jiwa yang dizakati *</b> <small>(diri sendiri & tanggungan, maks. 20)</small>
          ${d.jiwa.map((n, i) => `<div style="display:flex;gap:6px;margin-top:6px"><input data-ol-jiwa="${i}" maxlength="60" placeholder="Nama jiwa ${i + 1}" value="${esc(n)}" style="flex:1">${d.jiwa.length > 1 ? `<button type="button" class="kb-btn garis" data-ol-hapus-jiwa="${i}" aria-label="Hapus jiwa ${i + 1}" style="padding:0 12px">✕</button>` : ''}</div>`).join('')}
          ${d.jiwa.length < 20 ? '<button type="button" class="kb-btn garis" data-ol-tambah-jiwa style="width:100%;margin-top:8px">+ Tambah jiwa</button>' : ''}</div>`
        : `<label class="kb-ol-f">Jumlah hari puasa yang ditinggalkan *<input id="ol-hari" type="number" min="1" max="60" inputmode="numeric" value="${esc(d.hari)}"></label>
          <label class="kb-ol-f">Fidyah atas nama (orang yang tidak berpuasa)<input id="ol-atas" maxlength="60" placeholder="Kosongkan bila diri sendiri" value="${esc(d.atas_nama || '')}"></label>`}
      <div class="kb-ol-ring" style="margin:10px 0"><div class="tot"><span>Total</span><b id="ol-total">${rp(olTotal())}</b></div></div>
      <label class="kb-ol-f">Nama pembayar *<input id="ol-nama" maxlength="80" autocomplete="name" value="${esc(d.nama || '')}"></label>
      <label class="kb-ol-f">Nomor WhatsApp *<input id="ol-wa" inputmode="tel" maxlength="16" autocomplete="tel" placeholder="08…" value="${esc(d.wa || '')}"></label>
      <label class="kb-ol-f">Email (opsional, untuk bukti)<input id="ol-email" type="email" maxlength="120" autocomplete="email" value="${esc(d.email || '')}"></label>
      <label class="kb-ol-c"><input type="checkbox" id="ol-anonim" ${d.anonim ? 'checked' : ''}> Sembunyikan nama saya (Hamba Allah)</label>
      <label class="kb-ol-c"><input type="checkbox" id="ol-setuju" ${d.setuju ? 'checked' : ''}> ${fit ? 'Saya berniat menunaikan <b>zakat fitrah</b> untuk diri saya dan/atau tanggungan saya yang tercantum, karena Allah Ta\'ala, dan mewakilkan penyalurannya kepada BAZNAS Kota Lubuklinggau sebelum salat Idulfitri.'
        : 'Saya membayar <b>fidyah</b> atas puasa Ramadan yang ditinggalkan karena uzur syar\'i, untuk diberikan kepada fakir miskin melalui BAZNAS Kota Lubuklinggau.'}</label>
      <p class="kb-ol-galat" id="ol-galat"></p>
      <button class="kb-btn utama" type="button" style="width:100%" data-ol-lanjut>Lanjut — periksa</button>
      <button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-tutup>Batal</button>
      <p class="kb-ol-ket">${fit ? 'Bukti Setor Zakat elektronik (e-BSZ) terbit otomatis setelah lunas.' : 'Fidyah disalurkan utuh kepada fakir miskin (tanpa potongan hak amil).'}</p>`;
  }
  document.addEventListener('input', e => { if (e.target.matches('[data-ol-jiwa],#ol-hari') && OL.x && /^(fitrah|fidyah)$/.test(OL.x.umum)) { olBacaKhusus(); const o = document.getElementById('ol-total'); if (o) o.textContent = rp(olTotal()); } });
  function olBacaKhusus() {
    const g = id => document.getElementById(id);
    if (!g('ol-nama')) return;
    if (OL.x.umum === 'fitrah') OL.d.jiwa = [...document.querySelectorAll('[data-ol-jiwa]')].map(e => e.value);
    else { OL.d.hari = Math.max(0, parseInt(g('ol-hari').value, 10) || 0); OL.d.atas_nama = g('ol-atas').value.trim(); }
    Object.assign(OL.d, { nama: g('ol-nama').value.trim(), wa: g('ol-wa').value.trim(), email: g('ol-email').value.trim(), anonim: g('ol-anonim').checked, setuju: g('ol-setuju').checked, doa: '' });
  }
  function olForm() {
    if (OL.x.umum === 'fitrah' || OL.x.umum === 'fidyah') return olFormKhusus();
    const x = OL.x, d = OL.d, isi = lembar(), z = x.umum === 'zakat';
    const pilihJenis = x.umum ? `<div class="kb-ol-nom" style="grid-template-columns:1fr 1fr;margin-bottom:8px">${['zakat', 'infak'].map(j => `<button type="button" data-ol-jenis="${j}" class="${x.umum === j ? 'on' : ''}">${j === 'zakat' ? '🕌 Zakat Mal' : '🤲 Infak/Sedekah'}</button>`).join('')}</div>` : '';
    const idZakat = z ? `<details class="kb-ol-f" ${d.npwp || d.nik ? 'open' : ''} style="margin:4px 0 10px"><summary style="cursor:pointer;font-weight:600">Data untuk Bukti Setor Zakat (opsional, untuk pengurang pajak)</summary>
        <label class="kb-ol-f">NPWP<input id="ol-npwp" inputmode="numeric" maxlength="20" autocomplete="off" placeholder="15/16 digit" value="${esc(d.npwp || '')}"></label>
        <label class="kb-ol-f">atau NIK<input id="ol-nik" inputmode="numeric" maxlength="16" autocomplete="off" placeholder="16 digit" value="${esc(d.nik || '')}"></label>
        <label class="kb-ol-f">Alamat<input id="ol-alamat" maxlength="200" autocomplete="street-address" value="${esc(d.alamat || '')}"></label></details>` : '';
    const nyata = z ? `<label class="kb-ol-c"><input type="checkbox" id="ol-setuju" ${d.setuju ? 'checked' : ''}> Saya berniat menunaikan <b>zakat mal</b> karena Allah Ta'ala dan mewakilkan penyalurannya kepada BAZNAS Kota Lubuklinggau sesuai ketentuan syariah (8 asnaf).</label>`
      : x.umum ? `<label class="kb-ol-c"><input type="checkbox" id="ol-setuju" ${d.setuju ? 'checked' : ''}> Saya berinfak/bersedekah kepada BAZNAS Kota Lubuklinggau untuk disalurkan sesuai program yang dibutuhkan (infak tidak terikat).</label>`
      : `<label class="kb-ol-c"><input type="checkbox" id="ol-setuju" ${d.setuju ? 'checked' : ''}> Saya berinfak/bersedekah untuk <b>${esc(x.program || x.judul)}</b> melalui kampanye ini, dan dana disalurkan BAZNAS Kota Lubuklinggau sesuai peruntukannya (infak terikat).</label>`;
    isi.innerHTML = `<div class="kb-ol-langkah"><b>1 · Nominal &amp; data</b><span>2 · Periksa</span><span>3 · Bayar</span></div>
      <h3 style="margin:6px 0 2px">${x.umum ? (z ? 'Bayar zakat online' : 'Infak/sedekah online') : 'Donasi online'}</h3><p style="margin:0 0 10px;color:var(--kb-redup);font-size:14px">${x.umum ? 'BAZNAS Kota Lubuklinggau' : esc(x.judul)}</p>${pilihJenis}
      <div class="kb-ol-nom">${[25000, 50000, 100000, 250000, 500000, 1000000].map(n => `<button type="button" data-ol-nom="${n}" class="${+d.nilai === n ? 'on' : ''}">${rp(n)}</button>`).join('')}</div>
      <label class="kb-ol-f">${z ? 'Jumlah zakat' : 'Jumlah donasi'} (Rp) *<input id="ol-nilai" inputmode="numeric" placeholder="minimal 10.000" value="${d.nilai ? Number(d.nilai).toLocaleString('id-ID') : ''}"></label>
      <label class="kb-ol-f">Nama lengkap *<input id="ol-nama" maxlength="80" autocomplete="name" value="${esc(d.nama || '')}"></label>
      <label class="kb-ol-f">Nomor WhatsApp *<input id="ol-wa" inputmode="tel" maxlength="16" autocomplete="tel" placeholder="08…" value="${esc(d.wa || '')}"></label>
      <label class="kb-ol-f">Email (opsional, untuk bukti)<input id="ol-email" type="email" maxlength="120" autocomplete="email" value="${esc(d.email || '')}"></label>
      ${idZakat}<label class="kb-ol-f">Doa atau pesan (opsional)<textarea id="ol-doa" maxlength="200" rows="2">${esc(d.doa || '')}</textarea></label>
      <label class="kb-ol-c"><input type="checkbox" id="ol-anonim" ${d.anonim ? 'checked' : ''}> Sembunyikan nama saya (Hamba Allah)${z ? ' — BSZ tetap atas nama Anda' : ''}</label>
      ${nyata}
      <p class="kb-ol-galat" id="ol-galat"></p>
      <button class="kb-btn utama" type="button" style="width:100%" data-ol-lanjut>Lanjut — periksa ${z ? 'zakat' : 'donasi'}</button>
      <button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-tutup>Batal</button>
      <p class="kb-ol-ket">Data kontak tidak dipublikasikan. Pembayaran diproses Midtrans; BAZNAS tidak menyimpan data kartu/rekening Anda.</p>`;
    document.getElementById('ol-nilai').addEventListener('input', e => { const v = e.target.value.replace(/\D/g, ''); e.target.value = v ? Number(v).toLocaleString('id-ID') : ''; document.querySelectorAll('[data-ol-nom]').forEach(b => b.classList.toggle('on', b.dataset.olNom === v)); });
  }
  function olBaca() {
    const g = id => document.getElementById(id);
    if (OL.x.umum === 'fitrah' || OL.x.umum === 'fidyah') {
      olBacaKhusus(); const d = OL.d; d.nilai = olTotal();
      const gal = OL.x.umum === 'fitrah' && !(d.jiwa || []).some(n => n.trim().length >= 2) ? 'Isi minimal satu nama jiwa.' : OL.x.umum === 'fidyah' && !(d.hari >= 1 && d.hari <= 60) ? 'Jumlah hari 1–60.'
        : d.nilai < 10000 ? 'Total minimal Rp10.000.' : d.nama.length < 3 ? 'Isi nama pembayar.' : !/^(\+?62|0)8\d{7,12}$/.test(d.wa.replace(/[\s-]/g, '')) ? 'Nomor WhatsApp tidak valid (contoh 081234567890).'
        : d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? 'Alamat email tidak valid.' : !d.setuju ? 'Centang pernyataan niat.' : '';
      g('ol-galat').textContent = gal; return !gal;
    }
    Object.assign(OL.d, { nilai: Number((g('ol-nilai').value || '').replace(/\D/g, '')), nama: g('ol-nama').value.trim(), wa: g('ol-wa').value.trim(), email: g('ol-email').value.trim(),
      doa: g('ol-doa').value.trim(), anonim: g('ol-anonim').checked, setuju: g('ol-setuju').checked,
      npwp: g('ol-npwp') ? g('ol-npwp').value.replace(/\D/g, '') : '', nik: g('ol-nik') ? g('ol-nik').value.replace(/\D/g, '') : '', alamat: g('ol-alamat') ? g('ol-alamat').value.trim() : '' });
    const d = OL.d, gal = d.nilai < 10000 ? 'Nominal minimal Rp10.000.' : d.nama.length < 3 ? 'Isi nama lengkap.' : !/^(\+?62|0)8\d{7,12}$/.test(d.wa.replace(/[\s-]/g, '')) ? 'Nomor WhatsApp tidak valid (contoh 081234567890).'
      : d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? 'Alamat email tidak valid.'
      : d.npwp && !/^\d{15,16}$/.test(d.npwp) ? 'NPWP harus 15 atau 16 digit.' : d.nik && !/^\d{16}$/.test(d.nik) ? 'NIK harus 16 digit.'
      : !d.setuju ? (OL.x.umum === 'zakat' ? 'Centang pernyataan niat zakat.' : 'Centang pernyataan donasi.') : '';
    g('ol-galat').textContent = gal; return !gal;
  }
  function olPeriksa() {
    const x = OL.x, d = OL.d, isi = lembar(), wa = d.wa.replace(/\D/g, '');
    isi.innerHTML = `<div class="kb-ol-langkah"><span>1 · Nominal &amp; data</span><b>2 · Periksa</b><span>3 · Bayar</span></div>
      <h3 style="margin:6px 0 10px">Periksa ${x.umum === 'zakat' || x.umum === 'fitrah' ? 'zakat' : x.umum === 'fidyah' ? 'fidyah' : 'donasi'} Anda</h3>
      <div class="kb-ol-ring"><div><span>Untuk</span><b>${esc(x.umum ? 'BAZNAS Kota Lubuklinggau' : x.judul)}</b></div><div><span>Jenis dana</span><b>${x.umum ? UMUM[x.umum].jenis : 'Infak/Sedekah terikat'}</b></div>
        ${x.umum === 'fitrah' ? `<div><span>Jiwa (${d.jiwa.filter(n => n.trim().length >= 2).length})</span><b>${esc(d.jiwa.filter(n => n.trim().length >= 2).join(', '))}</b></div>` : ''}
        ${x.umum === 'fidyah' ? `<div><span>Fidyah</span><b>${esc(d.hari)} hari${d.atas_nama ? ' a.n. ' + esc(d.atas_nama) : ''}</b></div>` : ''}
        ${x.umum === 'zakat' ? `<div><span>Bukti Setor Zakat</span><b>${d.npwp ? 'NPWP ' + esc(d.npwp) : d.nik ? 'NIK ' + esc(d.nik.slice(0, 4) + '••••••••' + d.nik.slice(-4)) : 'Atas nama (tanpa NPWP/NIK)'}</b></div>` : ''}
        <div><span>Atas nama</span><b>${esc(d.anonim ? 'Hamba Allah (nama disembunyikan)' : d.nama)}</b></div><div><span>WhatsApp</span><b>${esc(wa.slice(0, 4) + '••••' + wa.slice(-3))}</b></div>
        <div class="tot"><span>Total dibayar</span><b>${rp(d.nilai)}</b></div></div>
      <p class="kb-ol-ket">Metode (QRIS, Virtual Account, e-wallet) dipilih pada langkah berikutnya. Tagihan berlaku 24 jam.</p>
      <p class="kb-ol-ket" style="background:#fff8e1;border:1px solid #f3dd97;border-radius:10px;padding:8px 10px;color:#5c4a00;text-align:left">💡 Pilih Virtual Account sesuai bank Anda (BNI, BRI, Mandiri, Permata). <b>Nasabah BCA/BSI/Bank Sumsel Babel: pilih QRIS</b> — pindai dengan aplikasi m-banking Anda.</p>
      <p class="kb-ol-galat" id="ol-galat"></p>
      <button class="kb-btn utama" type="button" style="width:100%" data-ol-bayar>Bayar sekarang ${rp(d.nilai)}</button>
      <button class="kb-btn garis" type="button" style="width:100%;margin-top:8px" data-ol-kembali>← Ubah data</button>`;
  }
  function olSnapJs(src, ck) {
    return new Promise((ok, gagal) => { if (window.snap) return ok();
      const s = document.createElement('script'); s.src = src; s.setAttribute('data-client-key', ck); s.onload = () => ok(); s.onerror = () => gagal(new Error('snap')); document.head.appendChild(s); });
  }
  async function olBayar(btn) {
    btn.disabled = true; btn.textContent = 'Menyiapkan pembayaran…'; const gal = document.getElementById('ol-galat');
    let r;
    try { const res = await fetch('/api/bayar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(OL.x.umum ? { ...OL.d, kode_kampanye: '', layanan: OL.x.umum, niat: OL.x.umum !== 'infak' && OL.d.setuju,
      jiwa: OL.x.umum === 'fitrah' ? OL.d.jiwa.filter(n => n.trim().length >= 2) : undefined } : { ...OL.d, kode_kampanye: OL.x.id }) }); r = await res.json(); }
    catch (e) { r = { ok: false, pesan: 'Gagal terhubung. Periksa koneksi internet.' }; }
    if (!r.ok) { gal.textContent = r.pesan; btn.disabled = false; btn.textContent = 'Coba lagi'; return; }
    lacak('donasi_online_mulai', { konten_id: OL.x.id || OL.x.umum, value: OL.d.nilai, currency: 'IDR' });
    try { await olSnapJs(r.snap_js, r.client_key); } catch (e) { gal.textContent = 'Halaman pembayaran gagal dimuat. Coba lagi.'; btn.disabled = false; return; }
    const ke = () => olStatus(r.order_id);
    window.snap.pay(r.token, { onSuccess: ke, onPending: ke, onError: ke, onClose: ke });
  }
  // v62: Lanjutkan Pembayaran (tagihan Snap yang sama) / Donasi Ulang (kampanye & nominal terisi)
  const OLS = {}, OLTOLAK = {}; let OLGEN = 0;
  async function olStatus(order, n, g) {
    n = n || 0; if (!n) g = ++OLGEN; const isi = lembar();
    if (!n) isi.innerHTML = '<div class="kb-skel" style="height:120px"></div>';
    let s; try { s = await api('bayar_status', { order_id: order }); } catch (e) { s = { ok: false }; }
    const ulang = s.ok && s.status === 'Menunggu pembayaran' && n < 40;
    if (s.ok) OLS[order] = s;
    const tunggu = s.ok && s.status === 'Menunggu pembayaran', lanjut = tunggu && s.bisa_lanjut && !OLTOLAK[order];
    const donUlang = s.ok && ((tunggu && !lanjut) || !/^(Lunas|Menunggu pembayaran|Refund)$/.test(s.status)) && (s.kode_kampanye || UMUM[s.layanan]);
    const ikon = !s.ok ? '⚠️' : s.status === 'Lunas' ? '✅' : s.status === 'Menunggu pembayaran' ? '⏳' : '✖️';
    const teks = !s.ok ? 'Status belum dapat dimuat. Simpan nomor transaksi di bawah dan cek kembali nanti.'
      : s.status === 'Lunas' && (s.layanan === 'zakat' || s.layanan === 'fitrah') ? `Ājarakallāhu fīmā a'ṭaita, wa bāraka laka fīmā abqaita. ${s.layanan === 'fitrah' ? 'Zakat fitrah' : 'Zakat mal'} <b>${rp(s.nilai)}</b> telah kami terima dan tercatat.`
      : s.status === 'Lunas' && s.layanan === 'fidyah' ? `Jazakumullahu khairan. Fidyah <b>${rp(s.nilai)}</b> telah kami terima dan akan disalurkan kepada fakir miskin.`
      : s.status === 'Lunas' ? `Jazakumullahu khairan. Donasi <b>${rp(s.nilai)}</b> untuk <b>${esc(s.judul)}</b> telah kami terima dan tercatat.`
      : lanjut ? 'Pembayaran belum selesai. Tekan <b>Lanjutkan Pembayaran</b> untuk membuka kembali tagihan Anda — halaman ini diperbarui otomatis setelah Anda membayar.'
      : tunggu ? 'Pembayaran belum selesai dan tagihan ini tidak dapat dibuka kembali dari halaman ini. Silakan <b>donasi ulang</b>; tagihan lama batal otomatis bila tidak dibayar.'
      : 'Transaksi ' + esc(String(s.status).toLowerCase()) + '. Silakan mulai donasi baru bila ingin melanjutkan.';
    if (s.ok && s.status === 'Lunas' && !n) lacak('donasi_online_lunas', { konten_id: s.kode_kampanye || s.layanan, value: s.nilai, currency: 'IDR' });
    isi.innerHTML = `<div class="kb-ol-status"><div class="ik">${ikon}</div><p>${teks}</p><div class="kb-ol-no">No. transaksi<br><b>${esc(order)}</b></div></div>
      ${s.ok && s.ada_bsz ? `<div class="kb-ol-ring" style="margin-bottom:10px"><div style="display:block"><b>📄 Bukti Setor Zakat elektronik (e-BSZ)</b><span style="display:block;font-size:13px;margin-top:4px">Untuk keamanan, masukkan 4 digit terakhir nomor WhatsApp yang Anda isi.</span></div>
        <div style="display:flex;gap:8px"><input id="ol-wa4" inputmode="numeric" maxlength="4" placeholder="4 digit" style="flex:1;padding:10px;border:1px solid #ccc;border-radius:10px;font-size:16px"><button class="kb-btn utama" type="button" data-ebsz="${esc(order)}">Unduh e-BSZ</button></div><p class="kb-ol-galat" id="ol-galat-bsz"></p></div>` : ''}
      ${s.ok && s.status === 'Lunas' && s.kode_kampanye ? `<a class="kb-btn wa" style="width:100%" href="${waLink('Saya baru berdonasi untuk ' + s.judul + '. Yuk ikut menebar manfaat', s.kode_kampanye)}" target="_blank" rel="noopener noreferrer">${svgWa} Ajak teman lewat WhatsApp</a>` : ''}
      ${tunggu && s.batas ? `<p class="kb-ol-ket">Bayar sebelum <b>${esc(s.batas)} WIB</b></p>` : ''}
      ${lanjut ? `<button class="kb-btn utama" type="button" style="width:100%" data-ol-lanjutkan="${esc(order)}">💳 Lanjutkan Pembayaran ${rp(s.nilai)}</button>
        <p class="kb-ol-galat" id="ol-galat-lanjut"></p>
        <p class="kb-ol-ket" style="background:#fff8e1;border:1px solid #f3dd97;border-radius:10px;padding:8px 10px;color:#5c4a00;text-align:left">💡 Cara termudah: pilih <b>QRIS</b>, simpan/screenshot kode QR-nya, lalu pindai dari aplikasi m-banking atau e-wallet Anda.</p>` : ''}
      ${donUlang ? `<button class="kb-btn utama" type="button" style="width:100%" data-ol-ulang="${esc(order)}">🔁 Donasi Ulang${s.kode_kampanye || /^(zakat|infak)$/.test(s.layanan) ? ' ' + rp(s.nilai) : ''}</button>` : ''}
      <button class="kb-btn ${lanjut || donUlang ? 'garis' : 'utama'}" type="button" style="width:100%;margin-top:8px" data-tutup>Tutup</button>`;
    if (ulang && document.getElementById('kb-lembar').classList.contains('buka')) setTimeout(() => { if (g === OLGEN && document.querySelector('.kb-ol-no b') && document.querySelector('.kb-ol-no b').textContent === order) olStatus(order, n + 1, g); }, 4000);
    if (s.ok && s.status === 'Lunas') { delete cacheDetail[s.kode_kampanye]; }
  }
  async function olLanjutkan(btn) {
    const order = btn.dataset.olLanjutkan, gal = document.getElementById('ol-galat-lanjut');
    btn.disabled = true; btn.textContent = 'Membuka tagihan…';
    let r; try { r = await (await fetch('/api/lanjut', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: order }) })).json(); }
    catch (e) { r = { ok: false, pesan: 'Gagal terhubung. Periksa koneksi internet.' }; }
    if (!r.ok && r.kode === 'ULANG') { OLTOLAK[order] = 1; return olStatus(order); }
    if (!r.ok) { if (gal) gal.textContent = r.pesan; btn.disabled = false; btn.textContent = 'Coba lagi'; return; }
    try { await olSnapJs(r.snap_js, r.client_key); } catch (e) { if (gal) gal.textContent = 'Halaman pembayaran gagal dimuat. Coba lagi.'; btn.disabled = false; btn.textContent = 'Coba lagi'; return; }
    lacak('donasi_online_lanjut', { konten_id: (OLS[order] || {}).kode_kampanye || (OLS[order] || {}).layanan || '' });
    const ke = () => olStatus(order);
    window.snap.pay(r.token, { onSuccess: ke, onPending: ke, onError: ke, onClose: ke });
  }
  async function olUlang(order) {
    const s = OLS[order] || {}, isi = lembar();
    if (s.kode_kampanye) {
      let x = cacheDetail[s.kode_kampanye];
      if (!x) { isi.innerHTML = '<div class="kb-skel" style="height:120px"></div>'; try { x = await api('detail_publik', { id: s.kode_kampanye }); } catch (e) { x = null; } if (x && x.ok) cacheDetail[s.kode_kampanye] = x; }
      if (!x || !x.ok || !x.online) { isi.innerHTML = `<div class="kb-ol-status"><div class="ik">ℹ️</div><p>Kampanye ini tidak lagi menerima donasi online. Silakan pilih kampanye lain atau tunaikan zakat/infak umum.</p></div><button class="kb-btn utama" type="button" style="width:100%" data-tutup>Tutup</button>`; return; }
      OL.x = x; OL.d = { x: x.id, nilai: s.nilai };
    } else if (UMUM[s.layanan]) {
      const j = s.layanan, grup = /^(fitrah|fidyah)$/.test(j) ? 'khusus-' + j : 'umum';
      OL.x = { id: '', umum: j, judul: UMUM[j].judul }; OL.d = grup === 'umum' ? { x: grup, nilai: s.nilai } : { x: grup };
    } else return;
    lacak('donasi_online_ulang', { konten_id: s.kode_kampanye || s.layanan });
    olForm();
  }
  // v47: e-BSZ — data diminta lewat POST (nomor transaksi + 4 digit WA), dicetak di jendela baru.
  const terbilang = n => { n = Math.floor(Math.abs(+n || 0)); const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    const t = x => x < 12 ? s[x] : x < 20 ? t(x - 10) + ' belas' : x < 100 ? t(Math.floor(x / 10)) + ' puluh ' + t(x % 10) : x < 200 ? 'seratus ' + t(x - 100) : x < 1000 ? t(Math.floor(x / 100)) + ' ratus ' + t(x % 100)
      : x < 2000 ? 'seribu ' + t(x - 1000) : x < 1e6 ? t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000) : x < 1e9 ? t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6) : t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9);
    const r = t(n).replace(/\s+/g, ' ').trim(); return r ? r.charAt(0).toUpperCase() + r.slice(1) + ' rupiah' : 'Nol rupiah'; };
  const muatQr = () => new Promise(ok => { if (window.qrcode) return ok(true); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; sc.onload = () => ok(!!window.qrcode); sc.onerror = () => ok(false); document.head.appendChild(sc); });
  async function olEbsz(btn) {
    const order = btn.dataset.ebsz, wa4 = (document.getElementById('ol-wa4').value || '').replace(/\D/g, ''), gal = document.getElementById('ol-galat-bsz');
    if (!/^\d{4}$/.test(wa4)) { gal.textContent = 'Isi 4 digit terakhir nomor WhatsApp.'; return; }
    const w = window.open('', '_blank'); if (!w) { gal.textContent = 'Izinkan popup untuk mengunduh e-BSZ.'; return; }
    w.document.write('<p style="font-family:sans-serif;padding:20px">Menyiapkan e-BSZ…</p>');
    btn.disabled = true; let r; try { r = await api('bsz_online', { order_id: order, wa4 }); } catch (e) { r = { ok: false, pesan: 'Gagal terhubung.' }; } btn.disabled = false;
    if (!r.ok) { w.close(); gal.textContent = r.pesan; return; }
    gal.textContent = ''; lacak('unduh_ebsz', { konten_id: 'zakat' });
    const qr = (await muatQr()) ? (() => { try { const q = qrcode(0, 'M'); q.addData(location.origin + '/pengajuan.html#bsz=' + encodeURIComponent(r.nomor_bsz)); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0 }); } catch (e) { return ''; } })() : '';
    const m = r.muzaki, st = r.setoran, row = (l, v) => `<tr><td style="width:42mm">${l}</td><td style="width:4mm">:</td><td>${v}</td></tr>`;
    const idn = m.npwp ? ['NPWP', m.npwp] : m.nomorIdentitas ? [m.jenisIdentitas || 'NIK', m.nomorIdentitas] : null;
    w.document.open(); w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>e-BSZ ${esc(r.nomor_bsz)}</title><style>
      @page{size:A4;margin:15mm}body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;max-width:180mm;margin:10px auto;padding:0 10px}
      .kop{display:flex;gap:12px;align-items:center;border-bottom:3px double #000;padding-bottom:8px}.kop img{width:22mm;height:22mm;object-fit:contain}.kop div{text-align:center;flex:1}
      .k1{font-size:14pt;font-weight:bold}.k2{font-size:16pt;font-weight:bold}.k3{font-size:9pt}h1{text-align:center;font-size:14pt;margin:14px 0 0;text-decoration:underline}.no{text-align:center;margin-bottom:12px}
      table{border-collapse:collapse;width:100%}td,th{padding:3px 4px;vertical-align:top}.g th,.g td{border:1px solid #000}.g th{background:#eee}.r{text-align:right}.c{text-align:center}
      .kaki{display:flex;justify-content:space-between;align-items:flex-end;margin-top:12mm}.qr{text-align:center;font-size:8pt;width:40mm}.qr svg{width:30mm;height:30mm}.ttd{text-align:center;width:75mm}
      .ket{margin-top:8mm;font-size:8.5pt;color:#444;border-top:1px solid #ccc;padding-top:2mm}.cetak{margin:16px 0;text-align:center}@media print{.cetak{display:none}}</style></head><body>
      <div class="kop"><img src="${location.origin}/logo-baznas.jpg" alt=""><div><div class="k1">BADAN AMIL ZAKAT NASIONAL</div><div class="k2">KOTA LUBUK LINGGAU</div>
        <div class="k3">Jl. Letkol Sukirno Kompleks Ex. Pemda Kelurahan Air Kuti Kecamatan Lubuk Linggau Timur I, Kota Lubuklinggau, Sumatera Selatan 31625<br>Website: https://kotalubuklinggau.baznas.go.id/ · Telp: 0812-7144-8282</div></div></div>
      <h1>BUKTI SETOR ZAKAT</h1><div class="no">Nomor: ${esc(r.nomor_bsz)}</div>
      <table>${row('Nama Muzaki', '<b>' + esc(m.nama) + '</b>')}${row('NPWZ', esc(m.npwz || '-'))}${idn ? row(esc(idn[0]), esc(idn[1])) : ''}${m.alamat ? row('Alamat', esc(m.alamat)) : ''}${row('ID Muzaki', esc(m.muzakiId || '-'))}</table>
      <p>Telah menerima pembayaran zakat dengan rincian:</p>
      <table class="g"><thead><tr><th>No</th><th>Tanggal Setor</th><th>No. Transaksi</th><th>Jenis Zakat</th><th>Cara Bayar</th><th>Jumlah (Rp)</th></tr></thead>
      <tbody><tr><td class="c">1</td><td class="c">${esc(tgl(st.tanggal))}</td><td class="c">${esc(st.no_bukti)}</td><td>${esc(st.jenis_dana)}</td><td class="c">${esc(st.metode)}</td><td class="r">${Math.round(st.nilai).toLocaleString('id-ID')}</td></tr>
      <tr><td colspan="5" class="r"><b>Jumlah</b></td><td class="r"><b>${Math.round(st.nilai).toLocaleString('id-ID')}</b></td></tr></tbody></table>
      ${st.rincian ? `<p style="font-size:11pt"><b>Rincian:</b> ${esc(st.rincian)}</p>` : ''}<p><b>Terbilang:</b> <i>${esc(terbilang(st.nilai))}</i></p>
      <p style="font-size:10.5pt">Bukti Setor Zakat ini diterbitkan secara elektronik oleh sistem BAZNAS Kota Lubuklinggau dan sah tanpa tanda tangan basah. Keasliannya dapat diperiksa dengan memindai kode QR. BSZ dapat digunakan sebagai pengurang penghasilan kena pajak sesuai Undang-Undang Nomor 23 Tahun 2011 tentang Pengelolaan Zakat dan peraturan perpajakan yang berlaku.</p>
      <div class="kaki"><div class="qr">${qr}<div>Pindai untuk verifikasi keaslian</div></div>
        <div class="ttd">Lubuklinggau, ${esc(tgl(r.tanggal_terbit))}<br>Ketua BAZNAS Kota Lubuk Linggau<br><br><i style="font-size:9pt">(dokumen elektronik)</i><br><br><b><u>${esc(C.ketua)}</u></b></div></div>
      <div class="ket">e-BSZ · diterbitkan ${esc(tgl(r.tanggal_terbit))} · ${esc(st.no_bukti)}</div>
      <div class="cetak"><button onclick="print()" style="font-size:16px;padding:10px 18px">🖨️ Cetak / Simpan PDF</button></div></body></html>`);
    w.document.close();
  }
  function olKlik(t) {
    if (t.dataset.online) { const x = cacheDetail[t.dataset.online]; if (!x) return; OL.x = x; OL.d = OL.d.x === x.id ? OL.d : { x: x.id }; lacak('donasi_online_buka', { konten_id: x.id }); olForm(); }
    else if (t.dataset.olNom) { const i = document.getElementById('ol-nilai'); i.value = Number(t.dataset.olNom).toLocaleString('id-ID'); document.querySelectorAll('[data-ol-nom]').forEach(b => b.classList.toggle('on', b === t)); }
    else if (t.hasAttribute('data-ol-lanjut')) { if (olBaca()) olPeriksa(); }
    else if (t.hasAttribute('data-ol-kembali')) olForm();
    else if (t.hasAttribute('data-ol-bayar')) olBayar(t);
    else if (t.dataset.olLanjutkan) olLanjutkan(t);   // v62
    else if (t.dataset.olUlang) olUlang(t.dataset.olUlang);
    else if (t.dataset.olUmum) {   // v47: zakat mal / infak tidak terikat tanpa kampanye
      const j = t.dataset.olUmum, grup = /^(fitrah|fidyah)$/.test(j) ? 'khusus-' + j : 'umum';
      OL.x = { id: '', umum: j, judul: UMUM[j].judul }; OL.d = OL.d.x === grup ? OL.d : { x: grup };
      const h = document.getElementById('kb-hasilz'); if (j === 'zakat' && h && h.classList.contains('wajib') && !OL.d.nilai) { const v = +(h.querySelector('b').textContent.replace(/\D/g, '')); if (v >= 10000) OL.d.nilai = v; }
      lacak('donasi_online_buka', { konten_id: j }); olForm();
    }
    else if (t.dataset.olJenis) { if (document.getElementById('ol-nama')) olBaca(); OL.d.setuju = false; OL.x = { id: '', umum: t.dataset.olJenis, judul: UMUM[t.dataset.olJenis].judul }; olForm(); }
    else if (t.dataset.ebsz) olEbsz(t);
    else if (t.dataset.olKelas) { olBacaKhusus(); OL.d.kelas = +t.dataset.olKelas; olFormKhusus(); }
    else if (t.hasAttribute('data-ol-tambah-jiwa')) { olBacaKhusus(); OL.d.jiwa.push(''); olFormKhusus(); const j = document.querySelectorAll('[data-ol-jiwa]'); j[j.length - 1].focus(); }
    else if (t.dataset.olHapusJiwa) { olBacaKhusus(); OL.d.jiwa.splice(+t.dataset.olHapusJiwa, 1); olFormKhusus(); }
  }
  { const m = /^#bayar-(ONL-\d{6}-[A-Z0-9]{8})$/.exec(location.hash); if (m) { history.replaceState(null, '', location.pathname); setTimeout(() => olStatus(m[1]), 300); } }
  muat();
})();
