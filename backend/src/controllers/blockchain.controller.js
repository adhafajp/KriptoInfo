import { prisma } from '../config/db.js';
import { computeHmacSha512, deriveSubkey, sha256, sha3_256 } from '../crypto/crypto.js';

function makeBlockPreimage(block) {
  return [
    block.blockIndex,
    block.createdAt.toISOString(),
    block.assetId,
    block.assetHash,
    block.previousHash,
    block.metadata || ''
  ].join('|');
}

function makeBlockHash(block) {
  return sha256(makeBlockPreimage(block));
}

function enrichBlockCryptographicSeals(block) {
  const preimage = makeBlockPreimage(block);
  let hmacSeal = null;
  try {
    const chainKey = deriveSubkey('KryptoInfo-Ledger-Salt', 'KryptoInfo-Chain-HMAC-v1', 32);
    hmacSeal = computeHmacSha512(chainKey, preimage).slice(0, 64);
  } catch {
    hmacSeal = null;
  }
  return {
    ...block,
    sha3_256: sha3_256(preimage),
    hmacSeal
  };
}

export async function addBlock(req, res) {
  const { assetId, assetHash, metadata = '' } = req.body;
  if (typeof assetId !== 'string' || !assetId.trim() ||
      typeof assetHash !== 'string' || !/^[a-f0-9]{64}$/i.test(assetHash)) {
    return res.status(400).json({ success: false, message: 'assetId dan assetHash SHA-256 (64 hex) wajib diisi.' });
  }
  const previous = await prisma.blockchainBlock.findFirst({
    where: { userId: req.user.id },
    orderBy: { blockIndex: 'desc' }
  });
  const block = {
    userId: req.user.id,
    blockIndex: (previous?.blockIndex ?? -1) + 1,
    assetId: assetId.trim().slice(0, 150),
    assetHash: assetHash.toLowerCase(),
    previousHash: previous?.currentHash || 'GENESIS',
    metadata: typeof metadata === 'string' ? metadata.slice(0, 2000) : JSON.stringify(metadata).slice(0, 2000),
    createdAt: new Date()
  };
  const currentHash = makeBlockHash(block);
  const saved = await prisma.blockchainBlock.create({
    data: { ...block, currentHash }
  });
  return res.status(201).json({ success: true, data: enrichBlockCryptographicSeals(saved) });
}

export async function listBlocks(req, res) {
  const blocks = await prisma.blockchainBlock.findMany({
    where: { userId: req.user.id },
    orderBy: { blockIndex: 'asc' }
  });
  return res.json({ success: true, data: blocks.map(enrichBlockCryptographicSeals) });
}

export async function verifyChain(req, res) {
  const blocks = await prisma.blockchainBlock.findMany({
    where: { userId: req.user.id },
    orderBy: { blockIndex: 'asc' }
  });
  let valid = true;
  let problemAt = null;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const expectedPrevious = i === 0 ? 'GENESIS' : blocks[i - 1].currentHash;
    if (block.blockIndex !== i || block.previousHash !== expectedPrevious || makeBlockHash(block) !== block.currentHash) {
      valid = false;
      problemAt = block.blockIndex;
      break;
    }
  }
  return res.json({
    success: true,
    data: {
      valid,
      totalBlocks: blocks.length,
      problemAt,
      algorithm: 'SHA-256 + SHA3-256 + HMAC-SHA512'
    }
  });
}
