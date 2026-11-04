
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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient mesh glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-indigo-600/15 blur-[140px] pointer-events-none -z-10" />

      <div className="w-full max-w-lg relative z-10 py-6">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1.5px] shadow-xl shadow-cyan-500/25 mb-4">
            <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            KryptoInfo
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Next-Gen 3-Layer Security Digital Vault
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">

          {/* Mode Switcher */}
          <div className="p-1 bg-[#0a0f1d] border border-white/[0.08] rounded-xl flex gap-1 mb-6">
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => changeMode('enroll')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'enroll'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enroll Device
            </button>
          </div>

          {/* Pesan error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
              <span className="text-red-400 mt-0.5">⚠️</span>
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {/* Pesan berhasil */}
          {message && (
            <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span className="flex-1 leading-relaxed">{message}</span>
            </div>
          )}

          {/* Panel kamera untuk login dan enrollment */}
          <div className="mb-6 p-4 rounded-2xl bg-[#0a0f1d] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                Biometric Face Verification
              </span>
              <span className="text-[11px] text-cyan-400 font-mono truncate max-w-[200px]">
                {faceStatus}
              </span>
            </div>

            <div className="relative w-full h-52 rounded-xl bg-black overflow-hidden border border-white/10 group">
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none z-20" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none z-20" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none z-20" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none z-20" />

              {cameraActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scanline pointer-events-none z-10" />
              )}

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                  <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Kamera standby. Aktifkan untuk memindai wajah.</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={loading || cameraActive}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>●</span>
                <span>Aktifkan Kamera</span>
              </button>

              <button
                type="button"
                onClick={closeCamera}
                disabled={loading || !cameraActive}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-xl text-xs font-medium border border-white/[0.06] transition-all"
              >
                Matikan
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600"
                  placeholder="Masukkan username..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600"
                  placeholder="Masukkan password..."
                  required
                />
              </div>

              {/* USB Dongle Section */}
              <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Hardware USB Dongle
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Ed25519 Token</span>
                </div>

                <button
                  type="button"
                  onClick={handleScanDongles}
                  disabled={scanning || loading}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 border border-cyan-500/25 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
                >
                  <span className={scanning ? 'animate-spin' : ''}>⚡</span>
                  <span>{scanning ? 'Mencari dongle di flashdisk...' : 'Cari USB Dongle'}</span>
                </button>

                <p className="text-[11px] text-slate-400">
                  Status: <span className="text-slate-300">{dongleStatus}</span>
                </p>

                {dongles.length > 0 && (
                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Pilih Kunci Dongle Aktif:
                    </label>
                    <select
                      value={selectedDongleId}
                      onChange={(e) => setSelectedDongleId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 text-slate-200 rounded-lg border border-white/10 text-xs focus:outline-none focus:border-cyan-500"
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
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Kunci dongle siap digunakan untuk menandatangani sesi.</span>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] mt-2"
              >
                {loading ? 'Memverifikasi Tiga Faktor...' : 'Authenticate & Unlock Vault'}
              </button>

              <p className="text-[11px] text-slate-500 text-center pt-2">
                Protected by Password + Hardware Ed25519 + Biometric Face ID
              </p>
            </form>
          ) : (
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600"
                  placeholder="Pilih username unik..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600"
                  placeholder="Minimal 8 karakter (huruf, angka, simbol)..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kode Enrollment
                </label>
                <input
                  type="password"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600"
                  placeholder="Masukkan kode rahasia admin..."
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default dev code: <span className="font-mono text-cyan-400">kryptoinfo-phase1-2026</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] mt-2"
              >
                {loading ? 'Mendaftarkan akun & membuat kunci...' : 'Daftar & Unduh Kunci Dongle'}
              </button>

              <p className="text-[11px] text-slate-500 text-center pt-2">
                Pendaftaran akan otomatis mengunduh kunci kriptografi Ed25519 Anda.
              </p>
            </form>
          )}

        </div>

        <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <p>KryptoInfo Vault Security • Tugas Praktikum Kriptografi</p>
          <p>UPN &quot;Veteran&quot; Yogyakarta</p>
        </div>

      </div>
    </div>
  );
}
