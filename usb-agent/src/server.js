import 'dotenv/config';
import http from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  findAvailableDongles,
  getDongleRoots,
  getDrivesWithDongleFolder,
  getWindowsRemovableDrives,
  publicDongleInfo
} from './discovery.js';
import { saveDongleToFolder, signDongleChallenge } from './dongle.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',').map(value => value.trim()).filter(Boolean);
const MAX_BODY_BYTES = 4096;
const signingRate = new Map();

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(body);
}

function checkOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true; // Allow local PowerShell/curl tests.
  if (!ALLOWED_ORIGINS.includes(origin)) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  return true;
}

function checkHost(req) {
  const host = String(req.headers.host || '').toLowerCase();
  return host === `127.0.0.1:${PORT}` || host === `localhost:${PORT}`;
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('Request body terlalu besar.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Body harus berupa JSON yang valid.');
    error.statusCode = 400;
    throw error;
  }
}

function allowSigning(req, res) {
  const ip = req.socket.remoteAddress || 'local';
  const now = Date.now();
  const state = signingRate.get(ip) || { start: now, count: 0 };
  if (now - state.start > 60_000) {
    state.start = now;
    state.count = 0;
  }
  state.count += 1;
  signingRate.set(ip, state);
  if (state.count > 20) {
    sendJson(res, 429, { success: false, message: 'Terlalu banyak permintaan signing. Coba lagi satu menit.' });
    return false;
  }
  return true;
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingDongles(dongles, rawUsername) {
  const reqUser = String(rawUsername || '').trim().toLowerCase();
  if (!reqUser) return [];

  const exactMatches = dongles.filter(d =>
    (d.username && d.username.toLowerCase() === reqUser) ||
    (d.fileName && (
      d.fileName.toLowerCase() === `kryptoinfo-dongle-${reqUser}.json` ||
      d.fileName.toLowerCase() === `kriptoinfo-dongle-${reqUser}.json`
    ))
  );
  if (exactMatches.length > 0) return exactMatches;

  const normalizedReq = normalizeId(reqUser);
  if (!normalizedReq) return [];

  return dongles.filter(d => {
    const normUser = normalizeId(d.username);
    const normFile = normalizeId(
      String(d.fileName || '').replace(/^kr[iy]ptoinfo-dongle-|\.json$/gi, '')
    );
    return (
      normUser === normalizedReq ||
      normFile === normalizedReq ||
      (normalizedReq.length >= 3 && (normUser.includes(normalizedReq) || normFile.includes(normalizedReq)))
    );
  });
}

function getErrorStatus(error) {
  if (error.code === 'INVALID_CHALLENGE') return 400;
  if (error.code === 'DONGLE_NOT_FOUND') return 409;
  if (error.code === 'DONGLE_INVALID') return 422;
  if (error.code === 'DONGLE_SELECTION_REQUIRED') return 409;
  if (error.code === 'USB_DISCOVERY_FAILED') return 503;
  return error.statusCode || 500;
}

const server = http.createServer(async (req, res) => {
  if (!checkHost(req)) {
    return sendJson(res, 403, { success: false, message: 'Host tidak diizinkan.' });
  }
  if (!checkOrigin(req, res)) {
    return sendJson(res, 403, { success: false, message: 'Origin frontend tidak diizinkan.' });
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/status') {
    try {
      const dongles = await findAvailableDongles();
      const publicDongles = dongles.map(publicDongleInfo);
      const reqUser = url.searchParams.get('username')?.trim() || '';

      let orderedDongles = publicDongles;
      let selectedDongle = publicDongles[0] || null;
      let matchedForUser = publicDongles.length > 0;

      if (reqUser) {
        const matched = findMatchingDongles(publicDongles, reqUser);
        if (matched.length > 0) {
          const matchedIds = new Set(matched.map(d => d.id));
          orderedDongles = [
            ...matched,
            ...publicDongles.filter(d => !matchedIds.has(d.id))
          ];
          selectedDongle = matched[0];
          matchedForUser = true;
        } else {
          selectedDongle = publicDongles[0] || null;
          matchedForUser = false;
        }
      }

      const detected = publicDongles.length > 0;
      return sendJson(res, 200, {
        success: true,
        detected,
        dongleDetected: detected,
        matchedForUser,
        count: publicDongles.length,
        dongles: orderedDongles,
        fileName: selectedDongle?.fileName || null,
        dongle: selectedDongle,
        message: detected
          ? (reqUser && !matchedForUser
            ? `${publicDongles.length} dongle terdeteksi di flashdisk (belum ada yang cocok spesifik untuk ${reqUser}).`
            : `${publicDongles.length} dongle valid ditemukan.`)
          : 'Tidak ada dongle valid pada drive removable yang terdeteksi.'
      });
    } catch (error) {
      return sendJson(res, 503, {
        success: false,
        detected: false,
        dongleDetected: false,
        matchedForUser: false,
        count: 0,
        dongles: [],
        message: error.message
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/sign-challenge') {
    if (!allowSigning(req, res)) return;
    if (!String(req.headers['content-type'] || '').includes('application/json')) {
      return sendJson(res, 415, { success: false, message: 'Content-Type harus application/json.' });
    }

    try {
      const body = await readJsonBody(req);
      if (typeof body.challengeText !== 'string') {
        return sendJson(res, 400, { success: false, message: 'challengeText wajib berupa string.' });
      }

      const dongles = await findAvailableDongles();
      if (dongles.length === 0) {
        return sendJson(res, 409, { success: false, message: 'Tidak ada dongle terpasang atau file dongle tidak valid.' });
      }

      let selected = null;
      if (body.dongleId) {
        selected = dongles.find(item => item.id === body.dongleId) || null;
      }
      if (!selected && body.username) {
        const matched = findMatchingDongles(dongles, body.username);
        if (matched.length > 0) {
          selected = matched[0];
        }
      }
      if (!selected) {
        selected = dongles[0];
      }

      const signature = await signDongleChallenge(selected.filePath, body.challengeText);
      return sendJson(res, 200, {
        success: true,
        signature,
        algorithm: 'Ed25519',
        encoding: 'base64url',
        dongle: publicDongleInfo(selected)
      });
    } catch (error) {
      return sendJson(res, getErrorStatus(error), {
        success: false,
        message: error.message || 'Gagal menandatangani challenge.'
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/save-dongle') {
    if (!String(req.headers['content-type'] || '').includes('application/json')) {
      return sendJson(res, 415, { success: false, message: 'Content-Type harus application/json.' });
    }

    try {
      const body = await readJsonBody(req);
      const username = body.username;
      const privateKeyPkcs8 = body.privateKeyPkcs8 || body.dongleData?.privateKeyPkcs8;

      if (!username || typeof username !== 'string') {
        return sendJson(res, 400, { success: false, message: 'username wajib diisi.' });
      }
      if (!privateKeyPkcs8 || typeof privateKeyPkcs8 !== 'string') {
        return sendJson(res, 400, { success: false, message: 'privateKeyPkcs8 wajib diisi.' });
      }

      // 1. Cek drive yang sudah memiliki folder KriptoInfoDongle atau KryptoInfoDongle
      const existingFolderDrives = getDrivesWithDongleFolder();
      let targetDrive = existingFolderDrives[0] || null;

      // 2. Jika belum ada folder dongle, cari drive removable Windows yang aktif (force scan agar flashdisk baru terdeteksi)
      if (!targetDrive) {
        const remDrives = await getWindowsRemovableDrives({ force: true });
        if (remDrives.length > 0) {
          targetDrive = remDrives[0];
        }
      }

      // 3. Fallback ke getDongleRoots (misalnya DONGLE_EXTRA_ROOTS)
      if (!targetDrive) {
        const roots = await getDongleRoots();
        if (roots.length > 0) {
          targetDrive = roots[0];
        }
      }

      if (!targetDrive) {
        return sendJson(res, 404, {
          success: false,
          code: 'FLASHDISK_NOT_FOUND',
          message: 'Flashdisk USB tidak terdeteksi. Colokkan flashdisk terlebih dahulu ke komputer.'
        });
      }

      // Tentukan nama folder: jika folder KriptoInfoDongle atau KryptoInfoDongle sudah ada, gunakan itu.
      // Jika belum ada, default ke KriptoInfoDongle sesuai permintaan pengguna.
      let folderName = 'KriptoInfoDongle';
      const kriptoFolder = path.join(targetDrive, 'KriptoInfoDongle');
      const kryptoFolder = path.join(targetDrive, 'KryptoInfoDongle');
      if (existsSync(kriptoFolder)) {
        folderName = 'KriptoInfoDongle';
      } else if (existsSync(kryptoFolder)) {
        folderName = 'KryptoInfoDongle';
      } else {
        folderName = 'KriptoInfoDongle';
      }

      const targetFolder = path.join(targetDrive, folderName);
      const saved = await saveDongleToFolder(targetFolder, username.trim(), privateKeyPkcs8.trim());

      return sendJson(res, 200, {
        success: true,
        message: `Dongle berhasil disimpan ke ${saved.filePath}`,
        drive: targetDrive,
        folder: folderName,
        fileName: saved.fileName,
        filePath: saved.filePath
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        message: error.message || 'Gagal menyimpan dongle ke flashdisk.'
      });
    }
  }

  return sendJson(res, 404, { success: false, message: 'Endpoint USB Agent tidak ditemukan.' });
});

server.listen(PORT, HOST, () => {
  console.log(`KryptoInfo USB Agent berjalan di http://${HOST}:${PORT}`);
  console.log('Mode discovery: semua drive removable Windows + folder tambahan di .env.');
  console.log('Private key tidak pernah dikirim melalui respons API.');
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
