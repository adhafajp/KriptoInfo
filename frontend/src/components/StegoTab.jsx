import React, { useState } from 'react';
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('embed')}
          className={`px-4 py-2 rounded ${mode === 'embed' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300'}`}
        >
          Sisipkan Pesan
        </button>
        <button
          onClick={() => setMode('extract')}
          className={`px-4 py-2 rounded ${mode === 'extract' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300'}`}
        >
          Ekstrak Pesan
        </button>
      </div>

      <div>
        <label className="block text-sm text-dark-300 mb-1">Upload File PNG</label>
        <input
          type="file"
          accept="image/png"
          onChange={handleFileChange}
          className="block w-full text-sm text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-700"
        />
      </div>

      {mode === 'embed' && (
        <div>
          <label className="block text-sm text-dark-300 mb-1">Pesan Rahasia</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
            rows={3}
            placeholder="Masukkan pesan yang akan disembunyikan dalam gambar..."
          />
        </div>
      )}

      <button
        onClick={mode === 'embed' ? handleEmbed : handleExtract}
        disabled={loading}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded"
      >
        {loading ? 'Memproses...' : mode === 'embed' ? 'Sisipkan Pesan ke Gambar' : 'Ekstrak Pesan dari Gambar'}
      </button>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
          {error}
        </div>
      )}

      {result && mode === 'embed' && (
        <div className="p-4 bg-dark-800 border border-dark-700 rounded">
          <h3 className="text-primary-400 font-semibold mb-2">Berhasil!</h3>
          <p className="text-sm text-dark-300 mb-3">
            Pesan berhasil disembunyikan. Download gambar di bawah:
          </p>
          <a
            href={result.imageUrl}
            download={result.filename || 'stego-output.png'}
            className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Download Gambar Stego
          </a>
        </div>
      )}

      {result && mode === 'extract' && (
        <div className="p-4 bg-dark-800 border border-dark-700 rounded">
          <h3 className="text-primary-400 font-semibold mb-2">Pesan Ditemukan:</h3>
          <div className="px-3 py-2 bg-dark-900 text-green-300 rounded border border-dark-700">
            {result.text || result.message || '(tidak ada pesan tersembunyi)'}
          </div>
        </div>
      )}
    </div>
  );
}
