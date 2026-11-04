import React, { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';

import { generateDongleKeyPair } from '../utils/cryptoHelper';

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

  // Deteksi otomatis USB Agent Daemon lokal di port 8787
  useEffect(() => {
    let active = true;
    async function checkDaemon() {
      try {
        const res = await fetch('http://127.0.0.1:8787/api/status', {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setDaemonOnline(true);
            const foundDongle = data.dongleDetected ? data : (data.detected && data.dongles?.[0]);
            if (foundDongle) {
              setDaemonDongle(foundDongle);
            } else {
              setDaemonDongle(null);
            }
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
    const interval = setInterval(checkDaemon, 2500);
    return () => {
      active = false;
      clearInterval(interval);
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

  // Proses login: wajah + dongle + password.
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
      // Faktor 1: ambil descriptor wajah dari kamera.
      const faceDescriptor = await getCurrentFaceDescriptor();

      // Faktor 2: minta challenge dari backend.
      const challengeRes = await authApi.challenge(username.trim());

      if (!challengeRes.success) {
        throw new Error(
          challengeRes.message || 'Gagal meminta challenge.'
        );
      }

      const { challengeId, challenge } = challengeRes.data;

      // Faktor 3: tanda tangani challenge via USB Agent daemon lokal.
      const signRes = await fetch('http://127.0.0.1:8787/api/sign-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeText: challenge,
          dongleId: daemonDongle.id
        })
      });
      const signData = await signRes.json();
      if (!signData.success || !signData.signature) {
        throw new Error(signData.message || 'Gagal menandatangani challenge dari USB Agent.');
      }
      const signature = signData.signature;

      // Kirim ketiga faktor ke backend.
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
        'Enrollment berhasil! Simpan file dongle yang terunduh ke flashdisk. Aktifkan kembali kamera untuk login.'
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
                  USB Dongle (Faktor Kriptografi Ed25519)
                </label>

                {daemonDongle ? (
                  <div className="p-3 bg-green-950/40 border border-green-700 rounded text-xs space-y-1">
                    <div className="flex items-center gap-2 text-green-300 font-semibold">
                      <span>✓</span>
                      <span>USB Dongle Terdeteksi Otomatis</span>
                    </div>
                    <p className="text-dark-300 font-mono truncate">
                      File: {daemonDongle.fileName}
                    </p>
                    <p className="text-dark-400 text-[11px] truncate">
                      Lokasi: {daemonDongle.filePath || daemonDongle.drive}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-950/40 border border-yellow-700/60 rounded text-xs space-y-1">
                    <div className="flex items-center gap-2 text-yellow-300 font-semibold">
                      <span className="animate-pulse">●</span>
                      <span>Menunggu USB Dongle...</span>
                    </div>
                    <p className="text-dark-300 text-[11px]">
                      {daemonOnline
                        ? 'Colokkan flashdisk berisi file kunci dongle (.json).'
                        : 'USB Agent belum aktif di background (jalankan `node usb-agent/src/server.js`).'}
                    </p>
                  </div>
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
