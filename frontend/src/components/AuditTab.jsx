import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Search, Download, Clock, CheckCircle2, XCircle, AlertCircle, Terminal, FileText } from 'lucide-react';
import { auditApi } from '../services/api';

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.list();
      if (res.success) {
        setLogs(res.data || []);
      } else {
        setError(res.error || 'Gagal memuat log audit.');
      }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke audit API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  function exportLogs() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kryptoinfo_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.detail && log.detail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      log.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  function getActionBadge(action) {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-vault-500/10 text-vault-400 border-vault-500/20';
    }
    if (action.includes('VAULT') || action.includes('ENCRYPT')) {
      return 'bg-cyber-500/10 text-cyber-400 border-cyber-500/20';
    }
    if (action.includes('BLOCK') || action.includes('LEDGER')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    if (action.includes('STEGO')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-dark-800 text-dark-300 border-dark-700';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-dark-900/90 via-dark-950 to-dark-900 border border-dark-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-vault-500/10 border border-vault-500/20 text-vault-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Log Aktivitas</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault-500/10 text-vault-400 border border-vault-500/20">
                AUDIT LOG
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-1 max-w-xl">
              Pencatatan riwayat aktivitas sistem. Setiap operasi autentikasi, enkripsi berkas, dan verifikasi blok tercatat untuk pemantauan keamanan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-2 bg-dark-900 hover:bg-dark-800 border border-dark-700 text-dark-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="px-3.5 py-2 bg-vault-600/20 hover:bg-vault-600/30 border border-vault-500/30 text-vault-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-dark-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aksi (LOGIN, VAULT, BLOCKCHAIN) atau detail..."
            className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-dark-100 placeholder-dark-500 focus:outline-none focus:border-vault-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-dark-400">Filter Status:</span>
          {['ALL', 'SUCCESS', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-vault-500/20 text-vault-300 border border-vault-500/30'
                  : 'bg-dark-950 text-dark-400 border border-dark-800 hover:text-dark-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table / List */}
      <div className="rounded-2xl bg-dark-950 border border-dark-800/80 shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-dark-900/80 border-b border-dark-800/80 flex items-center justify-between text-xs text-dark-400">
          <span className="font-semibold text-white">Daftar Rekaman Audit ({filteredLogs.length})</span>
          <span className="text-[11px] font-mono text-dark-500">Maksimum 50 entri terbaru</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-dark-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-vault-400" />
            <span>Mengambil rekaman audit dari database...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-dark-500 text-xs flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-dark-600" />
            <span>Tidak ada rekaman audit yang sesuai dengan filter.</span>
          </div>
        ) : (
          <div className="divide-y divide-dark-800/60">
            {filteredLogs.map((log) => {
              const isSuccess = log.status.toUpperCase() === 'SUCCESS';
              const dateStr = new Date(log.createdAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div key={log.id} className="p-4 hover:bg-dark-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-vault-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${isSuccess ? 'text-vault-400' : 'text-red-400'}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-dark-500 font-mono">
                          ID: {log.id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs text-dark-200 mt-1 font-mono break-all">
                        {log.detail || 'Tidak ada detail tambahan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-[11px] text-dark-500 font-mono flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-dark-500" />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
