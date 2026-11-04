import { useState, useEffect } from 'react';
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
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Immutable Hash-Chain Ledger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/20 font-mono">
              {blocks.length} blocks
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Buku besar digital anti-tamper berantai kriptografi SHA-256 untuk bukti kepemilikan aset.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
        >
          <span>🔍</span>
          <span>Verifikasi Integritas Rantai</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Verification Banner */}
      {verification && (
        <div className={`p-4 rounded-2xl border transition-all ${
          (verification.valid ?? verification.isValid)
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
            : 'bg-red-950/40 border-red-500/40 text-red-300 shadow-lg shadow-red-500/10'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>{(verification.valid ?? verification.isValid) ? '✓' : '✗'}</span>
            <h4>
              {(verification.valid ?? verification.isValid)
                ? 'Rantai Kriptografi Sah & Terverifikasi (Untampered)'
                : 'Integritas Rantai Dirusak / Hash Tidak Cocok'}
            </h4>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {verification.message || `Semua ${verification.totalBlocks || blocks.length} blok terverifikasi secara matematis.`}
          </p>
        </div>
      )}

      {/* Add Block Box */}
      <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-4 shadow-xl">
        <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
          <span>Tambahkan Blok Transaksi / Bukti Aset Baru</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Data Transaksi / Catatan Aset (Payload)
          </label>
          <textarea
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900/90 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm font-mono focus:outline-none"
            rows={2}
            placeholder="Contoh: Transaksi sertifikat kepemilikan dokumen rahasia #4029"
          />
        </div>

        <div className="pt-1">
          <button
            onClick={handleAddBlock}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⚡</span>
                <span>Menghitung Hash Rantai...</span>
              </>
            ) : (
              <>
                <span>+ Rekam ke Blockchain Ledger</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Block Explorer List */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Blockchain Ledger Explorer ({blocks.length} Blocks)
        </h3>

        {loading && !blocks.length && (
          <div className="p-8 rounded-2xl bg-[#0a0f1d] border border-white/5 text-center text-xs text-slate-500">
            Memuat rantai blok...
          </div>
        )}

        <div className="space-y-3">
          {blocks.map((b, idx) => {
            const blockNum = b.blockIndex !== undefined ? b.blockIndex : (b.index ?? idx);
            const isGenesis = blockNum === 0 || b.previousHash === 'GENESIS' || b.previousHash === '0';
            return (
              <div
                key={b.id || idx}
                className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/10 hover:border-cyan-500/30 transition-all space-y-3 relative group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-600/20 text-cyan-400 border border-blue-500/30 font-mono font-bold text-xs">
                      BLOK #{blockNum}
                    </span>
                    {isGenesis && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono text-[10px] font-semibold">
                        GENESIS BLOCK
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(b.timestamp || b.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Asset Metadata:</span>
                  <div className="p-3 bg-black/50 text-slate-200 rounded-xl border border-white/5 font-mono text-xs break-all">
                    {b.metadata || b.assetId || b.data}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                    <span className="text-slate-500 block text-[10px] uppercase">Current Hash (SHA-256):</span>
                    <span className="text-cyan-400 break-all select-all">{b.currentHash || b.hash}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.04]">
                    <span className="text-slate-500 block text-[10px] uppercase">Previous Hash:</span>
                    <span className="text-slate-400 break-all select-all">{b.previousHash || '0'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
