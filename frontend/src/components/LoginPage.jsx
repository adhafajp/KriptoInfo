import React, { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';

import { generateDongleKeyPair } from '../utils/cryptoHelper';

import {
  loadFaceModels,
  startFaceCamera,
  captureFaceDescriptor,
  stopFaceCamera
} from '../utils/faceHelper';

import {
  Shield,
  KeyRound,
  Usb,
  ScanFace,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Camera,
  CameraOff,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');

  const [daemonDongle, setDaemonDongle] = useState(null);
  const [daemonOnline, setDaemonOnline] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState(
    'Kamera belum diaktifkan.'
  );

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function closeCamera() {
    stopFaceCamera(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setFaceStatus('Kamera belum diaktifkan.');
  }

  useEffect(() => {
    return () => {
      stopFaceCamera(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  useEffect(() => {
    let active = true;
    const cleanUser = username.trim();

    if (!cleanUser) {
      setDaemonDongle(null);
      fetch('http://127.0.0.1:8787/api/status', { signal: AbortSignal.timeout(1500) })
        .then(res => { if (active) setDaemonOnline(res.ok); })
        .catch(() => { if (active) setDaemonOnline(false); });
      return;
    }

    async function checkDaemon() {
      try {
        const res = await fetch(`http://127.0.0.1:8787/api/status?username=${encodeURIComponent(cleanUser)}`, {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setDaemonOnline(true);
            let found = null;
            if (data.dongles && data.dongles.length > 0) {
              found = data.dongles.find(d =>
                (d.username && d.username.toLowerCase() === cleanUser.toLowerCase()) ||
                (d.fileName && d.fileName.toLowerCase() === `kryptoinfo-dongle-${cleanUser.toLowerCase()}.json`)
              ) || (data.dongleDetected ? data.dongles[0] : null);
            } else if (data.dongleDetected && data.fileName?.toLowerCase().includes(cleanUser.toLowerCase())) {
              found = data;
            }
            setDaemonDongle(found);
          }
          return;
        }
      } catch {
        // Daemon offline
      }
      if (active) {
        setDaemonOnline(false);
        setDaemonDongle(null);
      }
    }

    checkDaemon();
    const interval = setInterval(checkDaemon, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [username]);

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

  async function getCurrentFaceDescriptor() {
    if (!cameraActive || !videoRef.current) {
      throw new Error('Aktifkan kamera terlebih dahulu.');
    }

    setFaceStatus('Sedang mendeteksi wajah...');

    const descriptor = await captureFaceDescriptor(videoRef.current);

    setFaceStatus('Wajah berhasil terdeteksi.');

    return descriptor;
  }

  async function handleLogin(e) {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    if (!daemonDongle) {
      setError('Colokkan USB dongle (flashdisk) ke komputer terlebih dahulu.');
      return;
    }

    setLoading(true);

    try {
      const faceDescriptor = await getCurrentFaceDescriptor();

      const challengeRes = await authApi.challenge(username.trim());

      if (!challengeRes.success) {
        throw new Error(
          challengeRes.message || 'Gagal meminta challenge.'
        );
      }

      const { challengeId, challenge } = challengeRes.data;

      const signRes = await fetch('http://127.0.0.1:8787/api/sign-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeText: challenge,
          dongleId: daemonDongle?.id
        })
      });
      const signData = await signRes.json();
      if (!signData.success || !signData.signature) {
        throw new Error(signData.message || 'Gagal menandatangani challenge dari USB Agent.');
      }
      const signature = signData.signature;

      const loginRes = await authApi.login({
        username: username.trim(),
        password,
        challengeId,
        signature,
        faceDescriptor
      });

      if (!loginRes.success) {
        throw new Error(
          loginRes.message || 'Autentikasi gagal.'
        );
      }

      setMessage(
        'Autentikasi tiga faktor berhasil. Membuka vault...'
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
      const faceDescriptor = await getCurrentFaceDescriptor();

      const keyPair = await generateDongleKeyPair();

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

      let savedToUsb = false;
      let usbMsg = '';

      try {
        const usbSaveRes = await fetch('http://127.0.0.1:8787/api/save-dongle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            privateKeyPkcs8: keyPair.privateKeyBase64
          })
        });
        const usbSaveData = await usbSaveRes.json();
        if (usbSaveRes.ok && usbSaveData.success) {
          savedToUsb = true;
          usbMsg = `Kunci dongle langsung tersimpan di flashdisk (${usbSaveData.drive}KryptoInfoDongle).`;
        }
      } catch {
        // USB agent offline atau gagal terhubung
      }

      if (!savedToUsb) {
        const dongleData = {
          username: username.trim(),
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
        usbMsg = 'Flashdisk belum terhubung, file dongle otomatis diunduh ke komputer.';
      }

      setMessage(
        `Enrollment berhasil! ${usbMsg} Aktifkan kembali kamera untuk login.`
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

  const factors = [
    { id: 'password', label: 'Password', icon: Lock, ready: password.length > 0 },
    { id: 'usb', label: 'USB Dongle', icon: Usb, ready: !!daemonDongle },
    { id: 'face', label: 'Face ID', icon: ScanFace, ready: cameraActive },
  ];

  return (
    <div className="min-h-screen vault-bg flex items-center justify-center p-4" style={{ background: '#0a0f0d' }}>
      <div className="w-full max-w-4xl">

        {/* Header: compact logo + title on one line */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-vault-950/80 border border-vault-700/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-vault-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">KryptoInfo</h1>
            <p className="text-vault-400/80 text-[10px] font-medium tracking-widest uppercase">Secure Digital Vault</p>
          </div>
        </div>

        {/* Main Card — two-column layout */}
        <div className="vault-card rounded-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* LEFT COLUMN: Camera + factor indicators */}
            <div className="lg:w-[45%] p-5 bg-dark-950/40 border-b lg:border-b-0 lg:border-r border-dark-800/30 flex flex-col justify-between gap-4">

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ScanFace className="w-4 h-4 text-vault-400" />
                  <span className="text-white font-medium text-sm">Biometric Verification</span>
                </div>

                {/* Camera feed */}
                <div className="relative w-full aspect-[4/3] rounded-xl bg-black/60 overflow-hidden border border-dark-800/50 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-500 gap-2">
                      <Camera className="w-8 h-8 text-dark-600" />
                      <span className="text-xs">Kamera belum aktif</span>
                    </div>
                  )}

                  {/* Corner brackets for scan effect */}
                  {cameraActive && (
                    <>
                      <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-vault-400/60 rounded-tl" />
                      <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-vault-400/60 rounded-tr" />
                      <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-vault-400/60 rounded-bl" />
                      <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-vault-400/60 rounded-br" />
                    </>
                  )}
                </div>

                {/* Camera status + controls */}
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cameraActive ? 'bg-vault-400 animate-pulse' : 'bg-dark-600'}`} />
                    <p className="text-[11px] text-dark-400 truncate">{faceStatus}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      disabled={loading || cameraActive}
                      className="px-2.5 py-1.5 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Aktifkan
                    </button>
                    <button
                      type="button"
                      onClick={closeCamera}
                      disabled={loading || !cameraActive}
                      className="px-2.5 py-1.5 bg-dark-800 hover:bg-dark-700 disabled:opacity-40 text-dark-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      Matikan
                    </button>
                  </div>
                </div>
              </div>

              {/* Factor indicators (login mode only) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-3 border-t border-dark-800/30">
                  {factors.map((f) => (
                    <div key={f.id} className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        f.ready
                          ? 'bg-vault-500/20 border border-vault-500/50 text-vault-400'
                          : 'bg-dark-800/50 border border-dark-700/50 text-dark-500'
                      }`}>
                        <f.icon className="w-3 h-3" />
                      </div>
                      <span className={`text-[10px] font-medium ${f.ready ? 'text-vault-400' : 'text-dark-500'}`}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Mode toggle + form */}
            <div className="lg:w-[55%] p-5 flex flex-col justify-between">

              <div>
                {/* Mode Toggle */}
                <div className="flex gap-1 mb-4 p-1 bg-dark-900/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => changeMode('login')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      mode === 'login'
                        ? 'bg-vault-600 text-white shadow-lg shadow-vault-600/20'
                        : 'text-dark-400 hover:text-dark-200'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode('enroll')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      mode === 'enroll'
                        ? 'bg-vault-600 text-white shadow-lg shadow-vault-600/20'
                        : 'text-dark-400 hover:text-dark-200'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftar Baru
                  </button>
                </div>

                {/* Error / Success messages */}
                {error && (
                  <div className="mb-3 p-2.5 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
                {message && (
                  <div className="mb-3 p-2.5 bg-vault-950/50 border border-vault-700/50 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-vault-400 mt-0.5 flex-shrink-0" />
                    <p className="text-vault-300 text-sm">{message}</p>
                  </div>
                )}

                {/* Forms */}
                {mode === 'login' ? (

                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[11px] text-dark-400 mb-1 uppercase tracking-wider font-medium">Username</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-dark-900/80 text-white rounded-lg border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                          placeholder="Masukkan username..."
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-dark-400 mb-1 uppercase tracking-wider font-medium">Master Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2 bg-dark-900/80 text-white rounded-lg border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                          placeholder="Masukkan password..."
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* USB Status */}
                    <div className={`p-2.5 rounded-xl border ${
                      daemonDongle
                        ? 'bg-vault-950/40 border-vault-700/40'
                        : username.trim()
                          ? 'bg-yellow-950/30 border-yellow-800/30'
                          : 'bg-dark-900/60 border-dark-800/50'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          daemonDongle
                            ? 'bg-vault-500/20'
                            : username.trim()
                              ? 'bg-yellow-500/10'
                              : 'bg-dark-800/40'
                        }`}>
                          <Usb className={`w-3.5 h-3.5 ${
                            daemonDongle
                              ? 'text-vault-400'
                              : username.trim()
                                ? 'text-yellow-500/70 animate-pulse'
                                : 'text-dark-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {daemonDongle ? (
                            <>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-vault-400" />
                                <span className="text-vault-300 text-xs font-medium">Dongle Cocok Terdeteksi</span>
                              </div>
                              <p className="text-dark-500 text-[10px] font-mono truncate">{daemonDongle.fileName || 'Connected'}</p>
                            </>
                          ) : !username.trim() ? (
                            <>
                              <span className="text-dark-400 text-xs font-medium">Menunggu Username...</span>
                              <p className="text-dark-500 text-[10px]">Ketik username untuk memeriksa dongle yang sesuai.</p>
                            </>
                          ) : (
                            <>
                              <span className="text-yellow-400/80 text-xs font-medium">
                                {daemonOnline ? `Dongle ${username.trim()} Tidak Ditemukan` : 'USB Agent Belum Aktif'}
                              </span>
                              <p className="text-dark-500 text-[10px]">
                                {daemonOnline
                                  ? `Colokkan flashdisk berisi kryptoinfo-dongle-${username.trim()}.json`
                                  : 'Jalankan usb-agent terlebih dahulu.'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-1 py-2.5 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20 hover:shadow-vault-500/30"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memverifikasi 3 faktor...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          Buka Vault
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 pt-1">
                      <div className="flex items-center gap-1 text-dark-500 text-[10px]">
                        <Lock className="w-3 h-3" />
                        <span>Argon2id</span>
                      </div>
                      <div className="flex items-center gap-1 text-dark-500 text-[10px]">
                        <Usb className="w-3 h-3" />
                        <span>Ed25519</span>
                      </div>
                      <div className="flex items-center gap-1 text-dark-500 text-[10px]">
                        <ScanFace className="w-3 h-3" />
                        <span>128-d Vector</span>
                      </div>
                    </div>
                  </form>

                ) : (

                  <form onSubmit={handleEnroll} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[11px] text-dark-400 mb-1 uppercase tracking-wider font-medium">Username</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-dark-900/80 text-white rounded-lg border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                          placeholder="Pilih username unik..."
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-dark-400 mb-1 uppercase tracking-wider font-medium">Master Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2 bg-dark-900/80 text-white rounded-lg border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                          placeholder="Buat password kuat..."
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-dark-400 mb-1 uppercase tracking-wider font-medium">Kode Enrollment</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          type="password"
                          value={enrollmentCode}
                          onChange={(e) => setEnrollmentCode(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-dark-900/80 text-white rounded-lg border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                          placeholder="Kode pendaftaran dari admin..."
                          required
                        />
                      </div>
                      <p className="text-[10px] text-dark-500 mt-1 ml-1">Kode diberikan oleh administrator sistem.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-1 py-2.5 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20 hover:shadow-vault-500/30"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mendaftarkan...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Daftar Sekarang
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-dark-500 text-center">
                      Pendaftaran memerlukan kamera aktif, master password, dan akan menghasilkan USB Dongle otomatis.
                    </p>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-dark-600 text-[10px]">
            KryptoInfo v1.0 — Proyek Akhir Kriptografi &middot; UPN &quot;Veteran&quot; Yogyakarta
          </p>
        </div>

      </div>
    </div>
  );
}
