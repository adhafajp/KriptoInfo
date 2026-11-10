import {
  aesEncrypt,
  aesDecrypt,
  chachaEncrypt,
  chachaDecrypt,
  vigenereEncrypt,
  vigenereDecrypt
} from '../crypto/crypto.js';

export function encryptMessage(req, res) {
  const { text, vigenereKey } = req.body;
  if (typeof text !== 'string' || !text.length || typeof vigenereKey !== 'string' || !vigenereKey.length) {
    return res.status(400).json({ success: false, message: 'text dan vigenereKey wajib diisi.' });
  }
  const firstLayer = vigenereEncrypt(text, vigenereKey);
  const encrypted = aesEncrypt(Buffer.from(firstLayer, 'utf8'));

  // Pack IV (12B) + authTag (16B) + ciphertext menjadi satu string Base64 tunggal
  const ivBuf = Buffer.from(encrypted.iv, 'base64');
  const tagBuf = Buffer.from(encrypted.authTag, 'base64');
  const cipherBuf = Buffer.from(encrypted.ciphertext, 'base64');
  const packedToken = Buffer.concat([ivBuf, tagBuf, cipherBuf]).toString('base64');

  return res.json({
    success: true,
    data: {
      algorithm: 'Vigenere + AES-256-GCM',
      ciphertext: packedToken,
      payload: encrypted
    }
  });
}

export function decryptMessage(req, res) {
  const { payload, ciphertext, vigenereKey } = req.body;
  const rawInput = ciphertext || payload;
  if (!rawInput || typeof vigenereKey !== 'string') {
    return res.status(400).json({ success: false, message: 'ciphertext/payload dan vigenereKey wajib diisi.' });
  }

  let aesPayload;
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        aesPayload = JSON.parse(trimmed);
        if (aesPayload.payload) aesPayload = aesPayload.payload;
      } catch {
        // Abaikan parse error, coba parse sebagai packed Base64
      }
    }

    if (!aesPayload) {
      try {
        const packedBuf = Buffer.from(trimmed, 'base64');
        if (packedBuf.length < 28) {
          return res.status(400).json({ success: false, message: 'Ciphertext tidak valid atau terlalu pendek.' });
        }
        const iv = packedBuf.subarray(0, 12).toString('base64');
        const authTag = packedBuf.subarray(12, 28).toString('base64');
        const cipher = packedBuf.subarray(28).toString('base64');
        aesPayload = { iv, authTag, ciphertext: cipher };
      } catch {
        return res.status(400).json({ success: false, message: 'Ciphertext Base64 tidak valid.' });
      }
    }
  } else if (typeof rawInput === 'object') {
    aesPayload = rawInput.payload || rawInput;
  }

  if (!aesPayload || !aesPayload.iv || !aesPayload.authTag || !aesPayload.ciphertext) {
    return res.status(400).json({ success: false, message: 'Format data terenkripsi tidak dikenali.' });
  }

  try {
    const decryptedLayer = aesDecrypt(aesPayload).toString('utf8');
    const text = vigenereDecrypt(decryptedLayer, vigenereKey);
    return res.json({ success: true, data: { text } });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Dekripsi gagal: Kunci Vigenere salah atau ciphertext telah dirusak.'
    });
  }
}

export function encryptFile(req, res) {
  const { fileBase64 } = req.body;
  if (typeof fileBase64 !== 'string' || !fileBase64.length) {
    return res.status(400).json({ success: false, message: 'fileBase64 wajib diisi.' });
  }
  const input = Buffer.from(fileBase64, 'base64');
  if (!input.length || input.length > 4 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'File kosong atau melebihi 4 MB.' });
  }
  return res.json({ success: true, data: chachaEncrypt(input) });
}

export function decryptFile(req, res) {
  const { payload } = req.body;
  if (!payload) return res.status(400).json({ success: false, message: 'payload wajib diisi.' });
  const decrypted = chachaDecrypt(payload);
  return res.json({ success: true, data: { fileBase64: decrypted.toString('base64') } });
}
