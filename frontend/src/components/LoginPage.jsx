import React, { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';

import { generateDongleKeyPair } from '../utils/cryptoHelper';

import {
  loadFaceModels,
  startFaceCamera,
  captureFaceDescriptor,
  captureFaceSamples,
  detectFaceRealtime,
  computeDisplayBox,
  stopFaceCamera
} from '../utils/faceHelper';

import {
  Shield,
  Usb,
  ScanFace,
  Lock,
  Eye,
  EyeOff,
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

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [faceStatus, setFaceStatus] = useState('Kamera belum diaktifkan.');
  const [detectedFaceBox, setDetectedFaceBox] = useState(null);
  const [faceMatchInfo, setFaceMatchInfo] = useState({ status: 'no_user' });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const manualStoppedRef = useRef(false);
  const autoStartTimeoutRef = useRef(null);
  const usernameRef = useRef(username);
  const modeRef = useRef(mode);
  const loadingRef = useRef(loading);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

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

  // Reset info kecocokan wajah saat username kosong atau mode berubah ke enroll
  useEffect(() => {
    const cleanUser = username.trim();
    if (!cleanUser || mode === 'enroll' || !cameraActive) {
      setFaceMatchInfo({ status: 'no_user' });
    }
  }, [username, mode, cameraActive]);

  // Satu loop terpadu (unified loop) untuk deteksi kotak wajah, kalkulasi jarak/kedekatan,
  // caching descriptor biometrik, dan pencocokan identitas tanpa tabrakan GPU/WebGL.
  useEffect(() => {
    if (!cameraActive) {
      setDetectedFaceBox(null);
      return;
    }

    let active = true;
    let timerId = null;
    let lastDescriptorTime = 0;
    let verifyInFlight = false;

    async function unifiedBiometricLoop() {
      if (!active || !cameraActive || !videoRef.current) return;

      // Jeda loop latar belakang saat sedang proses submit login/enroll agar CPU/GPU fokus penuh
      if (loadingRef.current) {
        timerId = setTimeout(unifiedBiometricLoop, 200);
        return;
      }

      try {
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          const now = Date.now();
          const shouldExtractDescriptor = now - lastDescriptorTime >= 900;

          const res = await detectFaceRealtime(videoRef.current, {
            includeDescriptor: shouldExtractDescriptor
          });

          if (active && res && !res.skipped) {
            if (res.box) {
              const display = computeDisplayBox(res.box, videoRef.current, true);
              const scorePct = Math.round((res.score || 0) * 100);
              const proximity = res.proximity;

              if (display && proximity) {
                setDetectedFaceBox({
                  ...display,
                  score: scorePct,
                  proximity
                });

                if (proximity.status === 'too_far') {
                  setFaceStatus(
                    `Wajah kurang dekat (${proximity.proximityPct}% • ~${proximity.distanceCm} cm). Majukan wajah ke kamera.`
                  );
                } else if (proximity.status === 'too_close') {
                  setFaceStatus(
                    `Wajah terlalu dekat (~${proximity.distanceCm} cm). Mundurkan sedikit wajah Anda.`
                  );
                } else {
                  setFaceStatus(
                    `Wajah terdeteksi optimal (Kedekatan ${proximity.proximityPct}% • ~${proximity.distanceCm} cm).`
                  );
                }
              }

              // Jika descriptor diekstrak pada siklus ini, perbarui waktu dan cek kecocokan akun bila mode login
              if (shouldExtractDescriptor && res.descriptor) {
                lastDescriptorTime = now;
                const cleanUser = usernameRef.current.trim();

                if (
                  cleanUser.length >= 3 &&
                  modeRef.current === 'login' &&
                  proximity?.isOptimal &&
                  !verifyInFlight
                ) {
                  verifyInFlight = true;
                  authApi
                    .verifyFace(cleanUser, res.descriptor)
                    .then(verifyRes => {
                      if (!active) return;
                      if (verifyRes.success && verifyRes.data) {
                        if (verifyRes.data.userFound) {
                          setFaceMatchInfo({
                            status: verifyRes.data.match ? 'matched' : 'mismatched',
                            distance: verifyRes.data.distance,
                            threshold: verifyRes.data.threshold,
                            username: cleanUser
                          });
                        } else {
                          setFaceMatchInfo({
                            status: 'user_not_found',
                            username: cleanUser
                          });
                        }
                      }
                    })
                    .catch(() => {})
                    .finally(() => {
                      verifyInFlight = false;
                    });
                }
              }
            } else {
              setDetectedFaceBox(null);
              setFaceStatus('Wajah belum terdeteksi. Arahkan wajah ke tengah kamera.');
            }
          } else if (active && res === null) {
            setDetectedFaceBox(null);
            setFaceStatus('Wajah belum terdeteksi. Arahkan wajah ke tengah kamera.');
          }
        }
      } catch {
        // Abaikan error transien agar stream video tetap mulus
      }

      if (active && cameraActive) {
        timerId = setTimeout(unifiedBiometricLoop, 130);
      }
    }

    unifiedBiometricLoop();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [cameraActive]);

  useEffect(() => {
    let active = true;
    let timerId = null;
    const cleanUser = username.trim();

    async function checkDaemon() {
      if (!active) return;
      try {
        const query = cleanUser ? `?username=${encodeURIComponent(cleanUser)}` : '';
        const res = await fetch(`http://127.0.0.1:8787/api/status${query}`, {
          signal: AbortSignal.timeout(4500),
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            if (data.detected || data.dongleDetected || (data.dongles && data.dongles.length > 0)) {
              const selected = data.dongle || data.dongles?.[0] || null;
              setDaemonDongle(selected ? {
                ...selected,
                matchedForUser: Boolean(data.matchedForUser),
                totalCount: data.count || (data.dongles ? data.dongles.length : 1)
              } : null);
            } else {
              setDaemonDongle(null);
            }
          }
        } else if (active) {
          setDaemonDongle(null);
        }
      } catch {
        if (active) {
          setDaemonDongle(null);
        }
      }

      if (active) {
        timerId = setTimeout(checkDaemon, 1500);
      }
    }

    checkDaemon();
    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
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

  // Smart Auto-Start: nyalakan kamera saat user mengetik username (debounce 600ms)
  useEffect(() => {
    const clean = username.trim();
    if (clean.length < 3 || cameraActive || cameraStarting || manualStoppedRef.current) return;

    if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);

    autoStartTimeoutRef.current = setTimeout(() => {
      handleStartCamera();
    }, 600);

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

  async function getLoginFaceSamples() {
    if (!cameraActive || !videoRef.current) {
      throw new Error('Aktifkan kamera terlebih dahulu.');
    }

    setFaceStatus('Memvalidasi sampel biometrik wajah...');

    const samples = await captureFaceSamples(videoRef.current, (current, total) => {
      setFaceStatus(`Memverifikasi sampel wajah (${current}/${total})...`);
    });

    setFaceStatus('Sampel biometrik wajah tervalidasi.');

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

    setLoading(true);
    loadingRef.current = true;

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
          dongleId: daemonDongle?.id,
          username: username.trim()
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
      }, 400);

    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
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
    loadingRef.current = true;

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
          const folderName = usbSaveData.folder || 'KriptoInfoDongle';
          const driveLabel = usbSaveData.drive || '';
          usbMsg = `Kunci dongle langsung tersimpan di flashdisk (${driveLabel}${folderName}).`;
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
      loadingRef.current = false;
    }
  }

  function changeMode(nextMode) {
    closeCamera();
    setError('');
    setMessage('');
    setMode(nextMode);
  }

  // Penentuan status visual deteksi wajah yang beradaptasi dengan tema (Light Dossier / Dark Night Lamp)
  const proximity = detectedFaceBox?.proximity || null;
  const isFaceDetected = Boolean(detectedFaceBox);
  const isProximityOptimal = Boolean(proximity?.isOptimal);
  const isIdentityMismatch = mode === 'login' && faceMatchInfo.status === 'mismatched';
  const isIdentityMatched = mode === 'login' && faceMatchInfo.status === 'matched';

  // Skema warna kotak pelacak di atas video & banner status sesuai tema
  const getReticleTheme = () => {
    if (!isFaceDetected) {
      return {
        border: 'border-red-500/70',
        corner: 'border-red-500',
        glow: '',
        topBadgeBg: isDark ? 'bg-red-950/90 text-red-200 border-red-700' : 'bg-red-900/90 text-white border-red-950',
        bottomBadgeBg: 'bg-stone-950/85 text-stone-200 border-stone-700',
        statusLabel: 'BELUM TERDETEKSI'
      };
    }
    if (!isProximityOptimal) {
      return {
        border: 'border-amber-400/90',
        corner: 'border-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
        topBadgeBg: isDark ? 'bg-amber-950/95 text-amber-300 border-amber-500' : 'bg-amber-600/95 text-white border-amber-800',
        bottomBadgeBg: isDark ? 'bg-stone-950/90 text-amber-200 border-amber-700/70' : 'bg-amber-950/90 text-amber-100 border-amber-700',
        statusLabel: proximity?.status === 'too_far' ? 'KURANG DEKAT' : 'TERLALU DEKAT'
      };
    }
    if (isIdentityMismatch) {
      return {
        border: 'border-red-500/90',
        corner: 'border-red-500',
        glow: 'shadow-[0_0_18px_rgba(239,68,68,0.45)]',
        topBadgeBg: 'bg-red-900/95 text-white border-red-400',
        bottomBadgeBg: 'bg-red-950/90 text-red-200 border-red-700',
        statusLabel: 'WAJAH TIDAK COCOK'
      };
    }
    // Wajah Terdeteksi & Jarak Optimal -> Berubah sesuai tema (Meja Siang: Emerald-Sepia / Lampu Malam: Emerald-Amber Noir)
    return {
      border: isDark ? 'border-emerald-400/95' : 'border-emerald-500/95',
      corner: isDark ? 'border-amber-400' : 'border-emerald-300',
      glow: isDark
        ? 'shadow-[0_0_20px_rgba(16,185,129,0.45)]'
        : 'shadow-[0_0_18px_rgba(5,150,105,0.4)]',
      topBadgeBg: isDark
        ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400'
        : 'bg-emerald-800/95 text-amber-50 border-emerald-400',
      bottomBadgeBg: isDark
        ? 'bg-stone-950/90 text-amber-300 border-emerald-600/70'
        : 'bg-stone-900/90 text-emerald-200 border-emerald-500/70',
      statusLabel: isIdentityMatched ? `COCOK @${username.trim()}` : 'WAJAH TERDETEKSI'
    };
  };

  const reticleTheme = getReticleTheme();

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
              <span className="font-mono text-[9px] text-stone-900 dark:text-amber-300 font-bold tracking-widest uppercase">
                CASE {'//'} LIPUTAN-2026-X
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
              <div
                className={`polaroid-frame relative overflow-visible transition-all duration-300 ${
                  cameraActive && isFaceDetected && isProximityOptimal && !isIdentityMismatch
                    ? isDark
                      ? 'ring-2 ring-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                      : 'ring-2 ring-emerald-700/80 shadow-[0_0_20px_rgba(4,120,87,0.2)]'
                    : cameraActive && isFaceDetected && !isProximityOptimal
                      ? 'ring-2 ring-amber-500/80'
                      : ''
                }`}
              >
                {/* Real Red/Emerald 3D Push Pin pinned directly on Polaroid Corner */}
                <div
                  className={`absolute top-2 left-2 w-4 h-4 rounded-full shadow-md border z-30 flex items-center justify-center transition-colors duration-300 ${
                    cameraActive && isFaceDetected && isProximityOptimal && !isIdentityMismatch
                      ? 'bg-emerald-600 border-emerald-950'
                      : 'bg-red-600 border-red-950'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </div>

                {/* Top Status Pill inside Polaroid Header */}
                {cameraActive && (
                  <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-950/85 border border-stone-700 text-[9px] font-mono">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !isFaceDetected
                          ? 'bg-red-500 animate-ping'
                          : !isProximityOptimal
                            ? 'bg-amber-400 animate-pulse'
                            : isIdentityMismatch
                              ? 'bg-red-500'
                              : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span className="font-bold text-stone-100 tracking-wider">
                      {!isFaceDetected
                        ? 'MENCARI WAJAH...'
                        : !isProximityOptimal
                          ? `KURANG DEKAT (${proximity.proximityPct}%)`
                          : isIdentityMismatch
                            ? 'WAJAH TIDAK COCOK'
                            : 'TERDETEKSI & OPTIMAL'}
                    </span>
                  </div>
                )}

                <div className="relative aspect-[4/3] bg-stone-900 rounded overflow-hidden flex items-center justify-center">
                  {/* Video Kamera yang sudah di-MIRROR (scale-x-[-1]) */}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover scale-x-[-1] filter contrast-110 sepia-[0.12] transition-opacity duration-200 ${
                      cameraActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      {cameraStarting ? (
                        <div className="flex flex-col items-center gap-1.5 text-amber-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[10px] font-mono">Mengkalibrasi Biometrik...</span>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col items-center gap-1 cursor-pointer group"
                          onClick={() => {
                            manualStoppedRef.current = false;
                            handleStartCamera();
                          }}
                        >
                          <ScanFace className="w-7 h-7 text-stone-400 group-hover:text-amber-400 transition-colors" />
                          <span className="text-[10px] font-mono font-bold text-stone-200 group-hover:text-white">
                            POTRET SUBJEK (FACE ID)
                          </span>
                          <span className="text-[9px] font-mono text-stone-400">
                            Klik untuk aktifkan sensor (Mirror Aktif)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bingkai Panduan Tengah saat Kamera Aktif namun Wajah Belum Terdeteksi */}
                  {cameraActive && !isFaceDetected && (
                    <div className="absolute inset-5 border border-dashed border-red-500/60 rounded pointer-events-none flex flex-col items-center justify-center gap-1 bg-black/20">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 animate-ping" />
                      <span className="px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono font-bold text-red-300 tracking-wider">
                        POSISIKAN WAJAH DI SINI
                      </span>
                    </div>
                  )}

                  {/* KOTAK DETEKSI WAJAH REAL-TIME (Mengikuti posisi wajah yang di-mirror) */}
                  {cameraActive && detectedFaceBox && (
                    <div
                      style={{
                        left: `${detectedFaceBox.left}px`,
                        top: `${detectedFaceBox.top}px`,
                        width: `${detectedFaceBox.width}px`,
                        height: `${detectedFaceBox.height}px`
                      }}
                      className={`absolute pointer-events-none rounded-sm border-2 transition-all duration-100 ease-out ${reticleTheme.border} ${reticleTheme.glow}`}
                    >
                      {/* Siku-siku Sudut Taktis Detektif (Corner Brackets) */}
                      <div className={`absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-4 border-l-4 ${reticleTheme.corner}`} />
                      <div className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-4 border-r-4 ${reticleTheme.corner}`} />
                      <div className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-4 border-l-4 ${reticleTheme.corner}`} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-4 border-r-4 ${reticleTheme.corner}`} />

                      {/* Label HUD Atas pada Kotak Wajah: Status & Akurasi */}
                      <div
                        className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border shadow-sm ${reticleTheme.topBadgeBg}`}
                      >
                        {reticleTheme.statusLabel} &bull; {detectedFaceBox.score}%
                      </div>

                      {/* Label HUD Bawah pada Kotak Wajah: Angka Kedekatan & Estimasi Jarak */}
                      {proximity && (
                        <div
                          className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border shadow-sm ${reticleTheme.bottomBadgeBg}`}
                        >
                          DEKAT: {proximity.proximityPct}% (~{proximity.distanceCm}cm)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Panel Informasi & Angka Kedekatan Wajah di dalam Polaroid putih (selalu teks gelap ber-kontras tinggi) */}
                <div
                  className={`mt-2 p-2 rounded border transition-all duration-300 font-mono ${
                    !cameraActive
                      ? 'bg-stone-100 border-stone-400 text-stone-900'
                      : !isFaceDetected
                        ? 'bg-red-50 border-red-400 text-red-950'
                        : !isProximityOptimal
                          ? 'bg-amber-50 border-amber-500 text-amber-950'
                          : isIdentityMismatch
                            ? 'bg-red-100 border-red-600 text-red-950'
                            : 'bg-emerald-50 border-emerald-700 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!cameraActive ? (
                        <ScanFace className="w-3.5 h-3.5 text-stone-700 flex-shrink-0" />
                      ) : isFaceDetected && isProximityOptimal && !isIdentityMismatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            !isFaceDetected || isIdentityMismatch ? 'text-red-700' : 'text-amber-700'
                          }`}
                        />
                      )}
                      <span className="text-[10px] font-bold truncate">
                        {!cameraActive
                          ? 'KAMERA BELUM AKTIF'
                          : !isFaceDetected
                            ? 'WAJAH BELUM TERDETEKSI'
                            : proximity?.status === 'too_far'
                              ? `KURANG DEKAT (+${proximity.deficitPct}% LAGI)`
                              : proximity?.status === 'too_close'
                                ? 'WAJAH TERLALU DEKAT'
                                : isIdentityMismatch
                                  ? `TIDAK COCOK DENGAN @${username.trim()}`
                                  : isIdentityMatched
                                    ? `TERDETEKSI & COCOK (@${username.trim()})`
                                    : 'WAJAH TERDETEKSI & JARAK IDEAL'}
                      </span>
                    </div>

                    {/* Angka Persentase Kedekatan & Jarak */}
                    <span className="text-[10px] font-black flex-shrink-0">
                      {cameraActive && proximity
                        ? `${proximity.proximityPct}% (~${proximity.distanceCm}cm)`
                        : '0% (-- cm)'}
                    </span>
                  </div>

                  {/* Bar Indikator Angka Kedekatan Wajah (0% - 100%) */}
                  <div className="mt-1.5 w-full h-1.5 bg-stone-300 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${cameraActive && proximity ? Math.min(100, proximity.proximityPct) : 0}%`
                      }}
                      className={`h-full transition-all duration-150 rounded-full ${
                        !isFaceDetected
                          ? 'bg-red-600'
                          : !isProximityOptimal
                            ? 'bg-amber-600'
                            : isIdentityMismatch
                              ? 'bg-red-700'
                              : 'bg-emerald-700'
                      }`}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[8.5px] font-bold">
                    <span className="truncate">{faceStatus}</span>
                    {cameraActive && proximity && (
                      <span className="flex-shrink-0 ml-1">
                        {proximity.faceSizePx}px / min {proximity.minRequiredPx}px
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 px-1 flex items-center justify-between">
                  <div>
                    <p className="font-serif italic font-bold text-[11px] text-stone-900">
                      Subjek: @{username || 'Anonymous'}
                    </p>
                    <p className="text-[9px] font-mono font-bold text-stone-700">
                      Mirror Aktif {'//'} 128-D ResNet-34
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={
                      cameraActive
                        ? handleStopCamera
                        : () => {
                            manualStoppedRef.current = false;
                            handleStartCamera();
                          }
                    }
                    className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors ${
                      cameraActive
                        ? 'border-stone-400 text-stone-800 hover:bg-stone-200'
                        : 'border-red-700 bg-red-700 text-white hover:bg-red-800'
                    }`}
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
                  &bull; 3. Wajah Kedekatan &ge; 100% / &le; 60cm (Biometrik)
                </p>
              </div>
            </div>

            {/* RIGHT: Dossier Form & Dongle Hardware Verification (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              
              <div>
                <div className="flex border-b border-stone-400/50 dark:border-stone-700/80 mb-3 gap-2">
                  <button
                    type="button"
                    onClick={() => changeMode('login')}
                    className={`pb-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
                      mode === 'login'
                        ? 'border-red-700 text-red-700 dark:border-red-400 dark:text-red-400'
                        : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
                    }`}
                  >
                    AKSES BRANKAS
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode('enroll')}
                    className={`pb-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
                      mode === 'enroll'
                        ? 'border-red-700 text-red-700 dark:border-red-400 dark:text-red-400'
                        : 'border-transparent text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
                    }`}
                  >
                    PENDAFTARAN AGEN
                  </button>
                </div>

                {error && (
                  <div className="p-2.5 mb-3 bg-red-900/20 border-l-4 border-red-600 text-xs font-mono text-red-700 dark:text-red-300">
                    <strong>PERINGATAN:</strong> {error}
                  </div>
                )}

                {message && (
                  <div className="p-2.5 mb-3 bg-emerald-900/20 border-l-4 border-emerald-600 text-xs font-mono text-emerald-800 dark:text-emerald-300">
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
                        placeholder="Contoh: card_immortal_emperor_god"
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

                  {/* Indikator Status Sensor Wajah (Berubah warna mengikuti tema saat wajah terdeteksi optimal) */}
                  <div
                    className={`p-2.5 border-2 rounded text-xs font-mono flex items-center justify-between transition-all duration-300 ${
                      cameraActive && isFaceDetected && isProximityOptimal && !isIdentityMismatch
                        ? 'bg-emerald-900/10 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-500/80'
                        : cameraActive && isFaceDetected && !isProximityOptimal
                          ? 'bg-amber-900/10 dark:bg-amber-950/40 border-amber-600 dark:border-amber-500/80'
                          : 'bg-[#e4dac4] dark:bg-[#25211d] border-stone-400 dark:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ScanFace
                        className={`w-4 h-4 flex-shrink-0 ${
                          cameraActive && isFaceDetected && isProximityOptimal && !isIdentityMismatch
                            ? 'text-emerald-900 dark:text-emerald-400'
                            : cameraActive && isFaceDetected && !isProximityOptimal
                              ? 'text-amber-800 dark:text-amber-400'
                              : 'text-stone-700 dark:text-stone-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-[10px] text-stone-900 dark:text-amber-100 block truncate">
                          {cameraActive && isFaceDetected && isProximityOptimal && !isIdentityMismatch
                            ? 'BIOMETRIK WAJAH TERDETEKSI & SIAP'
                            : cameraActive && isFaceDetected && !isProximityOptimal
                              ? `WAJAH KURANG DEKAT (${proximity.proximityPct}% DARI 100%)`
                              : 'STATUS SENSOR // DETEKSI WAJAH'}
                        </span>
                        <span className="text-[10px] text-stone-700 dark:text-stone-300 font-medium block truncate">
                          {!cameraActive
                            ? 'Kamera belum aktif — klik Aktifkan pada bingkai Polaroid'
                            : !isFaceDetected
                              ? 'Belum ada wajah terdeteksi di depan kamera'
                              : !isProximityOptimal
                                ? `Jarak ~${proximity.distanceCm} cm (Majukan wajah hingga ≤ ${proximity.targetMaxCm} cm)`
                                : isIdentityMismatch
                                  ? `Wajah tidak cocok dengan akun @${username.trim()}`
                                  : `Kedekatan ${proximity.proximityPct}% (~${proximity.distanceCm} cm) • Akurasi ${detectedFaceBox.score}%`}
                        </span>
                      </div>
                    </div>
                    {cameraActive && isFaceDetected && (
                      <span
                        className={`rubber-stamp text-[9px] font-black flex-shrink-0 ml-2 ${
                          isProximityOptimal && !isIdentityMismatch
                            ? 'text-emerald-900 dark:text-emerald-400 border-emerald-900 dark:border-emerald-400'
                            : !isProximityOptimal
                              ? 'text-amber-900 dark:text-amber-400 border-amber-800 dark:border-amber-400'
                              : 'text-red-800 dark:text-red-400 border-red-800 dark:border-red-400'
                        }`}
                      >
                        {isProximityOptimal && !isIdentityMismatch
                          ? isIdentityMatched
                            ? 'VERIFIED'
                            : 'DETECTED'
                          : `${proximity.proximityPct}%`}
                      </span>
                    )}
                  </div>

                  {/* Indikator Status Perangkat Keras USB Dongle */}
                  <div
                    className={`p-2.5 border-2 rounded text-xs font-mono flex items-center justify-between transition-all duration-300 ${
                      daemonDongle
                        ? 'bg-emerald-900/10 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-500/80'
                        : 'bg-[#e4dac4] dark:bg-[#25211d] border-stone-400 dark:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Usb
                        className={`w-4 h-4 flex-shrink-0 ${
                          daemonDongle ? 'text-emerald-900 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-[10px] text-stone-900 dark:text-amber-100 block truncate">
                          {daemonDongle
                            ? username.trim() && daemonDongle.matchedForUser
                              ? 'DRIVE USB TERDETEKSI & SIAP'
                              : 'DRIVE USB TERDETEKSI'
                            : 'STATUS PERANGKAT KERAS // USB DONGLE'}
                        </span>
                        <span className="text-[10px] text-stone-700 dark:text-stone-300 font-medium block truncate">
                          {daemonDongle
                            ? `Drive: ${daemonDongle.driveLetter || daemonDongle.drive || 'USB'} • ${daemonDongle.fileName || 'Ed25519 Ready'}`
                            : 'Colokkan flashdisk berisi file kunci dongle'}
                        </span>
                      </div>
                    </div>
                    {daemonDongle && (
                      <span className="rubber-stamp text-[9px] text-emerald-900 dark:text-emerald-400 border-emerald-900 dark:border-emerald-400 font-black flex-shrink-0 ml-2">
                        {username.trim() && daemonDongle.matchedForUser ? 'MATCHED' : 'DETECTED'}
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
              <div className="pt-2.5 border-t border-stone-400/40 dark:border-stone-700 flex items-center justify-between text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
                <span>WARANT: INVESTIGATION ARCHIVE</span>
                <span>PROTECTED BY ED25519 & CHACHA20</span>
              </div>
            </div>

          </div>

        </div>

        <div className="mt-2 text-center">
          <p className="text-[10px] font-mono text-stone-900 dark:text-stone-300 font-bold tracking-wider uppercase">
            Pikatan v1.0 &middot; Pengamanan Data Liputan &middot; UPN &quot;Veteran&quot; Yogyakarta &middot; Berkas Rahasia
          </p>
        </div>

      </div>
    </div>
  );
}
