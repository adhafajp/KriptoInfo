import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  randomBytes,
  verify as verifySignature
} from 'node:crypto';

function getEncryptionKey() {
  const value = process.env.ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('ENCRYPTION_KEY harus berupa 64 karakter hex (32 byte).');
  }
  return Buffer.from(value, 'hex');
}

export function aesEncrypt(input) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(input)), cipher.final()]);
  return {
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64')
  };
}

export function aesDecrypt(payload) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
}

export function chachaEncrypt(input) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(
    'chacha20-poly1305',
    getEncryptionKey(),
    nonce,
    { authTagLength: 16 }
  );
  const encrypted = Buffer.concat([cipher.update(Buffer.from(input)), cipher.final()]);
  return {
    algorithm: 'ChaCha20-Poly1305',
    nonce: nonce.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64')
  };
}

export function chachaDecrypt(payload) {
  const decipher = createDecipheriv(
    'chacha20-poly1305',
    getEncryptionKey(),
    Buffer.from(payload.nonce, 'base64'),
    { authTagLength: 16 }
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
}

export function vigenereEncrypt(text, key) {
  return vigenereTransform(text, key, 1);
}

export function vigenereDecrypt(text, key) {
  return vigenereTransform(text, key, -1);
}

function vigenereTransform(text, key, direction) {
  if (typeof text !== 'string' || typeof key !== 'string' || !/[a-z]/i.test(key)) {
    throw new Error('Teks dan kunci Vigenere harus berupa string; kunci harus memiliki huruf.');
  }
  const shifts = [...key.toUpperCase()]
    .filter(char => char >= 'A' && char <= 'Z')
    .map(char => char.charCodeAt(0) - 65);
  if (!shifts.length) throw new Error('Kunci Vigenere harus mengandung huruf A-Z.');

  let keyIndex = 0;
  return [...text].map(char => {
    const upper = char >= 'A' && char <= 'Z';
    const lower = char >= 'a' && char <= 'z';
    if (!upper && !lower) return char;
    const base = upper ? 65 : 97;
    const shift = shifts[keyIndex++ % shifts.length] * direction;
    return String.fromCharCode(((char.charCodeAt(0) - base + shift + 26) % 26) + base);
  }).join('');
}

export function verifyDongleSignature(publicKeyBase64, challenge, signatureBase64Url) {
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki'
    });
    return verifySignature(
      null,
      Buffer.from(challenge, 'utf8'),
      publicKey,
      Buffer.from(signatureBase64Url, 'base64url')
    );
  } catch {
    return false;
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
