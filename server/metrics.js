/**
 * Модуль для сбора и экспорта метрик сервера через Prometheus.
 * Предоставляет метрики для сессий, латентности и ошибок.
 * @module Metrics
 */
import client from 'prom-client';
import logger from './logger.js';

// Создаем реестр метрик
const register = new client.Registry();

// Добавляем стандартные метрики Node.js
client.collectDefaultMetrics({
    register,
    prefix: 'game_server_'
});

/**
 * Метрика для отслеживания количества активных сессий.
 * @type {client.Gauge}
 */
const activeSessionsGauge = new client.Gauge({
    name: 'game_active_sessions',
    help: 'Number of currently active game sessions'
});

/**
 * Гистограмма для измерения латентности операций в комнатах.
 * @type {client.Histogram}
 */
const roomLatencyHistogram = new client.Histogram({
    name: 'game_room_latency_seconds',
    help: 'Latency of game room operations',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

/**
 * Счётчик ошибок синхронизации игры.
 * @type {client.Counter}
 */
const syncErrorsCounter = new client.Counter({
    name: 'game_sync_errors_total',
    help: 'Total number of game synchronization errors'
});

/**
 * Счётчик отключений игроков.
 * @type {client.Counter}
 */
const playerDisconnectsCounter = new client.Counter({
    name: 'game_player_disconnects_total',
    help: 'Total number of player disconnections'
});

/**
 * Счётчик ошибок Colyseus.
 * @type {client.Counter}
 */
const colyseusErrorsCounter = new client.Counter({
    name: 'colyseus_errors_total',
    help: 'Total number of Colyseus errors'
});

/**
 * Метрика для отслеживания использования памяти комнатами.
 * @type {client.Gauge}
 */
const roomMemoryGauge = new client.Gauge({
    name: 'game_room_memory_bytes',
    help: 'Memory usage by game rooms in bytes'
});

// Регистрируем метрики
register.registerMetric(activeSessionsGauge);
register.registerMetric(roomLatencyHistogram);
register.registerMetric(syncErrorsCounter);
register.registerMetric(playerDisconnectsCounter);
register.registerMetric(colyseusErrorsCounter);
register.registerMetric(roomMemoryGauge);

/**
 * Объект методов для обновления метрик.
 * @namespace metrics
 */
export const metrics = {
    /**
   * Обновляет количество активных сессий.
   * @param {number} count - Текущее количество активных сессий
   */
    updateActiveSessions: (count) => {
        activeSessionsGauge.set(count);
    },

    /**
   * Записывает латентность операций в комнате.
   * @param {number} seconds - Время выполнения в секундах
   */
    recordRoomLatency: (seconds) => {
        roomLatencyHistogram.observe(seconds);
    },

    /**
   * Увеличивает счётчик ошибок синхронизации.
   */
    incrementSyncErrors: () => {
        syncErrorsCounter.inc();
    },

    /**
   * Увеличивает счётчик отключений игроков.
   */
    incrementPlayerDisconnects: () => {
        playerDisconnectsCounter.inc();
    },

    /**
   * Увеличивает счётчик ошибок Colyseus.
   */
    incrementColyseusErrors: () => {
        colyseusErrorsCounter.inc();
    },

    /**
   * Обновляет использование памяти комнатами.
   * @param {number} bytes - Объём памяти в байтах
   */
    updateRoomMemory: (bytes) => {
        roomMemoryGauge.set(bytes);
    }
};

/**
 * Middleware для экспорта метрик в формате Prometheus.
 * @async
 * @param {Object} req - Объект запроса Express
 * @param {Object} res - Объект ответа Express
 */
export const metricsMiddleware = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        logger.error('Error while generating metrics:', error);
        res.status(500).end();
    }
}; 