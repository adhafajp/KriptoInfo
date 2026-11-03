import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);

const crypto = await import('../src/crypto/crypto.js');

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

test('ChaCha20-Poly1305 dapat mengenkripsi dan mendekripsi kembali', () => {
  const original = Buffer.from('File rahasia');
  const encrypted = crypto.chachaEncrypt(original);
  assert.equal(crypto.chachaDecrypt(encrypted).toString(), original.toString());
});

test('AES-GCM menolak ciphertext yang diubah', () => {
  const encrypted = crypto.aesEncrypt(Buffer.from('data'));
  encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -2)}AA`;
  assert.throws(() => crypto.aesDecrypt(encrypted));
});
