import React, { useState } from 'react';
import { stegoApi } from '../services/api';
import {
  Image, Upload, Download, Eye, AlertCircle, Loader2, ImagePlus, Search
} from 'lucide-react';

export default function StegoTab() {
  const [mode, setMode] = useState('embed');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'image/png') { setError('Hanya file PNG yang didukung'); setFile(null); return; }
    setFile(selected); setError('');
  }

  async function handleEmbed() {
    if (!file || !message.trim()) { setError('File PNG dan pesan wajib diisi'); return; }
    setError(''); setResult(null);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('message', message);
    setLoading(true);
    const res = await stegoApi.embed(formData);
    setLoading(false);
    if (res.success) { setResult(res.data); } else { setError(res.message || 'Embed gagal'); }
  }

  async function handleExtract() {
    if (!file) { setError('File PNG wajib diisi'); return; }
    setError(''); setResult(null);
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    const res = await stegoApi.extract(formData);
    setLoading(false);
    if (res.success) { setResult(res.data); } else { setError(res.message || 'Ekstrak gagal'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-vault-500/10 border border-vault-600/20 flex items-center justify-center">
          <Image className="w-5 h-5 text-vault-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Steganografi Gambar</h2>
          <p className="text-xs text-dark-400">Sembunyikan pesan dalam gambar PNG dengan LSB + AES-GCM</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-dark-900/60 rounded-xl w-fit">
        <button onClick={() => setMode('embed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${mode === 'embed' ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30' : 'text-dark-400 hover:text-dark-200 border border-transparent'}`}>
          <ImagePlus className="w-4 h-4" />Sisipkan Pesan
        </button>
        <button onClick={() => setMode('extract')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${mode === 'extract' ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30' : 'text-dark-400 hover:text-dark-200 border border-transparent'}`}>
          <Search className="w-4 h-4" />Ekstrak Pesan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Upload Gambar PNG</label>
            <div className="relative">
              <input type="file" accept="image/png" onChange={handleFileChange}
                className="block w-full text-sm text-dark-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-vault-600 file:text-white file:font-medium file:text-sm hover:file:bg-vault-500 file:cursor-pointer cursor-pointer" />
            </div>
            {file && <p className="text-xs text-dark-500 mt-1">File: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>

          {mode === 'embed' && (
            <div>
              <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Pesan Rahasia</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-900/60 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                rows={4} placeholder="Masukkan pesan yang akan disembunyikan dalam gambar..." />
            </div>
          )}

          <button onClick={mode === 'embed' ? handleEmbed : handleExtract} disabled={loading}
            className="w-full py-3 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Memproses...</>) : mode === 'embed' ? (<><Upload className="w-4 h-4" />Sisipkan Pesan ke Gambar</>) : (<><Search className="w-4 h-4" />Ekstrak Pesan dari Gambar</>)}
          </button>
        </div>

        <div>
          <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Hasil</label>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {result && mode === 'embed' && (
            <div className="bg-dark-900/60 border border-dark-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-vault-400" />
                <span className="text-sm text-vault-400 font-medium">Pesan berhasil disisipkan!</span>
              </div>
              <p className="text-xs text-dark-400">Pesan dienkripsi AES-GCM lalu disisipkan ke bit LSB piksel gambar. Secara visual gambar tidak berubah.</p>
              <a href={result.imageUrl} download={result.filename || 'stego-output.png'}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-vault-600 hover:bg-vault-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-vault-600/20">
                <Download className="w-4 h-4" />Download Gambar Stego
              </a>
            </div>
          )}

          {result && mode === 'extract' && (
            <div className="bg-dark-900/60 border border-dark-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-vault-400" />
                <span className="text-sm text-vault-400 font-medium">Pesan Ditemukan</span>
              </div>
              <div className="px-3 py-3 bg-vault-950/30 border border-vault-700/30 rounded-xl text-vault-300 text-sm">
                {result.text || result.message || '(tidak ada pesan tersembunyi)'}
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="h-full min-h-[200px] bg-dark-900/30 border border-dashed border-dark-700/30 rounded-xl flex flex-col items-center justify-center text-dark-500 gap-2">
              <Image className="w-6 h-6 text-dark-600" />
              <span className="text-xs">Hasil akan muncul di sini</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
