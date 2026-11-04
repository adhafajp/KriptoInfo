import { useState, useEffect } from 'react';
import { vaultApi, cryptoApi } from '../services/api';

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

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const res = await vaultApi.list();
    setLoading(false);
    if (res.success) {
      setItems(res.data);
    } else {
      setError(res.message);
    }
  }

  async function handleCreateItem() {
    if (!title.trim() || !secretContent.trim() || !vigenereKey.trim()) {
      setError('Semua field wajib diisi');
      return;
    }
    setError('');
    setLoading(true);
    
    // Encrypt content first using Vigenere + AES
    const encRes = await cryptoApi.encryptMessage(secretContent, vigenereKey);
    if (!encRes.success) {
      setLoading(false);
      setError(encRes.message || 'Gagal mengenkripsi konten');
      return;
    }

    const res = await vaultApi.create({
      title,
      category,
      encryptedData: encRes.data
    });
    setLoading(false);

    if (res.success) {
      setShowAdd(false);
      setTitle('');
      setSecretContent('');
      setVigenereKey('');
      loadItems();
    } else {
      setError(res.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus item ini?')) return;
    const res = await vaultApi.delete(id);
    if (res.success) {
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setDecryptedContent('');
      }
      loadItems();
    } else {
      setError(res.message);
    }
  }

  async function handleView(id) {
    setLoading(true);
    const res = await vaultApi.get(id);
    setLoading(false);
    if (res.success) {
      setSelectedItem(res.data);
      setDecryptedContent('');
      setDecryptKey('');
    } else {
      setError(res.message);
    }
  }

  async function handleDecrypt() {
    if (!selectedItem || !decryptKey) {
      setError('Kunci Vigenere harus diisi untuk mendekripsi');
      return;
    }
    setError('');
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(selectedItem.encryptedData);
    } catch {
      setError('Data vault corrupt');
      return;
    }

    setLoading(true);
    const res = await cryptoApi.decryptMessage(parsedPayload.payload || parsedPayload, decryptKey);
    setLoading(false);

    if (res.success) {
      setDecryptedContent(res.data.text);
    } else {
      setError(res.message || 'Gagal mendekripsi: Kunci mungkin salah');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Digital Vault Storage</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/20 font-mono">
              {items.length} items
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Penyimpanan data rahasia terenkripsi client-side sebelum disimpan ke MariaDB.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="self-start sm:self-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
        >
          <span>{showAdd ? '✕ Tutup Form' : '+ Simpan Data Baru'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {showAdd && (
        <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-4 shadow-xl">
          <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <span>Enkripsi & Simpan Item Baru</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Judul Item</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm focus:outline-none"
                placeholder="Contoh: Kredensial Database Prod"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 text-xs sm:text-sm focus:outline-none"
              >
                <option value="NOTE">Catatan Rahasia (NOTE)</option>
                <option value="CREDENTIAL">Kredensial / Akun (CREDENTIAL)</option>
                <option value="DOCUMENT">Dokumen Ringkas (DOCUMENT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Konten Rahasia (Plaintext)</label>
            <textarea
              value={secretContent}
              onChange={(e) => setSecretContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm font-mono focus:outline-none"
              rows={3}
              placeholder="Masukkan password, catatan sensitif, atau token API..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kunci Kriptografi (Vigenère Key)</label>
            <input
              type="text"
              value={vigenereKey}
              onChange={(e) => setVigenereKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs sm:text-sm font-mono focus:outline-none"
              placeholder="Kunci unik untuk dekripsi nantinya..."
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateItem}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              {loading ? 'Mengenkripsi & Menyimpan...' : '🔒 Enkripsi & Simpan ke Vault'}
            </button>
          </div>
        </div>
      )}

      {/* Grid of Items & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Item List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Daftar Vault Item
          </h3>

          {loading && !items.length && (
            <div className="p-8 rounded-2xl bg-[#0a0f1d] border border-white/5 text-center text-xs text-slate-500">
              Memuat data vault...
            </div>
          )}

          {!loading && !items.length && (
            <div className="p-8 rounded-2xl bg-[#0a0f1d] border border-white/5 text-center text-xs text-slate-500">
              Belum ada item di vault. Klik tombol Tambah Item.
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const badgeColors = {
                NOTE: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
                CREDENTIAL: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
                DOCUMENT: 'bg-purple-500/10 text-purple-300 border-purple-500/20'
              };
              return (
                <div
                  key={item.id}
                  onClick={() => handleView(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-[#0a0f1d] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-100 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${badgeColors[item.category] || badgeColors.NOTE}`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Hapus"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Item Detail & Decrypt */}
        <div className="lg:col-span-7">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Detail & Dekripsi Item
          </h3>

          {selectedItem ? (
            <div className="p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedItem.title}</h4>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono inline-block mt-1">
                    {selectedItem.category}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: {selectedItem.id.slice(0, 8)}...
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Ciphertext Stored in Database (AES-256-GCM / ChaCha20 Envelope):
                </label>
                <textarea
                  readOnly
                  value={selectedItem.encryptedData}
                  className="w-full px-3 py-2 bg-black/60 text-slate-400 font-mono text-[11px] rounded-xl border border-white/5 focus:outline-none"
                  rows={4}
                />
              </div>

              {/* Decrypt Box */}
              <div className="pt-2 border-t border-white/[0.06] space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Buka Konten Rahasia (Masukkan Kunci Vigenère):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                    placeholder="Masukkan kunci Vigenère..."
                    className="flex-1 px-3.5 py-2 bg-slate-900 text-slate-100 rounded-xl border border-white/10 focus:border-cyan-500 text-xs sm:text-sm font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleDecrypt}
                    disabled={loading}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all"
                  >
                    {loading ? 'Mendekripsi...' : 'Buka Kunci'}
                  </button>
                </div>

                {decryptedContent && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      ✓ Konten Rahasia Terbuka:
                    </p>
                    <p className="text-slate-100 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {decryptedContent}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#0a0f1d] border border-dashed border-white/10 text-center flex flex-col items-center justify-center text-slate-500 text-xs sm:text-sm gap-2">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Pilih salah satu item di sebelah kiri untuk melihat payload dan membuka kuncinya.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
