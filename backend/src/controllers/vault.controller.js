import { prisma } from '../config/db.js';

export async function createVaultItem(req, res) {
  const { title, category, encryptedData } = req.body;
  if (typeof title !== 'string' || !title.trim() || typeof category !== 'string' || !encryptedData) {
    return res.status(400).json({ success: false, message: 'title, category, dan encryptedData wajib diisi.' });
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

export async function listVaultItems(req, res) {
  const items = await prisma.vaultItem.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, category: true, createdAt: true, updatedAt: true }
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
  const result = await prisma.vaultItem.deleteMany({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!result.count) return res.status(404).json({ success: false, message: 'Data vault tidak ditemukan.' });
  return res.json({ success: true, message: 'Data vault berhasil dihapus.' });
}
