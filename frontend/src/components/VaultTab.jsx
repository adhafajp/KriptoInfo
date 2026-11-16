import React, { useState, useEffect } from 'react';
import { vaultApi, cryptoApi } from '../services/api';
import {
  Lock, Unlock, Plus, Trash2, KeyRound, FileText,
  FolderLock, AlertCircle, Loader2, ChevronRight, X, Eye, ShieldCheck,
  Upload, Download, File, Search, Layers
} from 'lucide-react';

const VAULT_FILE_PIPELINE = [
  'HKDF-SHA512',
  'SHAKE-256',
  'AES-256-GCM',
  'ChaCha20-Poly1305',
  'HMAC-SHA512 + SHA3'
];

export default function VaultTab() {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState('text');
  const [title, setTitle] = useState('');
  const [secretContent, setSecretContent] = useState('');
  const [vigenereKey, setVigenereKey] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [decryptKey, setDecryptKey] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingEnc, setDownloadingEnc] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [encFileToDecrypt, setEncFileToDecrypt] = useState(null);
  const [encJsonText, setEncJsonText] = useState('');
  const [targetDecryptedName, setTargetDecryptedName] = useState('');
  const [decryptingFile, setDecryptingFile] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const res = await vaultApi.list();
    setLoading(false);
    if (res.success) { setItems(res.data); } else { setError(res.message); }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB');
      return;
    }
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(',')[1];
      setFileBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateItem() {
    if (addMode === 'file') {
      if (!title.trim() || !selectedFile || !fileBase64) {
        setError('Judul dan berkas file wajib diisi');
        return;
      }
      setError('');
      setLoading(true);
      const res = await vaultApi.uploadFile({
        title: title.trim(),
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileBase64
      });
      setLoading(false);
      if (res.success) {
        setShowAdd(false);
        setTitle('');
        setSelectedFile(null);
        setFileBase64('');
        loadItems();
      } else {
        setError(res.message);
      }
      return;
    }

    if (!title.trim() || !secretContent.trim() || !vigenereKey.trim()) { setError('Semua field wajib diisi'); return; }
    setError(''); setLoading(true);
    const encRes = await cryptoApi.encryptMessage(secretContent, vigenereKey);
    if (!encRes.success) { setLoading(false); setError(encRes.message || 'Gagal mengenkripsi konten'); return; }
    const res = await vaultApi.create({ title, encryptedData: encRes.data });
    setLoading(false);
    if (res.success) { setShowAdd(false); setTitle(''); setSecretContent(''); setVigenereKey(''); loadItems(); }
    else { setError(res.message); }
  }

  async function handleDownloadFile(id) {
    setDownloading(true);
    setError('');
    const res = await vaultApi.downloadFile(id);
    setDownloading(false);
    if (!res.success) {
      setError(res.message || 'Gagal mengunduh file');
      return;
    }
    const byteCharacters = atob(res.data.fileBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: res.data.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.data.fileName || 'vault-file';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleDownloadEncryptedFile(id) {
    setDownloadingEnc(true);
    setError('');
    const res = await vaultApi.downloadEncryptedFile(id);
    setDownloadingEnc(false);
    if (!res.success) {
      setError(res.message || 'Gagal mengunduh file terenkripsi');
      return;
    }
    const blob = new Blob([res.data.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.data.fileName || 'vault-file.enc';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleEncFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setEncFileToDecrypt(file);
    if (file.name.endsWith('.enc')) {
      setTargetDecryptedName(file.name.replace(/\.enc$/, ''));
    } else {
      setTargetDecryptedName('file-terdekripsi');
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEncJsonText(reader.result);
    };
    reader.readAsText(file);
  }

  async function handleDecryptUploadedFile() {
    if (!encJsonText.trim()) {
      setError('File .enc belum dipilih atau kosong');
      return;
    }
    let payload;
    try {
      payload = JSON.parse(encJsonText);
    } catch {
      setError('Format file .enc tidak valid (harus JSON ChaCha20-Poly1305).');
      return;
    }

    setDecryptingFile(true);
    setError('');
    const res = await cryptoApi.decryptFile(payload);
    setDecryptingFile(false);

    if (!res.success) {
      setError(res.message || 'Gagal mendekripsi file .enc');
      return;
    }

    const byteCharacters = atob(res.data.fileBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetDecryptedName || 'file-terdekripsi';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setShowDecryptModal(false);
    setEncFileToDecrypt(null);
    setEncJsonText('');
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus item ini?')) return;
    const res = await vaultApi.delete(id);
    if (res.success) { if (selectedItem?.id === id) { setSelectedItem(null); setDecryptedContent(''); } loadItems(); }
    else { setError(res.message); }
  }

  async function handleView(id) {
    setLoading(true);
    const res = await vaultApi.get(id);
    setLoading(false);
    if (res.success) { setSelectedItem(res.data); setDecryptedContent(''); setDecryptKey(''); }
    else { setError(res.message); }
  }

  async function handleDecrypt() {
    if (!selectedItem || !decryptKey) { setError('Kunci Vigenere harus diisi untuk mendekripsi'); return; }
    setError('');
    let parsedPayload;
    try { parsedPayload = JSON.parse(selectedItem.encryptedData); } catch { setError('Data vault corrupt'); return; }
    setLoading(true);
    const res = await cryptoApi.decryptMessage(parsedPayload.payload || parsedPayload, decryptKey);
    setLoading(false);
    if (res.success) { setDecryptedContent(res.data.text); }
    else { setError(res.message || 'Gagal mendekripsi: Kunci mungkin salah'); }
  }

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.fileName && item.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let selectedMeta = null;
  if (selectedItem?.encryptedData) {
    try {
      selectedMeta = JSON.parse(selectedItem.encryptedData);
    } catch {
      selectedMeta = null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Archival Fragment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 dark:border-stone-700/80 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
              VAULT // 02
            </span>
            <span className="text-[11px] font-mono text-stone-700 dark:text-amber-300/90 font-bold uppercase tracking-wider">
              5-LAYER CASCADE REPOSITORY (HKDF + SHAKE256 + AES-GCM + CHACHA20 + HMAC)
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight mt-1">
            Brankas Dokumen &amp; Bukti Liputan
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowDecryptModal(true)}
            className="px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 dossier-panel hover:opacity-90 transition-colors"
          >
            <Unlock className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
            <span>Dekripsi .enc</span>
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all uppercase tracking-wider shadow-sm ${
              showAdd
                ? 'bg-stone-800 dark:bg-stone-700 text-amber-50'
                : 'bg-red-800 hover:bg-red-900 text-amber-50'
            }`}
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAdd ? 'Batal' : 'Tambah Berkas'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-red-900/15 dark:bg-red-950/50 border-l-4 border-red-700 rounded flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-900 dark:text-red-200 text-xs font-mono font-bold">{error}</p>
        </div>
      )}

      {/* Add New Fragment Panel */}
      {showAdd && (
        <div className="p-4 dossier-panel rounded space-y-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-amber-200">
              CREATE // NEW 5-LAYER EVIDENCE ARTIFACT
            </span>
            <div className="flex dossier-surface p-0.5 rounded">
              <button
                type="button"
                onClick={() => setAddMode('text')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
                  addMode === 'text'
                    ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                Catatan Teks
              </button>
              <button
                type="button"
                onClick={() => setAddMode('file')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1.5 ${
                  addMode === 'file'
                    ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Berkas Liputan</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1">
              IDENTIFIKASI / JUDUL ARSIP
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 dossier-input rounded text-xs font-mono font-bold transition-colors"
              placeholder={addMode === 'file' ? 'Contoh: Rekaman Bukti Investigasi 2026' : 'Contoh: Kontak Narasumber Rahasia'} />
          </div>

          {addMode === 'text' ? (
            <>
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1">
                  KONTEN TEKS RAHASIA (5-LAYER ENCRYPTED)
                </label>
                <textarea value={secretContent} onChange={(e) => setSecretContent(e.target.value)}
                  className="w-full px-3 py-2 dossier-input rounded text-xs font-mono transition-colors"
                  rows={3} placeholder="Data yang akan diamankan dengan 5 lapisan kriptografi..." />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1">
                  KUNCI KRIPTOGRAFI VIGENÈRE &amp; HKDF SEED
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600 dark:text-amber-400" />
                  <input type="text" value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 dossier-input rounded text-xs font-mono tracking-wider transition-colors font-bold"
                    placeholder="Kunci unik pemilik data..." />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200 mb-1">
                UNGGAH DOKUMEN / MEDIA (MAKS 10 MB)
              </label>
              <div className="border-2 border-dashed border-stone-400 dark:border-stone-600 rounded p-4 text-center cursor-pointer transition-colors relative dossier-surface hover:border-red-700">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-red-700 dark:text-amber-400" />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-mono font-bold">{selectedFile.name}</p>
                      <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300">{formatSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-mono font-bold">Pilih berkas dokumen dari sistem</p>
                      <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300">
                        Otomatis diamankan 5 lapis: HKDF-SHA512 &rarr; SHAKE-256 &rarr; AES-GCM &rarr; ChaCha20 &rarr; HMAC-SHA512
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button onClick={handleCreateItem} disabled={loading}
            className="w-full py-2.5 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm">
            {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Enkripsi 5-Lapis Berjalan...</span></>) : (<><ShieldCheck className="w-3.5 h-3.5" /><span>Amankan ke Brankas</span></>)}
          </button>
        </div>
      )}

      {/* Bento Grid: Items list & Interactive Detail Fragment */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              BERKAS ARSIP TERSIMPAN
            </span>
            <span className="text-[10px] font-mono text-stone-700 dark:text-amber-300 font-bold">
              {filteredItems.length} / {items.length} TOTAL
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau nama berkas..."
              className="w-full pl-8 pr-3 py-1.5 dossier-input rounded text-xs font-mono"
            />
          </div>

          {loading && !items.length && (
            <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 py-6 justify-center font-mono text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /><span>Memuat arsip...</span>
            </div>
          )}

          {!loading && !filteredItems.length && (
            <div className="py-10 flex flex-col items-center justify-center text-stone-700 dark:text-stone-300 gap-1 rounded border border-dashed border-stone-400 dark:border-stone-700 dossier-surface">
              <FolderLock className="w-6 h-6 text-stone-600 dark:text-stone-300 mb-1" />
              <span className="text-xs font-mono font-bold">
                {items.length ? 'Tidak ada berkas yang cocok' : 'Belum ada berkas terdaftar'}
              </span>
            </div>
          )}

          <div className="space-y-2 max-h-[430px] overflow-y-auto pr-0.5">
            {filteredItems.map((item, idx) => {
              const isFile = Boolean(item.fileName);
              const Icon = isFile ? File : FileText;
              const isSelected = selectedItem?.id === item.id;
              return (
                <div key={item.id}
                  className={`p-3 rounded flex items-center gap-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'dossier-panel border-red-700 dark:border-amber-500 shadow-sm'
                      : 'dossier-surface hover:border-stone-500 dark:hover:border-stone-500'
                  }`}
                  onClick={() => handleView(item.id)}>
                  <div className="w-8 h-8 rounded bg-stone-300/70 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-stone-800 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-red-800 dark:text-red-400 font-bold">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <p className="font-bold text-xs truncate">{item.title}</p>
                    </div>
                    <p className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-medium truncate">
                      {isFile ? `${item.fileName} • ${formatSize(item.fileSize)}` : 'Catatan Teks 5-Layer Terenkripsi'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1 text-stone-700 dark:text-stone-300 hover:text-red-700 dark:hover:text-red-400 rounded transition-colors" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Item Detail Fragment (Viewer) */}
        <div className="lg:col-span-3">
          <div className="pb-1 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              INSPEKSI BERKAS ARSIP
            </span>
          </div>

          {selectedItem ? (
            <div className="p-4 dossier-panel rounded space-y-3.5 shadow-sm">
              <div className="flex items-start justify-between pb-2.5 border-b border-stone-400/40 dark:border-stone-700 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rubber-stamp text-[9px] text-red-800 dark:text-red-400 font-bold">
                      TERVERIFIKASI
                    </span>
                    <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300 font-bold truncate">
                      REF-ID: {selectedItem.id}
                    </span>
                  </div>
                  <h4 className="text-base font-serif font-black mt-1 break-words">{selectedItem.title}</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold dossier-surface flex-shrink-0">
                  {selectedItem.fileName ? '5L CHACHA20 CASCADE' : '5L HYBRID AEAD'}
                </span>
              </div>

              {/* 5-Layer Security Pipeline Indicator */}
              <div className="p-2.5 rounded dossier-surface space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-red-800 dark:text-amber-400">
                  <Layers className="w-3 h-3" />
                  <span>LAPISAN KRIPTOGRAFI AKTIF:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(selectedMeta?.layers || selectedMeta?.payload?.layers || VAULT_FILE_PIPELINE).map((layer, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-[9px] font-mono font-bold">
                      {layer}
                    </span>
                  ))}
                </div>
              </div>

              {selectedItem.fileName ? (
                <div className="space-y-3">
                  <div className="p-3 dossier-surface rounded space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-700 dark:text-stone-300 font-bold">Nama Berkas:</span>
                      <span className="font-bold truncate max-w-xs">{selectedItem.fileName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-700 dark:text-stone-300 font-bold">Ukuran Asli:</span>
                      <span className="font-bold">{formatSize(selectedItem.fileSize)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-700 dark:text-stone-300 font-bold">Tipe Berkas:</span>
                      <span className="font-bold">{selectedItem.fileType || 'binary/stream'}</span>
                    </div>
                    {selectedMeta?.sha3_256 && (
                      <div className="pt-1 border-t border-stone-300 dark:border-stone-800 text-[10px] font-mono">
                        <span className="text-stone-700 dark:text-stone-300 font-bold block">SHA3-256 Seal:</span>
                        <span className="break-all font-bold text-emerald-800 dark:text-emerald-400">{selectedMeta.sha3_256}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={() => handleDownloadFile(selectedItem.id)}
                      disabled={downloading || downloadingEnc}
                      className="flex-1 py-2 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      {downloading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Mendekripsi...</span></>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /><span>Unduh File Asli</span></>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadEncryptedFile(selectedItem.id)}
                      disabled={downloading || downloadingEnc}
                      className="flex-1 py-2 dossier-surface hover:opacity-90 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      {downloadingEnc ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Mengunduh...</span></>
                      ) : (
                        <><Lock className="w-3.5 h-3.5" /><span>Unduh Berkas .enc</span></>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-700 dark:text-stone-300 mb-1">
                      DATA CIPHERTEXT (DATABASE PAYLOAD)
                    </label>
                    <textarea readOnly value={selectedItem.encryptedData}
                      className="w-full px-3 py-2 dossier-input font-mono text-[10px] rounded resize-none font-bold" rows={3} />
                  </div>

                  <div className="pt-2 border-t border-stone-400/40 dark:border-stone-700 space-y-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-800 dark:text-amber-200">
                      DEKRIPSI KONTEN SECARA INSTAN
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600 dark:text-amber-400" />
                        <input type="text" value={decryptKey} onChange={(e) => setDecryptKey(e.target.value)}
                          placeholder="Masukkan kunci Vigenere..."
                          className="w-full pl-9 pr-3 py-1.5 dossier-input rounded text-xs font-mono font-bold" />
                      </div>
                      <button onClick={handleDecrypt} disabled={loading}
                        className="px-4 py-1.5 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5" /><span>Buka</span>
                      </button>
                    </div>

                    {decryptedContent && (
                      <div className="p-3 dossier-surface border border-emerald-700/50 rounded mt-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 text-xs font-mono mb-1 font-bold">
                          <Eye className="w-3.5 h-3.5" />
                          <span>HASIL DEKRIPSI TEKS ASLI:</span>
                        </div>
                        <p className="text-xs font-mono font-bold whitespace-pre-wrap">{decryptedContent}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 rounded border border-dashed border-stone-400 dark:border-stone-700 dossier-surface flex flex-col items-center justify-center text-stone-800 dark:text-stone-200 gap-1.5 p-4 text-center">
              <FolderLock className="w-7 h-7 text-stone-600 dark:text-stone-300 mb-1" />
              <span className="text-xs font-mono font-bold">Pilih salah satu item berkas di sebelah kiri</span>
              <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300">Setiap berkas diproteksi 5 lapis kriptografi terautentikasi</span>
            </div>
          )}
        </div>
      </div>

      {/* Decrypt .enc Modal - Noir Dossier Theme */}
      {showDecryptModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="dossier-paper rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-400/50 dark:border-stone-700 pb-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-red-700 dark:text-red-400" />
                <h3 className="text-sm font-bold font-mono tracking-wide uppercase">Dekripsi Berkas .enc</h3>
              </div>
              <button
                onClick={() => { setShowDecryptModal(false); setEncFileToDecrypt(null); setEncJsonText(''); }}
                className="p-1 text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-stone-700 dark:text-stone-300">
              Unggah berkas <span className="text-red-700 dark:text-amber-400 font-bold">.enc</span> (5-Layer Cascade JSON / ChaCha20-Poly1305) untuk diverifikasi HMAC-SHA512 dan didekripsi kembali ke berkas aslinya.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-700 dark:text-amber-200 mb-1">
                  FILE .ENC
                </label>
                <input
                  type="file"
                  accept=".enc,application/json"
                  onChange={handleEncFileSelect}
                  className="w-full text-xs font-mono dossier-input file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:font-bold file:bg-red-800 file:text-amber-50 cursor-pointer p-2 rounded"
                />
              </div>

              {encFileToDecrypt && (
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider block text-stone-700 dark:text-amber-200 mb-1">
                    NAMA FILE KELUARAN:
                  </label>
                  <input
                    type="text"
                    value={targetDecryptedName}
                    onChange={(e) => setTargetDecryptedName(e.target.value)}
                    placeholder="Contoh: dokumen-pulih.pdf"
                    className="w-full px-3 py-2 dossier-input text-xs font-mono font-bold rounded"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-400/40 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setShowDecryptModal(false)}
                className="px-3 py-1.5 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 hover:underline"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDecryptUploadedFile}
                disabled={!encFileToDecrypt || decryptingFile}
                className="px-4 py-1.5 bg-red-800 hover:bg-red-900 disabled:opacity-50 text-amber-50 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                {decryptingFile ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Mendekripsi...</span></>
                ) : (
                  <><Download className="w-3.5 h-3.5" /><span>Dekripsi &amp; Simpan</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
