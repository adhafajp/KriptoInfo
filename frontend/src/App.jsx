import { useState, useEffect } from 'react';
import MessageTab from './components/MessageTab';
import VaultTab from './components/VaultTab';
import StegoTab from './components/StegoTab';
import BlockchainTab from './components/BlockchainTab';
import LoginPage from './components/LoginPage';
import { authApi } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('message');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek status login saat aplikasi dimulai
  useEffect(() => {
    async function checkAuth() {
      const res = await authApi.me();
      if (res.success && res.data) {
        setCurrentUser(res.data);
        setIsLoggedIn(true);
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    await authApi.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  }

  function handleLoginSuccess(userData) {
    setCurrentUser(userData);
    setIsLoggedIn(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <p className="text-dark-300">Memeriksa sesi...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white p-4">
      <header className="mb-8 text-center relative">
        <div className="absolute right-0 top-0 flex items-center gap-3">
          <span className="text-xs text-dark-300">
            User: <strong className="text-primary-400">{currentUser?.username || 'Authenticated'}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1 bg-red-900/40 hover:bg-red-800 border border-red-700 text-red-200 rounded"
          >
            Logout
          </button>
        </div>
        <h1 className="text-4xl font-bold text-primary-400 mb-2">
          KryptoInfo
        </h1>
        <p className="text-dark-300 text-lg">
          Digital Vault dengan 3-Layer Security
        </p>
      </header>

      <nav className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { id: 'message', label: 'Pesan Rahasia' },
            { id: 'vault', label: 'Vault Storage' },
            { id: 'stego', label: 'Steganografi' },
            { id: 'blockchain', label: 'Blockchain' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto">
        <div className="p-6 bg-dark-900 border border-dark-800 rounded-lg">
          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
        </div>
      </main>

      <footer className="mt-10 text-center text-dark-400 text-xs">
        <p>
          Sistem Kriptografi Tiga Lapis: Vigenere → AES-256-GCM → ChaCha20-Poly1305
        </p>
        <p className="mt-2">
          Dibangun dengan React 18, Express.js, Prisma, dan MariaDB.
          <br />
          Port Backend: <span className="text-primary-400">3001</span> | Port Frontend: <span className="text-primary-400">5174</span>
        </p>
      </footer>
    </div>
  );
}

export default App
