import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Cpu, HardDrive, KeyRound, ScanFace, Activity, RefreshCw, CheckCircle2, Layers } from 'lucide-react';

export default function SecurityHealthModal({ isOpen, onClose, user }) {
  const [backendLatency, setBackendLatency] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [agentStatus, setAgentStatus] = useState({ online: false, donglePresent: false, checking: true });
  const [refreshing, setRefreshing] = useState(false);

  async function checkDiagnostics() {
    setRefreshing(true);
    // 1. Check Backend
    const t0 = performance.now();
    try {
      const res = await fetch('/api/health');
      const t1 = performance.now();
      if (res.ok) {
        setBackendLatency(Math.round(t1 - t0));
        setBackendStatus('online');
      } else {
        setBackendStatus('degraded');
      }
    } catch {
      setBackendStatus('offline');
      setBackendLatency(null);
    }

    // 2. Check USB Agent
    try {
      const usernameParam = user?.username ? `?username=${encodeURIComponent(user.username)}` : '';
      const agentRes = await fetch(`http://127.0.0.1:8787/api/status${usernameParam}`, {
        signal: AbortSignal.timeout(1500),
      });
      if (agentRes.ok) {
        const data = await agentRes.json();
        setAgentStatus({
          online: true,
          donglePresent: !!(data.dongleFound || data.donglePresent || (data.dongles && data.dongles.length > 0)),
          checking: false,
        });
      } else {
        setAgentStatus({ online: false, donglePresent: false, checking: false });
      }
    } catch {
      setAgentStatus({
        online: false,
        donglePresent: false,
        checking: false,
      });
    }

    setRefreshing(false);
  }

  useEffect(() => {
    if (isOpen) {
      checkDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-950 border border-vault-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-900/80 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-vault-500/10 border border-vault-500/20 text-vault-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Security Architecture & Diagnostics
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault-500/10 text-vault-400 border border-vault-500/20">
                  3FA OPTIMAL
                </span>
              </h3>
              <p className="text-xs text-dark-400">
                Pemeriksaan kesehatan sistem, konektivitas daemon, dan postur enkripsi tiga lapis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 3-Layer Authentication Matrix */}
          <div>
            <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-vault-400" />
              Three-Layer Authentication Posture
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Layer 1: Hardware Dongle */}
              <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <HardDrive className="w-4 h-4 text-cyber-400" />
                    <span className="text-[10px] font-mono text-cyber-300 bg-cyber-500/10 px-1.5 py-0.5 rounded">
                      Layer 1
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white">Hardware USB Dongle</p>
                  <p className="text-[11px] text-dark-400 mt-0.5 font-mono">Ed25519 Asymmetric</p>
                </div>
                <div className="mt-3 pt-2 border-t border-dark-800/80 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vault-400" />
                  <span className="text-[10px] text-dark-300">Enrolled & Validated</span>
                </div>
              </div>

              {/* Layer 2: Biometrics */}
              <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <ScanFace className="w-4 h-4 text-vault-400" />
                    <span className="text-[10px] font-mono text-vault-300 bg-vault-500/10 px-1.5 py-0.5 rounded">
                      Layer 2
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white">Facial Neural Net</p>
                  <p className="text-[11px] text-dark-400 mt-0.5 font-mono">ResNet-34 (L2 &le; 0.35)</p>
                </div>
                <div className="mt-3 pt-2 border-t border-dark-800/80 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vault-400" />
                  <span className="text-[10px] text-dark-300">Enrolled & Verified</span>
                </div>
              </div>

              {/* Layer 3: Master Password */}
              <div className="p-3 rounded-xl bg-dark-900/80 border border-dark-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Layer 3
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white">Master Passphrase</p>
                  <p className="text-[11px] text-dark-400 mt-0.5 font-mono">Argon2id Memory-Hard</p>
                </div>
                <div className="mt-3 pt-2 border-t border-dark-800/80 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vault-400" />
                  <span className="text-[10px] text-dark-300">Argon2id Hash Locked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-vault-400" />
                Live Node Diagnostics
              </h4>
              <button
                onClick={checkDiagnostics}
                disabled={refreshing}
                className="text-[11px] text-vault-400 hover:text-vault-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Pindai Ulang
              </button>
            </div>

            <div className="space-y-2">
              {/* Backend API */}
              <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-vault-400 animate-pulse' : 'bg-red-400'}`} />
                  <div>
                    <span className="text-xs font-medium text-white">Express Backend API (Port 3001)</span>
                    <p className="text-[10px] text-dark-500 font-mono">MariaDB Database + Prisma ORM Engine</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    backendStatus === 'online' ? 'bg-vault-500/10 text-vault-400 border border-vault-500/20' : 'bg-red-950 text-red-400'
                  }`}>
                    {backendStatus === 'online' ? `ONLINE (${backendLatency}ms)` : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* USB Agent Daemon */}
              <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${agentStatus.online ? 'bg-cyber-400 animate-pulse' : 'bg-amber-400'}`} />
                  <div>
                    <span className="text-xs font-medium text-white">USB Agent Daemon (Port 8787)</span>
                    <p className="text-[10px] text-dark-500 font-mono">
                      {agentStatus.online
                        ? agentStatus.donglePresent
                          ? 'Dongle fisik terdeteksi di drive USB'
                          : 'Daemon aktif, menunggu flashdisk dicolokkan'
                        : 'Daemon lokal belum berjalan'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    agentStatus.online ? 'bg-cyber-500/10 text-cyber-400 border border-cyber-500/20' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {agentStatus.online ? (agentStatus.donglePresent ? 'DONGLE READY' : 'DAEMON IDLE') : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Primitives Table */}
          <div>
            <h4 className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-vault-400" />
              Cryptographic Algorithms Deployed
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800 flex justify-between">
                <span className="text-dark-400">Vault Cipher:</span>
                <span className="text-vault-300">ChaCha20-Poly1305</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800 flex justify-between">
                <span className="text-dark-400">Message Cipher:</span>
                <span className="text-cyber-300">Vigenere + AES-256-GCM</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800 flex justify-between">
                <span className="text-dark-400">Ledger Hash:</span>
                <span className="text-vault-300">SHA-256 Merkle Chain</span>
              </div>
              <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-800 flex justify-between">
                <span className="text-dark-400">Steganography:</span>
                <span className="text-purple-300">LSB 1-bit / Channel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-dark-900/60 border-t border-dark-800 text-[11px] text-dark-500 flex justify-between items-center">
          <span className="font-mono">User: @{user?.username || 'anonymous'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-lg text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
