import { randomBytes } from 'node:crypto';
import multer from 'multer';
import { PNG } from 'pngjs';
import {
  aesEncrypt,
  aesDecrypt,
  deriveSubkey,
  getEncryptionKey,
  sha256,
  vigenereEncrypt,
  vigenereDecrypt,
  xorKeystreamTransform
} from '../crypto/crypto.js';

const STEGO_LAYERS = [
  'Vigenère Master Substitution',
  'HKDF-SHA512 Key Derivation',
  'SHAKE-256 Stream Whitening',
  'AES-256-GCM AEAD + PNG LSB'
];

function deriveMasterVigenereSeed() {
  const digest = sha256(getEncryptionKey());
  // Ubah setiap karakter hex (0-f) menjadi huruf A-P untuk seed Vigenere deterministik
  return [...digest]
    .slice(0, 32)
    .map(ch => String.fromCharCode(65 + parseInt(ch, 16)))
    .join('');
}

export const uploadPng = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'image/png') {
      const error = new Error('File harus berupa PNG.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

function embedBytesInPng(png, payload) {
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  const complete = Buffer.concat([header, payload]);
  const capacity = png.width * png.height;
  if (complete.length * 8 > capacity) {
    throw Object.assign(new Error('Pesan terlalu besar untuk gambar PNG ini.'), { statusCode: 413 });
  }
  let bitPosition = 0;
  for (const byte of complete) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      const pixel = bitPosition++;
      const dataIndex = pixel * 4; // kanal merah dari setiap pixel
      png.data[dataIndex] = (png.data[dataIndex] & 0xfe) | ((byte >> bit) & 1);
    }
  }
  return png;
}

function extractBytesFromPng(png) {
  const capacity = png.width * png.height;
  if (capacity < 32) throw new Error('Gambar tidak memiliki payload steganografi yang valid.');

  function readBytes(startPixel, byteLength) {
    const output = Buffer.alloc(byteLength);
    let position = startPixel;
    for (let i = 0; i < byteLength; i += 1) {
      let value = 0;
      for (let bit = 7; bit >= 0; bit -= 1) {
        value |= (png.data[position * 4] & 1) << bit;
        position += 1;
      }
      output[i] = value;
    }
    return output;
  }

  const length = readBytes(0, 4).readUInt32BE();
  if (!length || length * 8 + 32 > capacity) throw new Error('Payload tidak ditemukan atau rusak.');
  return readBytes(32, length);
}

export function embedMessage(req, res, next) {
  try {
    const message = req.body.message || req.body.text;
    if (!req.file || typeof message !== 'string' || !message.length) {
      return res.status(400).json({ success: false, message: 'File PNG dan message wajib diisi.' });
    }
    const png = PNG.sync.read(req.file.buffer);
    const iv = randomBytes(12);

    // Lapis 1: Vigenere Master Key Substitution (zero byte overhead)
    const layer1 = vigenereEncrypt(message, deriveMasterVigenereSeed());

    // Lapis 2: HKDF-SHA512 + SHAKE-256 Stream Whitening (zero byte overhead)
    const streamKey = deriveSubkey(iv, 'KryptoInfo-Stego-Stream-v2', 32);
    const aesKey = deriveSubkey(iv, 'KryptoInfo-Stego-AES-v2', 32);
    const layer2 = xorKeystreamTransform(Buffer.from(layer1, 'utf8'), streamKey, iv);

    // Lapis 3: AES-256-GCM AEAD dengan payload ultra-ringkas
    const encrypted = aesEncrypt(layer2, aesKey, iv);
    const compactPayload = {
      v: 2,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext
    };

    // Lapis 4: LSB 1-Bit Red-Channel Pixel Encoding
    const payload = Buffer.from(JSON.stringify(compactPayload), 'utf8');
    embedBytesInPng(png, payload);
    const output = PNG.sync.write(png);
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'attachment; filename="kryptoinfo-stego.png"');
    return res.send(output);
  } catch (error) {
    return next(error);
  }
}

export function extractMessage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File PNG wajib diunggah.' });
    const png = PNG.sync.read(req.file.buffer);
    const payload = JSON.parse(extractBytesFromPng(png).toString('utf8'));

    let text;
    if (payload.v === 2) {
      const ivBuf = Buffer.from(payload.iv, 'base64');
      const streamKey = deriveSubkey(ivBuf, 'KryptoInfo-Stego-Stream-v2', 32);
      const aesKey = deriveSubkey(ivBuf, 'KryptoInfo-Stego-AES-v2', 32);
      const layer2 = aesDecrypt(payload, aesKey);
      const layer1 = xorKeystreamTransform(layer2, streamKey, ivBuf).toString('utf8');
      text = vigenereDecrypt(layer1, deriveMasterVigenereSeed());
    } else {
      text = aesDecrypt(payload).toString('utf8');
    }

    return res.json({
      success: true,
      data: {
        text,
        algorithm: 'Vigenere + HKDF-SHA512 + SHAKE-256 + AES-256-GCM + LSB',
        layers: STEGO_LAYERS,
        sha256: sha256(Buffer.from(text, 'utf8'))
      }
    });
  } catch (error) {
    return next(error);
  }
}
