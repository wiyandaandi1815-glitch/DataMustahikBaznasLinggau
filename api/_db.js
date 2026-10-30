// Pemanggil Apps Script dari fungsi Vercel (server). URL dapat diganti lewat variabel lingkungan DB_URL.
const DB_URL = process.env.DB_URL || 'https://script.google.com/macros/s/AKfycbwcFWag2lgTgaaV5lKBWU_YDrhSHEAgPgXyrfFR9tq6uRyzrg5t_158fHzSBX6183me/exec';
async function panggil(aksi, data) {
  const r = await fetch(DB_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ aksi, data }), redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
const ID_RE = /^(KMP-\d{4}-[A-Z0-9]+(-[A-Z0-9]+)*|PUB-\d{4}-\d{4})$/;
module.exports = { panggil, ID_RE };
