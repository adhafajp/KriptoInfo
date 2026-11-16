import React, { useState, useEffect, useRef } from 'react';
import MessageTab from './components/MessageTab';
import VaultTab from './components/VaultTab';
import StegoTab from './components/StegoTab';
import BlockchainTab from './components/BlockchainTab';
import AuditTab from './components/AuditTab';
import LoginPage from './components/LoginPage';
import CryptoToolModal from './components/CryptoToolModal';
import SecurityHealthModal from './components/SecurityHealthModal';
import { authApi } from './services/api';
import { useTheme } from './context/ThemeContext';

import {
  Shield,
  MessageSquareLock,
  Lock,
  Image,
  Link2,
  LogOut,
  Loader2,
  Menu,
  X,
  Activity,
  Cpu,
  ChevronDown,
  History,
  Sun,
  Moon
} from 'lucide-react';

function App() {
  const { toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('message');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive controls state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);

  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await authApi.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }

  function handleLoginSuccess(userData) {
    setCurrentUser(userData);
    setIsLoggedIn(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center desk-canvas">
        <div className="dossier-paper rounded-lg px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
          <div className="w-12 h-12 rounded-lg bg-red-800/15 dark:bg-red-950/60 border border-red-700/40 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-700 dark:text-amber-400" />
          </div>
          <div className="flex items-center gap-2 text-stone-900 dark:text-amber-100 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-red-700 dark:text-amber-400" />
            <span className="text-sm font-bold">Memeriksa sesi kriptografi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabs = [
    { id: 'message', label: 'Pesan', icon: MessageSquareLock, badge: '5-Layer' },
    { id: 'vault', label: 'Brankas Dokumen', icon: Lock, badge: '5-Layer AEAD' },
    { id: 'stego', label: 'Steganografi', icon: Image, badge: '4-Layer LSB' },
    { id: 'blockchain', label: 'Integritas Data', icon: Link2, badge: 'SHA256+SHA3' },
    { id: 'audit', label: 'Log Aktivitas', icon: History, badge: 'Audit' },
  ];

  const activeTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="min-h-screen desk-canvas flex flex-col transition-colors selection:bg-red-800 selection:text-white">

      {/* Top Bar Header - Theme-Adaptive Detective File Folder Bar */}
      <header className="border-b-2 border-[#b8a789] dark:border-stone-800 bg-[#efe6d5]/95 dark:bg-[#141210]/95 backdrop-blur-md text-stone-900 dark:text-[#ede4d1] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Left: Identitas Aplikasi Tegas Tanpa Terpotong */}
          <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap">
            <div className="w-8 h-8 rounded bg-red-800 text-amber-50 flex items-center justify-center shadow-sm border border-red-950/30">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-black tracking-tight text-lg text-stone-900 dark:text-amber-300">
                PIKATAN
              </span>
              <span className="font-mono text-[10px] font-bold text-stone-700 dark:text-stone-300 hidden xl:inline-block uppercase tracking-widest">
                {'//'} BRANKAS INVESTIGASI
              </span>
            </div>
          </div>

          {/* Center: Folder Tabs Tanpa Nomor Urut */}
          <nav className="hidden md:flex items-center gap-1 bg-[#e3d7be] dark:bg-[#1f1c19] p-1 rounded border border-[#b8a789] dark:border-stone-800">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 dark:bg-[#ede4d1] text-amber-50 dark:text-[#1c1917] shadow-sm'
                      : 'text-stone-800 dark:text-stone-200 hover:bg-stone-900/10 dark:hover:bg-stone-800/80'
                  }`}
                >
                  <TabIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isActive ? 'text-amber-400 dark:text-red-700' : 'text-red-800 dark:text-amber-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Lab Tools, Theme Switcher & Agent Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setCryptoModalOpen(true)}
              className="p-1.5 rounded text-stone-800 dark:text-stone-200 hover:bg-stone-900/10 dark:hover:bg-stone-800 transition-colors border border-stone-400/50 dark:border-stone-700"
              title="Crypto Tools Lab"
            >
              <Cpu className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-stone-800 dark:text-stone-200 hover:bg-stone-900/10 dark:hover:bg-stone-800 transition-colors border border-stone-400/50 dark:border-stone-700"
              title={isDark ? 'Beralih ke Meja Siang (Light)' : 'Beralih ke Lampu Malam (Dark)'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-800" />}
            </button>

            {/* Profile trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#fcf9f2] dark:bg-[#1f1c19] border border-[#b8a789] dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-amber-100 hover:opacity-90 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-red-700 dark:text-red-400 font-black">@</span>
                <span className="max-w-[120px] truncate">{currentUser?.username || 'agen'}</span>
                <ChevronDown className={`w-3 h-3 text-stone-600 dark:text-stone-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 dossier-paper border-2 border-[#b8a789] dark:border-stone-700 rounded shadow-2xl p-2 z-50 animate-fade-in text-xs font-mono">
                  <div className="px-2 py-1.5 border-b border-stone-400/40 dark:border-stone-800 mb-1">
                    <p className="font-bold text-stone-900 dark:text-amber-200">IDENTITAS AGEN AKTIF</p>
                    <p className="text-stone-700 dark:text-stone-300 text-[10px] truncate font-bold">
                      @{currentUser?.username}
                    </p>
                  </div>
                  <button
                    onClick={() => { setUserDropdownOpen(false); setHealthModalOpen(true); }}
                    className="w-full text-left px-2 py-1.5 rounded text-stone-900 dark:text-stone-200 hover:bg-stone-300/60 dark:hover:bg-stone-800 flex items-center gap-2 font-bold"
                  >
                    <Activity className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                    <span>Audit Postur 3FA</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-2 py-1.5 rounded text-red-800 dark:text-red-400 hover:bg-red-900/15 dark:hover:bg-red-950/40 flex items-center gap-2 mt-1 border-t border-stone-400/40 dark:border-stone-800 pt-1.5 font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Berkas</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-stone-800 dark:text-stone-200 hover:bg-stone-900/10 dark:hover:bg-stone-800 rounded"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#efe6d5] dark:bg-[#1c1917] border-b border-[#b8a789] dark:border-stone-800 p-3 space-y-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-mono font-bold rounded flex items-center justify-between ${
                    isActive
                      ? 'bg-stone-900 dark:bg-[#ede4d1] text-amber-50 dark:text-[#1c1917]'
                      : 'text-stone-800 dark:text-stone-200 hover:bg-stone-300/50 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </span>
                  <span className="text-[10px] opacity-80">{tab.badge}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area - Detective Dossier Evidence Canvas */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-7 flex-1 w-full">
        <div className="dossier-paper rounded-lg p-5 sm:p-8 relative shadow-2xl">
          {/* Evidence Push Pin on the top center */}
          <div className="push-pin" />
          
          {/* Dossier File Case Tag */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b-2 border-stone-400/50 dark:border-stone-700/80">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="rubber-stamp text-xs text-red-800 dark:text-red-400">
                EVIDENCE FILE
              </span>
              <span className="font-mono text-xs text-stone-800 dark:text-stone-200 font-bold uppercase tracking-wider">
                {activeTabInfo.label} {'//'} {activeTabInfo.badge} &bull; 3FA ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-800 dark:text-stone-200 font-bold">
              <span className="px-2 py-0.5 rounded bg-emerald-900/15 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-700/50">
                SESI TERENKRIPSI
              </span>
              <span>REF: #123240116-H</span>
            </div>
          </div>

          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </main>

      {/* Minimal Archival Footer */}
      <footer className="border-t border-[#b8a789] dark:border-stone-800 py-3 bg-[#efe6d5]/90 dark:bg-[#141210]/90 text-stone-800 dark:text-stone-300 text-[11px] font-mono backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-700 dark:bg-red-500 inline-block" />
            <span>Pikatan {'//'} Investigative Archival Engine</span>
          </div>
          <span className="text-center font-medium">
            HKDF-SHA512 &bull; SHAKE-256 &bull; ChaCha20-Poly1305 &bull; AES-256-GCM &bull; HMAC-SHA512 &bull; Ed25519
          </span>
        </div>
      </footer>

      {/* Interactive Modals */}
      <CryptoToolModal isOpen={cryptoModalOpen} onClose={() => setCryptoModalOpen(false)} />
      <SecurityHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} user={currentUser} />
    </div>
  );
}

export default App;
