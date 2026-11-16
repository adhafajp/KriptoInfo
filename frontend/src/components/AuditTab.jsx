import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Search, Download, Clock, CheckCircle2,
  XCircle, AlertCircle, FileText, ShieldCheck
} from 'lucide-react';
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

  const successCount = logs.filter(l => l.status.toUpperCase() === 'SUCCESS').length;
  const failedCount = logs.length - successCount;

  function getActionBadge(action) {
    if (action.includes('LOGIN') || action.includes('AUTH') || action.includes('ENROLL')) {
      return 'bg-emerald-900/10 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-700/40';
    }
    if (action.includes('VAULT') || action.includes('ENCRYPT')) {
      return 'bg-amber-900/10 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-700/40';
    }
    if (action.includes('BLOCK') || action.includes('LEDGER')) {
      return 'bg-red-900/10 dark:bg-red-950/60 text-red-900 dark:text-red-300 border-red-700/40';
    }
    return 'dossier-surface';
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-stone-400/40 dark:border-stone-700/80 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rubber-stamp text-[10px] text-red-800 dark:text-red-400 font-bold">
              AUDIT // 05
            </span>
            <span className="text-[11px] font-mono text-stone-700 dark:text-amber-300/90 font-bold uppercase tracking-wider">
              FORENSIC SECURITY TRAIL &bull; 3FA ACCESS LOGS
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight mt-1">
            Log Aktivitas &amp; Pemantauan Keamanan
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-mono font-bold dossier-panel hover:opacity-90 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="px-3.5 py-1.5 bg-red-800 hover:bg-red-900 disabled:opacity-40 text-amber-50 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-3 gap-3 font-mono">
        <div className="p-3 dossier-panel rounded shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
            Total Rekaman
          </span>
          <span className="text-lg font-black">{logs.length}</span>
        </div>
        <div className="p-3 dossier-panel rounded shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
            Berhasil (Success)
          </span>
          <span className="text-lg font-black text-emerald-800 dark:text-emerald-400">{successCount}</span>
        </div>
        <div className="p-3 dossier-panel rounded shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 dark:text-red-400 block">
            Ditolak / Gagal
          </span>
          <span className="text-lg font-black text-red-800 dark:text-red-400">{failedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded dossier-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-700 dark:text-stone-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aksi (LOGIN, ENROLLMENT, LOGOUT) atau detail..."
            className="w-full dossier-input rounded pl-9 pr-3.5 py-2 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[10px] font-bold uppercase text-stone-800 dark:text-stone-200 mr-1">
            Status:
          </span>
          {['ALL', 'SUCCESS', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-stone-900 dark:bg-amber-500 text-amber-50 dark:text-stone-950 shadow-sm'
                  : 'dossier-surface text-stone-800 dark:text-stone-200 hover:opacity-85'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded bg-red-900/15 dark:bg-red-950/50 border-l-4 border-red-700 text-xs font-mono text-red-900 dark:text-red-200 flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs List */}
      <div className="rounded dossier-panel shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-stone-300/40 dark:bg-stone-900/60 border-b border-stone-400/50 dark:border-stone-700 flex items-center justify-between text-xs font-mono">
          <span className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-red-700 dark:text-amber-400" />
            Daftar Rekaman Audit ({filteredLogs.length})
          </span>
          <span className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">
            Maksimum 50 entri terbaru
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-800 dark:text-stone-200 text-xs font-mono flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-red-700 dark:text-amber-400" />
            <span className="font-bold">Mengambil rekaman audit dari database...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-stone-800 dark:text-stone-200 text-xs font-mono flex flex-col items-center gap-2 dossier-surface">
            <FileText className="w-8 h-8 text-stone-600 dark:text-stone-300" />
            <span className="font-bold">Tidak ada rekaman audit yang sesuai dengan filter.</span>
          </div>
        ) : (
          <div className="divide-y divide-stone-400/30 dark:divide-stone-800 max-h-[480px] overflow-y-auto">
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
                <div key={log.id} className="p-3.5 dossier-surface hover:opacity-95 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap font-mono">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                        <span className={`text-[10px] font-black ${isSuccess ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">
                          ID: {log.id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs mt-1 font-mono break-all font-medium">
                        {log.detail || 'Operasi tercatat tanpa anomali'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-stone-700 dark:text-stone-300 font-mono font-bold flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
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
