import React, { useState, useEffect } from 'react';
import { blockchainApi } from '../services/api';

export default function BlockchainTab() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    setLoading(true);
    const res = await blockchainApi.list();
    setLoading(false);
    if (res.success) {
      setBlocks(res.data);
    } else {
      setError(res.message);
    }
  }

  async function handleAddBlock() {
    if (!dataInput.trim()) {
      setError('Data blok tidak boleh kosong');
      return;
    }
    setError('');
    setLoading(true);
    const res = await blockchainApi.add(dataInput);
    setLoading(false);

    if (res.success) {
      setDataInput('');
      loadBlocks();
    } else {
      setError(res.message);
    }
  }

  async function handleVerify() {
    setError('');
    setLoading(true);
    const res = await blockchainApi.verify();
    setLoading(false);
    if (res.success) {
      setVerification(res.data);
    } else {
      setError(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Immutable Ledger (Blockchain)</h2>
        <button
          onClick={handleVerify}
          disabled={loading}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded text-sm border border-dark-600"
        >
          Verifikasi Integritas Rantai
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
          {error}
        </div>
      )}

      {verification && (
        <div className={`p-4 rounded border ${(verification.valid ?? verification.isValid) ? 'bg-green-950/40 border-green-700 text-green-300' : 'bg-red-950/40 border-red-700 text-red-300'}`}>
          <h4 className="font-semibold mb-1">
            {(verification.valid ?? verification.isValid) ? '✓ Rantai Valid' : '✗ Rantai Tidak Valid / Dirusak'}
          </h4>
          <p className="text-xs">
            {verification.message || `Total blok diverifikasi: ${verification.totalBlocks || blocks.length}`}
          </p>
        </div>
      )}

      <div className="p-4 bg-dark-800 border border-dark-700 rounded space-y-3">
        <h3 className="font-semibold text-primary-400">Tambah Blok Baru</h3>
        <textarea
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          className="w-full px-3 py-2 bg-dark-900 text-white rounded border border-dark-700"
          rows={2}
          placeholder="Isi data atau payload transaksi untuk blok ini..."
        />
        <button
          onClick={handleAddBlock}
          disabled={loading}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
        >
          {loading ? 'Menambang...' : 'Tambah ke Rantai'}
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-dark-300">Daftar Blok ({blocks.length})</h3>
        {loading && !blocks.length && <p className="text-dark-400">Memuat...</p>}
        {blocks.map((b, idx) => (
          <div key={b.id || idx} className="p-4 bg-dark-800 border border-dark-700 rounded space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary-400">Blok #{b.blockIndex !== undefined ? b.blockIndex : (b.index ?? idx)}</span>
              <span className="text-xs text-dark-400">{new Date(b.timestamp || b.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <p className="text-xs text-dark-400">Asset / Metadata:</p>
              <p className="text-sm text-white font-mono bg-dark-900 p-2 rounded">{b.metadata || b.assetId || b.data}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-dark-400">Hash: </span>
                <span className="text-dark-300 truncate inline-block w-48 align-bottom">{b.currentHash || b.hash}</span>
              </div>
              <div>
                <span className="text-dark-400">Prev Hash: </span>
                <span className="text-dark-300 truncate inline-block w-48 align-bottom">{b.previousHash || '0'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
