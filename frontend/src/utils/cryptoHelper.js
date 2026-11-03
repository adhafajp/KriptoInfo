
// Membuat pasangan kunci Ed25519 untuk USB Dongle.
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

  const publicKeyBuffer = await window.crypto.subtle.exportKey(
    'spki',
    pair.publicKey
  );

  const privateKeyBuffer = await window.crypto.subtle.exportKey(
    'pkcs8',
    pair.privateKey
  );

  return {
    publicKeyBase64: toBase64(publicKeyBuffer),
    privateKeyBase64: toBase64(privateKeyBuffer)
  };
}

// Menandatangani challenge backend menggunakan private key Ed25519.
export async function signChallenge(
  privateKeyBase64,
  challengeText
) {
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

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
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
