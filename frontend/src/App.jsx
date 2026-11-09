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
    { id: 'message', label: 'Pesan Rahasia', icon: MessageSquareLock, badge: 'AES+Vig' },
    { id: 'vault', label: 'Vault Storage', icon: Lock, badge: 'ChaCha20' },
    { id: 'stego', label: 'Steganografi', icon: Image, badge: 'LSB PNG' },
    { id: 'blockchain', label: 'Blockchain', icon: Link2, badge: 'SHA-256' },
    { id: 'audit', label: 'Audit & Forensik', icon: History, badge: 'WORM' },
  ];

  return (
    <div className="min-h-screen vault-bg flex flex-col transition-colors">

      {/* Top Bar Header */}
      <header className="border-b border-slate-200/80 dark:border-dark-800/80 bg-white/90 dark:bg-dark-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-vault-500/10 dark:bg-vault-950/80 border border-vault-500/30 dark:border-vault-700/40 flex items-center justify-center shadow-lg shadow-vault-950/20">
              <ShieldCheck className="w-5 h-5 text-vault-500 dark:text-vault-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                  KryptoInfo
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-vault-500/10 text-vault-600 dark:text-vault-400 border border-vault-500/20">
                  v1.2
                </span>
              </div>
              <p className="text-[10px] text-vault-600 dark:text-vault-500 font-medium tracking-widest uppercase mt-0.5">
                Three-Layer Digital Vault
              </p>
            </div>
          </div>

          {/* Center Action Controls (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* System Posture Health Button */}
            <button
              onClick={() => setHealthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-900/90 dark:hover:bg-dark-850 border border-slate-200 dark:border-dark-700/70 hover:border-vault-500/40 rounded-xl text-xs font-medium text-slate-700 dark:text-dark-200 transition-all shadow-sm group"
            >
              <div className="w-2 h-2 rounded-full bg-vault-500 dark:bg-vault-400 animate-pulse" />
              <Activity className="w-3.5 h-3.5 text-vault-500 dark:text-vault-400 group-hover:scale-110 transition-transform" />
              <span>3FA Protected</span>
            </button>

            {/* Quick Crypto Lab Hasher Button */}
            <button
              onClick={() => setCryptoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-500/10 dark:bg-vault-600/15 hover:bg-vault-500/20 dark:hover:bg-vault-600/25 border border-vault-500/30 text-vault-700 dark:text-vault-300 rounded-xl text-xs font-medium transition-all shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5 text-vault-500 dark:text-vault-400" />
              <span>Crypto Lab</span>
            </button>
          </div>

          {/* User Profile Dropdown, Theme Switcher & Mobile Hamburger Toggle */}
          <div className="flex items-center gap-2">
            {/* Desktop Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 dark:hover:bg-dark-850 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-dark-300 hover:text-vault-600 dark:hover:text-vault-400 transition-all shadow-sm"
              title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-vault-600" />}
            </button>

            {/* User Dropdown (Desktop) */}
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-900/80 dark:hover:bg-dark-850 border border-slate-200 dark:border-dark-800 rounded-xl text-xs font-medium text-slate-700 dark:text-dark-200 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-vault-500/20 border border-vault-500/30 flex items-center justify-center text-vault-600 dark:text-vault-300 font-bold text-[11px]">
                  {currentUser?.username ? currentUser.username[0].toUpperCase() : 'U'}
                </div>
                <span className="font-mono text-slate-700 dark:text-dark-300">
                  @{currentUser?.username || 'user'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-dark-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-950 border border-slate-200 dark:border-dark-750 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in border-vault-500/20">
                  <div className="pb-3 border-b border-slate-200 dark:border-dark-800/80">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Akun Vault Terautentikasi</p>
                    <p className="text-[11px] text-slate-500 dark:text-dark-400 font-mono">@{currentUser?.username}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-dark-300">
                        <CheckCircle2 className="w-3 h-3 text-vault-500 dark:text-vault-400" />
                        <span>Password (Argon2id)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-dark-300">
                        <CheckCircle2 className="w-3 h-3 text-vault-500 dark:text-vault-400" />
                        <span>Facial Biometrics (ResNet-34)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-dark-300">
                        <CheckCircle2 className="w-3 h-3 text-vault-500 dark:text-vault-400" />
                        <span>Hardware Dongle (Ed25519)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setHealthModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-900 flex items-center gap-2 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-vault-500 dark:text-vault-400" />
                      Status Sistem & 3FA
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setCryptoModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-900 flex items-center gap-2 transition-colors"
                    >
                      <Cpu className="w-3.5 h-3.5 text-cyber-500 dark:text-cyber-400" />
                      Crypto Lab & Hasher
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors pt-2 border-t border-slate-200 dark:border-dark-800/80 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout dari Vault
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-vault-500 dark:text-vault-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[57px] bg-white/95 dark:bg-black/80 backdrop-blur-md z-50 flex flex-col p-4 animate-fade-in border-t border-slate-200 dark:border-dark-800">
            {/* User Info Bar */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-dark-900/90 border border-slate-200 dark:border-dark-800 mb-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-vault-500/20 border border-vault-500/30 flex items-center justify-center text-vault-600 dark:text-vault-300 font-bold text-xs">
                  {currentUser?.username ? currentUser.username[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">@{currentUser?.username}</p>
                  <p className="text-[10px] text-vault-600 dark:text-vault-400 font-mono">3FA Active & Locked</p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-vault-500 dark:bg-vault-400 animate-pulse" />
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              <p className="text-[10px] font-mono text-slate-400 dark:text-dark-500 uppercase tracking-wider px-2 mb-1">
                Navigasi Modul
              </p>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                    activeTab === tab.id
                      ? 'bg-vault-500/15 dark:bg-vault-600/20 text-vault-700 dark:text-vault-300 border border-vault-500/40 shadow-sm'
                      : 'text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-dark-900/40 hover:bg-slate-100 dark:hover:bg-dark-900 border border-slate-200 dark:border-dark-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <tab.icon className="w-4 h-4 text-vault-500 dark:text-vault-400" />
                    <span>{tab.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-dark-400 border border-slate-200 dark:border-dark-800">
                    {tab.badge}
                  </span>
                </button>
              ))}

              <div className="pt-4 border-t border-slate-200 dark:border-dark-800/80 space-y-2">
                <p className="text-[10px] font-mono text-slate-400 dark:text-dark-500 uppercase tracking-wider px-2">
                  Alat & Tampilan
                </p>
                {/* Mobile Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-dark-900/60 text-slate-700 dark:text-dark-200 border border-slate-200 dark:border-dark-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-vault-600" />}
                    <span>Tema Tampilan</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-950 text-slate-700 dark:text-dark-300 border border-slate-200 dark:border-dark-850">
                    {isDark ? 'DARK' : 'LIGHT'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCryptoModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-dark-900/60 text-cyber-600 dark:text-cyber-300 border border-cyber-500/30 dark:border-cyber-500/20 flex items-center gap-2.5"
                >
                  <Cpu className="w-4 h-4 text-cyber-500 dark:text-cyber-400" />
                  <span>Buka Crypto Lab & Hasher</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setHealthModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-dark-900/60 text-vault-700 dark:text-vault-300 border border-vault-500/30 dark:border-vault-500/20 flex items-center gap-2.5"
                >
                  <Activity className="w-4 h-4 text-vault-500 dark:text-vault-400" />
                  <span>Inspeksi Postur 3FA & Node</span>
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-dark-800 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout dari Vault</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Horizontal Tab Navigation Bar */}
      <nav className="border-b border-slate-200/60 dark:border-dark-800/60 bg-slate-50/70 dark:bg-dark-950/60 hidden lg:block transition-colors">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-vault-500/10 dark:bg-vault-600/20 text-vault-700 dark:text-vault-300 border border-vault-500/30 dark:border-vault-500/40 shadow-sm'
                    : 'text-slate-600 dark:text-dark-400 hover:text-slate-900 dark:hover:text-dark-200 hover:bg-slate-100 dark:hover:bg-dark-900/60 border border-transparent'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 text-vault-500 dark:text-vault-400" />
                <span>{tab.label}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  activeTab === tab.id
                    ? 'bg-vault-500/20 dark:bg-vault-500/20 text-vault-800 dark:text-vault-200 border border-vault-500/30'
                    : 'bg-slate-200/60 dark:bg-dark-900 text-slate-500 dark:text-dark-500 border border-slate-300/50 dark:border-dark-800'
                }`}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="vault-card rounded-2xl p-6 shadow-2xl">
          {activeTab === 'message' && <MessageTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'stego' && <StegoTab />}
          {activeTab === 'blockchain' && <BlockchainTab />}
          {activeTab === 'audit' && <AuditTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-dark-800/40 mt-auto bg-slate-50/70 dark:bg-dark-950/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-vault-500" />
            <span className="text-slate-500 dark:text-dark-500 text-[11px] font-mono">
              ChaCha20-Poly1305 • AES-256-GCM • Argon2id • ResNet-34 • Ed25519 • SHA-256
            </span>
          </div>
          <span className="text-slate-500 dark:text-dark-600 text-[10px] font-mono">
            KryptoInfo — Final Cryptography Project (UPN &quot;Veteran&quot; Yogyakarta)
          </span>
        </div>
      </footer>

      {/* Interactive Modals */}
      <CryptoToolModal
        isOpen={cryptoModalOpen}
        onClose={() => setCryptoModalOpen(false)}
      />

      <SecurityHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        user={currentUser}
      />
    </div>
  );
}

export default App;
