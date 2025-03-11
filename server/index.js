import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { createClient } from "redis";
import http from "http";
import dotenv from "dotenv";
import { register, login } from "./auth.js";
import logger from "./logger.js";
import config from "./config.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { metricsMiddleware } from './metrics.js';

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
    redisClient.on("error", (err) => {
        logger.error("Redis Client Error", err);
    });
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

// Маршруты авторизации
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

// Эндпоинт для метрик Prometheus
app.get('/metrics', metricsMiddleware);

const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
const gameServer = new Server({ transport });

class HexRoom extends Room {
    onCreate(options) {
        logger.info("Hex room created");
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
    }
}

(async () => {
    await initRedis();
    gameServer.define("hex", HexRoom);
    
    // Перемещаем эндпоинт метрик сюда
    app.get("/metrics", async (req, res) => {
        try {
            const rooms = await gameServer.matchMaker.getAvailableRooms("hex");
            const totalClients = rooms.reduce((sum, room) => sum + (room.clients || 0), 0);

            let metrics = "";
            metrics += `# HELP colyseus_clients_total Total number of connected clients\n`;
            metrics += `# TYPE colyseus_clients_total gauge\n`;
            metrics += `colyseus_clients_total ${totalClients}\n`;
            res.set("Content-Type", "text/plain");
            res.send(metrics);
        } catch (err) {
            logger.error("Error fetching metrics", err);
            res.status(500).send("Error fetching metrics");
        }
    });

    app.use("/colyseus", monitor());
    server.listen(config.port, () => logger.info(`Game server running on port ${config.port}`));
})();