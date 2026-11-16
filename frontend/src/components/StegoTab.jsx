import React, { useState, useEffect } from 'react';
import { stegoApi } from '../services/api';
import {
  Image, Upload, Download, Eye, AlertCircle, Loader2,
  ImagePlus, Search, CheckCircle2, Layers, Copy
} from 'lucide-react';

const STEGO_PIPELINE = [
  'Vigenère Substitution',
  'HKDF-SHA512',
  'SHAKE-256 Stream',
  'AES-256-GCM + LSB PNG'
];

export default function StegoTab() {
  const [mode, setMode] = useState('embed');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageDims, setImageDims] = useState(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (result?.imageUrl) URL.revokeObjectURL(result.imageUrl);
    };
  }, [result]);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== 'image/png') {
      setError('Hanya file gambar berformat PNG yang didukung untuk LSB Steganografi.');
      setFile(null);
      setPreviewUrl('');
      setImageDims(null);
      return;
    }

    const nextUrl = URL.createObjectURL(selected);
    const img = new window.Image();
    img.onload = () => {
      const totalPixels = img.width * img.height;
      // Overhead JSON v2 + 4B header sekitar ~105 bytes -> sisanya kapasitas pesan bersih
      const maxPayloadBytes = Math.max(0, Math.floor(totalPixels / 8) - 4);
      const safeMessageBytes = Math.max(0, maxPayloadBytes - 95);
      setImageDims({
        width: img.width,
        height: img.height,
        totalPixels,
        maxPayloadBytes,
        safeMessageBytes
      });
    };
    img.src = nextUrl;

    setFile(selected);
    setPreviewUrl(nextUrl);
    setResult(null);
    setError('');
  }

  async function handleEmbed() {
    if (!file || !message.trim()) {
      setError('File PNG dan pesan rahasia wajib diisi');
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

  function handleCopyExtracted() {
    const val = result?.text || result?.message || '';
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const msgBytes = new TextEncoder().encode(message).length;
  const capacityPct = imageDims?.safeMessageBytes > 0
    ? Math.min(100, Math.round((msgBytes / imageDims.safeMessageBytes) * 100))
    : 0;

  return (
    <div className="space-y-5">

      {/* Dossier Fragment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 dark:border-stone-700/80 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
              STEGO // 03
            </span>
            <span className="text-[11px] font-mono text-stone-700 dark:text-amber-300/90 font-bold uppercase tracking-wider">
              4-LAYER STEGANOGRAPHY &bull; PNG LSB RED-CHANNEL
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight mt-1">
            Penyisipan Rahasia Citra PNG (Steganografi)
          </h2>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-0.5 dossier-panel rounded self-start sm:self-auto">
          <button
            onClick={() => { setMode('embed'); setResult(null); setError(''); }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'embed'
                ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <ImagePlus className="w-3.5 h-3.5 text-red-500 dark:text-current" />
            <span>Sisipkan Pesan</span>
          </button>
          <button
            onClick={() => { setMode('extract'); setResult(null); setError(''); }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              mode === 'extract'
                ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-red-500 dark:text-current" />
            <span>Ekstrak Pesan</span>
          </button>
        </div>
      </div>

      {/* 4-Layer Pipeline Bar */}
      <div className="dossier-panel rounded px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-amber-400">
          <Layers className="w-3.5 h-3.5" />
          <span>PROTEKSI 4 LAPIS CITRA:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STEGO_PIPELINE.map(step => (
            <span
              key={step}
              className="px-2 py-0.5 rounded dossier-surface font-bold text-stone-800 dark:text-amber-100"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Input Panel */}
        <div className="p-4 rounded dossier-panel space-y-4 shadow-sm">
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1.5">
              UPLOAD GAMBAR PEMBAWA (FORMAT PNG LOSSLESS)
            </label>
            <div className="border-2 border-dashed border-stone-400 dark:border-stone-600 rounded p-4 text-center cursor-pointer transition-colors relative dossier-surface hover:border-red-700">
              <input
                type="file"
                accept="image/png"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {previewUrl ? (
                <div className="flex items-center gap-3 text-left">
                  <img
                    src={previewUrl}
                    alt="Pratinjau PNG"
                    className="w-16 h-16 object-cover rounded border border-stone-400 dark:border-stone-600 flex-shrink-0 bg-stone-900"
                  />
                  <div className="min-w-0 flex-1 font-mono">
                    <p className="text-xs font-bold truncate">{file?.name}</p>
                    <p className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">
                      {(file.size / 1024).toFixed(1)} KB
                      {imageDims ? ` • ${imageDims.width} × ${imageDims.height} px` : ''}
                    </p>
                    {imageDims && (
                      <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">
                        Kapasitas LSB bersih: ~{imageDims.safeMessageBytes.toLocaleString('id-ID')} byte
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <Upload className="w-6 h-6 text-red-700 dark:text-amber-400" />
                  <p className="text-xs font-mono font-bold">Klik atau seret berkas PNG ke sini</p>
                  <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300">
                    Maksimal 8 MB &bull; Tanpa kompresi JPEG agar bit LSB tidak rusak
                  </p>
                </div>
              )}
            </div>
          </div>

          {mode === 'embed' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-amber-200">
                  PESAN RAHASIA YANG DISISIPKAN
                </label>
                <span className="text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
                  {msgBytes} byte {imageDims ? `(${capacityPct}% kapasitas)` : ''}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2.5 dossier-input rounded text-xs font-mono transition-colors leading-relaxed"
                rows={4}
                placeholder="Masukkan pesan investigasi atau koordinat rahasia yang akan disisipkan ke piksel PNG..."
              />
              {imageDims && (
                <div className="w-full h-1.5 bg-stone-300 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${capacityPct}%` }}
                    className={`h-full transition-all duration-150 rounded-full ${
                      capacityPct > 90 ? 'bg-red-600' : 'bg-emerald-600 dark:bg-emerald-400'
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          <button
            onClick={mode === 'embed' ? handleEmbed : handleExtract}
            disabled={loading}
            className="w-full py-2.5 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses 4-Layer Stego...</span>
              </>
            ) : mode === 'embed' ? (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Enkripsi &amp; Sisipkan ke PNG</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Ekstrak &amp; Dekripsi Pesan</span>
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="p-4 rounded dossier-panel flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-amber-200">
                OUTPUT // HASIL PEMROSESAN STEGO
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

            {result && mode === 'embed' && (
              <div className="dossier-surface rounded p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    Pesan berhasil dienkripsi 4 lapis &amp; disisipkan!
                  </span>
                </div>
                {result.imageUrl && (
                  <div className="flex justify-center p-2 rounded bg-stone-950/10 dark:bg-black/40 border border-stone-300 dark:border-stone-800">
                    <img
                      src={result.imageUrl}
                      alt="Hasil Steganografi PNG"
                      className="max-h-40 rounded object-contain"
                    />
                  </div>
                )}
                <p className="text-[11px] font-mono text-stone-800 dark:text-stone-200">
                  Payload diamankan dengan Vigenère + HKDF-SHA512 + SHAKE-256 + AES-256-GCM sebelum ditulis ke LSB kanal merah. Secara visual gambar identik.
                </p>
                <a
                  href={result.imageUrl}
                  download={result.filename || 'kryptoinfo-stego.png'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-amber-50 rounded text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar Stego PNG</span>
                </a>
              </div>
            )}

            {result && mode === 'extract' && (
              <div className="dossier-surface rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-300 dark:border-stone-700 bg-stone-200/60 dark:bg-stone-900/80">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-[11px] font-mono font-bold">Pesan Rahasia Ditemukan</span>
                  </div>
                  <button
                    onClick={handleCopyExtracted}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-stone-300 dark:bg-stone-800 hover:bg-stone-400 dark:hover:bg-stone-700 text-stone-900 dark:text-amber-100"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="dossier-input p-3 rounded text-xs font-mono font-bold whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                    {result.text || result.message || '(tidak ada pesan tersembunyi)'}
                  </div>
                  {result.sha256 && (
                    <div className="text-[9.5px] font-mono text-stone-800 dark:text-stone-200 break-all">
                      <span className="font-bold">SHA-256 Pesan: </span>
                      <span>{result.sha256}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!result && !error && (
              <div className="h-56 dossier-surface border border-dashed border-stone-400 dark:border-stone-700 rounded flex flex-col items-center justify-center text-stone-800 dark:text-stone-200 gap-1.5 p-4 text-center">
                <Image className="w-7 h-7 text-stone-600 dark:text-stone-300" />
                <span className="text-xs font-mono font-bold">
                  {mode === 'embed' ? 'Hasil citra stego akan tampil di sini' : 'Pesan terdekripsi akan tampil di sini'}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2.5 mt-3 border-t border-stone-400/40 dark:border-stone-700 flex items-center justify-between text-[10px] font-mono font-bold text-stone-800 dark:text-stone-200">
            <span>LOSSLESS LSB-1 CHANNEL</span>
            <span>4-LAYER AEAD PROTECTED</span>
          </div>
        </div>

      </div>
    </div>
  );
}
