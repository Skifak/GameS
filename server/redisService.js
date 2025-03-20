/**
 * Сервис для работы с Redis.
 * Управляет сессиями игроков и кэшированием состояния.
 * @module RedisService
 */
import { createClient } from 'redis';
import config from './config.js';
import logger from './logger.js';

export class RedisService {
  constructor() {
    this.client = createClient({ url: config.redisUrl });
    this.client.on('error', (err) => logger.error('Redis Error:', err));
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Connected to Redis at ' + config.redisUrl);
    }
  }

  async setPlayerSession(sessionId, data) {
    await this.connect();
    await this.client.set(`player:${sessionId}`, JSON.stringify(data), { EX: 3600 }); // TTL 1 час
    logger.debug(`Set player session in Redis: player:${sessionId}`);
  }

  async getPlayerSession(sessionId) {
    await this.connect();
    const data = await this.client.get(`player:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deletePlayerSession(sessionId) {
    await this.connect();
    await this.client.del(`player:${sessionId}`);
    logger.debug(`Deleted player session from Redis: player:${sessionId}`);
  }
}