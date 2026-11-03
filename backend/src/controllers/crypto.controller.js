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
  return res.json({ success: true, data: { algorithm: 'Vigenere + AES-256-GCM', payload: encrypted } });
}

export function decryptMessage(req, res) {
  const { payload, vigenereKey } = req.body;
  if (!payload || typeof vigenereKey !== 'string') {
    return res.status(400).json({ success: false, message: 'payload dan vigenereKey wajib diisi.' });
  }
  const decryptedLayer = aesDecrypt(payload).toString('utf8');
  const text = vigenereDecrypt(decryptedLayer, vigenereKey);
  return res.json({ success: true, data: { text } });
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
