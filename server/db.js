import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'supabase-db',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false,
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Проверяем подключение с повторными попытками
async function connectWithRetry(retries = 5, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            logger.info('Database connected successfully');
            client.release();
            return;
        } catch (err) {
            if (i === retries - 1) {
                logger.error('Database connection failed after retries:', err);
                process.exit(1);
            }
            logger.warn(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

connectWithRetry(); 