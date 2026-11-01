// ==========================================
// KryptoInfo — Health Check Routes
// ==========================================

import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health — System & database health check
router.get('/', getHealth);

export default router;
