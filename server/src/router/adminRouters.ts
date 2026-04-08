import express from 'express';
import { generateNewsEmbeddings, getDbStatus } from '../controller/adminController';

const router = express.Router();

// GET /api/admin/status — returns row counts for all tables
router.get('/status', getDbStatus);

// POST /api/admin/generate-embeddings — regenerates all news embeddings using OpenAI
router.post('/generate-embeddings', generateNewsEmbeddings);

export default router;
