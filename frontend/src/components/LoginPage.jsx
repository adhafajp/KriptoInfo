
import { useEffect, useRef, useState } from 'react';
import { authApi, usbAgentApi } from '../services/api';

import {
  generateDongleKeyPair
} from '../utils/cryptoHelper';

import {
  loadFaceModels,
  startFaceCamera,
  captureFaceDescriptor,
  stopFaceCamera
} from '../utils/faceHelper';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');

  const [dongles, setDongles] = useState([]);
  const [selectedDongleId, setSelectedDongleId] = useState('');
  const [dongleStatus, setDongleStatus] = useState(
    'USB Agent belum diperiksa.'
  );
const [scanning, setScanning] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState(
    'Kamera belum diaktifkan.'
  );

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Mematikan kamera dan melepas stream.
  function closeCamera() {
    stopFaceCamera(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setFaceStatus('Kamera belum diaktifkan.');
  }

  // Memastikan kamera mati ketika komponen ditutup.
  useEffect(() => {
    return () => {
      stopFaceCamera(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  // Mengaktifkan kamera dan memuat model pengenalan wajah.
  async function handleStartCamera() {
    setError('');
    setMessage('');
    setFaceStatus('Memuat model pengenalan wajah...');

    try {
      await loadFaceModels();

      const stream = await startFaceCamera(videoRef.current);

      streamRef.current = stream;
      setCameraActive(true);
      setFaceStatus('Kamera aktif. Posisikan wajah di depan kamera.');
    } catch (err) {
      closeCamera();
      setError(`Gagal mengaktifkan kamera: ${err.message}`);
    }
  }

  // Mengambil descriptor wajah asli dari kamera.
  async function getCurrentFaceDescriptor() {
    if (!cameraActive || !videoRef.current) {
      throw new Error('Aktifkan kamera terlebih dahulu.');
    }

    setFaceStatus('Sedang mendeteksi wajah...');

    const descriptor = await captureFaceDescriptor(videoRef.current);

    setFaceStatus('Wajah berhasil terdeteksi.');

    return descriptor;
  }

  
  async function handleScanDongles() {
    setScanning(true);
    setError('');
    setDongleStatus('Sedang mencari USB dongle...');

    try {
      const result = await usbAgentApi.status();

      const found = Array.isArray(result.dongles)
        ? result.dongles
        : [];

      setDongles(found);

      // Jika hanya ada satu dongle, pilih otomatis.
      if (found.length === 1) {
        setSelectedDongleId(found[0].id);
      } else {
        // Jika banyak, coba cocokkan dengan username.
        const matching = found.filter(
          item =>
            item.username?.toLowerCase() === username.trim().toLowerCase()
        );

        setSelectedDongleId(
          matching.length === 1 ? matching[0].id : ''
        );
      }

      if (found.length === 0) {
        setDongleStatus('Tidak ada USB dongle valid yang ditemukan.');
      } else {
        setDongleStatus(
          `${found.length} USB dongle berhasil ditemukan.`
        );
      }

    } catch (err) {
      setDongles([]);
      setSelectedDongleId('');
      setDongleStatus('USB Agent tidak tersedia.');
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }


  // Proses login: wajah + dongle + password.
  async function handleLogin(e) {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    if (!selectedDongleId) {
      setError('Cari dan pilih USB dongle terlebih dahulu.');
      return;
    }

    setLoading(true);

    try {
      // Faktor 1: Face Recognition.
      const faceDescriptor = await getCurrentFaceDescriptor();

      // Faktor 2: Minta challenge dari backend.
      const challengeRes = await authApi.challenge(username.trim());

      if (!challengeRes.success) {
        throw new Error(
          challengeRes.message || 'Gagal meminta challenge.'
        );
      }

      const { challengeId, challenge } = challengeRes.data;

      // Faktor USB: minta USB Agent menandatangani challenge.
      const signRes = await usbAgentApi.signChallenge(
        selectedDongleId,
        challenge
      );

      if (!signRes.signature) {
        throw new Error('USB Agent tidak menghasilkan signature.');
      }

      // Kirim ketiga faktor kepada backend.
      const loginRes = await authApi.login({
        username: username.trim(),
        password,
        challengeId,
        signature: signRes.signature,
        faceDescriptor
      });

      if (!loginRes.success) {
        throw new Error(
          loginRes.message || 'Autentikasi gagal.'
        );
      }

      setMessage(
        'Autentikasi tiga faktor berhasil. Membuka dashboard...'
      );

      closeCamera();

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(loginRes.data);
        }
      }, 500);

    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }


  // Proses enrollment: mengambil wajah asli dan mendaftarkan public key.
  async function handleEnroll(e) {
    e.preventDefault();

    setError('');
    setMessage('');

    if (
      !username.trim() ||
      !password ||
      !enrollmentCode.trim()
    ) {
      setError('Semua field wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      // Ambil descriptor wajah asli dari kamera.
      const faceDescriptor = await getCurrentFaceDescriptor();

      // Membuat pasangan kunci Ed25519.
      const keyPair = await generateDongleKeyPair();

      // Daftarkan username, password, public key, dan wajah ke backend.
      const res = await authApi.enroll({
        username: username.trim(),
        password,
        enrollmentCode: enrollmentCode.trim(),
        publicKey: keyPair.publicKeyBase64,
        faceDescriptor
      });

      if (!res.success) {
        throw new Error(res.message || 'Pendaftaran gagal.');
      }

      // Unduh private key sebagai file dongle.
      const dongleData = {
        privateKeyPkcs8: keyPair.privateKeyBase64
      };

      const blob = new Blob(
        [JSON.stringify(dongleData, null, 2)],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `kryptoinfo-dongle-${username.trim()}.json`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMessage(
        'Enrollment berhasil! Pindahkan file dongle yang diunduh ke folder KryptoInfoDongle pada flashdisk.'
      );

      closeCamera();
      setMode('login');

    } catch (err) {
      setError(err.message || 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    closeCamera();
    setError('');
    setMessage('');
    setMode(nextMode);
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-400 mb-2">
            KryptoInfo
          </h1>

          <p className="text-dark-300">
            Three-Layer Secure Digital Vault
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-6">

          {/* Pilihan Login atau Enrollment */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`flex-1 py-2 rounded ${
                mode === 'login'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => changeMode('enroll')}
              className={`flex-1 py-2 rounded ${
                mode === 'enroll'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {/* Pesan error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Pesan berhasil */}
          {message && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-300 text-sm">
              {message}
            </div>
          )}

          {/* Panel kamera untuk login dan enrollment */}
          <div className="mb-5 p-3 bg-dark-800 rounded border border-dark-700">

            <h3 className="text-white font-medium mb-2">
              Face Recognition
            </h3>

            <div className="relative w-full h-48 rounded bg-black overflow-hidden">

              {/* Elemen video selalu sama, tidak diganti React */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${
                  cameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Tampilan ketika kamera belum aktif */}
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-dark-400 text-sm text-center p-4">
                  Kamera belum aktif. Tekan tombol Aktifkan Kamera.
                </div>
              )}

            </div>


            <p className="text-xs text-dark-300 mt-2">
              Status: {faceStatus}
            </p>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={loading || cameraActive}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded text-sm"
              >
                Aktifkan Kamera
              </button>

              <button
                type="button"
                onClick={closeCamera}
                disabled={loading || !cameraActive}
                className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 text-white rounded text-sm"
              >
                Matikan Kamera
              </button>
            </div>
          </div>

          {mode === 'login' ? (

            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan username..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  Master Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan password..."
                  required
                />
              </div>

              
              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  USB Dongle
                </label>

                <button
                  type="button"
                  onClick={handleScanDongles}
                  disabled={scanning || loading}
                  className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded text-sm"
                >
                  {scanning ? 'Mencari dongle...' : 'Cari USB Dongle'}
                </button>

                <p className="text-xs text-dark-300 mt-2">
                  Status: {dongleStatus}
                </p>

                {dongles.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm text-dark-300 mb-1">
                      Pilih Dongle
                    </label>

                    <select
                      value={selectedDongleId}
                      onChange={(e) => setSelectedDongleId(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700"
                    >
                      <option value="">Pilih dongle...</option>

                      {dongles.map(dongle => (
                        <option key={dongle.id} value={dongle.id}>
                          {dongle.username} — {dongle.fileName} ({dongle.drive})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedDongleId && (
                  <p className="text-xs text-green-400 mt-2">
                    ✓ Dongle berhasil dipilih.
                  </p>
                )}
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded font-medium"
              >
                {loading ? 'Memverifikasi tiga faktor...' : 'Login'}
              </button>

              <p className="text-xs text-dark-400 text-center mt-4">
                Password + USB Ed25519 + Face Recognition
              </p>

            </form>

          ) : (

            <form onSubmit={handleEnroll} className="space-y-4">

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Pilih username unik..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  Master Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Buat password kuat..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  Kode Enrollment
                </label>

                <input
                  type="password"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
                  placeholder="Masukkan kode pendaftaran..."
                  required
                />

                <p className="text-xs text-dark-400 mt-1">
                  Gunakan kode enrollment dari konfigurasi backend.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded font-medium"
              >
                {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
              </button>

              <p className="text-xs text-dark-400 text-center mt-4">
                Pendaftaran membutuhkan kamera, Master Password, dan pembuatan USB Dongle.
              </p>

            </form>
          )}

        </div>

        <div className="mt-6 text-center text-xs text-dark-500">
          <p>KryptoInfo v1.0 — Proyek Akhir Kriptografi</p>
          <p className="mt-1">UPN &quot;Veteran&quot; Yogyakarta</p>
        </div>

      </div>
    </div>
  );
}
