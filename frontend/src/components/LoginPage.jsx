import { useState } from 'react';
import { authApi } from '../services/api';
import { generateDongleKeyPair, generateMockFaceDescriptor, signChallenge } from '../utils/cryptoHelper';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [usbPrivateKey, setUsbPrivateKey] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi');
      return;
    }

    if (!usbPrivateKey.trim()) {
      setError('Private key USB (kryptoinfo-dongle.json) belum dimasukkan');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Request challenge
      const challengeRes = await authApi.challenge(username);
      if (!challengeRes.success) {
        setLoading(false);
        setError(challengeRes.message || 'Gagal meminta challenge');
        return;
      }

      const { challengeId, challenge } = challengeRes.data;

      // Step 2: Sign challenge dengan private key Ed25519
      const signature = await signChallenge(usbPrivateKey, challenge);

      // Step 3: Kirim 3 faktor (Password + USB Signature + Face Descriptor)
      const faceDescriptor = generateMockFaceDescriptor(username);

      const loginRes = await authApi.login({
        username,
        password,
        challengeId,
        signature,
        faceDescriptor
      });

      setLoading(false);

      if (loginRes.success) {
        setMessage('Login berhasil!');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(loginRes.data);
        }, 500);
      } else {
        setError(loginRes.message || 'Autentikasi gagal');
      }
    } catch (err) {
      setLoading(false);
      setError(`Error kriptografi/login: ${err.message}`);
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim() || !password.trim() || !enrollmentCode.trim()) {
      setError('Semua field wajib diisi');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Generate pasangan kunci Ed25519 di browser
      const keyPair = await generateDongleKeyPair();

      // Step 2: Buat face descriptor dummy
      const faceDescriptor = generateMockFaceDescriptor(username);

      // Step 3: Kirim ke backend
      const res = await authApi.enroll({
        username,
        password,
        enrollmentCode,
        publicKey: keyPair.publicKeyBase64,
        faceDescriptor
      });

      setLoading(false);

      if (res.success) {
        // Otomatis unduh dongle key file
        const blob = new Blob(
          [JSON.stringify({ privateKeyPkcs8: keyPair.privateKeyBase64 }, null, 2)],
          { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kryptoinfo-dongle-${username}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setUsbPrivateKey(keyPair.privateKeyBase64);
        setMessage('Pendaftaran berhasil! File kunci USB telah diunduh.');
        setMode('login');
      } else {
        setError(res.message || 'Pendaftaran gagal');
      }
    } catch (err) {
      setLoading(false);
      setError(`Gagal memproses pendaftaran: ${err.message}`);
    }
  }

  function handleFileDongleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.privateKeyPkcs8) {
          setUsbPrivateKey(json.privateKeyPkcs8);
          setMessage('File kunci USB berhasil dimuat.');
        } else {
          setError('Format file dongle tidak valid (kunci privateKeyPkcs8 tidak ditemukan)');
        }
      } catch {
        setError('File JSON tidak valid');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-400 mb-2">KryptoInfo</h1>
          <p className="text-dark-300">Three-Layer Secure Digital Vault</p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded ${
                mode === 'login'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('enroll')}
              className={`flex-1 py-2 rounded ${
                mode === 'enroll'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-300 text-sm">
              {message}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan username..."
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan password..."
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">USB Dongle Key (.json)</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileDongleUpload}
                  className="w-full text-xs text-dark-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-dark-700 file:text-white hover:file:bg-dark-600"
                />
                {usbPrivateKey && (
                  <p className="text-xs text-green-400 mt-1">✓ Kunci USB siap</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded font-medium"
              >
                {loading ? 'Memproses...' : 'Login'}
              </button>

              <p className="text-xs text-dark-400 text-center mt-4">
                Three-Layer Auth: Password + USB Ed25519 Signature + Face Descriptor
              </p>
            </form>
          ) : (
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Pilih username unik..."
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Buat password kuat..."
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">Kode Enrollment</label>
                <input
                  type="text"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan kode pendaftaran..."
                />
                <p className="text-xs text-dark-400 mt-1">
                  Kode default development: <span className="text-primary-400 font-mono">DEV-2024-KRYPTO</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded font-medium"
              >
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </button>

              <p className="text-xs text-dark-400 text-center mt-4">
                Mode Development: USB Key & Face Descriptor akan ditambahkan nanti.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-dark-500">
          <p>KryptoInfo v1.0 — Proyek Akhir Kriptografi</p>
          <p className="mt-1">UPN "Veteran" Yogyakarta</p>
        </div>
      </div>
    </div>
  );
}
