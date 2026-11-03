import multer from 'multer';
import { PNG } from 'pngjs';
import { aesEncrypt, aesDecrypt } from '../crypto/crypto.js';

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
    if (!req.file || typeof req.body.text !== 'string' || !req.body.text.length) {
      return res.status(400).json({ success: false, message: 'File PNG dan text wajib diisi.' });
    }
    const png = PNG.sync.read(req.file.buffer);
    const encrypted = aesEncrypt(Buffer.from(req.body.text, 'utf8'));
    const payload = Buffer.from(JSON.stringify(encrypted), 'utf8');
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
    const text = aesDecrypt(payload).toString('utf8');
    return res.json({ success: true, data: { text } });
  } catch (error) {
    return next(error);
  }
}
