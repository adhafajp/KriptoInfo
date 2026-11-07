import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { findAvailableDongles, getDongleRoots, getWindowsRemovableDrives, publicDongleInfo } from './discovery.js';
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
      const reqUser = url.searchParams.get('username')?.trim().toLowerCase();
      let matched = publicDongles;
      if (reqUser) {
        matched = publicDongles.filter(d =>
          (d.username && d.username.toLowerCase() === reqUser) ||
          (d.fileName && d.fileName.toLowerCase() === `kryptoinfo-dongle-${reqUser}.json`)
        );
      }
      return sendJson(res, 200, {
        success: true,
        detected: matched.length > 0,
        dongleDetected: matched.length > 0,
        count: matched.length,
        dongles: matched,
        fileName: matched[0]?.fileName || null,
        dongle: matched[0] || null,
        message: matched.length
          ? `${matched.length} dongle valid ditemukan.`
          : (reqUser ? `Dongle untuk ${reqUser} tidak ditemukan di flashdisk.` : 'Tidak ada dongle valid pada drive removable yang terdeteksi.')
      });
    } catch (error) {
      return sendJson(res, 503, {
        success: false,
        detected: false,
        dongleDetected: false,
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

      let selected;
      if (body.dongleId) {
        selected = dongles.find(item => item.id === body.dongleId);
        if (!selected) {
          return sendJson(res, 409, { success: false, message: 'Dongle pilihan tidak ditemukan. Periksa koneksi flashdisk dan muat ulang daftar dongle.' });
        }
      } else if (dongles.length === 1) {
        selected = dongles[0];
      } else {
        return sendJson(res, 409, {
          success: false,
          code: 'DONGLE_SELECTION_REQUIRED',
          message: 'Lebih dari satu dongle ditemukan. Pilih dongleId yang akan digunakan.',
          dongles: dongles.map(publicDongleInfo)
        });
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

      let roots = await getDongleRoots();
      if (roots.length === 0) {
        const remDrives = await getWindowsRemovableDrives();
        if (remDrives.length > 0) roots = remDrives;
      }

      if (roots.length === 0) {
        return sendJson(res, 404, {
          success: false,
          code: 'FLASHDISK_NOT_FOUND',
          message: 'Flashdisk tidak terdeteksi. Colokkan flashdisk terlebih dahulu.'
        });
      }

      const targetDrive = roots[0];
      const targetFolder = path.join(targetDrive, 'KryptoInfoDongle');
      const saved = await saveDongleToFolder(targetFolder, username.trim(), privateKeyPkcs8.trim());

      return sendJson(res, 200, {
        success: true,
        message: `Dongle berhasil disimpan ke ${saved.filePath}`,
        drive: targetDrive,
        folder: 'KryptoInfoDongle',
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
