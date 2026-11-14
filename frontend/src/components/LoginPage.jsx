import React, { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';

import { generateDongleKeyPair } from '../utils/cryptoHelper';

import {
  loadFaceModels,
  startFaceCamera,
  captureFaceDescriptor,
  captureFaceSamples,
  detectFaceBox,
  extractQuickDescriptor,
  computeDisplayBox,
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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage({ onLoginSuccess }) {
  const { toggleTheme, isDark } = useTheme();
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
  const [cameraStarting, setCameraStarting] = useState(false);
  const [faceStatus, setFaceStatus] = useState(
    'Kamera belum diaktifkan.'
  );
  const [detectedFaceBox, setDetectedFaceBox] = useState(null);
  const [faceMatchInfo, setFaceMatchInfo] = useState({ status: 'no_user' });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const manualStoppedRef = useRef(false);
  const autoStartTimeoutRef = useRef(null);

  function closeCamera() {
    stopFaceCamera(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraStarting(false);
    setDetectedFaceBox(null);
    setFaceMatchInfo({ status: 'no_user' });
    setFaceStatus('Kamera belum diaktifkan.');
  }

  function handleStopCamera() {
    manualStoppedRef.current = true;
    closeCamera();
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
    let timeoutId = null;

    async function trackLoop() {
      if (!active || !cameraActive || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          const res = await detectFaceBox(videoRef.current);
          if (active) {
            if (res && res.box) {
              const display = computeDisplayBox(res.box, videoRef.current);
              if (display) {
                setDetectedFaceBox({
                  ...display,
                  score: Math.round(res.score * 100)
                });
              }
            } else {
              setDetectedFaceBox(null);
            }
          }
        }
      } catch {
        // error tracking loop dilewati agar tidak mengganggu video
      }

      if (active && cameraActive) {
        timeoutId = setTimeout(trackLoop, 100);
      }
    }

    if (cameraActive) {
      trackLoop();
    } else {
      setDetectedFaceBox(null);
    }

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [cameraActive]);

  // Loop pencocokan biometrik wajah terhadap username yang diketik
  useEffect(() => {
    let active = true;
    let timer = null;
    const cleanUser = username.trim();

    if (!cleanUser || mode === 'enroll' || !cameraActive) {
      setFaceMatchInfo({ status: 'no_user' });
      return;
    }

    async function checkFaceIdentity() {
      if (!active || !cameraActive || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          const descriptor = await extractQuickDescriptor(videoRef.current);
          if (active && descriptor) {
            const res = await authApi.verifyFace(cleanUser, descriptor);
            if (active && res.success && res.data) {
              if (res.data.userFound) {
                setFaceMatchInfo({
                  status: res.data.match ? 'matched' : 'mismatched',
                  distance: res.data.distance,
                  threshold: res.data.threshold,
                  username: cleanUser
                });
              } else {
                setFaceMatchInfo({ status: 'user_not_found', username: cleanUser });
              }
            }
          }
        }
      } catch {
        // error loop dilewati
      }

      if (active && cameraActive) {
        timer = setTimeout(checkFaceIdentity, 800);
      }
    }

    timer = setTimeout(checkFaceIdentity, 300);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [username, cameraActive, mode]);

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
    if (cameraActive || cameraStarting) return;
    setError('');
    setMessage('');
    setCameraStarting(true);
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
    } finally {
      setCameraStarting(false);
    }
  }

  // Smart Auto-Start: nyalakan kamera saat user mengetik username (debounce 800ms)
  useEffect(() => {
    const clean = username.trim();
    if (clean.length < 3 || cameraActive || cameraStarting || manualStoppedRef.current) return;

    if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);

    autoStartTimeoutRef.current = setTimeout(() => {
      handleStartCamera();
    }, 800);

    return () => {
      if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
    };
  }, [username, cameraActive, cameraStarting]);

  // Reset status manual stop jika user berpindah mode
  useEffect(() => {
    manualStoppedRef.current = false;
  }, [mode]);

  async function getCurrentFaceDescriptor() {
    if (!cameraActive || !videoRef.current) {
      throw new Error('Aktifkan kamera terlebih dahulu.');
    }

    setFaceStatus('Memulai pemindaian biometrik...');

    const descriptor = await captureFaceDescriptor(videoRef.current, (current, total) => {
      setFaceStatus(`Mengambil sampel biometrik wajah (${current}/${total})...`);
    });

    setFaceStatus('Pemindaian biometrik selesai & terverifikasi.');

    return descriptor;
  }

  // Login memakai 3 sampel individu (matriks) — backend mensyaratkan SEMUA sampel
  // berada di bawah ambang batas agar tombol putih/wajah generik tidak lolos.
  async function getLoginFaceSamples() {
    if (!cameraActive || !videoRef.current) {
      throw new Error('Aktifkan kamera terlebih dahulu.');
    }

    setFaceStatus('Memulai pemindaian biometrik ketat (3 sampel)...');

    const samples = await captureFaceSamples(videoRef.current, (current, total) => {
      setFaceStatus(`Mengambil sampel ketat ${current}/${total} (semua harus lolos)...`);
    });

    setFaceStatus('Pemindaian ketat selesai.');

    return samples;
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

    if (faceMatchInfo?.status === 'mismatched' || faceMatchInfo?.status === 'user_not_found') {
      setError(`Wajah di kamera tidak cocok dengan pemilik akun @${username.trim()}. Akses ditolak.`);
      return;
    }

    setLoading(true);

    try {
      const faceDescriptor = await getLoginFaceSamples();

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
    <div className="h-screen w-screen desk-canvas flex items-center justify-center p-2 sm:p-3 overflow-hidden select-none transition-colors selection:bg-red-800 selection:text-white">
      <div className="w-full max-w-4xl relative max-h-[96vh] flex flex-col justify-center">

        {/* Ambient Detective Desk Props Header */}
        <div className="flex items-end justify-between mb-1.5 px-2 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rubber-stamp text-[10px] tracking-widest text-red-800 dark:text-red-500 border-red-800 dark:border-red-500">
                CONFIDENTIAL
              </span>
              <span className="font-mono text-[9px] text-stone-800 dark:text-amber-500/90 font-bold tracking-widest uppercase">
                CASE // LIPUTAN-2026-X
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-stone-900 dark:text-amber-400 drop-shadow-sm">
              PIKATAN DOSSIER
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-md bg-[#ede4d1] dark:bg-stone-900 border-2 border-stone-500 dark:border-stone-700 text-stone-900 dark:text-amber-300 hover:scale-105 transition-all shadow-md"
              title={isDark ? 'Beralih ke Meja Siang (Light)' : 'Beralih ke Lampu Malam (Dark)'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-800" />}
            </button>
          </div>
        </div>

        {/* The Detective Dossier Folder / Evidence Board */}
        <div className="dossier-paper rounded-lg p-4 sm:p-5 relative overflow-hidden flex-shrink-0">
          
          {/* Top Push Pin Decoration */}
          <div className="push-pin" />

          {/* Top Stamp & Case File Number */}
          <div className="flex items-center justify-between border-b-2 border-stone-400/50 dark:border-stone-700 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-stone-900 dark:text-amber-100 tracking-wider">
                EVIDENCE BOARD // AUTH-PROTOCOL-3FA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rubber-stamp text-[9px] text-red-800 dark:text-red-400 border-red-800 dark:border-red-400 font-black">
                TOP SECRET
              </span>
              <span className="font-mono text-[10px] text-stone-800 dark:text-stone-300 font-bold">
                REF: 123240116
              </span>
            </div>
          </div>

          {/* Two-Column Noir Detective Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* LEFT: Polaroid Camera Suspect/Target Scanner (5 Cols) */}
            <div className="lg:col-span-5 space-y-2">
              <div className="polaroid-frame relative overflow-visible">
                {/* Real Red 3D Push Pin pinned directly on Polaroid Corner */}
                <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-red-600 shadow-md border border-red-950 z-30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </div>
                
                <div className="relative aspect-[4/3] bg-stone-900 rounded overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover filter contrast-125 sepia-[0.2] ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      {cameraStarting ? (
                        <div className="flex flex-col items-center gap-1.5 text-amber-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[10px] font-mono">Mengkalibrasi Biometrik...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { manualStoppedRef.current = false; handleStartCamera(); }}>
                          <ScanFace className="w-6 h-6 text-stone-500" />
                          <span className="text-[10px] font-mono font-bold text-stone-300">POTRET SUBJEK (FACE ID)</span>
                          <span className="text-[9px] font-mono text-stone-500">Klik untuk aktifkan sensor</span>
                        </div>
                      )}
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute inset-3 border border-dashed border-red-500/50 pointer-events-none flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                    </div>
                  )}
                </div>

                <div className="pt-1.5 px-1 flex items-center justify-between">
                  <div>
                    <p className="font-serif italic font-bold text-[11px] text-stone-800">
                      Subjek: @{username || 'Anonymous'}
                    </p>
                    <p className="text-[9px] font-mono text-stone-500">
                      ResNet-34 // 128-float Euclidean
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cameraActive ? handleStopCamera : () => { manualStoppedRef.current = false; handleStartCamera(); }}
                    className="px-2 py-0.5 text-[10px] font-mono rounded border border-stone-400 hover:bg-stone-200"
                  >
                    {cameraActive ? 'Matikan' : 'Aktifkan'}
                  </button>
                </div>
              </div>

              {/* Sticky Note Detective Clue pinned on board */}
              <div className="sticky-note p-2 rounded text-xs font-mono space-y-0.5 relative">
                <div className="absolute -top-1.5 left-5 w-3 h-3 rounded-full bg-red-600 shadow-sm border border-red-950 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white/80" />
                </div>
                <p className="font-bold uppercase tracking-wider text-[9px] border-b border-amber-800/30 pb-0.5">
                  CATATAN PENYELIDIK // 3FA:
                </p>
                <p className="text-[9.5px] leading-tight text-amber-950 font-medium">
                  &bull; 1. Sandi Argon2id (Pengetahuan)<br />
                  &bull; 2. USB Dongle Ed25519 (Fisik)<br />
                  &bull; 3. Verifikasi Wajah &le; 0.60 (Biometrik)
                </p>
              </div>
            </div>

            {/* RIGHT: Dossier Form & Dongle Hardware Verification (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              
              <div>
                <div className="flex border-b border-stone-300 dark:border-stone-700/80 mb-4 gap-2">
                  <button
                    type="button"
                    onClick={() => changeMode('login')}
                    className={`pb-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
                      mode === 'login'
                        ? 'border-red-600 text-red-600 dark:text-red-400'
                        : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    [1. AKSES BRANKAS]
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode('enroll')}
                    className={`pb-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
                      mode === 'enroll'
                        ? 'border-red-600 text-red-600 dark:text-red-400'
                        : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    [2. PENDAFTARAN AGEN]
                  </button>
                </div>

                {error && (
                  <div className="p-3 mb-4 bg-red-900/20 border-l-4 border-red-600 text-xs font-mono text-red-700 dark:text-red-300">
                    <strong>PERINGATAN:</strong> {error}
                  </div>
                )}

                {message && (
                  <div className="p-3 mb-4 bg-emerald-900/20 border-l-4 border-emerald-600 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                    {message}
                  </div>
                )}

                <form onSubmit={mode === 'login' ? handleLogin : handleEnroll} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-stone-900 dark:text-amber-100 mb-1">
                      KODE NAMA // USERNAME:
                    </label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600 dark:text-amber-400/80" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#fdfcf7] dark:bg-[#121110] border-2 border-stone-400 dark:border-stone-600 rounded text-xs font-mono font-bold text-stone-900 dark:text-amber-100 focus:border-red-600 focus:outline-none shadow-inner"
                        placeholder="Contoh: mirwan24"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-stone-900 dark:text-amber-100 mb-1">
                      KUNCI MASTER // PASSWORD:
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600 dark:text-amber-400/80" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-1.5 bg-[#fdfcf7] dark:bg-[#121110] border-2 border-stone-400 dark:border-stone-600 rounded text-xs font-mono font-bold text-stone-900 dark:text-amber-100 focus:border-red-600 focus:outline-none shadow-inner"
                        placeholder="Minimal 8 karakter kuat"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 dark:text-amber-400/80 hover:text-stone-950 dark:hover:text-amber-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'enroll' && (
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-stone-900 dark:text-amber-100 mb-1">
                        KODE ENROLLMENT OTORITAS:
                      </label>
                      <input
                        type="password"
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#fdfcf7] dark:bg-[#121110] border-2 border-stone-400 dark:border-stone-600 rounded text-xs font-mono font-bold text-stone-900 dark:text-amber-100 focus:border-red-600 focus:outline-none shadow-inner"
                        placeholder="Kode khusus laboratorium"
                        required
                      />
                    </div>
                  )}

                  <div className="p-2.5 bg-[#e4dac4] dark:bg-[#25211d] border-2 border-stone-400 dark:border-stone-600 rounded text-xs font-mono flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Usb className={`w-4 h-4 ${daemonDongle ? 'text-emerald-900 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-400'}`} />
                      <div>
                        <span className="font-bold text-[10px] text-stone-900 dark:text-amber-100 block">
                          {daemonDongle ? 'DONGLE USB TERVERIFIKASI' : 'STATUS PERANGKAT KERAS // USB DONGLE'}
                        </span>
                        <span className="text-[10px] text-stone-700 dark:text-stone-300 font-medium">
                          {daemonDongle ? `Drive letter: ${daemonDongle.driveLetter} (Ed25519 Ready)` : 'Colokkan flashdisk berisi file kunci dongle'}
                        </span>
                      </div>
                    </div>
                    {daemonDongle && (
                      <span className="rubber-stamp text-[9px] text-emerald-900 dark:text-emerald-400 border-emerald-900 dark:border-emerald-400 font-black">
                        MATCHED
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>MEMVALIDASI 3FA...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>{mode === 'login' ? 'BUKA BRANKAS INVESTIGASI' : 'DAFTARKAN IDENTITAS BARU'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Bottom Noir Stamp Footnote */}
              <div className="pt-3 border-t border-stone-400/40 dark:border-stone-700 flex items-center justify-between text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
                <span>WARANT: INVESTIGATION ARCHIVE</span>
                <span>PROTECTED BY ED25519 & CHACHA20</span>
              </div>
            </div>

          </div>

        </div>

        <div className="mt-2 text-center">
          <p className="text-[10px] font-mono text-stone-800 dark:text-stone-400 font-bold tracking-wider uppercase">
            Pikatan v1.0 &middot; Pengamanan Data Liputan &middot; UPN "Veteran" Yogyakarta &middot; Berkas Rahasia
          </p>
        </div>

      </div>
    </div>
  );
}
