#!/usr/bin/env node

/**
 * KryptoInfo backend-only helper.
 * - enroll: generate Ed25519 keys and register the public key with the API.
 * - test: unlock the USB key, sign a one-time challenge, log in, and smoke-test APIs.
 *
 * The face descriptor in this CLI is a TEST FIXTURE, not real face recognition.
 * A future camera/frontend integration must submit a descriptor from an actual
 * face-recognition model instead.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  sign
} from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PNG } from 'pngjs';

const DEFAULT_API = 'http://localhost:3001';
const DONGLE_FILENAME = 'kryptoinfo-dongle.json';
const DONGLE_AAD = Buffer.from('KryptoInfo-Dongle-v1', 'utf8');
const DEMO_FACE_DESCRIPTOR = Array.from(
  { length: 128 },
  (_, index) => Number((Math.sin(index + 1) * 0.25).toFixed(8))
);

const args = process.argv.slice(2);
const command = args[0] || 'help';

function option(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function apiBase() {
  return (option('--api', process.env.KRYPTO_API_URL || DEFAULT_API)).replace(/\/+$/, '');
}

async function askLine(label) {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    return (await terminal.question(label)).trim();
  } finally {
    terminal.close();
  }
}

async function askHidden(label) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    stdout.write('(Terminal tidak mendukung input tersembunyi; input akan terlihat.)\n');
    return askLine(label);
  }

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          finish(new Error('Dibatalkan pengguna.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          stdout.write('\b \b');
          continue;
        }
        if (character >= ' ') {
          value += character;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function requestJson(endpoint, { method = 'GET', body, headers = {}, cookie } = {}) {
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (cookie) requestHeaders.Cookie = cookie;

  let response;
  try {
    response = await fetch(`${apiBase()}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(`Tidak bisa menghubungi API ${apiBase()}. Pastikan backend aktif. Detail: ${error.message}`);
  }

  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { data = { message: raw }; }

  if (!response.ok) {
    throw new Error(`${method} ${endpoint} gagal (HTTP ${response.status}): ${data.message || raw || 'Tidak ada detail.'}`);
  }
  return { response, data };
}

function deriveDongleKey(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 10) {
    throw new Error('Passphrase dongle minimal 10 karakter.');
  }
  return scryptSync(passphrase, salt, 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
}

function encryptPrivateKey(privateKeyDer, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveDongleKey(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(DONGLE_AAD);
  const ciphertext = Buffer.concat([cipher.update(privateKeyDer), cipher.final()]);

  return {
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    cipher: 'AES-256-GCM',
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptPrivateKey(envelope, passphrase) {
  if (!envelope || envelope.kdf !== 'scrypt' || envelope.cipher !== 'AES-256-GCM') {
    throw new Error('Format private key dongle tidak dikenal.');
  }
  const key = deriveDongleKey(passphrase, Buffer.from(envelope.salt, 'base64'));
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(envelope.iv, 'base64')
  );
  decipher.setAAD(DONGLE_AAD);
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  const privateKeyDer = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final()
  ]);
  return createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
}

async function getDongleLocation() {
  const value = option('--usb', process.env.KRYPTO_USB_DIR);
  if (!value) {
    throw new Error('Folder flashdisk belum diberikan. Contoh: --usb "E:\\KryptoInfoDongle"');
  }
  const directory = path.resolve(value);
  let info;
  try { info = await stat(directory); }
  catch { throw new Error(`Folder flashdisk tidak ditemukan: ${directory}. Buat folder KryptoInfoDongle terlebih dahulu.`); }
  if (!info.isDirectory()) throw new Error('--usb harus menunjuk ke folder, bukan file.');
  return { directory, file: path.join(directory, DONGLE_FILENAME) };
}

async function health() {
  const { data } = await requestJson('/api/health');
  stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  if (!data.success) process.exitCode = 1;
}

async function enroll() {
  const { directory, file } = await getDongleLocation();
  if (existsSync(file)) {
    throw new Error(`File dongle sudah ada: ${file}. Jangan ditimpa. Gunakan flashdisk/folder lain atau cadangkan file lama terlebih dahulu.`);
  }

  stdout.write('\n=== KryptoInfo: Pendaftaran Akun + Dongle ===\n');
  stdout.write(`Folder dongle: ${directory}\n`);
  const username = await askLine('Username baru: ');
  const password = await askHidden('Master Password: ');
  const enrollmentCode = await askHidden('ENROLLMENT_CODE dari backend/.env: ');
  const passphrase = await askHidden('Passphrase untuk mengunci private key di flashdisk (min. 10 karakter): ');
  if (passphrase.length < 10) throw new Error('Passphrase dongle minimal 10 karakter.');

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyBase64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const privateKeyDer = privateKey.export({ format: 'der', type: 'pkcs8' });

  const dongleDocument = {
    format: 'KryptoInfo USB Dongle',
    version: 1,
    keyType: 'Ed25519',
    createdAt: new Date().toISOString(),
    privateKey: encryptPrivateKey(privateKeyDer, passphrase),
    // Fixture hanya agar backend dapat diuji sebelum modul kamera tersedia.
    // BUKAN data wajah dan tidak boleh dianggap sebagai autentikasi biometrik.
    demoFaceDescriptor: DEMO_FACE_DESCRIPTOR
  };

  const temporaryFile = `${file}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(dongleDocument, null, 2), {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600
  });

  try {
    const { data } = await requestJson('/api/auth/enroll', {
      method: 'POST',
      headers: { 'X-Enrollment-Code': enrollmentCode },
      body: { username, password, publicKey: publicKeyBase64, faceDescriptor: DEMO_FACE_DESCRIPTOR }
    });
    await rename(temporaryFile, file);
    stdout.write('\nPendaftaran berhasil.\n');
    stdout.write(`Username: ${data.data.username}\n`);
    stdout.write(`File dongle tersimpan: ${file}\n`);
    stdout.write('Private key dienkripsi dengan passphrase sebelum disimpan di flashdisk.\n');
    stdout.write('\nCATATAN: descriptor wajah yang digunakan adalah fixture DEMO, bukan face recognition asli.\n');
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

function cookieFromResponse(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  if (!values.length) return null;
  return values[0].split(';')[0];
}

async function testBackend() {
  const { file } = await getDongleLocation();
  let dongle;
  try { dongle = JSON.parse(await readFile(file, 'utf8')); }
  catch { throw new Error(`Tidak dapat membaca file dongle: ${file}`); }
  if (dongle.format !== 'KryptoInfo USB Dongle' || dongle.version !== 1) {
    throw new Error('File bukan dongle KryptoInfo versi yang didukung.');
  }

  stdout.write('\n=== KryptoInfo: Uji Backend Tanpa Frontend ===\n');
  const username = await askLine('Username: ');
  const password = await askHidden('Master Password: ');
  const passphrase = await askHidden('Passphrase dongle: ');
  const privateKey = decryptPrivateKey(dongle.privateKey, passphrase);
  const faceDescriptor = dongle.demoFaceDescriptor;
  if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
    throw new Error('Descriptor demo tidak ditemukan. Akun ini mungkin didaftarkan melalui frontend.');
  }

  const unprotectedCheck = await fetch(`${apiBase()}/api/auth/me`);
  if (unprotectedCheck.status !== 401) {
    throw new Error(`API terlindungi seharusnya menolak akses tanpa sesi (diharapkan 401, diterima ${unprotectedCheck.status}).`);
  }
  stdout.write('✓ Proteksi API: tanpa sesi mendapat HTTP 401.\n');

  const challengeResult = await requestJson('/api/auth/challenge', {
    method: 'POST',
    body: { username }
  });
  const { challengeId, challenge } = challengeResult.data.data;
  const signature = sign(null, Buffer.from(challenge, 'utf8'), privateKey).toString('base64url');
  const loginBody = { username, password, challengeId, signature, faceDescriptor };

  const loginResult = await requestJson('/api/auth/login', {
    method: 'POST',
    body: loginBody
  });
  const cookie = cookieFromResponse(loginResult.response);
  if (!cookie) throw new Error('Login sukses tetapi cookie sesi tidak ditemukan pada response.');
  stdout.write('✓ Login: password + tanda tangan Ed25519 + descriptor demo diterima.\n');

  const replayResponse = await fetch(`${apiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginBody)
  });
  if (replayResponse.status !== 401) {
    throw new Error(`Challenge yang sudah dipakai harus ditolak (diharapkan 401, diterima ${replayResponse.status}).`);
  }
  stdout.write('✓ Anti-replay: challenge yang sama ditolak saat dipakai ulang.\n');

  try {
    const me = await requestJson('/api/auth/me', { cookie });
    stdout.write(`✓ Session: aktif untuk ${me.data.data.username}.\n`);

    const encryptedMessage = await requestJson('/api/crypto/message/encrypt', {
      method: 'POST', cookie,
      body: { text: 'Pesan rahasia KryptoInfo', vigenereKey: 'KRIPTO' }
    });
    const decryptedMessage = await requestJson('/api/crypto/message/decrypt', {
      method: 'POST', cookie,
      body: { payload: encryptedMessage.data.data.payload, vigenereKey: 'KRIPTO' }
    });
    if (decryptedMessage.data.data.text !== 'Pesan rahasia KryptoInfo') {
      throw new Error('Hasil round-trip Secure Message tidak cocok.');
    }
    stdout.write('✓ Secure Message: Vigenere + AES-256-GCM.\n');

    const originalFile = Buffer.from('Contoh isi file rahasia KryptoInfo');
    const encryptedFile = await requestJson('/api/crypto/file/encrypt', {
      method: 'POST', cookie,
      body: { fileBase64: originalFile.toString('base64') }
    });
    const decryptedFile = await requestJson('/api/crypto/file/decrypt', {
      method: 'POST', cookie,
      body: { payload: encryptedFile.data.data }
    });
    if (!Buffer.from(decryptedFile.data.data.fileBase64, 'base64').equals(originalFile)) {
      throw new Error('Hasil round-trip Secure File tidak cocok.');
    }
    stdout.write('✓ Secure File: ChaCha20-Poly1305.\n');

    const vault = await requestJson('/api/vault', {
      method: 'POST', cookie,
      body: {
        title: `CLI smoke test ${new Date().toISOString()}`,
        category: 'MESSAGE',
        encryptedData: encryptedMessage.data.data.payload
      }
    });
    const vaultList = await requestJson('/api/vault', { cookie });
    const found = vaultList.data.data.some(item => item.id === vault.data.data.id);
    if (!found) throw new Error('Item vault yang baru dibuat tidak muncul pada daftar.');
    await requestJson(`/api/vault/${vault.data.data.id}`, { method: 'DELETE', cookie });
    stdout.write('✓ Vault: simpan, daftar, dan hapus data milik akun.\n');

    const assetContent = Buffer.from(`KryptoInfo asset test ${Date.now()}`);
    const assetHash = createHash('sha256').update(assetContent).digest('hex');
    await requestJson('/api/blockchain', {
      method: 'POST', cookie,
      body: { assetId: `cli-${Date.now()}`, assetHash, metadata: 'Backend CLI smoke test' }
    });
    const chain = await requestJson('/api/blockchain/verify', { cookie });
    if (!chain.data.data.valid) throw new Error(`Hash chain tidak valid pada block ${chain.data.data.problemAt}.`);
    stdout.write(`✓ Blockchain: ${chain.data.data.totalBlocks} block, hash chain valid.\n`);

    // Buat PNG uji di memori, tidak menyimpan gambar sementara ke disk.
    const png = new PNG({ width: 256, height: 256 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 230;
      png.data[i + 1] = 230;
      png.data[i + 2] = 230;
      png.data[i + 3] = 255;
    }
    const inputImage = PNG.sync.write(png);
    const form = new FormData();
    form.append('image', new Blob([inputImage], { type: 'image/png' }), 'cover.png');
    form.append('text', 'Pesan tersembunyi KryptoInfo');
    const embedResponse = await fetch(`${apiBase()}/api/stego/embed`, {
      method: 'POST', headers: { Cookie: cookie }, body: form
    });
    if (!embedResponse.ok) {
      const detail = await embedResponse.text();
      throw new Error(`Steganography embed gagal (HTTP ${embedResponse.status}): ${detail}`);
    }
    const stegoImage = Buffer.from(await embedResponse.arrayBuffer());
    const extractForm = new FormData();
    extractForm.append('image', new Blob([stegoImage], { type: 'image/png' }), 'stego.png');
    const extractResponse = await fetch(`${apiBase()}/api/stego/extract`, {
      method: 'POST', headers: { Cookie: cookie }, body: extractForm
    });
    const extracted = await extractResponse.json();
    if (!extractResponse.ok || extracted.data?.text !== 'Pesan tersembunyi KryptoInfo') {
      throw new Error(`Steganography extract gagal: ${extracted.message || 'hasil tidak cocok'}`);
    }
    stdout.write('✓ Steganography: PNG LSB + AES-256-GCM.\n');

    await requestJson('/api/audit', { cookie });
    stdout.write('✓ Audit log: endpoint dapat diakses.\n');
  } finally {
    try {
      await requestJson('/api/auth/logout', { method: 'POST', cookie });
      stdout.write('✓ Logout: sesi ditutup.\n');
    } catch (error) {
      stdout.write(`! Logout otomatis gagal: ${error.message}\n`);
    }
  }

  stdout.write('\nSEMUA UJI BACKEND YANG DIJALANKAN BERHASIL.\n');
  stdout.write('Catatan: faktor wajah pada CLI ini hanya fixture demo, bukan pengenalan wajah kamera.\n');
}

function showHelp() {
  stdout.write(`\nKryptoInfo backend-only CLI\n\n`);
  stdout.write(`Perintah:\n`);
  stdout.write(`  npm run dongle -- health --api http://localhost:3001\n`);
  stdout.write(`  npm run dongle -- enroll --usb "E:\\KryptoInfoDongle"\n`);
  stdout.write(`  npm run dongle -- test --usb "E:\\KryptoInfoDongle"\n\n`);
  stdout.write(`Opsi:\n`);
  stdout.write(`  --api URL   Alamat backend (default http://localhost:3001)\n`);
  stdout.write(`  --usb PATH  Folder di dalam flashdisk tempat file dongle disimpan\n\n`);
  stdout.write(`'enroll' mendaftarkan akun dan membuat file dongle terenkripsi.\n`);
  stdout.write(`'test' melakukan login Ed25519 dan menguji endpoint backend.\n`);
  stdout.write(`Descriptor wajah pada CLI hanya fixture demo untuk pengujian API.\n`);
}

try {
  if (command === 'health') await health();
  else if (command === 'enroll') await enroll();
  else if (command === 'test' || command === 'smoke') await testBackend();
  else showHelp();
} catch (error) {
  console.error(`\nGAGAL: ${error.message}`);
  process.exitCode = 1;
}
