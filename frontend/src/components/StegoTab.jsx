import { useState } from 'react';
import { stegoApi } from '../services/api';

export default function StegoTab() {
  const [mode, setMode] = useState('embed');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'image/png') {
      setError('Hanya file PNG yang didukung');
      setFile(null);
      return;
    }
    setFile(selected);
    setError('');
  }

  async function handleEmbed() {
    if (!file || !message.trim()) {
      setError('File PNG dan pesan wajib diisi');
      return;
    }
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('message', message);
    
    setLoading(true);
    const res = await stegoApi.embed(formData);
    setLoading(false);

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.message || 'Embed gagal');
    }
  }

  async function handleExtract() {
    if (!file) {
      setError('File PNG wajib diisi');
      return;
    }
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('image', file);

    setLoading(true);
    const res = await stegoApi.extract(formData);
    setLoading(false);

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.message || 'Ekstrak gagal');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Steganografi Gambar LSB</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sembunyikan pesan rahasia terenkripsi AES-256 ke dalam pixel Red kanal Least Significant Bit PNG.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex p-1 bg-[#0a0f1d] border border-white/[0.08] rounded-xl gap-1 self-start sm:self-auto">
          <button
            onClick={() => { setMode('embed'); setResult(null); setError(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'embed'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🖼️ Sisipkan (Embed)
          </button>
          <button
            onClick={() => { setMode('extract'); setResult(null); setError(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'extract'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔍 Ekstrak (Extract)
          </button>
        </div>
      </div>

      {/* File Upload Zone */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            File Cover / Stego Image (Format PNG Wajib)
          </label>
          <div className="p-6 rounded-2xl bg-[#0a0f1d] border-2 border-dashed border-white/10 hover:border-cyan-500/40 transition-all flex flex-col items-center justify-center text-center relative group">
            <input
              type="file"
              accept="image/png"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-cyan-300">{file.name}</p>
                <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • Klik untuk ganti file</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-slate-300">
                  Drag & drop gambar PNG di sini, atau <span className="text-cyan-400 underline">pilih file</span>
                </p>
                <p className="text-[11px] text-slate-500">Hanya format PNG lossless yang didukung</p>
              </div>
            )}
          </div>
        </div>

        {mode === 'embed' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pesan Rahasia yang Akan Disembunyikan
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#0a0f1d] text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm font-mono focus:outline-none"
              rows={3}
              placeholder="Ketik teks rahasia... (akan dienkripsi AES-256-GCM terlebih dahulu sebelum diinjeksi)"
            />
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          onClick={mode === 'embed' ? handleEmbed : handleExtract}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⚡</span>
              <span>Memproses Pixel LSB...</span>
            </>
          ) : mode === 'embed' ? (
            <>
              <span>Injeksi Pesan ke Gambar</span>
            </>
          ) : (
            <>
              <span>Ekstrak Pesan dari Gambar</span>
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

      {/* Success embed result */}
      {result && mode === 'embed' && (
        <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="text-lg">✓</span>
            <h3 className="font-bold text-sm text-slate-100">
              Pesan Berhasil Tersembunyi di Gambar PNG
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Struktur pixel PNG telah diubah secara visual tidak kasat mata. Silakan unduh gambar stego di bawah ini:
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt="Stego preview"
                className="w-20 h-20 object-cover rounded-xl border border-white/10 shadow-md"
              />
            )}
            <a
              href={result.imageUrl}
              download={result.filename || 'kryptoinfo-stego.png'}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <span>⬇</span>
              <span>Download Gambar Stego (.png)</span>
            </a>
          </div>
        </div>
      )}

      {/* Success extract result */}
      {result && mode === 'extract' && (
        <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Pesan Rahasia yang Terekstrak:
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
            {result.text || result.message || '(tidak ada pesan tersembunyi)'}
          </div>
        </div>
      )}
    </div>
  );
}
