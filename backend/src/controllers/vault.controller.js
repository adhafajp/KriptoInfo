import { prisma } from '../config/db.js';
import { chachaEncrypt, chachaDecrypt } from '../crypto/crypto.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_STORAGE = join(__dirname, '..', '..', 'storage', 'vault');

function ensureStorageDir() {
  if (!existsSync(VAULT_STORAGE)) {
    mkdirSync(VAULT_STORAGE, { recursive: true });
  }
}

export async function createVaultItem(req, res) {
  const { title, category = 'NOTE', encryptedData } = req.body;
  if (typeof title !== 'string' || !title.trim() || !encryptedData) {
    return res.status(400).json({ success: false, message: 'title dan encryptedData wajib diisi.' });
  }
  let parsedData = encryptedData;
  if (typeof encryptedData === 'string') {
    try { parsedData = JSON.parse(encryptedData); }
    catch { return res.status(400).json({ success: false, message: 'encryptedData harus berupa objek ciphertext JSON.' }); }
  }
  const envelope = parsedData?.payload || parsedData;
  const supported = ['AES-256-GCM', 'ChaCha20-Poly1305'].includes(envelope?.algorithm) &&
    typeof envelope?.ciphertext === 'string' && typeof (envelope?.iv || envelope?.nonce) === 'string' &&
    typeof envelope?.authTag === 'string';
  if (!supported) {
    return res.status(400).json({ success: false, message: 'Vault hanya menerima payload AES-256-GCM atau ChaCha20-Poly1305.' });
  }
  const serialized = JSON.stringify(parsedData);
  if (serialized.length > 5_000_000) {
    return res.status(413).json({ success: false, message: 'Data vault terlalu besar (maksimal 5 MB).' });
  }

  const item = await prisma.vaultItem.create({
    data: {
      userId: req.user.id,
      title: title.trim().slice(0, 150),
      category: category.toUpperCase().slice(0, 30),
      encryptedData: serialized
    },
    select: { id: true, title: true, category: true, createdAt: true }
  });
  return res.status(201).json({ success: true, data: item });
}

export async function uploadVaultFile(req, res) {
  const { title, category = 'DOCUMENT', fileBase64, fileName, fileType } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Judul wajib diisi.' });
  }
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    return res.status(400).json({ success: false, message: 'fileBase64 wajib diisi.' });
  }
  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ success: false, message: 'fileName wajib diisi.' });
  }

  const fileBuf = Buffer.from(fileBase64, 'base64');
  if (!fileBuf.length) {
    return res.status(400).json({ success: false, message: 'File kosong.' });
  }
  if (fileBuf.length > 10 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: 'Ukuran file melebihi batas 10 MB.' });
  }

  const encrypted = chachaEncrypt(fileBuf);
  ensureStorageDir();

  const item = await prisma.vaultItem.create({
    data: {
      userId: req.user.id,
      title: title.trim().slice(0, 150),
      category: category.toUpperCase().slice(0, 30),
      encryptedData: '',
      fileName: fileName.slice(0, 255),
      fileType: (fileType || 'application/octet-stream').slice(0, 100),
      fileSize: fileBuf.length
    },
    select: { id: true, title: true, category: true, fileName: true, fileType: true, fileSize: true, createdAt: true }
  });

  const encryptedFilePath = join(VAULT_STORAGE, item.id + '.enc');
  const encPayload = JSON.stringify(encrypted);
  writeFileSync(encryptedFilePath, encPayload, 'utf8');

  await prisma.vaultItem.update({
    where: { id: item.id },
    data: { encryptedData: JSON.stringify({ storagePath: item.id + '.enc', algorithm: encrypted.algorithm }) }
  });

  return res.status(201).json({ success: true, data: item });
}

export async function downloadVaultFile(req, res) {
  const item = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!item) return res.status(404).json({ success: false, message: 'File vault tidak ditemukan.' });
  if (!item.fileName) return res.status(400).json({ success: false, message: 'Item ini bukan file.' });

  let storageInfo;
  try { storageInfo = JSON.parse(item.encryptedData); }
  catch { return res.status(500).json({ success: false, message: 'Data vault corrupt.' }); }

  const encryptedFilePath = join(VAULT_STORAGE, storageInfo.storagePath);
  if (!existsSync(encryptedFilePath)) {
    return res.status(404).json({ success: false, message: 'File terenkripsi tidak ditemukan di storage.' });
  }

  let encPayload;
  try {
    encPayload = JSON.parse(readFileSync(encryptedFilePath, 'utf8'));
  } catch {
    return res.status(500).json({ success: false, message: 'Gagal membaca file terenkripsi.' });
  }

  const decrypted = chachaDecrypt(encPayload);

  return res.json({
    success: true,
    data: {
      fileName: item.fileName,
      fileType: item.fileType,
      fileSize: item.fileSize,
      fileBase64: decrypted.toString('base64')
    }
  });
}

export async function listVaultItems(req, res) {
  const items = await prisma.vaultItem.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, category: true,
      fileName: true, fileType: true, fileSize: true,
      createdAt: true, updatedAt: true
    }
  });
  return res.json({ success: true, data: items });
}

export async function getVaultItem(req, res) {
  const item = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!item) return res.status(404).json({ success: false, message: 'Data vault tidak ditemukan.' });
  return res.json({ success: true, data: item });
}

export async function deleteVaultItem(req, res) {
  const item = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!item) return res.status(404).json({ success: false, message: 'Data vault tidak ditemukan.' });

  if (item.fileName) {
    try {
      const storageInfo = JSON.parse(item.encryptedData);
      const encPath = join(VAULT_STORAGE, storageInfo.storagePath);
      if (existsSync(encPath)) unlinkSync(encPath);
    } catch {}
  }

  await prisma.vaultItem.delete({ where: { id: item.id } });
  return res.json({ success: true, message: 'Data vault berhasil dihapus.' });
}
