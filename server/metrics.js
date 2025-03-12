import client from 'prom-client';
import logger from './logger.js';

// Создаем реестр метрик
const register = new client.Registry();

// Добавляем стандартные метрики Node.js
client.collectDefaultMetrics({
    register,
    prefix: 'game_server_'
});

// Метрики для игровых сессий
const activeSessionsGauge = new client.Gauge({
    name: 'game_active_sessions',
    help: 'Number of currently active game sessions'
});

const roomLatencyHistogram = new client.Histogram({
    name: 'game_room_latency_seconds',
    help: 'Latency of game room operations',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const syncErrorsCounter = new client.Counter({
    name: 'game_sync_errors_total',
    help: 'Total number of game synchronization errors'
});

const playerDisconnectsCounter = new client.Counter({
    name: 'game_player_disconnects_total',
    help: 'Total number of player disconnections'
});

const colyseusErrorsCounter = new client.Counter({
    name: 'colyseus_errors_total',
    help: 'Total number of Colyseus errors'
});

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

// Функции для обновления метрик
export const metrics = {
    updateActiveSessions: (count) => {
        activeSessionsGauge.set(count);
    },

    recordRoomLatency: (seconds) => {
        roomLatencyHistogram.observe(seconds);
    },

    incrementSyncErrors: () => {
        syncErrorsCounter.inc();
    },

    incrementPlayerDisconnects: () => {
        playerDisconnectsCounter.inc();
    },

    incrementColyseusErrors: () => {
        colyseusErrorsCounter.inc();
    },

    updateRoomMemory: (bytes) => {
        roomMemoryGauge.set(bytes);
    }
};

// Middleware для экспорта метрик
export const metricsMiddleware = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        logger.error('Error while generating metrics:', error);
        res.status(500).end();
    }
}; 