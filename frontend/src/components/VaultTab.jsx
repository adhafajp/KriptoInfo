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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Digital Vault Storage</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
        >
          {showAdd ? 'Batal' : '+ Tambah Item'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
          {error}
        </div>
      )}

      {showAdd && (
        <div className="p-4 bg-dark-800 border border-dark-700 rounded space-y-4">
          <h3 className="font-semibold text-primary-400">Tambah Item Baru ke Vault</h3>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 text-white rounded border border-dark-700"
              placeholder="Contoh: Password Email Penting"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 text-white rounded border border-dark-700"
            >
              <option value="NOTE">Catatan Rahasia</option>
              <option value="CREDENTIAL">Kredensial / Akun</option>
              <option value="DOCUMENT">Dokumen Ringkas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Konten Rahasia (Plaintext)</label>
            <textarea
              value={secretContent}
              onChange={(e) => setSecretContent(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 text-white rounded border border-dark-700"
              rows={3}
              placeholder="Data yang akan dienkripsi secara lokal sebelum disimpan..."
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Kunci Kriptografi (Vigenere Key)</label>
            <input
              type="text"
              value={vigenereKey}
              onChange={(e) => setVigenereKey(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 text-white rounded border border-dark-700"
              placeholder="Kunci unik untuk dekripsi nantinya..."
            />
          </div>
          <button
            onClick={handleCreateItem}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
          >
            {loading ? 'Menyimpan...' : 'Enkripsi & Simpan ke Vault'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-dark-300">Daftar Item ({items.length})</h3>
          {loading && !items.length && <p className="text-dark-400">Memuat...</p>}
          {!loading && !items.length && <p className="text-dark-400">Vault kosong.</p>}
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3 bg-dark-800 border rounded flex justify-between items-center cursor-pointer hover:border-primary-500 ${
                selectedItem?.id === item.id ? 'border-primary-500' : 'border-dark-700'
              }`}
              onClick={() => handleView(item.id)}
            >
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="text-xs text-primary-400">{item.category}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-dark-300 mb-2">Detail Item</h3>
          {selectedItem ? (
            <div className="p-4 bg-dark-800 border border-dark-700 rounded space-y-4">
              <div>
                <h4 className="text-lg font-bold text-white">{selectedItem.title}</h4>
                <span className="text-xs bg-dark-700 text-primary-300 px-2 py-0.5 rounded">
                  {selectedItem.category}
                </span>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Payload Terenkripsi (di DB)</label>
                <textarea
                  readOnly
                  value={selectedItem.encryptedData}
                  className="w-full px-2 py-1 bg-dark-900 text-dark-400 font-mono text-xs rounded border border-dark-700"
                  rows={4}
                />
              </div>

              <div className="border-t border-dark-700 pt-3 space-y-2">
                <label className="block text-sm text-dark-300">Dekripsi Konten</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                    placeholder="Masukkan kunci Vigenere..."
                    className="flex-1 px-3 py-1 bg-dark-900 text-white rounded border border-dark-700 text-sm"
                  />
                  <button
                    onClick={handleDecrypt}
                    disabled={loading}
                    className="px-4 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
                  >
                    Buka
                  </button>
                </div>
                {decryptedContent && (
                  <div className="mt-2 p-3 bg-dark-900 border border-green-700 rounded">
                    <p className="text-xs text-green-400 mb-1">Konten Asli:</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{decryptedContent}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-dark-800/50 border border-dashed border-dark-700 rounded text-center text-dark-400 text-sm">
              Pilih item dari daftar untuk melihat detail dan mendekripsi konten.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
