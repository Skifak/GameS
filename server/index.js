import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { createClient } from "redis";
import http from "http";
import dotenv from "dotenv";

import logger from "./logger.js";
import config from "./config.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { metrics, metricsMiddleware } from './metrics.js'; // Импортируем метрики

dotenv.config();

let redisClient;
async function initRedis() {
    if (config.allowMissingRedis) {
        logger.warn("Redis initialization skipped as per configuration");
        return;
    }

    redisClient = createClient({
        url: config.redisUrl
    });
    redisClient.on("error", (err) => logger.error("Redis Client Error", err));
    try {
        await redisClient.connect();
        logger.info("Connected to Redis");
    } catch (err) {
        logger.error("Failed to connect to Redis", err);
        redisClient = null;
    }
}

const app = express();

// Настройка CORS
app.use(cors(config.cors));
app.use(express.json());

// Эндпоинт для метрик Prometheus
app.get('/metrics', metricsMiddleware);

const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
const gameServer = new Server({ transport });

class HexRoom extends Room {
    onCreate(options) {
        logger.info("Hex room created");
        this.updateMetrics(); // Обновляем метрики при создании комнаты
    }

    async onAuth(client, options) {
        if (!options.token) throw new Error("No token provided");

        try {
            const user = await jwt.verify(options.token, config.jwtSecret);
            return user;
        } catch (error) {
            throw new Error("Invalid token");
        }
    }

    async onJoin(client, options) {
        logger.info(`Player ${client.sessionId} joined`);
        if (redisClient) {
            try {
                await redisClient.set(`player:${client.sessionId}`, "active");
            } catch (error) {
                logger.warn(`Failed to set Redis key: ${error.message}`);
            }
        }
        this.updateMetrics(); // Обновляем метрики при подключении игрока
    }

    async onLeave(client, consented) {
        logger.info(`Player ${client.sessionId} left`);
        if (redisClient) {
            try {
                await redisClient.del(`player:${client.sessionId}`);
            } catch (error) {
                logger.warn(`Failed to delete Redis key: ${error.message}`);
            }
        }
        this.updateMetrics(); // Обновляем метрики при отключении игрока
        if (!consented) {
            metrics.incrementPlayerDisconnects(); // Увеличиваем счётчик отключений
        }
        // Симуляция ошибок синхронизации (замени на реальную логику)
        if (Math.random() < 0.1) {
            metrics.incrementSyncErrors();
        }
    }

    onMessage(client, message) {
        // Пример: измеряем задержку обработки сообщения
        const start = Date.now();
        // Здесь должна быть логика обработки сообщения
        const latency = (Date.now() - start) / 1000; // Задержка в секундах
        metrics.recordRoomLatency(latency);
    }

    updateMetrics() {
        const totalClients = this.clients?.length || 0;
        metrics.updateActiveSessions(totalClients); // Обновляем количество активных сессий
        // Пример: симуляция использования памяти (замени на реальное значение)
        metrics.updateRoomMemory(totalClients * 1024 * 1024); // Пример: 1MB на клиента
    }
}

(async () => {
    await initRedis();
    gameServer.define("hex", HexRoom);

    app.use("/colyseus", monitor());
    server.listen(config.port, () => logger.info(`Game server running on port ${config.port}`));
})();