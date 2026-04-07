// utils/newsUtils.ts
import { DEFAULT_NEWS_IMAGES } from '../constants/defaultImages';
import pool from '../config/db';

function getRandomImage(): () => string {
    const usedImages = new Set<string>();

    return function getUniqueRandomImage(): string {
        if (usedImages.size === DEFAULT_NEWS_IMAGES.length) {
            usedImages.clear();
        }

        let randomImage: string;
        do {
            const randomIndex = Math.floor(Math.random() * DEFAULT_NEWS_IMAGES.length);
            randomImage = DEFAULT_NEWS_IMAGES[randomIndex];
        } while (usedImages.has(randomImage));

        usedImages.add(randomImage);
        return randomImage;
    };
}

function addImagesToNews(news: any[]) {
    const getUniqueImage = getRandomImage();
    return news.map((item, index) => {
        if (index < 5) {
            return {
                ...item,
                imageUrl: getUniqueImage(),
                isFeature: index === 0
            };
        }
        return item;
    });
}

export const getNewsEventsFromDB = async (companyName: string) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `
                SELECT id, date, link, category, headline, short_description
                FROM news
                WHERE headline ILIKE $1 OR short_description ILIKE $1
                ORDER BY date DESC
                LIMIT 20
            `,
            [`%${companyName}%`]
        );
        return addImagesToNews(result.rows);
    } catch (error) {
        console.error('Error fetching news events from DB:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const getLatestNewsFromDB = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, date, link, category, headline, short_description
            FROM news
            ORDER BY date DESC
            LIMIT 40`
        );
        return addImagesToNews(result.rows);
    } catch (error) {
        console.error('Error fetching latest news from DB:', error);
        throw error;
    } finally {
        client.release();
    }
};
