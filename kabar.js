/* Kabar BAZNAS Kota Lubuklinggau — halaman publik (hanya membaca lewat aksi API; tanpa data pribadi).
   Konfigurasi lewat window.KABAR_CONFIG = { api, foto, bagikan, cekSetoran, laporanKeuangan } */
(function () {
  const C = Object.assign({ api: '', foto: '/api/foto', bagikan: '/k/', cekSetoran: 'pengajuan.html#setoran', laporanKeuangan: 'https://kotalubuklinggau.baznas.go.id/',
    muzaki: 'muzaki.html', nisabBulan: 7640144, nisabSumber: 'SK Ketua BAZNAS No. 15 Tahun 2026' }, window.KABAR_CONFIG || {});
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
        ${akhir ? `<div class="kb-hasil">✅ Terkumpul ${rp(k.terkumpul)} dari ${k.donatur} donatur. Jazakumullah khairan.</div>` :
        `<div class="kb-aksi"><button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Cara berdonasi</button>
          <a class="kb-btn wa" href="${waLink(k.judul, k.id, k.persen + '% tercapai')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}</a></div>`}
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
      <a class="kb-bagi" href="${waLink(x.judul, x.id, rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}</a>
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
    box.innerHTML = xs.length ? xs.map(kartuKabar).join('') : `<div class="kb-kosong kb-span">Belum ada kabar${F.kec ? ' di Kecamatan Lubuk Linggau ' + esc(F.kec) : ''} untuk pilihan ini. <button type="button" class="kb-tautan" data-reset>Tampilkan semua</button></div>`;
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
          <h1><a href="#${esc(k.id)}">${esc(k.judul)}</a></h1>
          <p>${esc(k.ringkas)}</p>
          <div class="kb-bar" role="progressbar" aria-valuenow="${k.persen}" aria-valuemin="0" aria-valuemax="100" aria-label="Tercapai ${k.persen}%"><i data-w="${Math.min(100, k.persen)}"></i></div>
          <div class="kb-kumpul"><span><b>${rp(k.terkumpul)}</b> terkumpul dari ${rpRingkas(k.target)}</span><span>${k.persen}%</span></div>
          <div class="kb-hangka"><div><b>${k.donatur.toLocaleString('id-ID')}</b><small>donatur</small></div><div><b>${k.sisa_hari}</b><small>hari lagi</small></div><div><b>${esc(k.program)}</b><small>tujuan dana</small></div></div>
          <div class="kb-aksi"><button class="kb-btn utama" type="button" data-donasi="${esc(k.id)}">Cara berdonasi</button>
            <a class="kb-btn wa" href="${waLink(k.judul, k.id, k.persen + '% tercapai')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}<span class="kb-hp-sembunyi">WhatsApp</span></a>
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
        <h1><a href="#${esc(x.id)}">${esc(x.judul)}</a></h1>
        ${x.ringkas ? `<p>${esc(x.ringkas)}</p>` : ''}
        <div class="kb-hangka"><div><b>${x.jumlah_penerima}</b><small>penerima</small></div><div><b>${rpRingkas(x.total_nilai)}</b><small>tersalurkan</small></div><div><b>${esc(x.kecamatan || 'Kota Lubuklinggau')}</b><small>lokasi</small></div></div>
        <div class="kb-aksi"><a class="kb-btn utama" href="#${esc(x.id)}">Baca selengkapnya</a>
          <a class="kb-btn wa" href="${waLink(x.judul, x.id, rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}<span class="kb-hp-sembunyi">WhatsApp</span></a>
          <button class="kb-btn garis" type="button" data-bagi="${esc(x.id)}" data-judul="${esc(x.judul)}" aria-label="Bagikan ke media sosial lain">${svgBagi}</button></div>
      </div></section>`;
  }
  // ── v18: kalkulator zakat penghasilan + CTA ──
  function samping() {
    return `<aside class="kb-samping" id="zakat" aria-label="Kalkulator zakat">
      <div class="kb-kalk">
        <h2>Kalkulator zakat penghasilan</h2>
        <p class="kb-kecil">Nisab ${rp(C.nisabBulan)}/bulan · kadar 2,5% (${esc(C.nisabSumber)})</p>
        <label>Penghasilan per bulan<span class="kb-rpin"><span>Rp</span><input id="kb-gaji" inputmode="numeric" autocomplete="off" placeholder="0"></span></label>
        <label>Pendapatan lain per bulan <small>(opsional: bonus, sewa, usaha)</small><span class="kb-rpin"><span>Rp</span><input id="kb-lain" inputmode="numeric" autocomplete="off" placeholder="0"></span></label>
        <div class="kb-hasilz" id="kb-hasilz" aria-live="polite"><small>Isi penghasilan untuk menghitung</small><b>Rp 0</b><span>Dihitung dari penghasilan bruto per bulan.</span></div>
        <a class="kb-cta" href="${esc(C.muzaki)}">Tunaikan Zakat Sekarang</a>
        <p class="kb-aman">${svgPerisai}<span>Transfer hanya ke rekening atas nama <b>BAZNAS Kota Lubuklinggau</b>. Bukti Setor Zakat (BSZ) dapat menjadi pengurang penghasilan kena pajak.</span></p>
      </div>
      <nav class="kb-transparan" aria-label="Transparansi"><b>Transparansi</b>
        <a href="${esc(C.laporanKeuangan)}" rel="noopener">Laporan keuangan →</a>
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
    if (h === 'beasiswa') tabAktif = 'beasiswa';
    const tayang = data.kampanye.filter(k => k.status === 'Tayang'), selesai = data.kampanye.filter(k => k.status === 'Berakhir');
    if (!tabAktif) tabAktif = tayang.length ? 'kampanye' : 'kabar';
    const bln = new Date(data.bulan_ini.bulan + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long' });
    document.body.classList.remove('kb-mode-detail');
    app.innerHTML = `${hero(tayang)}
      <section class="kb-dampak" aria-label="Dampak tahun ${esc(data.dampak.tahun)}">
        <div><strong data-hitung="${data.dampak.penerima}">${data.dampak.penerima.toLocaleString('id-ID')}</strong><small>penerima manfaat</small></div>
        <div class="emas"><strong>${rpRingkas(data.dampak.tersalurkan)}</strong><small>tersalurkan</small></div>
        <div class="kb-cap">Sepanjang tahun ${esc(data.dampak.tahun)} · data langsung dari pembukuan BAZNAS</div>
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
    pasangFoto(app); animasiBar(app);
    document.title = 'Kabar Kebaikan — BAZNAS Kota Lubuklinggau';
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
        <div class="kb-aksi" style="margin-top:12px">
          ${kmp && !akhir ? `<button class="kb-btn utama" type="button" data-donasi="${esc(x.id)}">Cara berdonasi</button>` : `<a class="kb-btn utama" href="#">Lihat kabar lainnya</a>`}
          <a class="kb-btn wa" href="${waLink(x.judul, x.id, kmp ? x.persen + '% tercapai' : rp(x.total_nilai) + ' tersalurkan')}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${svgWa}</a>
          <button class="kb-btn garis" type="button" data-bagi="${esc(x.id)}" data-judul="${esc(x.judul)}" aria-label="Bagikan ke media sosial lain">${svgBagi}</button></div>
      </div></article>${samping()}`;
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
    const f = e.target.closest('[data-kec],[data-kat],[data-reset],[data-bagi]');
    if (f) {
      if (f.hasAttribute('data-kec')) F.kec = f.dataset.kec || '';
      else if (f.hasAttribute('data-kat')) F.kat = f.dataset.kat || '';
      else if (f.hasAttribute('data-reset')) { F.kec = ''; F.kat = ''; F.cari = ''; const c = document.getElementById('kb-cari'); if (c) c.value = ''; }
      else { bagikan(f.dataset.bagi, f.dataset.judul, f); return; }
      isiKabar(); return;
    }
    const t = e.target.closest('[data-tab],[data-donasi],[data-salin],[data-tutup]');
    if (!t) { if (e.target.id === 'kb-lembar') e.target.classList.remove('buka'); return; }
    if (t.dataset.tab) { e.preventDefault(); tabAktif = t.dataset.tab; if (location.hash) history.replaceState(null, '', location.pathname); render(); const tb = document.querySelector('.kb-tabs'); if (tb && (tabAktif === 'beasiswa' || t.closest('.kb-nav'))) tb.scrollIntoView({ behavior: gerakMinim ? 'auto' : 'smooth' }); }
    else if (t.dataset.donasi) bukaDonasi(t.dataset.donasi);
    else if (t.dataset.salin) { (navigator.clipboard ? navigator.clipboard.writeText(t.dataset.salin) : Promise.reject()).then(() => { t.textContent = /^https?:/.test(t.dataset.salin) ? '✓ Tautan disalin' : '✓ Nomor rekening disalin'; }).catch(() => prompt('Salin nomor rekening:', t.dataset.salin)); }
    else if (t.hasAttribute('data-tutup')) document.getElementById('kb-lembar').classList.remove('buka');
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'kb-cari') { F.cari = e.target.value; isiKabar(); }
    else if (e.target.id === 'kb-gaji' || e.target.id === 'kb-lain') hitungZakat();
  });
  // bagikan: lembar bagikan bawaan HP (WA, FB, IG, Telegram…) bila ada; di komputer salin tautan
  async function bagikan(id, judul, tombol) {
    const url = tautan(id);
    if (navigator.share) { try { await navigator.share({ title: judul, text: judul + ' — Kabar Kebaikan BAZNAS Kota Lubuklinggau', url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const fb = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), xx = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(judul) + '&url=' + encodeURIComponent(url);
    const l = document.getElementById('kb-lembar'), isi = l.querySelector('.kb-lembar-isi');
    isi.innerHTML = `<h3 style="margin:0 0 4px">Bagikan kabar ini</h3><p style="margin:0 0 12px;color:var(--kb-redup);font-size:14px">${esc(judul)}</p>
      <div class="kb-bagi-daftar"><a class="kb-btn wa" href="${waLink(judul, id)}" target="_blank" rel="noopener">${svgWa} WhatsApp</a>
      <a class="kb-btn garis" href="${fb}" target="_blank" rel="noopener">Facebook</a><a class="kb-btn garis" href="${xx}" target="_blank" rel="noopener">X / Twitter</a>
      <button class="kb-btn garis" type="button" data-salin="${esc(url)}">📋 Salin tautan</button></div>
      <button class="kb-btn utama" type="button" style="width:100%;margin-top:12px" data-tutup>Tutup</button>`;
    l.classList.add('buka');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('kb-lembar').classList.remove('buka'); });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (!h) { render(); window.scrollTo({ top: 0 }); } else if (/^(KMP|PUB)-/.test(decodeURIComponent(h))) render(); });
  muat();
})();
