import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import winston from "winston";
import { createClient } from "redis";
import LokiTransport from "winston-loki";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" }),
        new LokiTransport({
            host: "http://loki:3100",
            labels: { app: "game-server" },
            json: true,
            onConnectionError: (err) => console.error("Loki connection error:", err)
        })
    ]
});

let redisClient;
async function initRedis() {
    redisClient = createClient({
        url: "redis://redis:6379"  // Изменено с localhost на redis для docker.
    });
    redisClient.on("error", (err) => logger.error("Redis Client Error", err));
    try {
        await redisClient.connect();
        logger.info("Connected to Redis");
    } catch (err) {
        logger.error("Failed to connect to Redis, continuing without it", err);
        redisClient = null;
    }
}

const app = express();
const transport = new WebSocketTransport({ server: app.listen(2567) });
const gameServer = new Server({ transport });

class HexRoom extends Room {
    onCreate(options) {
        logger.info("Hex room created");
    }

    onJoin(client, options) {
        logger.info(`Player ${client.sessionId} joined`);
        if (redisClient) {
            redisClient.set(`player:${client.sessionId}`, "active");
        }
    }
}

// Эндпоинт для метрик Prometheus
app.get("/metrics", (req, res) => {
    const rooms = gameServer.rooms || []; // Получаем список комнат
    let metrics = "";
    metrics += `# HELP colyseus_rooms_total Total number of active rooms\n`;
    metrics += `# TYPE colyseus_rooms_total gauge\n`;
    metrics += `colyseus_rooms_total ${rooms.length}\n`;

    let totalClients = 0;
    rooms.forEach((room) => {
        totalClients += room.clients.length;
    });
    metrics += `# HELP colyseus_clients_total Total number of connected clients\n`;
    metrics += `# TYPE colyseus_clients_total gauge\n`;
    metrics += `colyseus_clients_total ${totalClients}\n`;

    res.set("Content-Type", "text/plain");
    res.send(metrics);
});

(async () => {
    await initRedis();
    gameServer.define("hex", HexRoom);
    app.use("/colyseus", monitor());
    console.log("Colyseus server running on port 2567");
})();