import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_DONGLE_FILE_BYTES = 64 * 1024;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function makeError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function usernameFromFile(fileName, dongle) {
  if (typeof dongle.username === 'string' && dongle.username.trim()) {
    return dongle.username.trim().slice(0, 80);
  }
  const match = fileName.match(/^kryptoinfo-dongle-(.+)\.json$/i);
  return match ? match[1].slice(0, 80) : 'Dongle';
}

async function readDongle(filePath) {
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    throw makeError('File dongle tidak ditemukan.', 'DONGLE_NOT_FOUND');
  }

  if (!fileStat.isFile() || fileStat.size <= 0 || fileStat.size > MAX_DONGLE_FILE_BYTES) {
    throw makeError('Ukuran atau tipe file dongle tidak valid.', 'DONGLE_INVALID');
  }

  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    throw makeError('File dongle tidak dapat dibaca.', 'DONGLE_NOT_FOUND');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw makeError('Isi JSON dongle tidak valid.', 'DONGLE_INVALID');
  }

  if (typeof data.privateKeyPkcs8 !== 'string' || !data.privateKeyPkcs8.trim()) {
    throw makeError('Field privateKeyPkcs8 tidak ditemukan.', 'DONGLE_INVALID');
  }

  let privateKey;
  try {
    privateKey = createPrivateKey({
      key: Buffer.from(data.privateKeyPkcs8, 'base64'),
      format: 'der',
      type: 'pkcs8'
    });
  } catch {
    throw makeError('Private key dalam file dongle tidak valid.', 'DONGLE_INVALID');
  }

  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw makeError('Kunci dongle bukan Ed25519.', 'DONGLE_INVALID');
  }

  const publicKey = createPublicKey(privateKey);
  const publicDer = publicKey.export({ format: 'der', type: 'spki' });
  const fingerprint = createHash('sha256').update(publicDer).digest('hex').slice(0, 16);

  return {
    privateKey,
    username: usernameFromFile(path.basename(filePath), data),
    fingerprint
  };
}

function uniquePaths(items) {
  const map = new Map();
  for (const item of items) {
    const normalized = path.resolve(item);
    map.set(process.platform === 'win32' ? normalized.toLowerCase() : normalized, normalized);
  }
  return [...map.values()];
}

/**
 * Scan known dongle locations one directory deep only. Each valid JSON file
 * containing an Ed25519 PKCS#8 privateKeyPkcs8 is treated as a dongle.
 * The function accepts explicit roots to make testing independent of Windows.
 */
export async function discoverDongles({ roots = [], searchFolders = ['KryptoInfoDongle', '.kryptoinfo/dongles', 'KryptoInfo/dongles'] } = {}) {
  const candidates = [];

  for (const root of uniquePaths(roots)) {
    const directories = [root, ...searchFolders.map(folder => path.join(root, folder))];
    for (const directory of uniquePaths(directories)) {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;
        candidates.push(path.join(directory, entry.name));
      }
    }
  }

  const found = [];
  for (const filePath of uniquePaths(candidates)) {
    try {
      const dongle = await readDongle(filePath);
      const absolutePath = path.resolve(filePath);
      // ID distinguishes separate files, including copies of the same key.
      const id = createHash('sha256')
        .update(`${absolutePath}|${dongle.fingerprint}`)
        .digest('hex')
        .slice(0, 24);

      const driveMatch = absolutePath.match(/^([A-Za-z]:)/);
      found.push({
        id,
        username: dongle.username,
        fileName: path.basename(filePath),
        drive: driveMatch?.[1] || 'Local folder',
        fingerprint: dongle.fingerprint,
        // Internal-only property. Never serialize this object directly.
        filePath: absolutePath
      });
    } catch {
      // Ignore ordinary JSON files and invalid dongle files without exposing
      // their contents or private-key material.
    }
  }

  return found.sort((a, b) => `${a.drive}/${a.fileName}`.localeCompare(`${b.drive}/${b.fileName}`));
}

export async function readDonglePrivateKey(filePath) {
  const dongle = await readDongle(filePath);
  return dongle.privateKey;
}

export async function signDongleChallenge(filePath, challengeText) {
  if (typeof challengeText !== 'string' || !CHALLENGE_PATTERN.test(challengeText)) {
    throw makeError('Challenge tidak valid. Minta challenge baru dari backend.', 'INVALID_CHALLENGE');
  }
  const privateKey = await readDonglePrivateKey(filePath);
  const signature = sign(null, Buffer.from(challengeText, 'utf8'), privateKey);
  return signature.toString('base64url');
}
