import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPublicKey,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature
} from 'node:crypto';

export function getEncryptionKey() {
  const value = process.env.ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error('ENCRYPTION_KEY harus berupa 64 karakter hex (32 byte).');
  }
  return Buffer.from(value, 'hex');
}

/**
 * HKDF-SHA512 key derivation untuk mengisolasi sub-kunci per lapisan dan per operasi.
 */
export function deriveSubkey(salt, info, length = 32, masterKey = null) {
  const keyMaterial = masterKey ? Buffer.from(masterKey) : getEncryptionKey();
  return Buffer.from(
    hkdfSync('sha512', keyMaterial, Buffer.from(salt), Buffer.from(info, 'utf8'), length)
  );
}

/**
 * Lapisan stream cipher berbasis SHAKE-256 XOF (SHA-3 family) dengan panjang sama persis (zero overhead).
 * Sifat XOR simetris membuat transformasi enkripsi dan dekripsi identik dan sangat cepat.
 */
export function xorKeystreamTransform(inputBuffer, keyBuffer, nonceBuffer) {
  const data = Buffer.from(inputBuffer);
  if (data.length === 0) return Buffer.alloc(0);

  const seed = createHmac('sha512', Buffer.from(keyBuffer))
    .update('KryptoInfo-SHAKE256-Stream-v1')
    .update(Buffer.from(nonceBuffer))
    .digest();

  const keystream = createHash('shake256', { outputLength: data.length })
    .update(seed)
    .digest();

  const output = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i += 1) {
    output[i] = data[i] ^ keystream[i];
  }
  return output;
}

export function computeHmacSha512(keyBuffer, dataBuffer) {
  return createHmac('sha512', Buffer.from(keyBuffer))
    .update(Buffer.from(dataBuffer))
    .digest('hex');
}

export function verifyHmacSha512(keyBuffer, dataBuffer, expectedHex) {
  if (typeof expectedHex !== 'string' || !/^[0-9a-fA-F]{128}$/.test(expectedHex)) {
    return false;
  }
  const actual = Buffer.from(computeHmacSha512(keyBuffer, dataBuffer), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function computeMultiDigest(input) {
  const buf = Buffer.from(input);
  return {
    sha256: createHash('sha256').update(buf).digest('hex'),
    sha384: createHash('sha384').update(buf).digest('hex'),
    sha512: createHash('sha512').update(buf).digest('hex'),
    sha3_256: createHash('sha3-256').update(buf).digest('hex'),
    blake2b512: createHash('blake2b512').update(buf).digest('hex')
  };
}

export function aesEncrypt(input, customKey = null, customIv = null) {
  const iv = customIv ? Buffer.from(customIv) : randomBytes(12);
  const key = customKey ? Buffer.from(customKey) : getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(input)), cipher.final()]);
  return {
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64')
  };
}

export function aesDecrypt(payload, customKey = null) {
  const key = customKey ? Buffer.from(customKey) : getEncryptionKey();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
}

function chachaEncryptSingle(input, keyBuffer) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(
    'chacha20-poly1305',
    keyBuffer,
    nonce,
    { authTagLength: 16 }
  );
  const encrypted = Buffer.concat([cipher.update(Buffer.from(input)), cipher.final()]);
  return {
    nonce,
    authTag: cipher.getAuthTag(),
    ciphertext: encrypted
  };
}

function chachaDecryptSingle(nonceBuf, authTagBuf, ciphertextBuf, keyBuffer) {
  const decipher = createDecipheriv(
    'chacha20-poly1305',
    keyBuffer,
    nonceBuf,
    { authTagLength: 16 }
  );
  decipher.setAuthTag(authTagBuf);
  return Buffer.concat([
    decipher.update(ciphertextBuf),
    decipher.final()
  ]);
}

/**
 * Enkripsi Brankas / Berkas 5-Lapis (Cascade AEAD):
 * 1. HKDF-SHA512 Subkey Derivation (isolasi 4 kunci independen dari master key + salt 16B)
 * 2. SHAKE-256 Keystream XOR Whitening (difusi pra-enkripsi)
 * 3. Inner AES-256-GCM AEAD (IV 96-bit + AuthTag 128-bit)
 * 4. Outer ChaCha20-Poly1305 AEAD (Nonce 96-bit + AuthTag 128-bit)
 * 5. HMAC-SHA512 Encrypt-then-MAC + SHA-256 & SHA3-256 Integrity Seal
 */
export function chachaEncrypt(input) {
  const plainBuf = Buffer.from(input);
  const hkdfSalt = randomBytes(16);

  const streamKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-Stream-v2', 32);
  const aesKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-AES-v2', 32);
  const chachaKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-ChaCha-v2', 32);
  const macKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-HMAC-v2', 64);

  // Lapis 2: SHAKE-256 Stream Whitening
  const aesIv = randomBytes(12);
  const whitened = xorKeystreamTransform(plainBuf, streamKey, aesIv);

  // Lapis 3: Inner AES-256-GCM
  const innerAes = aesEncrypt(whitened, aesKey, aesIv);
  const innerAesTagBuf = Buffer.from(innerAes.authTag, 'base64');
  const innerCipherBuf = Buffer.from(innerAes.ciphertext, 'base64');

  // Lapis 4: Outer ChaCha20-Poly1305
  const outerChaCha = chachaEncryptSingle(innerCipherBuf, chachaKey);

  // Lapis 5: HMAC-SHA512 Encrypt-then-MAC + Multi-Digest
  const macTranscript = Buffer.concat([
    hkdfSalt,
    aesIv,
    innerAesTagBuf,
    outerChaCha.nonce,
    outerChaCha.authTag,
    outerChaCha.ciphertext
  ]);
  const hmac = computeHmacSha512(macKey, macTranscript);
  const digests = computeMultiDigest(plainBuf);

  return {
    algorithm: 'ChaCha20-Poly1305',
    version: 2,
    layers: [
      'HKDF-SHA512',
      'SHAKE-256 Stream Whitening',
      'AES-256-GCM',
      'ChaCha20-Poly1305',
      'HMAC-SHA512 + SHA3-256'
    ],
    hkdfSalt: hkdfSalt.toString('base64'),
    aesIv: aesIv.toString('base64'),
    aesTag: innerAes.authTag,
    nonce: outerChaCha.nonce.toString('base64'),
    authTag: outerChaCha.authTag.toString('base64'),
    ciphertext: outerChaCha.ciphertext.toString('base64'),
    hmac,
    sha256: digests.sha256,
    sha3_256: digests.sha3_256
  };
}

export function chachaDecrypt(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload ChaCha20 tidak valid.');
  }

  // Jalur 5-Lapis (v2)
  if (payload.version === 2 && payload.hkdfSalt && payload.aesIv && payload.aesTag) {
    const hkdfSalt = Buffer.from(payload.hkdfSalt, 'base64');
    const aesIv = Buffer.from(payload.aesIv, 'base64');
    const aesTag = Buffer.from(payload.aesTag, 'base64');
    const nonce = Buffer.from(payload.nonce, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const outerCiphertext = Buffer.from(payload.ciphertext, 'base64');

    const streamKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-Stream-v2', 32);
    const aesKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-AES-v2', 32);
    const chachaKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-ChaCha-v2', 32);
    const macKey = deriveSubkey(hkdfSalt, 'KryptoInfo-Vault-HMAC-v2', 64);

    // Verifikasi Lapis 5 (HMAC-SHA512) terlebih dahulu sebelum dekripsi
    if (payload.hmac) {
      const macTranscript = Buffer.concat([
        hkdfSalt,
        aesIv,
        aesTag,
        nonce,
        authTag,
        outerCiphertext
      ]);
      if (!verifyHmacSha512(macKey, macTranscript, payload.hmac)) {
        throw new Error('Validasi HMAC-SHA512 gagal: berkas terenkripsi telah dimodifikasi.');
      }
    }

    // Buka Lapis 4 (Outer ChaCha20-Poly1305)
    const innerCipherBuf = chachaDecryptSingle(nonce, authTag, outerCiphertext, chachaKey);

    // Buka Lapis 3 (Inner AES-256-GCM)
    const whitened = aesDecrypt(
      {
        iv: payload.aesIv,
        authTag: payload.aesTag,
        ciphertext: innerCipherBuf.toString('base64')
      },
      aesKey
    );

    // Buka Lapis 2 (SHAKE-256 Stream Whitening)
    const plainBuf = xorKeystreamTransform(whitened, streamKey, aesIv);

    if (payload.sha256 && sha256(plainBuf) !== payload.sha256) {
      throw new Error('Validasi digest SHA-256 pasca-dekripsi tidak cocok.');
    }

    return plainBuf;
  }

  // Jalur Kompatibilitas Mundur (v1 single-layer ChaCha20-Poly1305)
  return chachaDecryptSingle(
    Buffer.from(payload.nonce, 'base64'),
    Buffer.from(payload.authTag, 'base64'),
    Buffer.from(payload.ciphertext, 'base64'),
    getEncryptionKey()
  );
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

export function sha3_256(value) {
  return createHash('sha3-256').update(value).digest('hex');
}
