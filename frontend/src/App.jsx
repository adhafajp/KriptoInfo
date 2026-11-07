import React, { useState, useEffect } from 'react';
import MessageTab from './components/MessageTab';
import VaultTab from './components/VaultTab';
import StegoTab from './components/StegoTab';
import BlockchainTab from './components/BlockchainTab';
import LoginPage from './components/LoginPage';
import { authApi } from './services/api';

import {
  Shield,
  MessageSquareLock,
  Lock,
  Image,
  Link2,
  LogOut,
  User,
  Loader2,
  ShieldCheck
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('message');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center vault-bg" style={{ background: '#0a0f0d' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-vault-950/80 border border-vault-700/30 flex items-center justify-center animate-glow">
            <Shield className="w-6 h-6 text-vault-400" />
          </div>
          <div className="flex items-center gap-2 text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memeriksa sesi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabs = [
    { id: 'message', label: 'Pesan Rahasia', icon: MessageSquareLock },
    { id: 'vault', label: 'Vault Storage', icon: Lock },
    { id: 'stego', label: 'Steganografi', icon: Image },
    { id: 'blockchain', label: 'Blockchain', icon: Link2 },
  ];

  return (
    <div className="min-h-screen vault-bg" style={{ background: '#0a0f0d' }}>

      {/* Top Bar */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-vault-950/80 border border-vault-700/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-vault-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">
                KryptoInfo
              </h1>
              <p className="text-[10px] text-vault-500 font-medium tracking-widest uppercase">
                Secure Digital Vault
              </p>
            </div>
          </div>

          {/* User & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-900/60 rounded-lg border border-dark-800/50">
              <User className="w-3.5 h-3.5 text-vault-400" />
              <span className="text-xs text-dark-300 font-medium">
                {currentUser?.username || 'Authenticated'}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-vault-400 animate-pulse" />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-800/30 text-red-300 rounded-lg text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-dark-800/30 bg-dark-950/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-vault-600/20 text-vault-400 border border-vault-600/30'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/40 border border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="vault-card rounded-2xl p-6">
          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-dark-600" />
            <span className="text-dark-600 text-[11px]">
              Vigenere + AES-256-GCM + ChaCha20-Poly1305 + Ed25519 + SHA-256
            </span>
          </div>
          <span className="text-dark-700 text-[10px]">
            KryptoInfo v1.0 — UPN &quot;Veteran&quot; Yogyakarta
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App
