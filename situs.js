/* v42 — menu ☰ & dropdown PPID pada halaman publik (sama dengan kabar.html) */
(function () {
  var bg = document.getElementById('kb-burger'), mn = document.getElementById('kb-menu'), dd = document.getElementById('kb-dd'), nav = document.querySelector('.kb-nav');
  if (!bg || !mn || !dd) return;
  var tm = function () { mn.classList.remove('buka'); bg.setAttribute('aria-expanded', 'false'); };
  var td = function () { dd.classList.remove('buka'); dd.firstElementChild.setAttribute('aria-expanded', 'false'); };
  bg.addEventListener('click', function (e) { e.stopPropagation(); bg.setAttribute('aria-expanded', String(mn.classList.toggle('buka'))); });
  dd.firstElementChild.addEventListener('click', function (e) { e.stopPropagation(); dd.firstElementChild.setAttribute('aria-expanded', String(dd.classList.toggle('buka'))); });
  document.addEventListener('click', function (e) { if (!e.target.closest('#kb-dd') || e.target.closest('.kb-dd-isi a')) td(); if (!e.target.closest('#kb-menu,#kb-burger') || e.target.closest('#kb-menu a')) tm(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { td(); tm(); } });
  var ukur = function () { if (nav) document.documentElement.style.setProperty('--st-nav-h', nav.offsetHeight + 'px'); };
  ukur(); addEventListener('resize', ukur);
})();
