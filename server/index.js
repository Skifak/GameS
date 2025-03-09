import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import winston from "winston";
import { createClient } from "redis";
import LokiTransport from "winston-loki";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

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
        url: process.env.REDIS_URL || "redis://redis:6379"
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
const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
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

app.get("/metrics", (req, res) => {
    // Временное решение без gameServer.rooms
    const totalClients = gameServer.transport.ws.clients.size;
    let metrics = "";
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
    server.listen(2567, () => console.log("Colyseus server running on port 2567"));
})();