import argon2 from 'argon2';
import {
  createHash,
  createPublicKey,
  randomBytes
} from 'node:crypto';
import { prisma } from '../config/db.js';
import { aesEncrypt, aesDecrypt, verifyDongleSignature } from '../crypto/crypto.js';

const genericLoginError = 'Autentikasi gagal. Periksa username, password, dongle, dan wajah.';

function validFaceDescriptor(value) {
  return Array.isArray(value) && value.length === 128 &&
    value.every(number => typeof number === 'number' && Number.isFinite(number));
}

function passwordProblem(password, username) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return 'Password harus memiliki panjang 8–128 karakter.';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password harus memiliki huruf kecil, huruf besar, angka, dan simbol.';
  }
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return 'Password tidak boleh memuat username.';
  }
  return null;
}

function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;
  return vector.map(val => val / norm);
}

function faceDistance(first, second) {
  const norm1 = l2Normalize(first);
  const norm2 = l2Normalize(second);
  const sum = norm1.reduce((total, value, index) => {
    return total + (value - norm2[index]) ** 2;
  }, 0);
  return Math.sqrt(sum);
}

function audit(userId, action, status, req, detail = null) {
  return prisma.systemAudit.create({
    data: {
      userId: userId || null,
      action,
      status,
      ipAddress: req.ip,
      detail
    }
  }).catch(error => console.warn('Audit log gagal:', error.message));
}

export async function enroll(req, res) {
  const enrollmentCode = process.env.ENROLLMENT_CODE;
  if (!enrollmentCode || req.get('x-enrollment-code') !== enrollmentCode) {
    return res.status(403).json({ success: false, message: 'Kode enrollment tidak valid.' });
  }

  const { username, password, publicKey, faceDescriptor } = req.body;
  if (typeof username !== 'string' || username.trim().length < 3 || username.length > 40) {
    return res.status(400).json({ success: false, message: 'Username harus 3–40 karakter.' });
  }
  const cleanUsername = username.trim();
  const problem = passwordProblem(password, cleanUsername);
  if (problem) return res.status(400).json({ success: false, message: problem });
  if (typeof publicKey !== 'string' || !publicKey.length || !validFaceDescriptor(faceDescriptor)) {
    return res.status(400).json({
      success: false,
      message: 'Public key dongle dan face descriptor 128 angka wajib diisi.'
    });
  }

  try {
    createPublicKey({
      key: Buffer.from(publicKey, 'base64'),
      format: 'der',
      type: 'spki'
    });
  } catch {
    return res.status(400).json({ success: false, message: 'Format public key Ed25519 tidak valid.' });
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
  const faceTemplate = JSON.stringify(aesEncrypt(Buffer.from(JSON.stringify(faceDescriptor))));

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        faceTemplate,
        dongle: { create: { publicKey } }
      },
      select: { id: true, username: true, role: true, createdAt: true }
    });
    await audit(user.id, 'USER_ENROLLMENT', 'SUCCESS', req);
    return res.status(201).json({
      success: true,
      message: 'Enrollment berhasil. Simpan private key pada flashdisk dan jaga kerahasiaannya.',
      data: user
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
    }
    throw error;
  }
}

export async function createChallenge(req, res) {
  const { username } = req.body;
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ success: false, message: 'Username wajib diisi.' });
  }

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
    include: { dongle: true }
  });
  if (!user || !user.dongle) {
    return res.status(401).json({ success: false, message: 'Tidak dapat memulai autentikasi.' });
  }

  const challenge = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 60 * 1000);
  const record = await prisma.authChallenge.create({
    data: { userId: user.id, challenge, expiresAt }
  });

  return res.json({
    success: true,
    data: { challengeId: record.id, challenge, expiresInSeconds: 60 }
  });
}

export async function login(req, res) {
  const { username, password, challengeId, signature, faceDescriptor } = req.body;
  const user = await prisma.user.findUnique({
    where: { username: typeof username === 'string' ? username.trim() : '' },
    include: { dongle: true }
  });

  if (!user || !user.dongle || typeof password !== 'string' ||
      typeof challengeId !== 'string' || typeof signature !== 'string' ||
      !validFaceDescriptor(faceDescriptor)) {
    await audit(user?.id, 'LOGIN', 'FAILED', req, 'Invalid authentication request');
    return res.status(401).json({ success: false, message: genericLoginError });
  }

  const challenge = await prisma.authChallenge.findFirst({
    where: {
      id: challengeId,
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });
  if (!challenge) {
    await audit(user.id, 'LOGIN', 'FAILED', req, 'Challenge missing or expired');
    return res.status(401).json({ success: false, message: genericLoginError });
  }

  // Tandai challenge terpakai sebelum memeriksa signature agar tidak bisa di-replay.
  const consumed = await prisma.authChallenge.updateMany({
    where: { id: challenge.id, userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });
  if (consumed.count !== 1) {
    return res.status(401).json({ success: false, message: genericLoginError });
  }

  const passwordOk = await argon2.verify(user.passwordHash, password).catch(() => false);
  const dongleOk = verifyDongleSignature(user.dongle.publicKey, challenge.challenge, signature);

  let faceOk = false;
  let distanceVal = null;
  try {
    const storedTemplate = JSON.parse(aesDecrypt(JSON.parse(user.faceTemplate)).toString('utf8'));
    distanceVal = faceDistance(storedTemplate, faceDescriptor);
    const configuredThreshold = Number(process.env.FACE_MATCH_THRESHOLD);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 0.35;
    faceOk = Number.isFinite(distanceVal) && distanceVal <= threshold;
  } catch {
    faceOk = false;
  }

  if (!passwordOk || !dongleOk || !faceOk) {
    const failReasons = [];
    if (!passwordOk) failReasons.push('password');
    if (!dongleOk) failReasons.push('dongle');
    if (!faceOk) failReasons.push(`face (distance: ${distanceVal !== null ? distanceVal.toFixed(4) : 'invalid'})`);
    await audit(user.id, 'LOGIN', 'FAILED', req, `Factors rejected: ${failReasons.join(', ')}`);
    return res.status(401).json({ success: false, message: genericLoginError });
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const ttlHours = Math.max(1, Number(process.env.SESSION_TTL_HOURS || 8));
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
  const cookieName = process.env.SESSION_COOKIE_NAME || 'kryptoinfo.sid';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ttlHours * 60 * 60 * 1000
  });

  await audit(user.id, 'LOGIN', 'SUCCESS', req);
  return res.json({
    success: true,
    message: 'Autentikasi tiga faktor berhasil.',
    data: { id: user.id, username: user.username, role: user.role, expiresAt }
  });
}

export async function me(req, res) {
  return res.json({ success: true, data: req.user });
}

export async function logout(req, res) {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'kryptoinfo.sid';
  const rawCookie = (req.headers.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(`${cookieName}=`));

  if (rawCookie) {
    const token = decodeURIComponent(rawCookie.slice(cookieName.length + 1));
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.session.deleteMany({ where: { tokenHash } });
  }

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  await audit(req.user?.id, 'LOGOUT', 'SUCCESS', req);
  return res.json({ success: true, message: 'Logout berhasil.' });
}

// Verifikasi real-time biometrik wajah terhadap username untuk visual feedback
export async function verifyFacePreview(req, res) {
  const { username, faceDescriptor } = req.body;
  if (typeof username !== 'string' || !username.trim() || !validFaceDescriptor(faceDescriptor)) {
    return res.status(400).json({ success: false, message: 'Data verifikasi tidak valid.' });
  }

  const user = await prisma.user.findUnique({
    where: { username: username.trim() }
  });

  if (!user || !user.faceTemplate) {
    return res.json({
      success: true,
      data: {
        userFound: false,
        match: false,
        message: 'Username belum terdaftar.'
      }
    });
  }

  try {
    const storedTemplate = JSON.parse(aesDecrypt(JSON.parse(user.faceTemplate)).toString('utf8'));
    const distanceVal = faceDistance(storedTemplate, faceDescriptor);
    const configuredThreshold = Number(process.env.FACE_MATCH_THRESHOLD);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 ? configuredThreshold : 0.35;
    const match = Number.isFinite(distanceVal) && distanceVal <= threshold;

    return res.json({
      success: true,
      data: {
        userFound: true,
        match,
        distance: Number(distanceVal.toFixed(4)),
        threshold
      }
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Gagal memproses biometrik wajah.' });
  }
}
