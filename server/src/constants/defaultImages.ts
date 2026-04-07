// Image URLs are served from the backend public folder.
// Uses BACKEND_URL env var for production, falls back to Railway URL.
const BACKEND_URL = process.env.BACKEND_URL || 'https://stockchatbackend-production.up.railway.app';

export const DEFAULT_NEWS_IMAGES = [
    `${BACKEND_URL}/news1.jpg`,
    `${BACKEND_URL}/news2.jpg`,
    `${BACKEND_URL}/news3.jpg`,
    `${BACKEND_URL}/news4.jpg`,
    `${BACKEND_URL}/news5.jpg`,
    `${BACKEND_URL}/news6.jpg`,
    `${BACKEND_URL}/news7.jpg`,
    `${BACKEND_URL}/news8.jpg`,
    `${BACKEND_URL}/news9.jpg`,
    `${BACKEND_URL}/news10.jpg`,
];
