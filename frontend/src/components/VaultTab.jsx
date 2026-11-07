import React, { useState, useEffect } from 'react';
import { vaultApi, cryptoApi } from '../services/api';
import {
  Lock, Unlock, Plus, Trash2, KeyRound, FileText, CreditCard,
  FolderLock, AlertCircle, Loader2, ChevronRight, X, Eye, ShieldCheck
} from 'lucide-react';

const CATEGORY_META = {
  NOTE: { label: 'Catatan Rahasia', icon: FileText, color: 'text-blue-400' },
  CREDENTIAL: { label: 'Kredensial / Akun', icon: CreditCard, color: 'text-amber-400' },
  DOCUMENT: { label: 'Dokumen Ringkas', icon: FolderLock, color: 'text-purple-400' },
};

export default function VaultTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('NOTE');
  const [secretContent, setSecretContent] = useState('');
  const [vigenereKey, setVigenereKey] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [decryptKey, setDecryptKey] = useState('');

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const res = await vaultApi.list();
    setLoading(false);
    if (res.success) { setItems(res.data); } else { setError(res.message); }
  }

  async function handleCreateItem() {
    if (!title.trim() || !secretContent.trim() || !vigenereKey.trim()) { setError('Semua field wajib diisi'); return; }
    setError(''); setLoading(true);
    const encRes = await cryptoApi.encryptMessage(secretContent, vigenereKey);
    if (!encRes.success) { setLoading(false); setError(encRes.message || 'Gagal mengenkripsi konten'); return; }
    const res = await vaultApi.create({ title, category, encryptedData: encRes.data });
    setLoading(false);
    if (res.success) { setShowAdd(false); setTitle(''); setSecretContent(''); setVigenereKey(''); loadItems(); }
    else { setError(res.message); }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vault-500/10 border border-vault-600/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-vault-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Digital Vault</h2>
            <p className="text-xs text-dark-400">Penyimpanan terenkripsi zero-knowledge</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${showAdd ? 'bg-dark-800 text-dark-400 border border-dark-700' : 'bg-vault-600 hover:bg-vault-500 text-white shadow-lg shadow-vault-600/20'}`}>
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Batal' : 'Tambah Item'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {showAdd && (
        <div className="p-5 bg-dark-900/60 border border-dark-700/50 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-vault-400" />
            <h3 className="font-semibold text-vault-400 text-sm">Tambah Item Baru</h3>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Judul</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-900/80 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
              placeholder="Contoh: Password Email Penting" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Kategori</label>
            <div className="flex gap-2">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button key={key} onClick={() => setCategory(key)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${category === key ? 'bg-vault-600/20 border-vault-600/30 text-vault-400' : 'bg-dark-900/40 border-dark-700/30 text-dark-400 hover:border-dark-600'}`}>
                  <meta.icon className="w-3.5 h-3.5" />
                  {meta.label.split(' / ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Konten Rahasia (Plaintext)</label>
            <textarea value={secretContent} onChange={(e) => setSecretContent(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-900/80 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
              rows={3} placeholder="Data yang akan dienkripsi sebelum disimpan..." />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5 uppercase tracking-wider font-medium">Kunci Kriptografi (Vigenere Key)</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input type="text" value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-dark-900/80 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm"
                placeholder="Kunci unik untuk dekripsi nantinya..." />
            </div>
          </div>
          <button onClick={handleCreateItem} disabled={loading}
            className="w-full py-3 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 disabled:text-dark-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-vault-600/20">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>) : (<><ShieldCheck className="w-4 h-4" />{'Enkripsi & Simpan ke Vault'}</>)}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-dark-400 uppercase tracking-wider font-medium">Item Tersimpan</span>
            <span className="text-xs text-dark-500">{items.length} item</span>
          </div>
          {loading && !items.length && (
            <div className="flex items-center gap-2 text-dark-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Memuat...</span>
            </div>
          )}
          {!loading && !items.length && (
            <div className="py-12 flex flex-col items-center justify-center text-dark-500 gap-2 bg-dark-900/30 rounded-xl border border-dashed border-dark-700/30">
              <FolderLock className="w-8 h-8 text-dark-600" />
              <span className="text-xs">Vault kosong</span>
              <span className="text-[10px] text-dark-600">Tambah item pertama untuk memulai</span>
            </div>
          )}
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.NOTE;
            const Icon = meta.icon;
            return (
              <div key={item.id}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${selectedItem?.id === item.id ? 'bg-vault-600/10 border-vault-600/30' : 'bg-dark-900/40 border-dark-700/30 hover:border-dark-600'}`}
                onClick={() => handleView(item.id)}>
                <div className="w-9 h-9 rounded-lg bg-dark-800/60 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{item.title}</p>
                  <p className="text-[10px] text-dark-400 uppercase tracking-wider">{meta.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1.5 text-dark-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-dark-600" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          <span className="block text-xs text-dark-400 uppercase tracking-wider font-medium mb-2">Detail Item</span>
          {selectedItem ? (
            <div className="p-5 bg-dark-900/60 border border-dark-700/50 rounded-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedItem.title}</h4>
                  <span className={`inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-lg bg-dark-800/60 ${(CATEGORY_META[selectedItem.category] || CATEGORY_META.NOTE).color}`}>
                    {(() => { const I = (CATEGORY_META[selectedItem.category] || CATEGORY_META.NOTE).icon; return <I className="w-3 h-3" />; })()}
                    {(CATEGORY_META[selectedItem.category] || CATEGORY_META.NOTE).label}
                  </span>
                </div>
                <Lock className="w-4 h-4 text-dark-500" />
              </div>
              <div>
                <label className="block text-[10px] text-dark-500 mb-1 uppercase tracking-wider">Data Terenkripsi (Ciphertext)</label>
                <textarea readOnly value={selectedItem.encryptedData}
                  className="w-full px-3 py-2 bg-dark-950/60 text-dark-500 font-mono text-[10px] rounded-xl border border-dark-800/50 resize-none" rows={3} />
              </div>
              <div className="border-t border-dark-700/30 pt-4 space-y-3">
                <label className="block text-xs text-dark-400 uppercase tracking-wider font-medium">Dekripsi Konten</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input type="text" value={decryptKey} onChange={(e) => setDecryptKey(e.target.value)}
                      placeholder="Masukkan kunci Vigenere..."
                      className="w-full pl-10 pr-3 py-2.5 bg-dark-900/80 text-white rounded-xl border border-dark-700/50 focus:border-vault-500/50 focus:outline-none text-sm" />
                  </div>
                  <button onClick={handleDecrypt} disabled={loading}
                    className="px-4 py-2.5 bg-vault-600 hover:bg-vault-500 disabled:bg-dark-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                    <Unlock className="w-4 h-4" />Buka
                  </button>
                </div>
                {decryptedContent && (
                  <div className="p-4 bg-vault-950/30 border border-vault-700/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-3.5 h-3.5 text-vault-400" />
                      <span className="text-xs text-vault-400 font-medium">Konten Terdekripsi</span>
                    </div>
                    <p className="text-white text-sm whitespace-pre-wrap">{decryptedContent}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-dark-900/30 border border-dashed border-dark-700/30 rounded-2xl flex flex-col items-center justify-center text-dark-500 gap-2">
              <FolderLock className="w-8 h-8 text-dark-600" />
              <span className="text-xs">Pilih item untuk melihat detail</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
