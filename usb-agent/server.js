import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createPrivateKey, sign } from 'node:crypto';

const PORT = 8787;
const HOST = '127.0.0.1';

// Cari file dongle di flashdisk / drive yang terpasang
function findDongleFile(targetUser) {
  const drives = ['D:\\', 'E:\\', 'F:\\', 'G:\\', 'H:\\', 'I:\\', 'J:\\'];
  const candidates = [];
  const expectedName = targetUser ? `kryptoinfo-dongle-${targetUser.toLowerCase()}.json` : null;

  function matches(file) {
    const lower = file.toLowerCase();
    if (!lower.startsWith('kryptoinfo-dongle') || !lower.endsWith('.json')) return false;
    if (expectedName) return lower === expectedName;
    return true;
  }

  // Cari di drive letter flashdisk
  for (const drive of drives) {
    try {
      if (fs.existsSync(drive)) {
        const rootFiles = fs.readdirSync(drive);
        for (const file of rootFiles) {
          if (matches(file)) {
            candidates.push(path.join(drive, file));
          }
        }
        const subFolder = path.join(drive, 'KryptoInfoDongle');
        if (fs.existsSync(subFolder)) {
          const subFiles = fs.readdirSync(subFolder);
          for (const file of subFiles) {
            if (matches(file)) {
              candidates.push(path.join(subFolder, file));
            }
          }
        }
      }
    } catch {
      // Drive tidak siap / permission ignored
    }
  }

  // Fallback: cek folder Downloads atau Desktop user
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const searchDirs = [
    path.join(userHome, 'Downloads'),
    path.join(userHome, 'Desktop')
  ];

  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (matches(file)) {
            candidates.push(path.join(dir, file));
          }
        }
      }
    } catch {}
  }

  if (candidates.length === 0) return null;
  // Ambil file dongle yang paling baru diubah
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0];
}

function readDongleKey(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const privateKeyBase64 = parsed.privateKeyPkcs8 || parsed.privateKey;
    if (!privateKeyBase64) return null;
    return {
      filePath,
      fileName: path.basename(filePath),
      privateKeyBase64
    };
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/status' && req.method === 'GET') {
    const reqUser = url.searchParams.get('username')?.trim().toLowerCase();
    const donglePath = findDongleFile(reqUser);
    const dongle = donglePath ? readDongleKey(donglePath) : null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      agent: 'KryptoInfo USB Daemon v1.0',
      dongleDetected: Boolean(dongle),
      detected: Boolean(dongle),
      fileName: dongle?.fileName || null,
      filePath: dongle?.filePath || null,
      dongles: dongle ? [{ id: dongle.fileName, fileName: dongle.fileName, username: reqUser || 'user' }] : []
    }));
    return;
  }

  if (url.pathname === '/api/sign-challenge' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { challengeText, challenge } = JSON.parse(body || '{}');
        const textToSign = challengeText || challenge;
        if (!textToSign) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'challengeText wajib diisi' }));
          return;
        }

        const donglePath = findDongleFile();
        const dongle = donglePath ? readDongleKey(donglePath) : null;
        if (!dongle) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'USB Dongle tidak ditemukan di flashdisk.' }));
          return;
        }

        const key = createPrivateKey({
          key: Buffer.from(dongle.privateKeyBase64, 'base64'),
          format: 'der',
          type: 'pkcs8'
        });

        const signature = sign(null, Buffer.from(textToSign, 'utf8'), key).toString('base64url');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          signature,
          fileName: dongle.fileName
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/save-dongle' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const username = parsed.username;
        const privateKeyPkcs8 = parsed.privateKeyPkcs8 || parsed.dongleData?.privateKeyPkcs8;

        if (!username || !privateKeyPkcs8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'username dan privateKeyPkcs8 wajib diisi.' }));
          return;
        }

        const drives = ['D:\\', 'E:\\', 'F:\\', 'G:\\', 'H:\\', 'I:\\', 'J:\\'];
        let targetDrive = null;
        for (const drive of drives) {
          try {
            if (fs.existsSync(drive)) {
              targetDrive = drive;
              break;
            }
          } catch {}
        }

        if (!targetDrive) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            code: 'FLASHDISK_NOT_FOUND',
            message: 'Flashdisk tidak terdeteksi. Colokkan flashdisk terlebih dahulu.'
          }));
          return;
        }

        const safeUsername = String(username).trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
        const targetFolder = path.join(targetDrive, 'KryptoInfoDongle');
        fs.mkdirSync(targetFolder, { recursive: true });

        const fileName = `kryptoinfo-dongle-${safeUsername}.json`;
        const filePath = path.join(targetFolder, fileName);
        fs.writeFileSync(filePath, JSON.stringify({
          username: safeUsername,
          privateKeyPkcs8: privateKeyPkcs8.trim()
        }, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Dongle berhasil disimpan ke ${filePath}`,
          drive: targetDrive,
          folder: 'KryptoInfoDongle',
          fileName,
          filePath
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`USB Agent Daemon aktif di http://${HOST}:${PORT}`);
});
