import React, { useState } from 'react';
import { cryptoApi } from '../services/api';

export default function MessageTab() {
  const [mode, setMode] = useState('encrypt');
  const [text, setText] = useState('');
  const [vigenereKey, setVigenereKey] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError('Payload dan kunci Vigenere wajib diisi');
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setError('Payload harus berupa JSON valid');
      return;
    }
    setLoading(true);
    const res = await cryptoApi.decryptMessage(payload, vigenereKey);
    setLoading(false);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.message || 'Dekripsi gagal');
    }
  }

  const [copied, setCopied] = useState(false);

  function copyToClipboard(content) {
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Enkripsi Pesan Multi-Lapis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kombinasi klasik Vigenère Cipher dengan penguncian simetris modern AES-256-GCM.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex p-1 bg-[#0a0f1d] border border-white/[0.08] rounded-xl gap-1 self-start sm:self-auto">
          <button
            onClick={() => { setMode('encrypt'); setResult(null); setError(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'encrypt'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔒 Enkripsi
          </button>
          <button
            onClick={() => { setMode('decrypt'); setResult(null); setError(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'decrypt'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔓 Dekripsi
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            {mode === 'encrypt' ? 'Plaintext (Teks Asli)' : 'Ciphertext Envelope (JSON Payload)'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3.5 py-3 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm transition-all placeholder:text-slate-600 font-mono"
            rows={mode === 'encrypt' ? 4 : 5}
            placeholder={mode === 'encrypt' ? 'Tulis pesan rahasia yang ingin dilindungi...' : 'Paste JSON envelope hasil enkripsi...'}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Kunci Vigenère (Secret Passphrase)</span>
            <span className="text-[11px] text-slate-500">Hanya karakter alfabet A-Z</span>
          </label>
          <input
            type="text"
            value={vigenereKey}
            onChange={(e) => setVigenereKey(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none text-sm font-mono tracking-wider placeholder:text-slate-600"
            placeholder="Contoh: RAHASIAPENTING"
          />
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⚡</span>
              <span>Memproses Algoritma...</span>
            </>
          ) : mode === 'encrypt' ? (
            <>
              <span>Kunci & Enkripsi Pesan</span>
            </>
          ) : (
            <>
              <span>Buka & Dekripsi Pesan</span>
            </>
          )}
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Output Results */}
      {result && (
        <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                {mode === 'encrypt' ? 'Ciphertext Payload Siap Dikirim' : 'Pesan Asli Berhasil Didekripsi'}
              </h3>
            </div>

            <button
              onClick={() => copyToClipboard(mode === 'encrypt' ? result.payload : result.text)}
              className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5"
            >
              <span>{copied ? '✓ Tersalin' : 'Salin'}</span>
            </button>
          </div>

          {mode === 'encrypt' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/20 font-mono">
                  {result.algorithm}
                </span>
                <span className="text-[11px] text-slate-500">Payload Envelope</span>
              </div>
              <textarea
                readOnly
                value={JSON.stringify(result.payload, null, 2)}
                className="w-full px-3.5 py-3 bg-black/60 text-emerald-400 rounded-xl border border-white/5 font-mono text-xs focus:outline-none"
                rows={8}
              />
            </div>
          ) : (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {result.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
