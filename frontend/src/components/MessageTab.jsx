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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('encrypt')}
          className={`px-4 py-2 rounded ${mode === 'encrypt' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300'}`}
        >
          Enkripsi
        </button>
        <button
          onClick={() => setMode('decrypt')}
          className={`px-4 py-2 rounded ${mode === 'decrypt' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300'}`}
        >
          Dekripsi
        </button>
      </div>

      <div>
        <label className="block text-sm text-dark-300 mb-1">
          {mode === 'encrypt' ? 'Teks Asli' : 'Payload JSON'}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
          rows={mode === 'encrypt' ? 4 : 6}
          placeholder={mode === 'encrypt' ? 'Masukkan teks yang ingin dienkripsi...' : 'Paste JSON payload hasil enkripsi...'}
        />
      </div>

      <div>
        <label className="block text-sm text-dark-300 mb-1">Kunci Vigenere</label>
        <input
          type="text"
          value={vigenereKey}
          onChange={(e) => setVigenereKey(e.target.value)}
          className="w-full px-3 py-2 bg-dark-800 text-white rounded border border-dark-700 focus:border-primary-500 focus:outline-none"
          placeholder="Contoh: RAHASIATOP"
        />
      </div>

      <button
        onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
        disabled={loading}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white rounded"
      >
        {loading ? 'Memproses...' : mode === 'encrypt' ? 'Enkripsi Pesan' : 'Dekripsi Pesan'}
      </button>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-dark-800 border border-dark-700 rounded">
          <h3 className="text-primary-400 font-semibold mb-2">Hasil:</h3>
          {mode === 'encrypt' ? (
            <>
              <p className="text-xs text-dark-400 mb-1">Algoritma: {result.algorithm}</p>
              <textarea
                readOnly
                value={JSON.stringify(result.payload, null, 2)}
                className="w-full px-3 py-2 bg-dark-900 text-green-300 rounded border border-dark-700 font-mono text-xs"
                rows={8}
              />
            </>
          ) : (
            <div className="px-3 py-2 bg-dark-900 text-green-300 rounded border border-dark-700">
              {result.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
