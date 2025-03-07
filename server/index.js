import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import winston from "winston";
import { createClient } from "redis";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" })
    ]
});

let redisClient;
async function initRedis() {
    redisClient = createClient({
        url: "redis://redis:6379"  // Изменено с localhost на redis для docker
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

(async () => {
    await initRedis();
    gameServer.define("hex", HexRoom);
    app.use("/colyseus", monitor());
    console.log("Colyseus server running on port 2567");
})();