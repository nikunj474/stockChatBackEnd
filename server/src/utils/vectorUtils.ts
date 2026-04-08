import pool from '../config/db';
import { QueryResult } from 'pg';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Match the existing pgvector column dimension in the DB
const EMBEDDING_DIMENSIONS = 768;

// No-op kept for backward compatibility with any callers
export const initEmbeddingModel = async () => {
    console.log('Embedding model: using OpenAI text-embedding-3-small (no local model needed).');
};

// Convert text to a 768-dim vector using OpenAI
export const transformTextToVector = async (text: string): Promise<number[]> => {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
    });
    const vector = response.data[0].embedding;
    console.log(`Text embedded via OpenAI: ${vector.length} dims`);
    return vector;
};

// Search for similar news articles by cosine similarity
export const findSimilarNews = async (queryVector: number[]): Promise<any[]> => {
    const client = await pool.connect();
    try {
        const vectorString = `[${queryVector.join(',')}]`;
        const result: QueryResult = await client.query(
            `
            SELECT
                id,
                headline as title,
                COALESCE(short_description, 'No description') as summary,
                date,
                embedding <=> $1 as distance
            FROM news
            ORDER BY embedding <=> $1
            LIMIT 5
            `,
            [vectorString]
        );
        console.log(`Similar news found: ${result.rows.length} results`);
        return result.rows;
    } catch (error) {
        console.error('Error during vector search:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const findSimilarNewsWithUrls = async (queryVector: number[]): Promise<any[]> => {
    const client = await pool.connect();
    try {
        const vectorString = `[${queryVector.join(',')}]`;
        const result: QueryResult = await client.query(
            `
            SELECT
                id,
                headline as title,
                COALESCE(short_description, 'No description') as summary,
                date,
                link as url,
                category,
                embedding <=> $1 as distance
            FROM news
            ORDER BY embedding <=> $1
            LIMIT 20
            `,
            [vectorString]
        );
        return result.rows;
    } catch (error) {
        console.error('Error during vector search:', error);
        throw error;
    } finally {
        client.release();
    }
};
