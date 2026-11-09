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
    <div className="min-h-screen vault-bg flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-4xl">

        {/* Header: compact logo + title + theme toggle */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vault-500/10 dark:bg-vault-950/80 border border-vault-500/30 dark:border-vault-700/30 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-vault-600 dark:text-vault-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-tight">KryptoInfo</h1>
              <p className="text-vault-600 dark:text-vault-400/80 text-[10px] font-medium tracking-widest uppercase">Secure Digital Vault</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/90 dark:bg-dark-900/90 hover:bg-slate-100 dark:hover:bg-dark-850 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-dark-300 hover:text-vault-600 dark:hover:text-vault-400 transition-all shadow-sm"
            title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-vault-600" />}
          </button>
        </div>

        {/* Main Card — two-column layout */}
        <div className="vault-card rounded-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* LEFT COLUMN: Camera + factor indicators */}
            <div className="lg:w-[45%] p-5 bg-dark-950/40 border-b lg:border-b-0 lg:border-r border-dark-800/30 flex flex-col justify-between gap-4">

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ScanFace className="w-4 h-4 text-vault-400" />
                    <span className="text-white font-medium text-sm">Biometric Scanner</span>
                  </div>
                  {/* Single Sleek Toggle Button */}
                  <button
                    type="button"
                    onClick={cameraActive ? handleStopCamera : () => { manualStoppedRef.current = false; handleStartCamera(); }}
                    disabled={loading || cameraStarting}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      cameraActive
                        ? 'bg-dark-900/90 text-dark-300 hover:text-red-400 border-dark-700/80 hover:border-red-800/60'
                        : 'bg-vault-600/20 text-vault-300 hover:bg-vault-600/30 border-vault-500/40 shadow-sm'
                    }`}
                  >
                    {cameraStarting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-vault-400" />
                        <span>Memuat...</span>
                      </>
                    ) : cameraActive ? (
                      <>
                        <CameraOff className="w-3.5 h-3.5 text-red-400" />
                        <span>Matikan</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 text-vault-400" />
                        <span>Aktifkan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Camera feed (Click-to-Activate when inactive) */}
                <div
                  onClick={!cameraActive && !cameraStarting ? () => { manualStoppedRef.current = false; handleStartCamera(); } : undefined}
                  className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border transition-all flex items-center justify-center ${
                    cameraActive
                      ? 'bg-black/80 border-dark-700/80'
                      : 'bg-dark-950/70 border-dark-800/80 hover:border-vault-500/50 cursor-pointer group hover:bg-dark-900/40'
                  }`}
                  title={!cameraActive ? 'Klik untuk mengaktifkan pemindai kamera' : undefined}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 gap-2.5 select-none">
                      {cameraStarting ? (
                        <div className="flex flex-col items-center gap-2 text-vault-400">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-xs font-mono font-medium">Memuat Model AI & Kamera...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform">
                          <div className="w-12 h-12 rounded-2xl bg-dark-900/80 border border-dark-700 group-hover:border-vault-500/50 flex items-center justify-center text-dark-400 group-hover:text-vault-400 transition-colors shadow-lg">
                            <ScanFace className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-dark-200 group-hover:text-vault-300 transition-colors">
                              Klik untuk Aktifkan Kamera
                            </p>
                            <p className="text-[10px] text-dark-500 mt-0.5">
                              atau ketik username untuk mulai otomatis
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Corner frame guides when camera is active */}
                  {cameraActive && (
                    <>
                      <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-dark-700/60" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-dark-700/60" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-dark-700/60" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-dark-700/60" />
                    </>
                  )}

                  {/* Dynamic Face Tracking Reticle - Smoothly follows user face */}
                  {cameraActive && detectedFaceBox && (() => {
                    const isMatched = faceMatchInfo.status === 'matched';
                    const isMismatched = faceMatchInfo.status === 'mismatched';
                    const isChecking = faceMatchInfo.status === 'checking';
                    const isUserNotFound = faceMatchInfo.status === 'user_not_found';

                    const borderColor = isMatched
                      ? 'border-vault-400'
                      : isMismatched
                      ? 'border-red-500'
                      : isChecking
                      ? 'border-yellow-400'
                      : isUserNotFound
                      ? 'border-amber-500'
                      : 'border-cyan-400';

                    const shadowColor = isMatched
                      ? 'shadow-[0_0_12px_#22c55e]'
                      : isMismatched
                      ? 'shadow-[0_0_14px_#ef4444]'
                      : isChecking
                      ? 'shadow-[0_0_10px_#eab308]'
                      : isUserNotFound
                      ? 'shadow-[0_0_10px_#f59e0b]'
                      : 'shadow-[0_0_10px_#06b6d4]';

                    const scanColor = isMatched
                      ? 'from-transparent via-vault-400 to-transparent shadow-[0_0_10px_#22c55e]'
                      : isMismatched
                      ? 'from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444]'
                      : isChecking
                      ? 'from-transparent via-yellow-400 to-transparent shadow-[0_0_10px_#eab308]'
                      : 'from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#06b6d4]';

                    const crosshairColor = isMatched
                      ? 'bg-vault-400'
                      : isMismatched
                      ? 'bg-red-500'
                      : isChecking
                      ? 'bg-yellow-400'
                      : 'bg-cyan-400';

                    return (
                      <div
                        className="absolute pointer-events-none transition-all duration-100 ease-out z-20"
                        style={{
                          left: `${detectedFaceBox.left}px`,
                          top: `${detectedFaceBox.top}px`,
                          width: `${detectedFaceBox.width}px`,
                          height: `${detectedFaceBox.height}px`,
                        }}
                      >
                        {/* 4 Corner Brackets */}
                        <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${borderColor} ${shadowColor}`} />
                        <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 ${borderColor} ${shadowColor}`} />
                        <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 ${borderColor} ${shadowColor}`} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${borderColor} ${shadowColor}`} />

                        {/* Laser Scan Line moving up and down */}
                        <div className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r ${scanColor} animate-hud-scan`} />

                        {/* Center Target Crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                          <div className={`w-3 h-0.5 ${crosshairColor}`} />
                          <div className={`h-3 w-0.5 ${crosshairColor} absolute`} />
                        </div>

                        {/* Top HUD Tag */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-black/90 border border-dark-700 flex items-center gap-1.5 shadow-lg">
                          {isMatched ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-vault-400 animate-ping" />
                              <span className="text-[9px] font-mono font-bold tracking-wider text-vault-300">
                                WAJAH COCOK: @{faceMatchInfo.username}
                              </span>
                            </>
                          ) : isMismatched ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              <span className="text-[9px] font-mono font-bold tracking-wider text-red-400">
                                BUKAN PEMILIK VAULT
                              </span>
                            </>
                          ) : isChecking ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[9px] font-mono font-bold tracking-wider text-yellow-300">
                                MEMERIKSA BIOMETRIK...
                              </span>
                            </>
                          ) : isUserNotFound ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[9px] font-mono font-bold tracking-wider text-amber-300">
                                USER TIDAK DITEMUKAN
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              <span className="text-[9px] font-mono font-bold tracking-wider text-cyan-300">
                                {mode === 'enroll' ? 'SAMPEL BIOMETRIK' : 'SUBJEK TERDETEKSI'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Bottom HUD Tag */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/85 border border-dark-800 text-[8px] font-mono text-dark-300 flex items-center gap-2">
                          {isMatched ? (
                            <>
                              <span>STATUS: <strong className="text-vault-400">TERVERIFIKASI</strong></span>
                              <span className="text-dark-500">DIST: {faceMatchInfo.distance}</span>
                            </>
                          ) : isMismatched ? (
                            <>
                              <span>STATUS: <strong className="text-red-400 font-bold">AKSES DITOLAK</strong></span>
                              <span className="text-dark-400">DIST: {faceMatchInfo.distance} &gt; {faceMatchInfo.threshold}</span>
                            </>
                          ) : isChecking ? (
                            <span className="text-yellow-400">Mencocokkan dengan @{username.trim()}...</span>
                          ) : mode === 'enroll' ? (
                            <span>Posisikan wajah di tengah</span>
                          ) : (
                            <span className="text-dark-400">Masukkan username untuk identifikasi</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Searching Indicator when no face detected yet */}
                  {cameraActive && !detectedFaceBox && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <div className="absolute inset-0 border border-dashed border-vault-500/40 rounded-full animate-hud-spin" />
                        <div className="w-20 h-20 border border-vault-500/20 rounded-full animate-ping" />
                        <ScanFace className="w-7 h-7 text-vault-500/60" />
                      </div>
                      <div className="mt-2.5 px-2 py-0.5 rounded bg-black/70 border border-dark-800 text-[9px] font-mono tracking-widest text-dark-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/80 animate-pulse" />
                        MENCARI WAJAH...
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera status telemetry */}
                <div className="flex items-center justify-between mt-2.5 px-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      cameraActive ? 'bg-vault-400 animate-pulse' : cameraStarting ? 'bg-yellow-400 animate-ping' : 'bg-dark-600'
                    }`} />
                    <p className="text-[11px] text-dark-400 truncate">{faceStatus}</p>
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    cameraActive
                      ? 'bg-vault-500/10 border-vault-500/30 text-vault-400'
                      : 'bg-dark-900 border-dark-800 text-dark-500'
                  }`}>
                    {cameraActive ? 'ONLINE' : 'STANDBY'}
                  </span>
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
