import React, { useState, useEffect, useCallback } from 'react';
import { blockchainApi } from '../services/api';
import {
  Link2, Plus, ShieldCheck, ShieldAlert, AlertCircle, Loader2, Clock,
  Upload, File, CheckCircle2, Copy, Check, FileText,
  Search, Database, Lock, Eye, XCircle, Sparkles, RefreshCw,
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
    multiDigest: meta?.multiDigest || null,
    rawText: b.metadata || b.assetId || b.data || 'No payload'
  };
}

async function digestHex(algo, buffer) {
  const hashBuf = await window.crypto.subtle.digest(algo, buffer);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeMultiHashes(strOrBuffer) {
  const buffer = typeof strOrBuffer === 'string'
    ? new TextEncoder().encode(strOrBuffer)
    : strOrBuffer;
  const [sha256, sha384, sha512] = await Promise.all([
    digestHex('SHA-256', buffer),
    digestHex('SHA-384', buffer),
    digestHex('SHA-512', buffer)
  ]);
  return { sha256, sha384, sha512 };
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
  const [liveTextHashes, setLiveTextHashes] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHashes, setFileHashes] = useState(null);
  const [hashingFile, setHashingFile] = useState(false);

  // Inspector / Proof of Existence state
  const [inspectFile, setInspectFile] = useState(null);
  const [inspectHashes, setInspectHashes] = useState(null);
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

  // Hitung live multi-hash saat mengetik teks
  useEffect(() => {
    if (!textInput.trim()) {
      setLiveTextHashes(null);
      return;
    }
    let active = true;
    computeMultiHashes(textInput).then(h => {
      if (active) setLiveTextHashes(h);
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
      const hashes = await computeMultiHashes(buffer);
      setFileHashes(hashes);
    } catch {
      setError('Gagal menghitung Multi-Digest berkas.');
    } finally {
      setHashingFile(false);
    }
  }

  async function handleAddBlock() {
    if (addMode === 'file') {
      if (!selectedFile || !fileHashes?.sha256) {
        setError('Pilih berkas file terlebih dahulu.');
        return;
      }
      setError('');
      setLoading(true);
      const res = await blockchainApi.add({
        assetId: `file-${Date.now()}-${selectedFile.name.slice(0, 40)}`,
        assetHash: fileHashes.sha256,
        metadata: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || 'unknown',
          recordedAt: new Date().toISOString(),
          multiDigest: {
            sha384: fileHashes.sha384,
            sha512: fileHashes.sha512
          }
        })
      });
      setLoading(false);
      if (res.success) {
        setSelectedFile(null);
        setFileHashes(null);
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

  // Verifikasi keaslian file terhadap ledger dengan multi-digest
  async function handleInspectFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setInspectFile(file);
    setInspecting(true);
    setInspectResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const computed = await computeMultiHashes(buffer);
      setInspectHashes(computed);

      const matchedBlock = blocks.find(
        b => b.assetHash && b.assetHash.toLowerCase() === computed.sha256.toLowerCase()
      );

      if (matchedBlock) {
        const parsed = parseBlockMetadata(matchedBlock);
        setInspectResult({
          status: 'matched',
          block: matchedBlock,
          parsed,
          hashes: computed
        });
      } else {
        setInspectResult({
          status: 'not_found',
          hashes: computed,
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
    <div className="space-y-5">
      {/* Header & Academic Metatag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 dark:border-stone-700/80 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
              LEDGER // 04
            </span>
            <span className="text-[11px] font-mono text-stone-700 dark:text-amber-300/90 font-bold uppercase tracking-wider">
              MULTI-DIGEST HASH-CHAIN &middot; SHA-256 + SHA3-256 + SHA-512 + HMAC
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight mt-1">
            Integritas Data &amp; Audit Trail
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadBlocks}
            disabled={loading}
            className="p-2 rounded dossier-panel hover:opacity-85 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleVerifyChain}
            disabled={loading}
            className="px-3.5 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 bg-red-800 hover:bg-red-900 text-amber-50 shadow-sm transition-all uppercase tracking-wider"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Rantai Multi-Hash</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner - Dossier Evidence Box Grids */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 dossier-panel rounded space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-amber-200 text-[10px] font-mono uppercase font-bold tracking-wider">
            <Layers className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
            <span>Panjang Rantai</span>
          </div>
          <p className="text-lg font-bold font-mono">
            {blocks.length} <span className="text-xs text-stone-700 dark:text-stone-300 font-bold">Blok</span>
          </p>
        </div>

        <div className="p-3 dossier-panel rounded space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-stone-800 dark:text-amber-200 text-[10px] font-mono uppercase font-bold tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Fungsi Hash</span>
          </div>
          <p className="text-xs font-bold font-mono">SHA-256 + SHA3-256</p>
          <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-bold">HMAC-SHA512 Sealed</p>
        </div>

        <div className="p-3 dossier-panel rounded space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-stone-800 dark:text-amber-200 text-[10px] font-mono uppercase font-bold tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Status Integritas</span>
          </div>
          <p className={`text-xs font-bold font-mono ${verification && !verification.valid ? 'text-red-700 dark:text-red-400' : 'text-emerald-800 dark:text-emerald-400'}`}>
            {verification ? (verification.valid ? 'VALID 100%' : 'TERPUTUS!') : 'TERVERIFIKASI'}
          </p>
          <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-bold">Zero Bit Drift</p>
        </div>

        <div className="p-3 dossier-panel rounded space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-stone-800 dark:text-amber-200 text-[10px] font-mono uppercase font-bold tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Blok Terbaru</span>
          </div>
          <p className="text-xs font-mono font-bold truncate" title={latestBlock?.currentHash || 'GENESIS'}>
            {latestBlock ? `#${latestBlock.blockIndex} (${latestBlock.currentHash.slice(0, 10)}...)` : '-'}
          </p>
          <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-bold">Append-Only Ledger</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs Dossier */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-stone-400/40 dark:border-stone-700 pb-2.5">
        <button
          onClick={() => setActiveView('ledger')}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
            activeView === 'ledger'
              ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 dark:hover:bg-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Penjelajah Blok ({blocks.length})</span>
        </button>
        <button
          onClick={() => setActiveView('inspector')}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
            activeView === 'inspector'
              ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 dark:hover:bg-stone-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Verifikator Berkas</span>
        </button>
        <button
          onClick={() => setActiveView('add')}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
            activeView === 'add'
              ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 dark:hover:bg-stone-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Blok</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-900/15 dark:bg-red-950/50 border-l-4 border-red-700 rounded flex items-start gap-2.5 text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="font-bold block text-red-900 dark:text-red-200">Terjadi Kesalahan:</strong>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Verification Result Banner */}
      {verification && (
        <div
          className={`p-4 rounded border-2 flex items-start gap-3 transition-all font-mono ${
            verification.valid
              ? 'bg-emerald-900/10 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-500/80'
              : 'bg-red-900/15 dark:bg-red-950/50 border-red-700'
          }`}
        >
          {verification.valid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm tracking-wide">
              {verification.valid ? '✓ Rantai Kriptografis Valid Sempurna' : '⚠ Integritas Rantai Terputus (Tampering Detected)'}
            </h4>
            <p className="text-stone-700 dark:text-stone-300">
              {verification.valid
                ? `Seluruh ${verification.totalBlocks} blok berhasil diaudit (${verification.algorithm || 'SHA-256'}). Setiap PreviousHash dan formula rekursif identik tanpa perubahan bit.`
                : `Kegagalan integritas terdeteksi pada Blok #${verification.problemAt}. Data blok di database telah dimanipulasi secara tidak sah.`}
            </p>
          </div>
        </div>
      )}

      {/* VIEW 1: PENJELAJAH RANTAI BLOK */}
      {activeView === 'ledger' && (
        <div className="space-y-4">
          {loading && !blocks.length && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-stone-800 dark:text-stone-200 font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-red-700 dark:text-amber-400" />
              <p className="text-xs font-bold">Memuat buku besar blockchain...</p>
            </div>
          )}

          {!loading && !blocks.length && (
            <div className="py-14 flex flex-col items-center justify-center gap-3 dossier-surface rounded border border-dashed border-stone-400 dark:border-stone-700">
              <div className="w-12 h-12 rounded-full bg-stone-300/60 dark:bg-stone-800 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-stone-700 dark:text-amber-400" />
              </div>
              <div className="text-center font-mono">
                <p className="text-sm font-bold">Belum Ada Blok di Ledger</p>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                  Tambahkan catatan teks atau berkas untuk membuat Genesis Block (#0).
                </p>
              </div>
              <button
                onClick={() => setActiveView('add')}
                className="mt-1 px-4 py-2 bg-red-800 hover:bg-red-900 text-amber-50 text-xs font-mono font-bold rounded flex items-center gap-1.5"
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
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full dossier-panel text-[10px] font-mono shadow-sm">
                      <Lock className="w-3 h-3 text-red-700 dark:text-amber-400" />
                      <span className="font-bold">Link #{b.blockIndex - 1} ➔ #{b.blockIndex}:</span>
                      {isLinkValid ? (
                        <span className="text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> H(prev) Cocok
                        </span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-2.5 h-2.5" /> Rantai Patah!
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Block Card */}
                <div className="dossier-panel rounded overflow-hidden shadow-sm transition-all">
                  {/* Top Bar */}
                  <div className="p-3 bg-stone-300/40 dark:bg-stone-900/60 border-b border-stone-400/50 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
                        {isGenesis ? 'GENESIS #0' : `BLOCK #${b.blockIndex}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold dossier-surface">
                        {parsed.isFile ? 'Berkas Dokumen' : 'Catatan Teks'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 text-xs font-mono font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(b.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Block Content */}
                  <div className="p-3.5 space-y-3">
                    {parsed.isFile ? (
                      <div className="p-3 rounded dossier-surface flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded bg-stone-300/60 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                            <File className="w-4 h-4 text-stone-800 dark:text-amber-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-bold truncate">{parsed.fileName}</p>
                            <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300">
                              {formatBytes(parsed.fileSize)} &middot; {parsed.fileType || 'binary/stream'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300 uppercase tracking-wider hidden sm:inline font-bold">
                          Waktu: {parsed.recordedAt ? new Date(parsed.recordedAt).toLocaleTimeString('id-ID') : '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded dossier-surface space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-800 dark:text-amber-400">
                          Konten Transaksi / Catatan:
                        </span>
                        <p className="text-xs font-mono font-bold whitespace-pre-wrap">{parsed.rawText}</p>
                      </div>
                    )}

                    {/* Hash Breakdown Table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded dossier-surface space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                            Asset Hash (SHA-256):
                          </span>
                          <button
                            onClick={() => copyToClipboard(b.assetHash, `asset-${b.blockIndex}`)}
                            className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `asset-${b.blockIndex}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="text-[11px] font-bold truncate select-all" title={b.assetHash}>{b.assetHash}</p>
                      </div>

                      <div className="p-2.5 rounded dossier-surface space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                            Previous Hash H(prev):
                          </span>
                          <button
                            onClick={() => copyToClipboard(b.previousHash, `prev-${b.blockIndex}`)}
                            className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `prev-${b.blockIndex}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className={`text-[11px] font-bold truncate select-all ${isGenesis ? 'text-red-700 dark:text-red-400 font-black' : ''}`} title={b.previousHash}>
                          {b.previousHash}
                        </p>
                      </div>

                      <div className="md:col-span-2 p-2.5 rounded dossier-surface border-2 border-red-800/35 dark:border-red-500/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-800 dark:text-red-400">
                              Current Block Hash H(curr) = SHA256(Block Payload):
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(b.currentHash, `curr-${b.blockIndex}`)}
                            className="text-stone-700 dark:text-stone-300 hover:text-red-800 dark:hover:text-amber-300 transition-colors"
                            title="Salin Hash"
                          >
                            {copiedId === `curr-${b.blockIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="font-mono font-bold text-[11px] break-all select-all tracking-wide">{b.currentHash}</p>

                        {(b.sha3_256 || b.hmacSeal) && (
                          <div className="pt-1.5 border-t border-stone-300 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[9.5px]">
                            {b.sha3_256 && (
                              <div className="truncate">
                                <span className="font-bold text-stone-700 dark:text-stone-300">SHA3-256: </span>
                                <span className="font-bold">{b.sha3_256}</span>
                              </div>
                            )}
                            {b.hmacSeal && (
                              <div className="truncate">
                                <span className="font-bold text-stone-700 dark:text-stone-300">HMAC-SHA512 Seal: </span>
                                <span className="font-bold text-emerald-800 dark:text-emerald-400">{b.hmacSeal}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Cryptographic Preimage Inspection */}
                    <div className="pt-1">
                      <button
                        onClick={() => togglePreimage(b.blockIndex)}
                        className="text-[11px] font-mono font-bold text-stone-800 dark:text-amber-300 hover:underline flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{expandedPreimage[b.blockIndex] ? 'Sembunyikan Preimage Kriptografis' : 'Bedah Preimage Kriptografis (Formula Hash)'}</span>
                      </button>

                      {expandedPreimage[b.blockIndex] && (
                        <div className="mt-2 p-3 rounded dossier-surface space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-700 dark:text-stone-300 font-mono">
                            <span>Formula: SHA-256( Index | Timestamp | AssetID | AssetHash | PrevHash | Metadata )</span>
                            <button
                              onClick={() => copyToClipboard(preimageStr, `pre-${b.blockIndex}`)}
                              className="text-red-800 dark:text-amber-400 hover:underline flex items-center gap-1 text-[10px] font-bold"
                            >
                              {copiedId === `pre-${b.blockIndex}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              Salin Raw Preimage
                            </button>
                          </div>
                          <div className="p-2 rounded dossier-input font-mono text-[10px] break-all select-all">
                            {preimageStr}
                          </div>
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
        <div className="p-5 dossier-panel rounded space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded dossier-surface flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-red-700 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold">Inspektor Keaslian Berkas (Proof of Existence)</h3>
              <p className="text-xs font-mono text-stone-700 dark:text-stone-300 mt-0.5">
                Unggah file lokal (.txt, .pdf, .docx, gambar) untuk mencocokkan sidik jari multi-hash (SHA-256, SHA-384, SHA-512) dengan buku besar blockchain.
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-stone-400 dark:border-stone-600 hover:border-red-700 rounded p-6 text-center cursor-pointer transition-colors relative dossier-surface">
            <input
              type="file"
              onChange={handleInspectFile}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center gap-2 font-mono">
              <Upload className="w-7 h-7 text-red-700 dark:text-amber-400" />
              {inspectFile ? (
                <div>
                  <p className="text-xs font-bold">{inspectFile.name}</p>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300">{formatBytes(inspectFile.size)} • {inspectFile.type || 'file'}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold">Klik atau seret file untuk diverifikasi</p>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-1">
                    Sistem menghitung SHA-256, SHA-384 &amp; SHA-512 lokal dan mencocokkan dengan seluruh blok ledger.
                  </p>
                </div>
              )}
            </div>
          </div>

          {inspecting && (
            <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold py-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-700 dark:text-amber-400" />
              <span>Menghitung multi-digest dan memindai ledger...</span>
            </div>
          )}

          {inspectResult && (
            <div
              className={`p-4 rounded border-2 space-y-3 transition-all font-mono ${
                inspectResult.status === 'matched'
                  ? 'bg-emerald-900/10 dark:bg-emerald-950/40 border-emerald-700 dark:border-emerald-500/80'
                  : 'bg-red-900/15 dark:bg-red-950/50 border-red-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {inspectResult.status === 'matched' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        DOKUMEN TERVERIFIKASI ASLI (AUTHENTIC)
                      </h4>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                        Sidik jari SHA-256 file ini cocok 100% dengan entri di buku besar blockchain.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-red-900 dark:text-red-300">
                        DOKUMEN TIDAK DITEMUKAN / SUDAH DIMANIPULASI
                      </h4>
                      <p className="text-[11px] text-red-800 dark:text-red-400">
                        Hash SHA-256 berkas tidak cocok dengan blok mana pun di blockchain akun ini.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {inspectHashes && (
                <div className="p-3 dossier-surface rounded space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between items-center font-bold">
                    <span>SHA-256 Berkas Ini:</span>
                    <button onClick={() => copyToClipboard(inspectHashes.sha256, 'inspect-hash')}>
                      {copiedId === 'inspect-hash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="break-all font-bold">{inspectHashes.sha256}</p>
                  <div className="pt-1.5 border-t border-stone-300 dark:border-stone-800 space-y-1 text-[9.5px] opacity-85">
                    <p className="break-all"><strong>SHA-384:</strong> {inspectHashes.sha384}</p>
                    <p className="break-all"><strong>SHA-512:</strong> {inspectHashes.sha512}</p>
                  </div>
                </div>
              )}

              {inspectResult.status === 'matched' && (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded dossier-surface">
                    <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 block uppercase">Tercatat Pada Blok:</span>
                    <strong className="text-sm">Blok #{inspectResult.block.blockIndex}</strong>
                  </div>
                  <div className="p-2.5 rounded dossier-surface">
                    <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 block uppercase">Waktu Pencatatan:</span>
                    <strong className="text-xs">{new Date(inspectResult.block.createdAt).toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TAMBAH BLOK BARU */}
      {activeView === 'add' && (
        <div className="p-5 dossier-panel rounded space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-700 dark:text-amber-400" />
              <h3 className="font-serif font-bold text-base">Catat Data Baru ke Rantai Blok</h3>
            </div>
            <div className="flex dossier-surface p-0.5 rounded">
              <button
                type="button"
                onClick={() => setAddMode('file')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${
                  addMode === 'file'
                    ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <Upload className="w-3 h-3" /> Berkas Dokumen
              </button>
              <button
                type="button"
                onClick={() => setAddMode('text')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${
                  addMode === 'text'
                    ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <FileText className="w-3 h-3" /> Catatan Teks
              </button>
            </div>
          </div>

          {addMode === 'file' ? (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-stone-400 dark:border-stone-600 hover:border-red-700 rounded p-6 text-center cursor-pointer transition-colors relative dossier-surface">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-2 font-mono">
                  <Upload className="w-7 h-7 text-red-700 dark:text-amber-400" />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold">{selectedFile.name}</p>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300">
                        {formatBytes(selectedFile.size)} • {selectedFile.type || 'Berkas'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold">Klik atau seret file ke sini</p>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-0.5">
                        Sistem menghitung Multi-Digest (SHA-256, SHA-384, SHA-512) untuk Proof of Existence
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {hashingFile && (
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-700 dark:text-amber-400" />
                  <span>Menghitung sidik jari kriptografi berlapis...</span>
                </div>
              )}

              {fileHashes && (
                <div className="p-3.5 dossier-surface rounded space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Multi-Digest Berkas Dihitung:</span>
                  </div>
                  <p className="break-all"><strong>SHA-256:</strong> {fileHashes.sha256}</p>
                  <p className="break-all opacity-80"><strong>SHA-384:</strong> {fileHashes.sha384}</p>
                  <p className="break-all opacity-80"><strong>SHA-512:</strong> {fileHashes.sha512}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-3.5 py-3 dossier-input rounded text-xs font-mono"
                rows={3}
                placeholder="Ketik data aset, catatan transaksi, atau pesan rahasia..."
              />
              {liveTextHashes && (
                <div className="p-3 dossier-surface rounded space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Multi-Digest Hashing:
                    </span>
                    <span className="text-[10px] opacity-80">{textInput.length} karakter</span>
                  </div>
                  <p className="break-all"><strong>SHA-256:</strong> {liveTextHashes.sha256}</p>
                  <p className="break-all opacity-80"><strong>SHA-384:</strong> {liveTextHashes.sha384}</p>
                  <p className="break-all opacity-80"><strong>SHA-512:</strong> {liveTextHashes.sha512}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveView('ledger')}
              className="px-4 py-2 rounded text-xs font-mono font-bold text-stone-700 dark:text-stone-300 hover:underline"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAddBlock}
              disabled={loading || hashingFile || (addMode === 'file' && !selectedFile) || (addMode === 'text' && !textInput.trim())}
              className="px-5 py-2 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mencatat ke Ledger...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Blok #{blocks.length}</span>
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
