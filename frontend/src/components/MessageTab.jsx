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
  ArrowRightLeft
} from 'lucide-react';

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

  return (
    <div className="space-y-6">

      {/* Editorial Fragment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rubber-stamp text-[10px] text-red-800 border-red-800 font-bold">
              FRG-MSG // 01
            </span>
            <span className="text-[11px] font-mono text-stone-700 font-bold uppercase tracking-wider">
              HYBRID-CIPHER (VIGENÈRE + AES-256-GCM)
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-stone-900 mt-1">
            Enkripsi Pesan & Catatan Sensitif
          </h2>
        </div>

        {/* Mode Toggle Button Group */}
        <div className="flex p-0.5 bg-stone-300/60 rounded border border-stone-400 self-start sm:self-auto">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'encrypt'
                ? 'bg-stone-900 text-amber-50 shadow-sm'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-red-700" />
            <span>Enkripsi</span>
          </button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'decrypt'
                ? 'bg-stone-900 text-amber-50 shadow-sm'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 text-red-700" />
            <span>Dekripsi</span>
          </button>
        </div>
      </div>

      {/* Input & Output Dossier Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Input Block */}
        <div className="p-4 rounded bg-[#e4dac4] border border-[#baa98f] space-y-3.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800">
                {mode === 'encrypt' ? 'INPUT // PLAINTEXT TEKS BERKAS' : 'INPUT // CIPHERTEXT BASE64'}
              </label>
              <span className="text-[10px] font-mono text-stone-600 font-bold">UTF-8</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 bg-stone-100/90 text-stone-900 rounded border border-stone-400 focus:border-red-800 focus:outline-none text-xs font-mono transition-colors"
              rows={mode === 'encrypt' ? 6 : 8}
              placeholder={mode === 'encrypt' ? 'Ketik catatan liputan atau pesan rahasia...' : 'Tempel ciphertext Base64 atau format JSON...'}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 mb-1">
              KUNCI VIGENÈRE (POLYALPHABETIC SEED)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600" />
              <input
                type="text"
                value={vigenereKey}
                onChange={(e) => setVigenereKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-100/90 text-stone-900 rounded border border-stone-400 focus:border-red-800 focus:outline-none text-xs font-mono tracking-wider transition-colors font-bold"
                placeholder="Contoh: LIPUTAN2026"
              />
            </div>
          </div>

          <button
            onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
            disabled={loading}
            className="w-full py-2 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Kriptografi...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{mode === 'encrypt' ? 'Jalankan Enkripsi' : 'Jalankan Dekripsi'}</span>
              </>
            )}
          </button>
        </div>

        {/* Result Block */}
        <div className="p-4 rounded bg-[#e4dac4] border border-[#baa98f] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800">
                OUTPUT // ARTIFAK TERLINDUNGI
              </span>
              {result && (
                <span className="text-[10px] font-mono text-emerald-900 font-bold">
                  STATUS: VERIFIED OK
                </span>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-red-900/10 border-l-4 border-red-800 rounded flex items-start gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-800 mt-0.5 flex-shrink-0" />
                <p className="text-red-900 text-xs font-mono font-bold">{error}</p>
              </div>
            )}

            {result ? (
              <div className="bg-stone-100/90 border border-stone-400 rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-300 bg-stone-200/50">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                    <span className="text-[11px] font-mono font-bold text-stone-800">
                      {mode === 'encrypt' ? result.algorithm : 'Plaintext Dipulihkan'}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-stone-300 hover:bg-stone-400 text-stone-900 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-800" />
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

                <div className="p-2.5">
                  {mode === 'encrypt' ? (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-mono font-bold text-stone-600 uppercase tracking-wider">
                        Ciphertext Base64 (IV 12B + Tag 16B + Ciphertext):
                      </p>
                      <pre className="text-xs font-mono font-bold text-stone-900 bg-white/70 p-2 rounded border border-stone-300 break-all whitespace-pre-wrap select-all max-h-52 overflow-y-auto">
                        {result.ciphertext || JSON.stringify(result.payload, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-mono font-bold text-stone-600 uppercase tracking-wider">
                        Isi Pesan Terdekripsi:
                      </p>
                      <div className="text-xs font-mono font-bold text-stone-900 bg-white/70 p-2 rounded border border-stone-300 whitespace-pre-wrap select-all">
                        {result.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-stone-400 rounded">
                <ShieldCheck className="w-6 h-6 text-stone-400 mb-1" />
                <p className="text-xs font-mono font-bold text-stone-600">Menunggu input untuk diproses</p>
              </div>
            )}
          </div>

          <div className="pt-2.5 mt-3 border-t border-stone-400/40 flex items-center justify-between text-[10px] font-mono font-bold text-stone-600">
            <span>PIKATAN SECURE CHANNEL</span>
            <span>END-TO-END VERIFIED</span>
          </div>
        </div>

      </div>
    </div>
  );
}
