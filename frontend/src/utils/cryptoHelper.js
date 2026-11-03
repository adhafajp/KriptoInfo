// Helper untuk generate kunci Ed25519 di browser menggunakan Web Crypto API
// dan membuat face descriptor dummy (128 angka) untuk kebutuhan development/testing.

export async function generateDongleKeyPair() {
  const toBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const pair = await window.crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', pair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', pair.privateKey);

  return {
    publicKeyBase64: toBase64(publicKeyBuffer),
    privateKeyBase64: toBase64(privateKeyBuffer)
  };
}

export async function signChallenge(privateKeyBase64, challengeText) {
  const toBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const toBase64Url = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    toBytes(privateKeyBase64),
    { name: 'Ed25519' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(challengeText)
  );

  return toBase64Url(signatureBuffer);
}

// Generate dummy 128-float face descriptor yang konsisten
export function generateMockFaceDescriptor(seed = 'default') {
  const descriptor = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 128; i++) {
    // Generate deterministic pseudo-random float between -0.2 and 0.2
    const val = Math.sin(hash + i) * 0.15;
    descriptor.push(Number(val.toFixed(6)));
  }
  return descriptor;
}
