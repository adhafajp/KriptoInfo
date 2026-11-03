import { createHash } from 'node:crypto';
import { prisma } from '../config/db.js';

function readCookie(req, cookieName) {
  const prefix = `${cookieName}=`;
  const item = (req.headers.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(prefix));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(prefix.length)); }
  catch { return null; }
}

export async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'kryptoinfo.sid';
    const token = readCookie(req, cookieName);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, username: true, role: true } } }
    });

    if (!session) {
      return res.status(401).json({ success: false, message: 'Sesi tidak valid atau sudah berakhir.' });
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
}
