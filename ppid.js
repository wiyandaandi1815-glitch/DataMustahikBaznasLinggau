/* PPID BAZNAS Kota Lubuklinggau — halaman publik. Semua kiriman POST JSON; NIK tidak pernah masuk URL. */
(function () {
  const C = Object.assign({ api: '', dok: '/api/dok' }, window.PPID_CONFIG || {});
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tgl = s => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const ukuran = n => { n = +n || 0; return n ? (n >= 1048576 ? (n / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : ''; };
  const lacak = (nama, p) => { try { if (typeof window.gtag === 'function') window.gtag('event', nama, p || {}); } catch (e) { } };
  async function api(aksi, d) {
    const r = await fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ aksi, data: d || {} }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  let data = null, periode = '';
  const STRUK = [['atasan', 'Atasan PPID', 'Ketua BAZNAS Kota Lubuklinggau'], ['pelaksana', 'PPID Pelaksana', 'Wakil Ketua IV Bidang Administrasi, SDM & Umum'],
    ['sekretaris', 'Sekretaris PPID', 'Sekretaris & Kepala Pelaksana'], ['petugas', 'Petugas Layanan Informasi', 'Kepala Bidang Administrasi, SDM & Umum']];

  function profil() {
    const p = data.profil, ada = !!p.sk;
    $('pp-struktur').innerHTML = `<dl class="pp-struk">${STRUK.map(([k, l, j]) => `<dt>${l}</dt><dd>${esc(ada && p[k] ? p[k] : j)}</dd>`).join('')}
      <dt>Penyedia data</dt><dd>Kepala Bidang/pelaksana tiap bidang</dd></dl>
      ${ada ? `<div class="pp-redup" style="margin:8px 0 0;font-size:12.5px">Ditetapkan dengan ${esc(p.sk)}</div>` : '<div class="pp-tunggu">Struktur PPID menunggu penetapan SK Ketua BAZNAS Kota Lubuklinggau; sementara ditampilkan berdasarkan jabatan.</div>'}`;
    const wa = String(p.wa || '').replace(/\D/g, '').replace(/^0/, '62');
    $('pp-kontak').innerHTML = `<p style="margin:0;color:var(--kb-redup)"><b style="color:var(--kb-teks)">Alamat:</b> ${esc(p.alamat)}<br>
      <b style="color:var(--kb-teks)">WhatsApp/Telepon:</b> ${wa ? `<a href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(p.wa)}</a>` : esc(p.wa)} · <b style="color:var(--kb-teks)">Email:</b> <a href="mailto:${esc(p.email)}">${esc(p.email)}</a><br>
      <b style="color:var(--kb-teks)">Jam layanan:</b> ${esc(p.jam)}</p>`;
  }
  function tombolAkses(d) {
    if (d.status !== 'Terbuka') return '<small>Tidak dibuka untuk umum</small>';
    if (d.ada_file) return `<a class="pp-unduh" href="${esc(C.dok)}?id=${encodeURIComponent(d.id)}" target="_blank" rel="noopener noreferrer" data-dok="${esc(d.id)}">⬇ Unduh PDF${d.ukuran ? ' · ' + ukuran(d.ukuran) : ''}</a>`;
    if (d.tautan) return `<a class="pp-unduh" href="${esc(d.tautan)}" target="_blank" rel="noopener noreferrer" data-dok="${esc(d.id)}">Buka tautan ↗</a>`;
    return '<small>Hubungi desk PPID</small>';
  }
  const item = d => `<div class="pp-item"><div><b>${esc(d.judul)}</b><small>${[d.kelompok, d.periode ? 'Periode ' + d.periode : '', d.diperbarui ? 'Diperbarui ' + tgl(d.diperbarui) : ''].filter(Boolean).map(esc).join(' · ')}</small>
    ${d.ringkasan ? `<div style="font-size:13px;color:var(--kb-redup);margin-top:3px">${esc(d.ringkasan)}</div>` : ''}</div>${tombolAkses(d)}</div>`;
  const kosong = t => `<div class="pp-kosong">${t}</div>`;
  function berkala() {
    const xs = data.dokumen.filter(d => d.kategori === 'Berkala' && d.status === 'Terbuka');
    const per = [...new Set(xs.map(d => d.periode || 'Lainnya'))].sort().reverse();
    if (!periode || !per.includes(periode)) periode = per[0] || '';
    $('pp-periode').innerHTML = per.length > 1 ? per.map(p => `<button type="button" role="tab" data-periode="${esc(p)}" aria-selected="${p === periode}">${p === 'Lainnya' ? 'Lainnya' : 'Periode ' + esc(p)}</button>`).join('') : '';
    const ys = xs.filter(d => (d.periode || 'Lainnya') === periode);
    $('pp-berkala').innerHTML = ys.length ? ys.map(item).join('') : kosong('Dokumen informasi berkala sedang disiapkan. Untuk kebutuhan mendesak, ajukan <a href="#permohonan">permohonan informasi</a>.');
  }
  function setiap() {
    const xs = data.dokumen.filter(d => d.kategori !== 'Berkala' && d.status === 'Terbuka');
    $('pp-setiap').innerHTML = xs.length ? xs.map(d => item(Object.assign({}, d, { kelompok: [d.kategori === 'Serta Merta' ? 'Serta Merta' : '', d.kelompok].filter(Boolean).join(' · ') }))).join('')
      : kosong('Dokumen sedang disiapkan. Untuk kebutuhan mendesak, ajukan <a href="#permohonan">permohonan informasi</a>.');
  }
  function dip() {
    const q = ($('pp-cari').value || '').trim().toLowerCase();
    const xs = data.dokumen.filter(d => !q || [d.judul, d.kategori, d.kelompok, d.periode, d.status].join(' ').toLowerCase().includes(q));
    $('pp-dip').innerHTML = xs.length ? xs.map((d, i) => `<tr><td>${i + 1}</td><td><b>${esc(d.judul)}</b>${d.status === 'Dikecualikan' && d.alasan_kecuali ? `<div style="font-size:12px;color:var(--kb-redup);margin-top:2px">Dasar pengecualian: ${esc(d.alasan_kecuali)}</div>` : ''}</td>
      <td>${esc(d.kategori)}${d.periode ? '<br><small>' + esc(d.periode) + '</small>' : ''}</td><td><span class="pp-st ${d.status === 'Terbuka' ? 'buka' : 'kecuali'}">${esc(d.status)}</span></td><td>${tombolAkses(d)}</td></tr>`).join('')
      : `<tr><td colspan="5">${kosong(q ? 'Tidak ada dokumen yang cocok.' : 'Daftar Informasi Publik sedang disusun.')}</td></tr>`;
  }
  function render() {
    profil(); berkala(); setiap(); dip();
    const sel = $('kb-alasan'); sel.innerHTML = '<option value="">— pilih —</option>' + data.alasan_keberatan.map(a => `<option>${esc(a)}</option>`).join('');
  }
  async function muat() {
    try { data = await api('ppid_publik'); if (!data.ok) throw new Error(data.pesan); render(); }
    catch (e) { ['pp-struktur', 'pp-kontak', 'pp-berkala', 'pp-setiap'].forEach(id => { $(id).innerHTML = kosong('Gagal memuat data. Periksa koneksi lalu <a href="javascript:location.reload()">muat ulang</a>.'); }); $('pp-dip').innerHTML = ''; }
  }
  // ── berkas → base64 (foto diperkecil; PDF apa adanya) ──
  function bacaBerkas(inp) {
    const f = inp.files && inp.files[0];
    if (!f) return Promise.resolve(null);
    if (f.size > 5 * 1048576) return Promise.reject(new Error('Ukuran file maksimal 5 MB.'));
    if (f.type === 'application/pdf') return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok({ mime: 'application/pdf', base64: String(r.result).split(',')[1] }); r.onerror = () => no(new Error('File tidak terbaca.')); r.readAsDataURL(f); });
    if (!/^image\/(jpeg|png)$/.test(f.type)) return Promise.reject(new Error('File harus JPG, PNG, atau PDF.'));
    return new Promise((ok, no) => { const u = URL.createObjectURL(f), img = new Image();
      img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok({ mime: 'image/jpeg', base64: c.toDataURL('image/jpeg', 0.85).split(',')[1] }); };
      img.onerror = () => no(new Error('Gambar tidak terbaca.')); img.src = u; });
  }
  const galat = (id, t) => { const g = $(id); g.textContent = t; g.hidden = !t; if (t) g.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  $('pm-jenis').addEventListener('change', e => { $('pm-kuasa-w').hidden = e.target.value !== 'Lembaga'; });
  $('pm-cara').addEventListener('change', e => { $('pm-salinan-w').hidden = e.target.value !== 'Mendapatkan salinan'; });
  $('pm-nik').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16); });
  ['ck-hp', 'kb-hp'].forEach(id => $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); }));
  $('pp-f-mohon').addEventListener('submit', async e => {
    e.preventDefault(); galat('pm-galat', '');
    const v = id => $(id).value.trim(), b = $('pm-kirim');
    const d = { jenis_pemohon: v('pm-jenis'), nama: v('pm-nama'), nik: v('pm-nik'), pekerjaan: v('pm-pek'), alamat: v('pm-alamat'), hp: v('pm-hp'), email: v('pm-email'),
      rincian: v('pm-rincian'), tujuan: v('pm-tujuan'), cara_peroleh: v('pm-cara'), cara_salinan: v('pm-salinan'), persetujuan: $('pm-setuju').checked, website: v('pm-web') };
    const k = [];
    if (d.nama.length < 3) k.push('nama'); if (!/^\d{16}$/.test(d.nik)) k.push('NIK 16 digit'); if (d.alamat.length < 10) k.push('alamat');
    if (!/^(\+?62|0)8\d{8,12}$/.test(d.hp.replace(/[\s-]/g, ''))) k.push('nomor HP/WA'); if (d.rincian.length < 15) k.push('rincian informasi (min. 15 karakter)');
    if (d.tujuan.length < 10) k.push('tujuan'); if (!d.cara_peroleh) k.push('cara memperoleh'); if (d.cara_peroleh === 'Mendapatkan salinan' && !d.cara_salinan) k.push('cara salinan');
    if (d.cara_salinan === 'Email' && !d.email) k.push('email'); if (!$('pm-ktp').files.length) k.push('foto KTP');
    if (d.jenis_pemohon === 'Lembaga' && !$('pm-kuasa').files.length) k.push('surat kuasa/akta'); if (!d.persetujuan) k.push('centang pernyataan');
    if (k.length) return galat('pm-galat', 'Mohon lengkapi: ' + k.join(', ') + '.');
    b.disabled = true; b.textContent = 'Mengirim…';
    try {
      d.ktp = await bacaBerkas($('pm-ktp')); if (d.jenis_pemohon === 'Lembaga') d.kuasa = await bacaBerkas($('pm-kuasa'));
      const r = await api('ppid_mohon', d);
      if (!r.ok) return galat('pm-galat', r.pesan);
      lacak('ppid_permohonan');
      $('pp-f-mohon').hidden = true;
      $('pm-tiket').hidden = false;
      $('pm-tiket').innerHTML = `<strong>Permohonan terdaftar.</strong> Nomor registrasi Anda:<b class="no">${esc(r.no_reg)}</b>Jawaban paling lambat <b>${esc(tgl(r.batas))}</b> (10 hari kerja). Simpan nomor ini untuk mengecek status atau mengajukan keberatan.
        <div style="margin-top:10px"><button type="button" class="kb-sbtn garis" data-salin="${esc(r.no_reg)}">📋 Salin nomor</button></div>`;
      $('pm-tiket').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (x) { galat('pm-galat', x.message && !/HTTP|fetch/i.test(x.message) ? x.message : 'Gagal terhubung ke server. Coba lagi.'); }
    finally { b.disabled = false; b.textContent = 'Kirim permohonan'; }
  });
  $('pp-f-keb').addEventListener('submit', async e => {
    e.preventDefault(); galat('kb-galat', '');
    const d = { no_reg: $('kb-no').value.trim().toUpperCase(), hp4: $('kb-hp').value.trim(), alasan: $('kb-alasan').value, uraian: $('kb-uraian').value.trim(), website: $('kb-web').value };
    const k = [];
    if (!/^PPID-\d{4}-\d{4}$/.test(d.no_reg)) k.push('nomor registrasi (PPID-…)'); if (!/^\d{4}$/.test(d.hp4)) k.push('4 digit HP'); if (!d.alasan) k.push('alasan'); if (d.uraian.length < 15) k.push('uraian (min. 15 karakter)');
    if (k.length) return galat('kb-galat', 'Mohon lengkapi: ' + k.join(', ') + '.');
    const b = $('kb-kirim'); b.disabled = true;
    try {
      const r = await api('ppid_keberatan', d);
      if (!r.ok) return galat('kb-galat', r.pesan);
      lacak('ppid_keberatan');
      $('pp-f-keb').hidden = true; $('kb-tiket').hidden = false;
      $('kb-tiket').innerHTML = `<strong>Keberatan terdaftar.</strong> Nomor keberatan:<b class="no">${esc(r.no_keb)}</b>Tanggapan Atasan PPID paling lambat <b>${esc(tgl(r.batas))}</b> (30 hari kerja).`;
    } catch (x) { galat('kb-galat', 'Gagal terhubung ke server. Coba lagi.'); } finally { b.disabled = false; }
  });
  $('pp-f-cek').addEventListener('submit', async e => {
    e.preventDefault();
    const no = $('ck-no').value.trim().toUpperCase(), hp4 = $('ck-hp').value.trim(), o = $('ck-hasil');
    if (!/^(PPID|KEB)-\d{4}-\d{4}$/.test(no) || !/^\d{4}$/.test(hp4)) { o.innerHTML = '<div class="pp-galat">Isi nomor registrasi (PPID-… / KEB-…) dan 4 digit terakhir HP.</div>'; return; }
    o.innerHTML = '<div class="kb-skel" style="height:60px;margin-top:12px"></div>';
    try {
      const r = await api('ppid_status', { no, hp4 });
      if (!r.ok) { o.innerHTML = `<div class="pp-galat" style="margin-top:12px">${esc(r.pesan)}</div>`; return; }
      o.innerHTML = `<div class="pp-hasil"><b>${esc(r.no)}</b> · ${r.jenis === 'keberatan' ? 'Keberatan atas ' + esc(r.no_reg) : 'Permohonan informasi'} · diajukan ${esc(tgl(r.tanggal))}<br>
        Status: <b>${esc(r.status)}</b>${r.selesai ? '' : ` · batas ${esc(tgl(r.batas))}`}
        ${r.jawaban ? `<div class="pp-jawab">${esc(r.jawaban)}</div>` : ''}${r.alasan_tolak ? `<div class="pp-jawab"><b>Alasan penolakan:</b> ${esc(r.alasan_tolak)}</div>` : ''}
        ${r.jenis === 'permohonan' && r.selesai ? '<div style="margin-top:8px;font-size:13px">Tidak puas dengan jawaban? <a href="#keberatan">Ajukan keberatan</a>.</div>' : ''}</div>`;
    } catch (x) { o.innerHTML = '<div class="pp-galat" style="margin-top:12px">Gagal terhubung ke server.</div>'; }
  });
  document.addEventListener('click', e => {
    const p = e.target.closest('[data-periode]'); if (p) { periode = p.dataset.periode; berkala(); return; }
    const d = e.target.closest('[data-dok]'); if (d) lacak('ppid_unduh', { dok_id: d.dataset.dok });
    const s = e.target.closest('[data-salin]'); if (s && navigator.clipboard) navigator.clipboard.writeText(s.dataset.salin).then(() => { s.textContent = '✓ Nomor disalin'; });
  });
  $('pp-cari').addEventListener('input', () => { if (data) dip(); });
  // menu HP & dropdown PPID (sama dengan kabar.html)
  (function () {
    const bg = $('kb-burger'), mn = $('kb-menu'), dd = $('kb-dd');
    const tm = () => { mn.classList.remove('buka'); bg.setAttribute('aria-expanded', 'false'); }, td = () => { dd.classList.remove('buka'); dd.firstElementChild.setAttribute('aria-expanded', 'false'); };
    bg.addEventListener('click', e => { e.stopPropagation(); bg.setAttribute('aria-expanded', String(mn.classList.toggle('buka'))); });
    dd.firstElementChild.addEventListener('click', e => { e.stopPropagation(); dd.firstElementChild.setAttribute('aria-expanded', String(dd.classList.toggle('buka'))); });
    document.addEventListener('click', e => { if (!e.target.closest('#kb-dd') || e.target.closest('.kb-dd-isi a')) td(); if (!e.target.closest('#kb-menu,#kb-burger') || e.target.closest('#kb-menu a')) tm(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { td(); tm(); } });
    // sorot menu samping sesuai bagian yang terlihat
    const sm = document.querySelectorAll('.pp-samping a');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) sm.forEach(a => a.classList.toggle('aktif', a.getAttribute('href') === '#' + x.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
      document.querySelectorAll('.pp-kartu[id]').forEach(s => io.observe(s));
    }
  })();
  muat();
})();
