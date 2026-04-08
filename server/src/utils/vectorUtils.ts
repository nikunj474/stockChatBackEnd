import pool from '../config/db';
import { QueryResult } from 'pg';
import { pipeline, env } from '@xenova/transformers';

// Cache dir so the model persists within the same Railway instance session
env.cacheDir = '/tmp/xenova-cache';

// all-MiniLM-L6-v2 produces 384-dimensional embeddings (quantized model is ~23 MB)
const EMBEDDING_DIMENSIONS = 384;

let _pipe: any = null;

async function getEmbeddingPipeline() {
    if (!_pipe) {
        console.log('[Embeddings] Loading Xenova/all-MiniLM-L6-v2 (first run: ~23 MB download)...');
        _pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });
        console.log('[Embeddings] Model loaded.');
    }
    return _pipe;
}

// No-op kept for backward compatibility with callers
export const initEmbeddingModel = async () => {
    console.log('[Embeddings] Using local Xenova/all-MiniLM-L6-v2 (384-dim, no API key needed).');
};

// Convert text → 384-dim vector using the local model
export const transformTextToVector = async (text: string): Promise<number[]> => {
    const pipe = await getEmbeddingPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data) as number[];
    return vector;
};

// Cosine-similarity search — top 5 similar news articles
export const findSimilarNews = async (queryVector: number[]): Promise<any[]> => {
    const client = await pool.connect();
    try {
        const vectorString = `[${queryVector.join(',')}]`;
        const result: QueryResult = await client.query(
            `SELECT
                id,
                headline  AS title,
                COALESCE(short_description, 'No description') AS summary,
                date,
                embedding <=> $1::vector AS distance
             FROM news
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT 5`,
            [vectorString]
        );
        console.log(`[Embeddings] Similar news found: ${result.rows.length} results`);
        return result.rows;
    } catch (error) {
        console.error('[Embeddings] Error during vector search:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Cosine-similarity search — top 20 results with URL (for stock analysis panel)
export const findSimilarNewsWithUrls = async (queryVector: number[]): Promise<any[]> => {
    const client = await pool.connect();
    try {
        const vectorString = `[${queryVector.join(',')}]`;
        const result: QueryResult = await client.query(
            `SELECT
                id,
                headline  AS title,
                COALESCE(short_description, 'No description') AS summary,
                date,
                link      AS url,
                category,
                embedding <=> $1::vector AS distance
             FROM news
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> $1::vector
             LIMIT 20`,
            [vectorString]
        );
        return result.rows;
    } catch (error) {
        console.error('[Embeddings] Error during vector search with URLs:', error);
        throw error;
    } finally {
        client.release();
    }
};
