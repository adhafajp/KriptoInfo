import React, { useState, useEffect } from 'react';
import { blockchainApi } from '../services/api';
import {
  Link2, Plus, ShieldCheck, ShieldAlert, AlertCircle, Loader2, Hash, Clock, ChevronDown,
  Upload, File, CheckCircle2
} from 'lucide-react';

export default function BlockchainTab() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addMode, setAddMode] = useState('text'); // 'text' | 'file'
  const [dataInput, setDataInput] = useState('');
  const [verification, setVerification] = useState(null);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [hashingFile, setHashingFile] = useState(false);

  useEffect(() => { loadBlocks(); }, []);

  async function loadBlocks() {
    setLoading(true);
    const res = await blockchainApi.list();
    setLoading(false);
    if (res.success) { setBlocks(res.data); } else { setError(res.message); }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setHashingFile(true);
    setError('');

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setFileHash(hashHex);
    } catch {
      setError('Gagal menghitung SHA-256 file.');
    } finally {
      setHashingFile(false);
    }
  }

  async function handleAddBlock() {
    if (addMode === 'file') {
      if (!selectedFile || !fileHash) {
        setError('Pilih berkas file terlebih dahulu.');
        return;
      }
      setError('');
      setLoading(true);
      const res = await blockchainApi.add({
        assetId: `file-${Date.now()}-${selectedFile.name.slice(0, 40)}`,
        assetHash: fileHash,
        metadata: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || 'unknown',
          recordedAt: new Date().toISOString()
        })
      });
      setLoading(false);
      if (res.success) {
        setSelectedFile(null);
        setFileHash('');
        loadBlocks();
      } else {
        setError(res.message);
      }
      return;
    }

    if (!dataInput.trim()) { setError('Data blok tidak boleh kosong'); return; }
    setError(''); setLoading(true);
    const res = await blockchainApi.add(dataInput);
    setLoading(false);
    if (res.success) { setDataInput(''); loadBlocks(); } else { setError(res.message); }
  }

  async function handleVerify() {
    setError(''); setLoading(true);
    const res = await blockchainApi.verify();
    setLoading(false);
    if (res.success) { setVerification(res.data); } else { setError(res.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vault-500/10 border border-vault-600/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-vault-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Immutable Ledger</h2>
            <p className="text-xs text-dark-400">Blockchain SHA-256 untuk integritas data</p>
          </div>
        </div>
        <button onClick={handleVerify} disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all bg-dark-800 hover:bg-dark-700 text-dark-300 border border-dark-700">
          <ShieldCheck className="w-4 h-4" />Verifikasi Rantai
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {verification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${(verification.valid ?? verification.isValid) ? 'bg-vault-950/40 border-vault-700/40' : 'bg-red-950/40 border-red-800/40'}`}>
          {(verification.valid ?? verification.isValid) ? (
            <ShieldCheck className="w-5 h-5 text-vault-400 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
          )}
          <div>
            <h4 className={`font-semibold text-sm ${(verification.valid ?? verification.isValid) ? 'text-vault-400' : 'text-red-400'}`}>
              {(verification.valid ?? verification.isValid) ? 'Rantai Valid' : 'Rantai Tidak Valid / Dirusak'}
            </h4>
            <p className="text-xs text-dark-400 mt-0.5">
              {verification.message || `Total blok diverifikasi: ${verification.totalBlocks || blocks.length}`}
            </p>
          </div>
        </div>
      )}

      <div className="p-5 bg-dark-900/60 border border-dark-700/50 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-vault-400" />
            <h3 className="font-semibold text-vault-400 text-sm">Tambah Blok Baru</h3>
          </div>
          <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800">
            <button
              type="button"
              onClick={() => setAddMode('text')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${addMode === 'text' ? 'bg-vault-600 text-white' : 'text-dark-400 hover:text-white'}`}
            >
              Teks / Catatan
            </button>
            <button
              type="button"
              onClick={() => setAddMode('file')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${addMode === 'file' ? 'bg-vault-600 text-white' : 'text-dark-400 hover:text-white'}`}
            >
              <Upload className="w-3 h-3" />
              Berkas / File (PDF, dll)
            </button>
          </div>
        </div>

        {addMode === 'text' ? (
          <textarea value={dataInput} onChange={(e) => setDataInput(e.target.value)}
            className="w-full px-3 py-2.5 bg-dark-900/80 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
            rows={2} placeholder="Masukkan data, catatan aset, atau transaksi..." />
        ) : (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-dark-700 hover:border-vault-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-dark-950/40">
              <input
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-vault-400" />
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                    <p className="text-xs text-dark-400">{(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Berkas'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-dark-300 font-medium">Klik atau seret file ke sini</p>
                    <p className="text-xs text-dark-500 mt-0.5">Sistem akan otomatis menghitung hash SHA-256 berkas</p>
                  </div>
                )}
              </div>
            </div>

            {hashingFile && (
              <div className="flex items-center gap-2 text-dark-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-vault-400" />
                <span>Menghitung sidik jari kriptografi (SHA-256)...</span>
              </div>
            )}

            {fileHash && (
              <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-vault-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hash Berkas SHA-256 Terkalkulasi:</span>
                </div>
                <p className="font-mono text-[11px] text-vault-300 break-all">{fileHash}</p>
              </div>
            )}
          </div>
        )}

        <button onClick={handleAddBlock} disabled={loading || hashingFile}
          className="w-full py-3 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menambang ke Blockchain...</>) : (<><Plus className="w-4 h-4" />Catat Integritas ke Blockchain</>)}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-400 uppercase tracking-wider font-medium">Rantai Blok</span>
          <span className="text-xs text-dark-500">{blocks.length} blok</span>
        </div>

        {loading && !blocks.length && (
          <div className="flex items-center gap-2 text-dark-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Memuat...</span>
          </div>
        )}

        {!loading && !blocks.length && (
          <div className="py-12 flex flex-col items-center justify-center text-dark-500 gap-2 bg-dark-900/30 rounded-xl border border-dashed border-dark-700/30">
            <Link2 className="w-8 h-8 text-dark-600" />
            <span className="text-xs">Belum ada blok</span>
            <span className="text-[10px] text-dark-600">Tambah blok pertama (genesis block)</span>
          </div>
        )}

        {blocks.map((b, idx) => (
          <div key={b.id || idx} className="relative">
            {idx > 0 && (
              <div className="flex justify-center -mt-1 -mb-1 relative z-10">
                <ChevronDown className="w-4 h-4 text-vault-600/50" />
              </div>
            )}
            <div className="p-4 bg-dark-900/60 border border-dark-700/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30' : 'bg-dark-800/60 text-dark-300 border border-dark-700/30'}`}>
                    #{b.blockIndex !== undefined ? b.blockIndex : (b.index ?? idx)}
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {idx === 0 ? 'Genesis Block' : `Block #${b.blockIndex !== undefined ? b.blockIndex : (b.index ?? idx)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-dark-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px]">{new Date(b.timestamp || b.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="px-3 py-2 bg-dark-950/40 rounded-lg">
                <p className="text-sm text-white font-mono">{b.metadata || b.assetId || b.data}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-vault-500 flex-shrink-0" />
                  <span className="text-dark-500">Hash:</span>
                  <span className="text-dark-300 truncate">{b.currentHash || b.hash}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-dark-600 flex-shrink-0" />
                  <span className="text-dark-500">Prev:</span>
                  <span className="text-dark-400 truncate">{b.previousHash || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
