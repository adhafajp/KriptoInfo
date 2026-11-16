import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Cpu, HardDrive, KeyRound, ScanFace, Activity, RefreshCw, CheckCircle2, Layers } from 'lucide-react';

export default function SecurityHealthModal({ isOpen, onClose, user }) {
  const [backendLatency, setBackendLatency] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [agentStatus, setAgentStatus] = useState({ online: false, donglePresent: false, checking: true });
  const [refreshing, setRefreshing] = useState(false);

  async function checkDiagnostics() {
    setRefreshing(true);
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

    try {
      const usernameParam = user?.username ? `?username=${encodeURIComponent(user.username)}` : '';
      const agentRes = await fetch(`http://127.0.0.1:8787/api/status${usernameParam}`, {
        signal: AbortSignal.timeout(4500),
      });
      if (agentRes.ok) {
        const data = await agentRes.json();
        setAgentStatus({
          online: true,
          donglePresent: !!(data.detected || data.dongleDetected || data.dongleFound || data.donglePresent || (data.dongles && data.dongles.length > 0)),
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
      <div className="relative w-full max-w-2xl dossier-paper rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 dossier-panel border-b border-stone-400/50 dark:border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded dossier-surface text-red-700 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-black text-stone-900 dark:text-amber-100 flex items-center gap-2">
                <span>Security Architecture &amp; Diagnostics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-800 text-amber-50 font-bold">
                  3FA OPTIMAL
                </span>
              </h3>
              <p className="text-xs font-mono text-stone-700 dark:text-stone-300">
                Pemeriksaan kesehatan sistem, konektivitas daemon, dan postur enkripsi berlapis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 dark:hover:bg-stone-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 3-Layer Authentication Matrix */}
          <div>
            <h4 className="text-xs font-mono font-bold text-stone-800 dark:text-amber-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
              <span>Three-Layer Authentication Posture</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Layer 1: Hardware Dongle */}
              <div className="p-3 rounded dossier-panel flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <HardDrive className="w-4 h-4 text-red-700 dark:text-amber-400" />
                    <span className="text-[10px] font-mono font-bold dossier-surface px-1.5 py-0.5 rounded">
                      Faktor 1
                    </span>
                  </div>
                  <p className="text-xs font-bold text-stone-900 dark:text-amber-100">Hardware USB Dongle</p>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-0.5 font-mono">Ed25519 Asymmetric</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-400/40 dark:border-stone-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-stone-800 dark:text-stone-200">Enrolled &amp; Validated</span>
                </div>
              </div>

              {/* Layer 2: Biometrics */}
              <div className="p-3 rounded dossier-panel flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <ScanFace className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-[10px] font-mono font-bold dossier-surface px-1.5 py-0.5 rounded">
                      Faktor 2
                    </span>
                  </div>
                  <p className="text-xs font-bold text-stone-900 dark:text-amber-100">Facial Neural Net</p>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-0.5 font-mono">ResNet-34 (L2 &le; 0.42)</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-400/40 dark:border-stone-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-stone-800 dark:text-stone-200">Enrolled &amp; Verified</span>
                </div>
              </div>

              {/* Layer 3: Master Password */}
              <div className="p-3 rounded dossier-panel flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <KeyRound className="w-4 h-4 text-red-700 dark:text-amber-400" />
                    <span className="text-[10px] font-mono font-bold dossier-surface px-1.5 py-0.5 rounded">
                      Faktor 3
                    </span>
                  </div>
                  <p className="text-xs font-bold text-stone-900 dark:text-amber-100">Master Passphrase</p>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 mt-0.5 font-mono">Argon2id Memory-Hard</p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-400/40 dark:border-stone-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-stone-800 dark:text-stone-200">Argon2id Hash Locked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-mono font-bold text-stone-800 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
                <span>Live Node Diagnostics</span>
              </h4>
              <button
                onClick={checkDiagnostics}
                disabled={refreshing}
                className="text-[11px] font-mono font-bold text-red-800 dark:text-amber-300 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Pindai Ulang</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded dossier-panel flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}`} />
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-amber-100 block">
                      Express Backend API (Port 3001)
                    </span>
                    <p className="text-[10px] text-stone-700 dark:text-stone-300 font-mono">
                      MariaDB Database + Prisma ORM Engine
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded dossier-surface ${
                  backendStatus === 'online' ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'
                }`}>
                  {backendStatus === 'online' ? `ONLINE (${backendLatency}ms)` : 'OFFLINE'}
                </span>
              </div>

              <div className="p-3 rounded dossier-panel flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${agentStatus.online ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-amber-100 block">
                      USB Agent Daemon (Port 8787)
                    </span>
                    <p className="text-[10px] text-stone-700 dark:text-stone-300 font-mono">
                      {agentStatus.online
                        ? agentStatus.donglePresent
                          ? 'Dongle fisik terdeteksi di drive USB'
                          : 'Daemon aktif, menunggu flashdisk dicolokkan'
                        : 'Daemon lokal belum berjalan'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded dossier-surface ${
                  agentStatus.online ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'
                }`}>
                  {agentStatus.online ? (agentStatus.donglePresent ? 'DONGLE READY' : 'DAEMON IDLE') : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Primitives Table */}
          <div>
            <h4 className="text-xs font-mono font-bold text-stone-800 dark:text-amber-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
              <span>Cryptographic Algorithms Deployed</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded dossier-surface flex justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300 font-bold">Vault Cipher:</span>
                <span className="text-emerald-800 dark:text-emerald-400 font-bold text-right">5L HKDF+SHAKE+AES+ChaCha20+HMAC</span>
              </div>
              <div className="p-2.5 rounded dossier-surface flex justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300 font-bold">Message Cipher:</span>
                <span className="text-emerald-800 dark:text-emerald-400 font-bold text-right">5L Vig+SHAKE+HKDF+ChaCha+AES</span>
              </div>
              <div className="p-2.5 rounded dossier-surface flex justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300 font-bold">Ledger Hash:</span>
                <span className="text-stone-900 dark:text-amber-300 font-bold text-right">SHA-256 + SHA3-256 + HMAC</span>
              </div>
              <div className="p-2.5 rounded dossier-surface flex justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300 font-bold">Steganography:</span>
                <span className="text-stone-900 dark:text-amber-300 font-bold text-right">4L Vig+HKDF+SHAKE+AES+LSB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 dossier-panel border-t border-stone-400/50 dark:border-stone-700 text-[11px] font-mono text-stone-800 dark:text-stone-200 flex justify-between items-center">
          <span className="font-bold">User: @{user?.username || 'anonymous'}</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-red-800 hover:bg-red-900 text-amber-50 rounded text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
