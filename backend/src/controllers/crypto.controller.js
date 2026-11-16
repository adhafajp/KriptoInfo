import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from 'node:crypto';
import {
  aesEncrypt,
  aesDecrypt,
  chachaEncrypt,
  chachaDecrypt,
  computeHmacSha512,
  computeMultiDigest,
  deriveSubkey,
  getEncryptionKey,
  verifyHmacSha512,
  vigenereEncrypt,
  vigenereDecrypt,
  xorKeystreamTransform
} from '../crypto/crypto.js';

const MAGIC_V2 = Buffer.from('KI5L', 'ascii');
const MESSAGE_LAYERS = [
  'Vigenère Polyalphabetic',
  'SHAKE-256 Keystream Whitening',
  'HKDF-SHA512 Key Derivation',
  'ChaCha20-Poly1305 AEAD',
  'AES-256-GCM + HMAC-SHA512'
];

export function encryptMessage(req, res) {
  const { text, vigenereKey } = req.body;
  if (typeof text !== 'string' || !text.length || typeof vigenereKey !== 'string' || !vigenereKey.length) {
    return res.status(400).json({ success: false, message: 'text dan vigenereKey wajib diisi.' });
  }

  // Lapis 1: Vigenere Polyalphabetic Cipher
  const firstLayer = vigenereEncrypt(text, vigenereKey);

  // Lapis 2: SHAKE-256 Keystream XOR Whitening terikat pada kunci pengguna & salt acak 16B
  const hkdfSalt = randomBytes(16);
  const userKeyHash = createHash('sha256').update(vigenereKey, 'utf8').digest();
  const secondLayerBuf = xorKeystreamTransform(Buffer.from(firstLayer, 'utf8'), userKeyHash, hkdfSalt);

  // Lapis 3: HKDF-SHA512 Key Derivation (mengikat Master Key + Kunci Vigenere pengguna)
  const hybridIkm = Buffer.concat([getEncryptionKey(), userKeyHash]);
  const chachaKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-ChaCha-v2', 32, hybridIkm);
  const aesKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-AES-v2', 32, hybridIkm);
  const macKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-HMAC-v2', 64, hybridIkm);

  // Lapis 4: Inner ChaCha20-Poly1305 AEAD
  const chachaNonce = randomBytes(12);
  const chachaCipher = createCipheriv('chacha20-poly1305', chachaKey, chachaNonce, { authTagLength: 16 });
  const innerCipherBuf = Buffer.concat([chachaCipher.update(secondLayerBuf), chachaCipher.final()]);
  const chachaTag = chachaCipher.getAuthTag();

  // Lapis 5: Outer AES-256-GCM AEAD + HMAC-SHA512 Encrypt-then-MAC + Multi-Digest
  const outerAes = aesEncrypt(innerCipherBuf, aesKey);
  const ivBuf = Buffer.from(outerAes.iv, 'base64');
  const tagBuf = Buffer.from(outerAes.authTag, 'base64');
  const outerCipherBuf = Buffer.from(outerAes.ciphertext, 'base64');

  const macTranscript = Buffer.concat([hkdfSalt, chachaNonce, chachaTag, ivBuf, tagBuf, outerCipherBuf]);
  const hmacHex = computeHmacSha512(macKey, macTranscript);
  const hmacBuf = Buffer.from(hmacHex, 'hex');
  const multiDigests = computeMultiDigest(Buffer.from(text, 'utf8'));

  const digests = {
    sha256: multiDigests.sha256,
    sha3_256: multiDigests.sha3_256,
    hmacSha512: hmacHex
  };

  // Kemas seluruh komponen ke token Base64 ringkas (KI5L + 136B header/MAC + ciphertext)
  const packedToken = Buffer.concat([
    MAGIC_V2,
    hkdfSalt,
    chachaNonce,
    chachaTag,
    ivBuf,
    tagBuf,
    hmacBuf,
    outerCipherBuf
  ]).toString('base64');

  const payload = {
    algorithm: 'AES-256-GCM',
    version: 2,
    layers: MESSAGE_LAYERS,
    hkdfSalt: hkdfSalt.toString('base64'),
    chachaNonce: chachaNonce.toString('base64'),
    chachaTag: chachaTag.toString('base64'),
    iv: outerAes.iv,
    authTag: outerAes.authTag,
    ciphertext: outerAes.ciphertext,
    hmac: hmacHex,
    digests
  };

  return res.json({
    success: true,
    data: {
      algorithm: '5-Layer Hybrid (Vigenere + SHAKE256 + HKDF-SHA512 + ChaCha20 + AES-256-GCM + HMAC-SHA512)',
      layers: MESSAGE_LAYERS,
      digests,
      ciphertext: packedToken,
      payload
    }
  });
}

function unpackV2Token(packedBuf) {
  if (packedBuf.length < 140 || !packedBuf.subarray(0, 4).equals(MAGIC_V2)) {
    return null;
  }
  return {
    version: 2,
    hkdfSalt: packedBuf.subarray(4, 20).toString('base64'),
    chachaNonce: packedBuf.subarray(20, 32).toString('base64'),
    chachaTag: packedBuf.subarray(32, 48).toString('base64'),
    iv: packedBuf.subarray(48, 60).toString('base64'),
    authTag: packedBuf.subarray(60, 76).toString('base64'),
    hmac: packedBuf.subarray(76, 140).toString('hex'),
    ciphertext: packedBuf.subarray(140).toString('base64')
  };
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
        // Coba parse sebagai packed Base64
      }
    }

    if (!aesPayload) {
      try {
        const packedBuf = Buffer.from(trimmed, 'base64');
        const v2Unpacked = unpackV2Token(packedBuf);
        if (v2Unpacked) {
          aesPayload = v2Unpacked;
        } else {
          if (packedBuf.length < 28) {
            return res.status(400).json({ success: false, message: 'Ciphertext tidak valid atau terlalu pendek.' });
          }
          aesPayload = {
            iv: packedBuf.subarray(0, 12).toString('base64'),
            authTag: packedBuf.subarray(12, 28).toString('base64'),
            ciphertext: packedBuf.subarray(28).toString('base64')
          };
        }
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
    // Jalur 5-Lapis (v2)
    if (aesPayload.version === 2 && aesPayload.hkdfSalt && aesPayload.chachaNonce && aesPayload.chachaTag) {
      const hkdfSalt = Buffer.from(aesPayload.hkdfSalt, 'base64');
      const chachaNonce = Buffer.from(aesPayload.chachaNonce, 'base64');
      const chachaTag = Buffer.from(aesPayload.chachaTag, 'base64');
      const ivBuf = Buffer.from(aesPayload.iv, 'base64');
      const tagBuf = Buffer.from(aesPayload.authTag, 'base64');
      const outerCipherBuf = Buffer.from(aesPayload.ciphertext, 'base64');

      const userKeyHash = createHash('sha256').update(vigenereKey, 'utf8').digest();
      const hybridIkm = Buffer.concat([getEncryptionKey(), userKeyHash]);
      const chachaKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-ChaCha-v2', 32, hybridIkm);
      const aesKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-AES-v2', 32, hybridIkm);
      const macKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Msg-HMAC-v2', 64, hybridIkm);

      if (aesPayload.hmac) {
        const macTranscript = Buffer.concat([hkdfSalt, chachaNonce, chachaTag, ivBuf, tagBuf, outerCipherBuf]);
        if (!verifyHmacSha512(macKey, macTranscript, aesPayload.hmac)) {
          return res.status(400).json({
            success: false,
            message: 'Dekripsi gagal: Kunci Vigenere salah atau ciphertext telah dimodifikasi.'
          });
        }
      }

      // Buka Lapis 5: AES-256-GCM
      const innerCipherBuf = aesDecrypt(aesPayload, aesKey);

      // Buka Lapis 4: ChaCha20-Poly1305
      const decipherChaCha = createDecipheriv('chacha20-poly1305', chachaKey, chachaNonce, { authTagLength: 16 });
      decipherChaCha.setAuthTag(chachaTag);
      const secondLayerBuf = Buffer.concat([decipherChaCha.update(innerCipherBuf), decipherChaCha.final()]);

      // Buka Lapis 2: SHAKE-256 Stream Whitening
      const firstLayerText = xorKeystreamTransform(secondLayerBuf, userKeyHash, hkdfSalt).toString('utf8');

      // Buka Lapis 1: Vigenere
      const text = vigenereDecrypt(firstLayerText, vigenereKey);
      const computed = computeMultiDigest(Buffer.from(text, 'utf8'));

      return res.json({
        success: true,
        data: {
          text,
          algorithm: '5-Layer Hybrid Cipher',
          layers: MESSAGE_LAYERS,
          digests: {
            sha256: computed.sha256,
            sha3_256: computed.sha3_256
          }
        }
      });
    }

    // Jalur Kompatibilitas Mundur (v1)
    const decryptedLayer = aesDecrypt(aesPayload).toString('utf8');
    const text = vigenereDecrypt(decryptedLayer, vigenereKey);
    return res.json({ success: true, data: { text } });
  } catch {
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
  try {
    const decrypted = chachaDecrypt(payload);
    return res.json({ success: true, data: { fileBase64: decrypted.toString('base64') } });
  } catch {
    return res.status(400).json({ success: false, message: 'Dekripsi gagal.' });
  }
}
