import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { discoverDongles } from './dongle.js';

const execFileAsync = promisify(execFile);

const REMOVABLE_CACHE_TTL_MS = 5000;
let cachedRemovableDrives = null;
let lastScanTimestamp = 0;
let removableScanInFlight = null;

export const DEFAULT_SEARCH_FOLDERS = [
  'KriptoInfoDongle',
  'KryptoInfoDongle',
  'kriptoinfodongle',
  'kryptoinfodongle',
  '.kryptoinfo/dongles',
  'KriptoInfo/dongles',
  'KryptoInfo/dongles',
  '.kryptoinfo'
];

function splitPaths(value) {
  return String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

async function queryWindowsRemovableDrivesRaw() {
  if (process.platform !== 'win32') return [];

  // Use .NET DriveInfo through PowerShell. It returns only drives Windows
  // classifies as Removable; no directory contents are read by PowerShell.
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$roots = @([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -eq [System.IO.DriveType]::Removable -and $_.IsReady } | ForEach-Object { $_.Name })",
    'ConvertTo-Json -InputObject $roots -Compress'
  ].join('; ');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 7000, maxBuffer: 1024 * 1024 }
    );
    const parsed = JSON.parse(stdout.trim() || '[]');
    if (Array.isArray(parsed)) return parsed.filter(value => typeof value === 'string');
    return typeof parsed === 'string' ? [parsed] : [];
  } catch (error) {
    console.warn(`[discovery] Peringatan deteksi drive removable Windows: ${error.message}`);
    return [];
  }
}

function refreshWindowsRemovableDrives() {
  if (!removableScanInFlight) {
    removableScanInFlight = queryWindowsRemovableDrivesRaw()
      .then(drives => {
        cachedRemovableDrives = drives;
        lastScanTimestamp = Date.now();
        return drives;
      })
      .finally(() => {
        removableScanInFlight = null;
      });
  }
  return removableScanInFlight;
}

export async function getWindowsRemovableDrives({ force = false } = {}) {
  if (process.platform !== 'win32') return [];

  if (!force && cachedRemovableDrives !== null) {
    if (Date.now() - lastScanTimestamp > REMOVABLE_CACHE_TTL_MS) {
      // Background refresh non-blocking agar respons tetap instan (< 15ms)
      refreshWindowsRemovableDrives().catch(() => {});
    }
    return cachedRemovableDrives.filter(drive => {
      try {
        return existsSync(drive);
      } catch {
        return false;
      }
    });
  }

  return refreshWindowsRemovableDrives();
}

// Pemanasan awal (warm-up) cache drive saat modul dimuat di Windows
if (process.platform === 'win32' && !process.env.DONGLE_DISABLE_WARMUP) {
  refreshWindowsRemovableDrives().catch(() => {});
}

/**
 * Scan seluruh drive Windows aktif untuk mendeteksi folder KriptoInfoDongle / KryptoInfoDongle
 * atau file kryptoinfo-dongle*.json / kriptoinfo-dongle*.json di root drive.
 * Bekerja sangat cepat (< 5ms) dan mendeteksi flashdisk USB meskipun Windows
 * mengklasifikasikannya sebagai Fixed drive (misalnya flashdisk USB 3.0 dengan RMB=0).
 */
export function getDrivesWithDongleFolder() {
  if (process.platform !== 'win32') return [];
  const candidateFolders = ['KriptoInfoDongle', 'KryptoInfoDongle', '.kryptoinfo'];
  const foundDrives = [];
  const systemDrive = (process.env.SystemDrive || 'C:').toUpperCase();
  const driveLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const hasDongleArtifact = (root) => {
    for (const folder of candidateFolders) {
      if (existsSync(path.join(root, folder))) {
        return true;
      }
    }
    try {
      const entries = readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && /^kr[iy]ptoinfo.*dongle$/i.test(entry.name)) {
          return true;
        }
        if (entry.isFile() && /^kr[iy]ptoinfo-dongle.*\.json$/i.test(entry.name)) {
          return true;
        }
      }
    } catch {
      // Abaikan jika root tidak dapat dibaca
    }
    return false;
  };

  for (const letter of driveLetters) {
    const root = `${letter}:\\`;
    try {
      if (!existsSync(root)) continue;
      if (hasDongleArtifact(root)) {
        foundDrives.push(root);
      }
    } catch {
      // Abaikan drive yang sedang sibuk / tidak siap
    }
  }

  try {
    const sysRoot = `${systemDrive}\\`;
    if (existsSync(sysRoot) && !foundDrives.includes(sysRoot) && hasDongleArtifact(sysRoot)) {
      foundDrives.push(sysRoot);
    }
  } catch {}

  return foundDrives;
}

export async function getDongleRoots(env = process.env) {
  const roots = [];
  if (env.DONGLE_SCAN_DRIVES !== 'false') {
    roots.push(...await getWindowsRemovableDrives());
    roots.push(...getDrivesWithDongleFolder());
  }
  roots.push(...splitPaths(env.DONGLE_EXTRA_ROOTS));

  return [...new Set(roots.map(root => path.resolve(root)))];
}

export async function findAvailableDongles(env = process.env) {
  const roots = await getDongleRoots(env);
  const searchFolders = env.DONGLE_SEARCH_FOLDERS
    ? splitPaths(env.DONGLE_SEARCH_FOLDERS)
    : DEFAULT_SEARCH_FOLDERS;
  return discoverDongles({ roots, searchFolders });
}

export function publicDongleInfo(dongle) {
  return {
    id: dongle.id,
    username: dongle.username,
    fileName: dongle.fileName,
    drive: dongle.drive,
    driveLetter: dongle.drive,
    fingerprint: dongle.fingerprint
  };
}
