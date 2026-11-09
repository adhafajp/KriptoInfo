// Uji empiris: jarak antar template wajah berbeda user di database asli
import { prisma } from '../src/config/db.js';
import { aesDecrypt } from '../src/crypto/crypto.js';

function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  return norm === 0 ? vector : vector.map(v => v / norm);
}

function faceDistance(a, b) {
  const x = l2Normalize(a), y = l2Normalize(b);
  return Math.sqrt(x.reduce((t, v, i) => t + (v - y[i]) ** 2, 0));
}

// Sifat statistik vektor: panjang asli face-api descriptor (sebelum/dudah L2)
function vecStats(name, raw) {
  const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return `${name}: len=${raw.length}, L2norm-asli=${norm.toFixed(4)}`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: { username: true, faceTemplate: true }
  });
  console.log(`Total user: ${users.length}`);
  const descs = [];
  for (const u of users) {
    if (!u.faceTemplate) { console.log(`- ${u.username}: TANPA template`); continue; }
    // faceTemplate bisa datang sebagai string JSON atau object (kolom Json Prisma)
    const cipherJson = typeof u.faceTemplate === 'string' ? JSON.parse(u.faceTemplate) : u.faceTemplate;
    const tpl = JSON.parse(aesDecrypt(cipherJson).toString('utf8'));
    descs.push({ username: u.username, tpl });
    console.log(vecStats(`- ${u.username}`, tpl));
  }

  // Matriks jarak pasangan beda user
  console.log('\n=== Matriks jarak antar user BERBEDA ===');
  for (let i = 0; i < descs.length; i++) {
    for (let j = i + 1; j < descs.length; j++) {
      const d = faceDistance(descs[i].tpl, descs[j].tpl);
      const status = d <= 0.35 ? 'LOLOS (FALSE ACCEPT!)' : d <= 0.45 ? 'BORDERLINE' : 'ditolak';
      console.log(`${descs[i].username} <-> ${descs[j].username}: ${d.toFixed(4)}  [${status}]`);
    }
  }

  // Distribusi norm komponen template (cek apakah template jd "wajah generik")
  console.log('\n=== Statistik komponen template (mu, sigma, min, max) ===');
  for (const d of descs) {
    const t = d.tpl;
    const mean = t.reduce((s, v) => s + v, 0) / t.length;
    const sd = Math.sqrt(t.reduce((s, v) => s + (v - mean) ** 2, 0) / t.length);
    console.log(`${d.username}: mean=${mean.toFixed(4)}, sd=${sd.toFixed(4)}, min=${Math.min(...t).toFixed(4)}, max=${Math.max(...t).toFixed(4)}`);
  }
}

main().finally(() => prisma.$disconnect());
