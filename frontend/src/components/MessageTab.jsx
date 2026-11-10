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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vault-500/10 border border-vault-600/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-vault-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Pesan</h2>
            <p className="text-xs text-dark-400">Enkripsi teks berlapis: Vigenere + AES-256-GCM</p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-dark-900/60 rounded-xl w-fit">
        <button
          onClick={() => setMode('encrypt')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            mode === 'encrypt'
              ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30'
              : 'text-dark-400 hover:text-dark-200 border border-transparent'
          }`}
        >
          <Lock className="w-4 h-4" />
          Enkripsi
        </button>
        <button
          onClick={() => setMode('decrypt')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            mode === 'decrypt'
              ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30'
              : 'text-dark-400 hover:text-dark-200 border border-transparent'
          }`}
        >
          <Unlock className="w-4 h-4" />
          Dekripsi
        </button>
      </div>

      {/* Input & Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">
              {mode === 'encrypt' ? 'Teks Asli (Plaintext)' : 'Ciphertext (Teks Terenkripsi)'}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-900/60 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm font-mono"
              rows={mode === 'encrypt' ? 5 : 7}
              placeholder={mode === 'encrypt' ? 'Masukkan teks yang ingin dienkripsi...' : 'Paste ciphertext hasil enkripsi...'}
            />
          </div>

          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">
              Kunci Vigenere
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                value={vigenereKey}
                onChange={(e) => setVigenereKey(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-dark-900/60 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                placeholder="Contoh: RAHASIATOP"
              />
            </div>
          </div>

          <button
            onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
            disabled={loading}
            className="w-full py-3 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                {mode === 'encrypt' ? 'Enkripsi Pesan' : 'Dekripsi Pesan'}
              </>
            )}
          </button>
        </div>

        {/* Result */}
        <div>
          <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">
            Hasil
          </label>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {result ? (
            <div className="bg-dark-900/60 border border-dark-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vault-400" />
                  <span className="text-xs text-vault-400 font-medium">
                    {mode === 'encrypt' ? `Algoritma: ${result.algorithm}` : 'Dekripsi Berhasil'}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-dark-400 hover:text-vault-400 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Salin'}
                </button>
              </div>
              {mode === 'encrypt' ? (
                <textarea
                  readOnly
                  value={result.ciphertext || JSON.stringify(result.payload, null, 2)}
                  className="w-full px-3 py-2 bg-transparent text-vault-300 font-mono text-xs border-0 focus:outline-none resize-none break-all"
                  rows={8}
                />
              ) : (
                <div className="px-3 py-3 text-vault-300 text-sm">
                  {result.text}
                </div>
              )}
            </div>
          ) : !error && (
            <div className="h-full min-h-[200px] bg-dark-900/30 border border-dashed border-dark-700/30 rounded-xl flex flex-col items-center justify-center text-dark-500 gap-2">
              <ArrowRightLeft className="w-6 h-6 text-dark-600" />
              <span className="text-xs">Hasil akan muncul di sini</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
