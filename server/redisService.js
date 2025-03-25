/**
 * Сервис для работы с Redis.
 * Управляет сессиями игроков и кэшированием состояния.
 * @module RedisService
 */
import { createClient } from 'redis';
import config from './config.js';
import logger from './logger.js';

/**
 * Класс для работы с Redis-сессиями игроков.
 * @class
 */
export class RedisService {
  constructor() {
    this.client = createClient({ url: config.redisUrl });
    this.client.on('error', (err) => logger.error('Redis Error:', err));
    this.isConnected = false;
  }

  /**
   * Устанавливает соединение с Redis, если оно ещё не установлено.
   * @async
   * @throws {Error} Если подключение не удалось
   */
  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Connected to Redis at ' + config.redisUrl);
    }
  }

  /**
   * Сохраняет сессию игрока в Redis с TTL 1 час.
   * @async
   * @param {string} sessionId - ID сессии игрока
   * @param {Object} data - Данные сессии для сохранения
   */
  async setPlayerSession(sessionId, data) {
    await this.connect();
    await this.client.set(`player:${sessionId}`, JSON.stringify(data), { EX: 3600 }); // TTL 1 час
    logger.debug(`Set player session in Redis: player:${sessionId}`);
  }

  /**
   * Получает данные сессии игрока из Redis.
   * @async
   * @param {string} sessionId - ID сессии игрока
   * @returns {Object|null} Данные сессии или null, если сессия не найдена
   */
  async getPlayerSession(sessionId) {
    await this.connect();
    const data = await this.client.get(`player:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Удаляет сессию игрока из Redis.
   * @async
   * @param {string} sessionId - ID сессии игрока
   */
  async deletePlayerSession(sessionId) {
    await this.connect();
    await this.client.del(`player:${sessionId}`);
    logger.debug(`Deleted player session from Redis: player:${sessionId}`);
  }
}