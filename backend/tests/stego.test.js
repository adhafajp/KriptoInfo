import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { PNG } from 'pngjs';

process.env.ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);

const crypto = await import('../src/crypto/crypto.js');
const stego = await import('../src/controllers/stego.controller.js');

function createDummyPng(width = 100, height = 100) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      png.data[idx] = 120;     // red
      png.data[idx + 1] = 200; // green
      png.data[idx + 2] = 255; // blue
      png.data[idx + 3] = 255; // alpha
    }
  }
  return PNG.sync.write(png);
}

test('Steganografi: embed dan ekstrak pesan rahasia', async () => {
  const pngBuffer = createDummyPng(50, 50);
  const secretMessage = 'Pesan rahasia ujian kriptografi 2026';

  let sentBuffer = null;
  const mockReqEmbed = {
    file: { buffer: pngBuffer },
    body: { message: secretMessage }
  };
  const mockResEmbed = {
    set: () => {},
    send: (buf) => { sentBuffer = buf; }
  };

  stego.embedMessage(mockReqEmbed, mockResEmbed, (err) => {
    if (err) throw err;
  });

  assert.ok(sentBuffer, 'Output buffer stego harus terbentuk');
  assert.ok(Buffer.isBuffer(sentBuffer), 'Output harus berupa buffer');

  let extractResult = null;
  const mockReqExtract = {
    file: { buffer: sentBuffer }
  };
  const mockResExtract = {
    json: (data) => { extractResult = data; }
  };

  stego.extractMessage(mockReqExtract, mockResExtract, (err) => {
    if (err) throw err;
  });

  assert.ok(extractResult?.success, 'Ekstraksi harus sukses');
  assert.equal(extractResult?.data?.text, secretMessage, 'Pesan harus sesuai dengan aslinya');
});

test('Steganografi: gambar kosong tanpa payload menghasilkan error terisolasi', () => {
  const cleanPngBuffer = createDummyPng(20, 20);
  let capturedError = null;

  const mockReqExtract = {
    file: { buffer: cleanPngBuffer }
  };
  const mockResExtract = {
    json: () => {}
  };

  stego.extractMessage(mockReqExtract, mockResExtract, (err) => {
    capturedError = err;
  });

  assert.ok(capturedError, 'Harus melempar error saat payload tidak valid');
});

test('Dongle Signature: verifikasi keypair Ed25519', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const spkiDer = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const challenge = 'challenge-nonce-12345';
  const signature = sign(null, Buffer.from(challenge, 'utf8'), privateKey).toString('base64url');

  const valid = crypto.verifyDongleSignature(spkiDer, challenge, signature);
  assert.equal(valid, true, 'Signature Ed25519 harus valid');

  const invalid = crypto.verifyDongleSignature(spkiDer, challenge, 'invalid-signature');
  assert.equal(invalid, false, 'Signature palsu harus ditolak');
});
