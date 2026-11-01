// ==========================================
// KryptoInfo — Express Server Entry Point
// Phase 1: Foundation & Database Connection
// ==========================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoutes from './routes/health.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────
// Security & Parsing Middleware
// ──────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ──────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────
app.use('/api/health', healthRoutes);

// ──────────────────────────────────────────
// 404 & Global Error Handlers (must be last)
// ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║      KryptoInfo API — PHASE 1            ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  Status  : RUNNING                       ║`);
  console.log(`║  Port    : ${PORT}                            ║`);
  console.log(`║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(29)}║`);
  console.log(`║  Health  : http://localhost:${PORT}/api/health ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});

export default app;
