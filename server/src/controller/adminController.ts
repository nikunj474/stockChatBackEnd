import { Request, Response } from 'express';
import pool from '../config/db';
import { initEmbeddingModel, transformTextToVector } from '../utils/vectorUtils';

export const getDbStatus = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const companyCnt = await client.query('SELECT COUNT(*) FROM company');
        const stocksCnt = await client.query('SELECT COUNT(*) FROM stocks');
        const newsCnt = await client.query('SELECT COUNT(*) FROM news');
        const zeroEmbCnt = await client.query(
            `SELECT COUNT(*) FROM news WHERE embedding IS NULL OR embedding = $1::vector`,
            [`[${Array(768).fill(0).join(',')}]`]
        );

        res.json({
            status: 'ok',
            tables: {
                company: parseInt(companyCnt.rows[0].count),
                stocks: parseInt(stocksCnt.rows[0].count),
                news: parseInt(newsCnt.rows[0].count),
                newsWithZeroEmbeddings: parseInt(zeroEmbCnt.rows[0].count),
            }
        });
    } catch (error: any) {
        console.error('DB status check error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const generateNewsEmbeddings = async (req: Request, res: Response) => {
    // Immediately respond that the process has started
    res.json({
        message: 'Embedding generation started. Check server logs for progress.',
        note: 'This process runs in the background and may take several minutes.'
    });

    // Run embedding generation asynchronously
    generateEmbeddingsInBackground().catch(err => {
        console.error('Background embedding generation failed:', err);
    });
};

async function generateEmbeddingsInBackground() {
    console.log('[Embeddings] Starting background embedding generation via OpenAI...');
    const client = await pool.connect();

    try {
        // Fetch ALL news to regenerate with OpenAI embeddings (replacing old DistilBERT ones)
        const news = await client.query(
            `SELECT id, headline, short_description FROM news ORDER BY id`
        );

        console.log(`[Embeddings] Regenerating embeddings for ${news.rows.length} articles using OpenAI...`);

        let updated = 0;
        for (const article of news.rows) {
            try {
                const text = `${article.headline}. ${article.short_description || ''}`.trim();
                const embedding = await transformTextToVector(text);
                const vectorStr = `[${embedding.join(',')}]`;

                await client.query(
                    `UPDATE news SET embedding = $1::vector WHERE id = $2`,
                    [vectorStr, article.id]
                );
                updated++;

                if (updated % 5 === 0) {
                    console.log(`[Embeddings] Progress: ${updated}/${news.rows.length}`);
                }
            } catch (err: any) {
                console.error(`[Embeddings] Error on article ${article.id}:`, err.message);
            }
        }

        console.log(`[Embeddings] Complete! Updated ${updated} news articles with OpenAI embeddings.`);
    } catch (err) {
        console.error('[Embeddings] Fatal error:', err);
    } finally {
        client.release();
    }
}
