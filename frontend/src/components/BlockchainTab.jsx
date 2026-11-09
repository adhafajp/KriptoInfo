import React, { useState, useEffect, useCallback } from 'react';
import { blockchainApi } from '../services/api';
import {
  Link2, Plus, ShieldCheck, ShieldAlert, AlertCircle, Loader2, Hash, Clock,
  Upload, File, CheckCircle2, Copy, Check, FileText,
  Search, Database, Lock, Eye, CheckCircle, XCircle, Sparkles, RefreshCw,
  Layers, ArrowRight
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function parseBlockMetadata(b) {
  let meta = null;
  if (b.metadata) {
    try {
      meta = JSON.parse(b.metadata);
    } catch {
      meta = null;
    }
  }
  const isFile = Boolean(meta && typeof meta === 'object' && meta.fileName);
  return {
    isFile,
    fileName: isFile ? meta.fileName : null,
    fileSize: isFile ? meta.fileSize : null,
    fileType: isFile ? meta.fileType : null,
    recordedAt: isFile ? meta.recordedAt : null,
    rawText: b.metadata || b.assetId || b.data || 'No payload'
  };
}

async function computeSha256(strOrBuffer) {
  const buffer = typeof strOrBuffer === 'string'
    ? new TextEncoder().encode(strOrBuffer)
    : strOrBuffer;
  const hashBuf = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function BlockchainTab() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('ledger'); // 'ledger' | 'add' | 'inspector'
  const [verification, setVerification] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedPreimage, setExpandedPreimage] = useState({});

  // Add Block State
  const [addMode, setAddMode] = useState('file'); // 'file' | 'text'
  const [textInput, setTextInput] = useState('');
  const [liveTextHash, setLiveTextHash] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [hashingFile, setHashingFile] = useState(false);

  // Inspector / Proof of Existence state
  const [inspectFile, setInspectFile] = useState(null);
  const [inspectHash, setInspectHash] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    const res = await blockchainApi.list();
    setLoading(false);
    if (res.success) {
      setBlocks(res.data);
    } else {
      setError(res.message);
    }
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  // Hitung live hash saat mengetik teks
  useEffect(() => {
    if (!textInput.trim()) {
      setLiveTextHash('');
      return;
    }
    let active = true;
    computeSha256(textInput).then(h => {
      if (active) setLiveTextHash(h);
    });
    return () => { active = false; };
  }, [textInput]);

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function togglePreimage(idx) {
    setExpandedPreimage(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setHashingFile(true);
    setError('');

    try {
      const buffer = await file.arrayBuffer();
      const hashHex = await computeSha256(buffer);
      setFileHash(hashHex);
    } catch {
      setError('Gagal menghitung SHA-256 berkas.');
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
        setActiveView('ledger');
        loadBlocks();
      } else {
        setError(res.message);
      }
      return;
    }

    if (!textInput.trim()) {
      setError('Konten teks blok tidak boleh kosong');
      return;
    }
    setError('');
    setLoading(true);
    const res = await blockchainApi.add(textInput);
    setLoading(false);
    if (res.success) {
      setTextInput('');
      setActiveView('ledger');
      loadBlocks();
    } else {
      setError(res.message);
    }
  }

  async function handleVerifyChain() {
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

  // Verifikasi keaslian file terhadap ledger
  async function handleInspectFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setInspectFile(file);
    setInspecting(true);
    setInspectResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const computed = await computeSha256(buffer);
      setInspectHash(computed);

      // Cari di blockchain blocks
      const matchedBlock = blocks.find(b => b.assetHash && b.assetHash.toLowerCase() === computed.toLowerCase());

      if (matchedBlock) {
        const parsed = parseBlockMetadata(matchedBlock);
        setInspectResult({
          status: 'matched',
          block: matchedBlock,
          parsed,
          hash: computed
        });
      } else {
        setInspectResult({
          status: 'not_found',
          hash: computed,
          fileName: file.name
        });
      }
    } catch {
      setError('Gagal membaca dan memverifikasi berkas.');
    } finally {
      setInspecting(false);
    }
  }

  const latestBlock = blocks[blocks.length - 1];

  return (
    <div className="space-y-6">
      {/* Header & Academic Metatag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-vault-500/10 border border-vault-500/30 flex items-center justify-center shadow-lg shadow-vault-500/5">
            <Link2 className="w-6 h-6 text-vault-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Cryptographic Hash Chain</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault-500/15 text-vault-400 border border-vault-500/30 font-semibold uppercase tracking-wider">
                Proof of Existence
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-0.5">
              Buku besar anti-manipulasi berbasis tautan rekursif SHA-256 (Merkle-Damgård Construction)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBlocks}
            disabled={loading}
            className="p-2.5 rounded-xl text-dark-400 hover:text-white bg-dark-900/60 hover:bg-dark-800 border border-dark-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleVerifyChain}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all bg-dark-900 hover:bg-dark-800 text-vault-400 border border-vault-500/40 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-vault-400" />
            Audit Seluruh Rantai
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-dark-900/50 border border-dark-800 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-dark-400 text-xs font-medium">
            <Layers className="w-3.5 h-3.5 text-vault-400" />
            <span>Panjang Rantai</span>
          </div>
          <p className="text-xl font-bold text-white font-mono">{blocks.length} <span className="text-xs text-dark-500 font-sans font-normal">Blok</span></p>
        </div>

        <div className="p-3.5 bg-dark-900/50 border border-dark-800 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-dark-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fungsi Hash</span>
          </div>
          <p className="text-sm font-bold text-cyan-300 font-mono">SHA-256 (256-bit)</p>
          <p className="text-[10px] text-dark-500">Collision Resistant</p>
        </div>

        <div className="p-3.5 bg-dark-900/50 border border-dark-800 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-dark-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Status Integritas</span>
          </div>
          <p className="text-sm font-bold text-emerald-400">
            {verification ? (verification.valid ? 'Terverifikasi 100%' : 'Anomali Terdeteksi!') : 'Belum Diaudit'}
          </p>
          <p className="text-[10px] text-dark-500">Zero Bit Drift</p>
        </div>

        <div className="p-3.5 bg-dark-900/50 border border-dark-800 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-dark-400 text-xs font-medium">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Blok Terbaru</span>
          </div>
          <p className="text-xs font-mono text-dark-300 truncate" title={latestBlock?.currentHash || 'GENESIS'}>
            {latestBlock ? `#${latestBlock.blockIndex} (${latestBlock.currentHash.slice(0, 10)}...)` : '-'}
          </p>
          <p className="text-[10px] text-dark-500">Append-Only Ledger</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
        <button
          onClick={() => setActiveView('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeView === 'ledger' ? 'bg-vault-600/20 text-vault-300 border border-vault-500/40 shadow-sm' : 'text-dark-400 hover:text-white hover:bg-dark-900'}`}
        >
          <Layers className="w-4 h-4" />
          Penjelajah Rantai Blok ({blocks.length})
        </button>
        <button
          onClick={() => setActiveView('inspector')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeView === 'inspector' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-dark-400 hover:text-white hover:bg-dark-900'}`}
        >
          <Search className="w-4 h-4 text-cyan-400" />
          Verifikator Keaslian Berkas
        </button>
        <button
          onClick={() => setActiveView('add')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeView === 'add' ? 'bg-vault-600/20 text-vault-300 border border-vault-500/40 shadow-sm' : 'text-dark-400 hover:text-white hover:bg-dark-900'}`}
        >
          <Plus className="w-4 h-4" />
          Tambah Blok Baru
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="font-semibold block text-red-200">Terjadi Kesalahan:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Verification Result Banner */}
      {verification && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${verification.valid ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200' : 'bg-red-950/40 border-red-800/60 text-red-200'}`}>
          {verification.valid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm tracking-wide">
              {verification.valid ? '✓ Rantai Kriptografis Valid Sempurna' : '⚠ Integritas Rantai Terputus (Tampering Detected)'}
            </h4>
            <p className="text-dark-300">
              {verification.valid
                ? `Seluruh ${verification.totalBlocks} blok berhasil diaudit. Setiap PreviousHash dan formula rekursif SHA-256 identik tanpa perubahan bit.`
                : `Kegagalan integritas terdeteksi pada Blok #${verification.problemAt}. Data blok di database telah dimanipulasi secara tidak sah.`}
            </p>
          </div>
        </div>
      )}

      {/* VIEW 1: PENJELAJAH RANTAI BLOK */}
      {activeView === 'ledger' && (
        <div className="space-y-4">
          {loading && !blocks.length && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-dark-400">
              <Loader2 className="w-6 h-6 animate-spin text-vault-400" />
              <p className="text-xs font-mono">Memuat buku besar blockchain...</p>
            </div>
          )}

          {!loading && !blocks.length && (
            <div className="py-16 flex flex-col items-center justify-center text-dark-400 gap-3 bg-dark-900/20 rounded-2xl border border-dashed border-dark-800">
              <div className="w-12 h-12 rounded-full bg-dark-800/60 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-dark-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Belum Ada Blok di Ledger</p>
                <p className="text-xs text-dark-500 mt-0.5">Tambahkan catatan teks atau berkas untuk membuat Genesis Block (#0).</p>
              </div>
              <button
                onClick={() => setActiveView('add')}
                className="mt-2 px-4 py-2 bg-vault-600 hover:bg-vault-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Genesis Block
              </button>
            </div>
          )}

          {/* Render Blocks in Ascending Order with Link Nodes */}
          {blocks.map((b, idx) => {
            const isGenesis = b.blockIndex === 0 || idx === 0;
            const parsed = parseBlockMetadata(b);
            const prevBlock = idx > 0 ? blocks[idx - 1] : null;
            const isLinkValid = isGenesis || (prevBlock && prevBlock.currentHash === b.previousHash);
            const preimageStr = [
              b.blockIndex,
              new Date(b.createdAt).toISOString(),
              b.assetId,
              b.assetHash,
              b.previousHash,
              b.metadata || ''
            ].join('|');

            return (
              <div key={b.id || idx} className="space-y-2">
                {/* Visual Inter-Block Link Indicator */}
                {!isGenesis && (
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-950/80 border border-dark-800/80 text-[10px] font-mono text-dark-400 shadow-inner">
                      <Lock className="w-3 h-3 text-vault-400" />
                      <span className="text-dark-500">Link #{b.blockIndex - 1} ➔ #{b.blockIndex}:</span>
                      {isLinkValid ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> H(prev) Cocok
                        </span>
                      ) : (
                        <span className="text-red-400 font-semibold flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" /> Rantai Patah!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Block Card */}
                <div className="bg-dark-900/60 border border-dark-700/60 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-dark-600">
                  {/* Top Bar: Block index, type, and timestamp */}
                  <div className="p-4 bg-dark-950/40 border-b border-dark-800/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${isGenesis ? 'bg-vault-500/20 text-vault-300 border border-vault-500/30' : 'bg-dark-800 text-dark-200 border border-dark-700'}`}>
                        <Hash className="w-3.5 h-3.5 text-vault-400" />
                        <span>{isGenesis ? 'GENESIS BLOCK #0' : `BLOCK #${b.blockIndex}`}</span>
                      </div>

                      {parsed.isFile ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <File className="w-3 h-3 text-purple-400" /> Berkas Dokumen
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" /> Catatan Teks
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-dark-400 text-xs">
                      <Clock className="w-3.5 h-3.5 text-dark-500" />
                      <span className="font-mono text-[11px]">{new Date(b.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                    </div>
                  </div>

                  {/* Block Content / Asset Payload */}
                  <div className="p-4 space-y-3">
                    {parsed.isFile ? (
                      <div className="p-3.5 rounded-xl bg-dark-950/60 border border-purple-500/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                            <File className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{parsed.fileName}</p>
                            <p className="text-xs text-dark-400">
                              {formatBytes(parsed.fileSize)} • <span className="font-mono">{parsed.fileType || 'binary/stream'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-dark-500 uppercase tracking-wider font-mono hidden sm:inline">
                            Tercatat: {parsed.recordedAt ? new Date(parsed.recordedAt).toLocaleTimeString('id-ID') : '-'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-dark-950/60 border border-dark-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-dark-500">Konten Transaksi / Catatan:</span>
                        <p className="text-sm text-dark-200 font-mono whitespace-pre-wrap">{parsed.rawText}</p>
                      </div>
                    )}

                    {/* Hash Breakdown Table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      {/* Asset Fingerprint */}
                      <div className="p-2.5 rounded-xl bg-dark-950/40 border border-dark-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-dark-500 uppercase tracking-wider">Asset Hash (Sidik Jari Data):</span>
                          <button
                            onClick={() => copyToClipboard(b.assetHash, `asset-${b.blockIndex}`)}
                            className="text-dark-400 hover:text-white transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `asset-${b.blockIndex}` ? <Check className="w-3 h-3 text-vault-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="text-vault-300 text-[11px] truncate" title={b.assetHash}>{b.assetHash}</p>
                      </div>

                      {/* Previous Block Hash */}
                      <div className="p-2.5 rounded-xl bg-dark-950/40 border border-dark-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-dark-500 uppercase tracking-wider">Previous Hash H(prev):</span>
                          <button
                            onClick={() => copyToClipboard(b.previousHash, `prev-${b.blockIndex}`)}
                            className="text-dark-400 hover:text-white transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `prev-${b.blockIndex}` ? <Check className="w-3 h-3 text-vault-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className={`text-[11px] truncate ${isGenesis ? 'text-amber-400 font-bold' : 'text-dark-400'}`} title={b.previousHash}>
                          {b.previousHash}
                        </p>
                      </div>

                      {/* Current Block Hash */}
                      <div className="md:col-span-2 p-2.5 rounded-xl bg-dark-950/80 border border-vault-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-vault-400" />
                            <span className="text-[10px] text-vault-400 uppercase tracking-wider font-bold">
                              Current Block Hash H(curr) = SHA256(Block Payload):
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(b.currentHash, `curr-${b.blockIndex}`)}
                            className="text-vault-400 hover:text-white transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `curr-${b.blockIndex}` ? <Check className="w-3.5 h-3.5 text-vault-300" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-white font-bold text-[11px] break-all select-all">{b.currentHash}</p>
                      </div>
                    </div>

                    {/* Collapsible Cryptographic Preimage Inspection */}
                    <div className="pt-1">
                      <button
                        onClick={() => togglePreimage(b.blockIndex)}
                        className="text-[11px] font-mono text-dark-400 hover:text-vault-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{expandedPreimage[b.blockIndex] ? 'Sembunyikan Preimage Kriptografis' : 'Bedah Preimage Kriptografis (Formula Hash)'}</span>
                      </button>

                      {expandedPreimage[b.blockIndex] && (
                        <div className="mt-2 p-3 rounded-xl bg-black/60 border border-dark-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-dark-400 font-mono">
                            <span>Formula: SHA-256( Index | Timestamp | AssetID | AssetHash | PrevHash | Metadata )</span>
                            <button
                              onClick={() => copyToClipboard(preimageStr, `pre-${b.blockIndex}`)}
                              className="text-vault-400 hover:text-white flex items-center gap-1 text-[10px]"
                            >
                              {copiedId === `pre-${b.blockIndex}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              Salin Raw Preimage
                            </button>
                          </div>
                          <div className="p-2 rounded bg-dark-950 font-mono text-[10px] text-dark-300 break-all select-all border border-dark-800">
                            {preimageStr}
                          </div>
                          <p className="text-[10px] text-dark-500 italic">
                            * Kamu dapat menyalin string di atas ke CyberChef atau terminal `echo -n &quot;...&quot; | sha256sum` untuk membuktikan hasil digest-nya persis dengan Current Hash.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: VERIFIKATOR KEASLIAN BERKAS (PROOF-OF-EXISTENCE INSPECTOR) */}
      {activeView === 'inspector' && (
        <div className="p-6 bg-dark-900/60 border border-dark-700/60 rounded-2xl space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspektor Keaslian Berkas (Proof of Existence)</h3>
              <p className="text-xs text-dark-400 mt-0.5">
                Unggah file lokal apa saja (.txt, .pdf, .docx, gambar) untuk mencocokkan sidik jari SHA-256 berkas tersebut dengan catatan di blockchain.
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-dark-950/40">
            <input
              type="file"
              onChange={handleInspectFile}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-cyan-400" />
              {inspectFile ? (
                <div>
                  <p className="text-sm font-semibold text-white">{inspectFile.name}</p>
                  <p className="text-xs text-dark-400 font-mono">{formatBytes(inspectFile.size)} • {inspectFile.type || 'file'}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-dark-200 font-medium">Klik atau seret file untuk diverifikasi</p>
                  <p className="text-xs text-dark-500 mt-1">Sistem akan menghitung SHA-256 lokal dan mencocokkan dengan seluruh blok di blockchain.</p>
                </div>
              )}
            </div>
          </div>

          {inspecting && (
            <div className="flex items-center justify-center gap-2 text-cyan-300 text-xs py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menghitung digest SHA-256 dan memindai ledger...</span>
            </div>
          )}

          {inspectResult && (
            <div className={`p-4 rounded-xl border space-y-3 transition-all ${inspectResult.status === 'matched' ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-red-950/30 border-red-800/40'}`}>
              <div className="flex items-center gap-2">
                {inspectResult.status === 'matched' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">DOKUMEN TERVERIFIKASI ASLI (AUTHENTIC)</h4>
                      <p className="text-[11px] text-emerald-400/80">Sidik jari SHA-256 file ini cocok 100% dengan entri di buku besar blockchain.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <h4 className="text-sm font-bold text-red-300">DOKUMEN TIDAK DITEMUKAN / SUDAH DIMANIPULASI</h4>
                      <p className="text-[11px] text-red-400/80">Hash SHA-256 berkas tidak cocok dengan blok manapun di blockchain akun ini.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 bg-dark-950 rounded-lg space-y-1.5 font-mono text-xs border border-dark-800">
                <div className="flex justify-between items-center text-dark-400">
                  <span>SHA-256 Berkas Ini:</span>
                  <button onClick={() => copyToClipboard(inspectHash, 'inspect-hash')} className="hover:text-white">
                    {copiedId === 'inspect-hash' ? <Check className="w-3 h-3 text-vault-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-white text-[11px] break-all">{inspectHash}</p>
              </div>

              {inspectResult.status === 'matched' && (
                <div className="grid grid-cols-2 gap-2 text-xs text-dark-300 pt-1">
                  <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                    <span className="text-[10px] text-dark-500 block uppercase font-mono">Tercatat Pada Blok:</span>
                    <strong className="text-white text-sm">Blok #{inspectResult.block.blockIndex}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800">
                    <span className="text-[10px] text-dark-500 block uppercase font-mono">Waktu Pencatatan:</span>
                    <strong className="text-white text-xs">{new Date(inspectResult.block.createdAt).toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TAMBAH BLOK BARU */}
      {activeView === 'add' && (
        <div className="p-6 bg-dark-900/60 border border-dark-700/60 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-vault-400" />
              <h3 className="font-bold text-white text-sm">Catat Data Baru ke Rantai Blok</h3>
            </div>
            <div className="flex bg-dark-950 p-1 rounded-xl border border-dark-800">
              <button
                type="button"
                onClick={() => setAddMode('file')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${addMode === 'file' ? 'bg-vault-600 text-white font-semibold' : 'text-dark-400 hover:text-white'}`}
              >
                <Upload className="w-3 h-3" /> Berkas Dokumen
              </button>
              <button
                type="button"
                onClick={() => setAddMode('text')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${addMode === 'text' ? 'bg-vault-600 text-white font-semibold' : 'text-dark-400 hover:text-white'}`}
              >
                <FileText className="w-3 h-3" /> Catatan Teks
              </button>
            </div>
          </div>

          {addMode === 'file' ? (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-dark-700 hover:border-vault-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-dark-950/40">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-vault-400" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                      <p className="text-xs text-dark-400">{formatBytes(selectedFile.size)} • {selectedFile.type || 'Berkas'}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-dark-300 font-medium">Klik atau seret file ke sini</p>
                      <p className="text-xs text-dark-500 mt-0.5">Sistem akan menghitung hash SHA-256 berkas (Proof of Existence)</p>
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
                <div className="p-3.5 bg-dark-950/80 rounded-xl border border-vault-500/30 space-y-1 font-mono">
                  <div className="flex items-center gap-1.5 text-xs text-vault-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sidik Jari SHA-256 Berkas:</span>
                  </div>
                  <p className="text-[11px] text-vault-300 break-all select-all">{fileHash}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-3.5 py-3 bg-dark-950 text-white rounded-xl border border-dark-700 focus:border-vault-500 focus:outline-none text-sm font-mono placeholder:font-sans"
                rows={3}
                placeholder="Ketik data aset, catatan transaksi, atau pesan rahasia..."
              />
              {liveTextHash && (
                <div className="p-3 bg-dark-950/80 rounded-xl border border-vault-500/30 space-y-1 font-mono">
                  <div className="flex items-center justify-between text-xs text-vault-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-vault-400" />
                      Live SHA-256 Hashing:
                    </span>
                    <span className="text-dark-500 text-[10px]">{textInput.length} karakter</span>
                  </div>
                  <p className="text-[11px] text-vault-300 break-all">{liveTextHash}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-dark-400 hover:text-white transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAddBlock}
              disabled={loading || hashingFile || (addMode === 'file' && !selectedFile) || (addMode === 'text' && !textInput.trim())}
              className="px-5 py-2.5 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-vault-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mencatat ke Ledger...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Catat Blok #{blocks.length}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
