import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkDatabaseConnection, prisma } from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as auth from '../controllers/auth.controller.js';
import * as crypto from '../controllers/crypto.controller.js';
import * as vault from '../controllers/vault.controller.js';
import * as blockchain from '../controllers/blockchain.controller.js';
import { embedMessage, extractMessage, uploadPng } from '../controllers/stego.controller.js';

const router = Router();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi beberapa menit.' }
});

router.get('/health', asyncHandler(async (req, res) => {
  const database = await checkDatabaseConnection();
  return res.status(database.connected ? 200 : 503).json({
    success: database.connected,
    message: database.connected ? 'KryptoInfo API aktif.' : 'Database belum terhubung.',
    data: { server: 'online', database }
  });
}));

// Authentication: enrollment -> challenge -> login (password + dongle + face).
router.post('/auth/enroll', authLimiter, asyncHandler(auth.enroll));
router.post('/auth/challenge', authLimiter, asyncHandler(auth.createChallenge));
router.post('/auth/login', authLimiter, asyncHandler(auth.login));
router.get('/auth/me', requireAuth, asyncHandler(auth.me));
router.post('/auth/logout', requireAuth, asyncHandler(auth.logout));

// Secure message and file cryptography.
router.post('/crypto/message/encrypt', requireAuth, crypto.encryptMessage);
router.post('/crypto/message/decrypt', requireAuth, crypto.decryptMessage);
router.post('/crypto/file/encrypt', requireAuth, crypto.encryptFile);
router.post('/crypto/file/decrypt', requireAuth, crypto.decryptFile);

// Vault endpoints are always scoped to the authenticated user.
router.post('/vault', requireAuth, asyncHandler(vault.createVaultItem));
router.get('/vault', requireAuth, asyncHandler(vault.listVaultItems));
router.get('/vault/:id', requireAuth, asyncHandler(vault.getVaultItem));
router.delete('/vault/:id', requireAuth, asyncHandler(vault.deleteVaultItem));

// PNG LSB steganography with AES-GCM encrypted payload.
router.post('/stego/embed', requireAuth, uploadPng.single('image'), embedMessage);
router.post('/stego/extract', requireAuth, uploadPng.single('image'), extractMessage);

// Educational per-user SHA-256 hash chain.
router.post('/blockchain', requireAuth, asyncHandler(blockchain.addBlock));
router.get('/blockchain', requireAuth, asyncHandler(blockchain.listBlocks));
router.get('/blockchain/verify', requireAuth, asyncHandler(blockchain.verifyChain));

router.get('/audit', requireAuth, asyncHandler(async (req, res) => {
  const logs = await prisma.systemAudit.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, action: true, status: true, detail: true, createdAt: true }
  });
  return res.json({ success: true, data: logs });
}));

export default router;
