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
  User,
  Loader2,
  ShieldCheck,
  Menu,
  X,
  Activity,
  Cpu,
  ChevronDown,
  CheckCircle2,
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
      <div className="min-h-screen flex items-center justify-center vault-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-vault-950/80 border border-vault-700/30 flex items-center justify-center animate-glow">
            <Shield className="w-6 h-6 text-vault-400" />
          </div>
          <div className="flex items-center gap-2 text-dark-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memeriksa sesi kriptografi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const tabs = [
    { id: 'message', label: 'Pesan', icon: MessageSquareLock, badge: 'AES+Vig' },
    { id: 'vault', label: 'Brankas Dokumen', icon: Lock, badge: 'ChaCha20' },
    { id: 'stego', label: 'Steganografi', icon: Image, badge: 'LSB PNG' },
    { id: 'blockchain', label: 'Integritas Data', icon: Link2, badge: 'SHA-256' },
    { id: 'audit', label: 'Log Aktivitas', icon: History, badge: 'Audit' },
  ];

  return (
    <div className="min-h-screen vault-bg flex flex-col transition-colors selection:bg-red-500/20">

      {/* Top Bar Header - Detective File Folder Tab */}
      <header className="border-b-2 border-stone-800 bg-[#141210] text-[#ede4d1] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Left: Vintage Press / Bureau Stamp Title */}
          <div className="flex items-center gap-3">
            <span className="rubber-stamp text-[10px] tracking-wider text-red-500 border-red-500">
              PIKATAN // BUREAU
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-black tracking-tight text-lg text-amber-100">
                DATA LIPUTAN
              </span>
              <span className="font-mono text-[10px] text-stone-400 hidden sm:inline uppercase tracking-widest">
                / CLASSIFIED EVIDENCE
              </span>
            </div>
          </div>

          {/* Center: Folder Tabs like Hanging File Folders */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#1f1c19] p-1 rounded border border-stone-800">
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#ede4d1] text-[#1c1917] shadow-md border border-[#baa98f]'
                      : 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  }`}
                >
                  <span className={isActive ? 'text-red-700' : 'text-stone-500'}>
                    [{idx + 1}]
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Status Stamp & Agent Info */}
          <div className="flex items-center gap-2.5">
            <span className="rubber-stamp text-[9px] text-amber-500 border-amber-600 hidden lg:inline-block">
              3FA SECURED
            </span>

            <button
              onClick={() => setCryptoModalOpen(true)}
              className="p-1.5 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors"
              title="Crypto Tools Lab"
            >
              <Cpu className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors"
              title="Lampu Meja"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1f1c19] border border-stone-700 text-xs font-mono text-amber-100 hover:bg-stone-800 transition-colors"
              >
                <span className="text-red-500 font-bold">@</span>
                <span>{currentUser?.username || 'agen'}</span>
                <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#1c1917] border-2 border-stone-700 rounded shadow-2xl p-2 z-50 animate-fade-in text-xs font-mono">
                  <div className="px-2 py-1.5 border-b border-stone-800 mb-1">
                    <p className="font-bold text-amber-100">IDENTITAS AGEN</p>
                    <p className="text-stone-400 text-[10px]">@{currentUser?.username}</p>
                  </div>
                  <button
                    onClick={() => { setUserDropdownOpen(false); setHealthModalOpen(true); }}
                    className="w-full text-left px-2 py-1.5 rounded text-stone-300 hover:bg-stone-800 flex items-center gap-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-red-500" />
                    <span>Audit Postur 3FA</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-2 py-1.5 rounded text-red-400 hover:bg-red-950/40 flex items-center gap-2 mt-1 border-t border-stone-800 pt-1.5"
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
              className="md:hidden p-1.5 text-stone-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1c1917] border-b border-stone-800 p-3 space-y-1">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-mono font-bold rounded flex items-center justify-between ${
                  activeTab === tab.id ? 'bg-[#ede4d1] text-[#1c1917]' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>[{idx + 1}] {tab.label}</span>
                <span className="text-[10px] text-stone-500">{tab.badge}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area - Detective Dossier Evidence Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <div className="dossier-paper rounded-lg p-6 sm:p-8 relative shadow-2xl">
          {/* Evidence Push Pin on the top center */}
          <div className="push-pin" />
          
          {/* Dossier File Case Tag */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-stone-300 dark:border-stone-700/80">
            <div className="flex items-center gap-3">
              <span className="rubber-stamp text-xs text-red-700 dark:text-red-500">
                EVIDENCE FILE
              </span>
              <span className="font-mono text-xs text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider">
                DOCUMENTATION CLASSIFIED // 3FA ACTIVE
              </span>
            </div>
            <span className="font-mono text-xs text-stone-500">
              CASE REF: #123240116-H
            </span>
          </div>

          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </main>

      {/* Minimal Archival Footer */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] py-3.5 bg-white/50 dark:bg-black/20 text-slate-500 dark:text-zinc-500 text-[11px] font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
            <span>Pikatan // Investigative Archival Engine</span>
          </div>
          <span>ChaCha20 • AES-256-GCM • Argon2id • Ed25519 • SHA-256</span>
        </div>
      </footer>

      {/* Interactive Modals */}
      <CryptoToolModal isOpen={cryptoModalOpen} onClose={() => setCryptoModalOpen(false)} />
      <SecurityHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} user={currentUser} />
    </div>
  );
}

export default App;
