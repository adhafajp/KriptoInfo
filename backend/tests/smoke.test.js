import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);

const crypto = await import('../src/crypto/crypto.js');
const cryptoCtrl = await import('../src/controllers/crypto.controller.js');

test('Vigenere dapat mengenkripsi dan mendekripsi kembali', () => {
  const original = 'Halo KryptoInfo 123!';
  const encrypted = crypto.vigenereEncrypt(original, 'KUNCI');
  assert.notEqual(encrypted, original);
  assert.equal(crypto.vigenereDecrypt(encrypted, 'KUNCI'), original);
});

test('AES-256-GCM dapat mengenkripsi dan mendekripsi kembali', () => {
  const original = Buffer.from('Pesan rahasia');
  const encrypted = crypto.aesEncrypt(original);
  assert.equal(crypto.aesDecrypt(encrypted).toString(), original.toString());
});

test('ChaCha20-Poly1305 5-Lapis (HKDF + SHAKE256 + AES-GCM + ChaCha20 + HMAC-SHA512) dapat mengenkripsi dan mendekripsi kembali', () => {
  const original = Buffer.from('File rahasia multi-lapisan kriptografi KryptoInfo 2026');
  const encrypted = crypto.chachaEncrypt(original);
  assert.equal(encrypted.version, 2);
  assert.equal(encrypted.layers.length, 5);
  assert.ok(encrypted.hkdfSalt && encrypted.aesIv && encrypted.aesTag && encrypted.hmac && encrypted.sha3_256);
  assert.equal(crypto.chachaDecrypt(encrypted).toString(), original.toString());
});

test('ChaCha20-Poly1305 5-Lapis menolak ciphertext atau HMAC yang dimanipulasi dan menghasilkan salt/IV unik', () => {
  const payloadA = crypto.chachaEncrypt(Buffer.from('Data uji identik'));
  const payloadB = crypto.chachaEncrypt(Buffer.from('Data uji identik'));
  assert.notEqual(payloadA.hkdfSalt, payloadB.hkdfSalt);
  assert.notEqual(payloadA.nonce, payloadB.nonce);
  assert.notEqual(payloadA.ciphertext, payloadB.ciphertext);

  const tamperedHmac = { ...payloadA, hmac: `${payloadA.hmac.slice(0, -2)}00` };
  assert.throws(() => crypto.chachaDecrypt(tamperedHmac), /HMAC-SHA512/);

  const largeBuf = Buffer.alloc(1024 * 1024 + 17, 0xab);
  const largeEnc = crypto.chachaEncrypt(largeBuf);
  assert.equal(Buffer.compare(crypto.chachaDecrypt(largeEnc), largeBuf), 0);
});

test('AES-GCM menolak ciphertext yang diubah', () => {
  const encrypted = crypto.aesEncrypt(Buffer.from('data'));
  encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -2)}AA`;
  assert.throws(() => crypto.aesDecrypt(encrypted));
});

test('Hybrid Message 5-Lapis mendukung dekripsi token Base64 maupun payload JSON dan menolak kunci salah', () => {
  const originalText = 'Laporan Investigasi Rahasia #2026!';
  const vigenereKey = 'SANDIRAHASIA';

  let encResData = null;
  const resEnc = {
    status: () => resEnc,
    json: (body) => { encResData = body; }
  };
  cryptoCtrl.encryptMessage({ body: { text: originalText, vigenereKey } }, resEnc);

  assert.equal(encResData.success, true);
  assert.equal(encResData.data.layers.length, 5);
  assert.ok(encResData.data.digests.sha3_256);

  // Dekripsi via packed Base64 token
  let decTokenData = null;
  const resDec1 = {
    status: () => resDec1,
    json: (body) => { decTokenData = body; }
  };
  cryptoCtrl.decryptMessage({ body: { ciphertext: encResData.data.ciphertext, vigenereKey } }, resDec1);
  assert.equal(decTokenData.success, true);
  assert.equal(decTokenData.data.text, originalText);

  // Dekripsi via objek payload JSON (alur Brankas/Vault)
  let decPayloadData = null;
  const resDec2 = {
    status: () => resDec2,
    json: (body) => { decPayloadData = body; }
  };
  cryptoCtrl.decryptMessage({ body: { payload: encResData.data.payload, vigenereKey } }, resDec2);
  assert.equal(decPayloadData.success, true);
  assert.equal(decPayloadData.data.text, originalText);

  // Tolak kunci Vigenere yang salah
  let badCode = 200;
  let badBody = null;
  const resBad = {
    status: (code) => { badCode = code; return resBad; },
    json: (body) => { badBody = body; }
  };
  cryptoCtrl.decryptMessage({ body: { ciphertext: encResData.data.ciphertext, vigenereKey: 'SALAH' } }, resBad);
  assert.equal(badCode, 400);
  assert.equal(badBody.success, false);
});
