import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { discoverDongles } from './dongle.js';

const execFileAsync = promisify(execFile);

function splitPaths(value) {
  return String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

export async function getWindowsRemovableDrives() {
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
    const wrapped = new Error(`Gagal memeriksa drive removable Windows: ${error.message}`);
    wrapped.code = 'USB_DISCOVERY_FAILED';
    throw wrapped;
  }
}

export async function getDongleRoots(env = process.env) {
  const roots = [];
  if (env.DONGLE_SCAN_DRIVES !== 'false') {
    roots.push(...await getWindowsRemovableDrives());
  }
  roots.push(...splitPaths(env.DONGLE_EXTRA_ROOTS));

  return [...new Set(roots.map(root => path.resolve(root)))];
}

export async function findAvailableDongles(env = process.env) {
  const roots = await getDongleRoots(env);
  const searchFolders = splitPaths(
    env.DONGLE_SEARCH_FOLDERS || 'KryptoInfoDongle;.kryptoinfo/dongles;KryptoInfo/dongles'
  );
  return discoverDongles({ roots, searchFolders });
}

export function publicDongleInfo(dongle) {
  return {
    id: dongle.id,
    username: dongle.username,
    fileName: dongle.fileName,
    drive: dongle.drive,
    fingerprint: dongle.fingerprint
  };
}
