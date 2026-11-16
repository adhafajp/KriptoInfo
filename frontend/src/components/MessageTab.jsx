import React, { useState } from 'react';
import { cryptoApi } from '../services/api';
import {
  Lock,
  Unlock,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRightLeft,
  Layers
} from 'lucide-react';

const CRYPTO_PIPELINE = [
  'Vigenère',
  'SHAKE-256',
  'HKDF-SHA512',
  'ChaCha20',
  'AES-GCM + HMAC'
];

export default function MessageTab() {
  const [mode, setMode] = useState('encrypt');
  const [text, setText] = useState('');
  const [vigenereKey, setVigenereKey] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleEncrypt() {
    setError('');
    setResult(null);
    if (!text.trim() || !vigenereKey.trim()) {
      setError('Teks dan kunci Vigenere wajib diisi');
      return;
    }
    setLoading(true);
    const res = await cryptoApi.encryptMessage(text, vigenereKey);
    setLoading(false);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.message || 'Enkripsi gagal');
    }
  }

  async function handleDecrypt() {
    setError('');
    setResult(null);
    if (!text.trim() || !vigenereKey.trim()) {
      setError('Ciphertext dan kunci Vigenere wajib diisi');
      return;
    }
    setLoading(true);
    const res = await cryptoApi.decryptMessage(text.trim(), vigenereKey);
    setLoading(false);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.message || 'Dekripsi gagal');
    }
  }

  function handleCopy() {
    const textToCopy = mode === 'encrypt'
      ? (result.ciphertext || JSON.stringify(result.payload, null, 2))
      : result.text;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputBytes = new TextEncoder().encode(text).length;

  return (
    <div className="space-y-5">

      {/* Editorial Fragment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 dark:border-stone-700/80 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
              FRG-MSG // 01
            </span>
            <span className="text-[11px] font-mono text-stone-700 dark:text-amber-300/90 font-bold uppercase tracking-wider">
              5-LAYER HYBRID CIPHER &bull; AUTHENTICATED AEAD
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight mt-1">
            Enkripsi Pesan &amp; Catatan Sensitif
          </h2>
        </div>

        {/* Mode Toggle Button Group */}
        <div className="flex p-0.5 dossier-panel rounded self-start sm:self-auto">
          <button
            onClick={() => { setMode('encrypt'); setResult(null); setError(''); }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'encrypt'
                ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-red-500 dark:text-current" />
            <span>Enkripsi</span>
          </button>
          <button
            onClick={() => { setMode('decrypt'); setResult(null); setError(''); }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'decrypt'
                ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 text-red-500 dark:text-current" />
            <span>Dekripsi</span>
          </button>
        </div>
      </div>

      {/* 5-Layer Cryptography Pipeline Bar */}
      <div className="dossier-panel rounded px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-amber-400">
          <Layers className="w-3.5 h-3.5" />
          <span>PIPELINE KRIPTOGRAFI 5 LAPIS:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CRYPTO_PIPELINE.map(step => (
            <span
              key={step}
              className="px-2 py-0.5 rounded dossier-surface font-bold text-stone-800 dark:text-amber-100"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Input & Output Dossier Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Input Block */}
        <div className="p-4 rounded dossier-panel space-y-3.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-amber-200">
                {mode === 'encrypt' ? 'INPUT // PLAINTEXT TEKS BERKAS' : 'INPUT // CIPHERTEXT BASE64 / JSON'}
              </label>
              <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-bold">
                {text.length} kar &bull; {inputBytes} B (UTF-8)
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2.5 dossier-input rounded text-xs font-mono transition-colors leading-relaxed"
              rows={mode === 'encrypt' ? 6 : 8}
              placeholder={mode === 'encrypt' ? 'Ketik catatan liputan atau pesan rahasia...' : 'Tempel ciphertext Base64 (KI5L...) atau format JSON...'}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1">
              KUNCI VIGENÈRE &amp; HKDF SEED (POLYALPHABETIC KEY)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600 dark:text-amber-400" />
              <input
                type="text"
                value={vigenereKey}
                onChange={(e) => setVigenereKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 dossier-input rounded text-xs font-mono tracking-wider transition-colors font-bold"
                placeholder="Contoh: LIPUTAN2026"
              />
            </div>
          </div>

          <button
            onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
            disabled={loading}
            className="w-full py-2.5 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses 5 Lapis Kriptografi...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{mode === 'encrypt' ? 'Jalankan Enkripsi 5-Lapis' : 'Jalankan Dekripsi 5-Lapis'}</span>
              </>
            )}
          </button>
        </div>

        {/* Result Block */}
        <div className="p-4 rounded dossier-panel flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-amber-200">
                OUTPUT // ARTIFAK TERLINDUNGI
              </span>
              {result && (
                <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-bold">
                  STATUS: VERIFIED OK
                </span>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-red-900/15 dark:bg-red-950/50 border-l-4 border-red-700 rounded flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-900 dark:text-red-200 text-xs font-mono font-bold">{error}</p>
              </div>
            )}

            {result ? (
              <div className="dossier-surface rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-300 dark:border-stone-700 bg-stone-200/60 dark:bg-stone-900/80 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px] font-mono font-bold truncate">
                      {mode === 'encrypt' ? result.algorithm : 'Plaintext Dipulihkan & Terverifikasi'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold rounded bg-stone-300 dark:bg-stone-800 hover:bg-stone-400 dark:hover:bg-stone-700 text-stone-900 dark:text-amber-100 transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 space-y-2.5">
                  {mode === 'encrypt' ? (
                    <div className="space-y-1.5">
                      <p className="text-[9.5px] font-mono font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Ciphertext Base64 (Magic + Salt + ChaCha20 + AES-GCM + HMAC-SHA512):
                      </p>
                      <pre className="text-xs font-mono font-bold dossier-input p-2.5 rounded break-all whitespace-pre-wrap select-all max-h-44 overflow-y-auto">
                        {result.ciphertext || JSON.stringify(result.payload, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[9.5px] font-mono font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                        Isi Pesan Terdekripsi:
                      </p>
                      <div className="text-xs font-mono font-bold dossier-input p-2.5 rounded whitespace-pre-wrap select-all max-h-44 overflow-y-auto">
                        {result.text}
                      </div>
                    </div>
                  )}

                  {result.digests && (
                    <div className="pt-2 border-t border-stone-300 dark:border-stone-800 space-y-1 text-[9.5px] font-mono">
                      <div className="flex justify-between gap-2">
                        <span className="text-stone-800 dark:text-stone-200 font-bold">SHA-256:</span>
                        <span className="truncate font-bold">{result.digests.sha256}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-stone-800 dark:text-stone-200 font-bold">SHA3-256:</span>
                        <span className="truncate font-bold">{result.digests.sha3_256}</span>
                      </div>
                      {result.digests.hmacSha512 && (
                        <div className="flex justify-between gap-2">
                          <span className="text-stone-800 dark:text-stone-200 font-bold">HMAC-SHA512:</span>
                          <span className="truncate font-bold text-emerald-800 dark:text-emerald-400">{result.digests.hmacSha512}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center p-4 border border-dashed border-stone-400 dark:border-stone-700 rounded dossier-surface">
                <ShieldCheck className="w-7 h-7 text-stone-600 dark:text-stone-300 mb-1.5" />
                <p className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                  Menunggu input untuk diproses melalui 5 lapisan kriptografi
                </p>
              </div>
            )}
          </div>

          <div className="pt-2.5 mt-3 border-t border-stone-400/40 dark:border-stone-700 flex items-center justify-between text-[10px] font-mono font-bold text-stone-800 dark:text-stone-200">
            <span>PIKATAN SECURE CHANNEL</span>
            <span>ENCRYPT-THEN-MAC VERIFIED</span>
          </div>
        </div>

      </div>
    </div>
  );
}
