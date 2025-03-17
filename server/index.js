import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { createClient } from "redis";
import http from "http";
import dotenv from "dotenv";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import cors from "cors";

import logger from "./logger.js";
import config from "./config.js";

dotenv.config();

const supabase = createSupabaseClient(process.env.SUPABASE_PUBLIC_URL, process.env.SUPABASE_ANON_KEY);

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

app.use(cors(config.cors));
app.use(express.json());

// Middleware для проверки токена
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        logger.warn('No token provided in request');
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw new Error('Invalid token');
        req.user = user;
        logger.info(`Player ${user.email} attempted to connect`);
        next();
    } catch (error) {
        logger.error('Token validation error:', error.message);
        res.status(401).json({ error: 'Invalid token' });
    }
};

const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
const gameServer = new Server({ transport });

class HexRoom extends Room {
    onCreate(options) {
        this.maxClients = 20;
        logger.info("Hex room created");
    }

    async onAuth(client, options) {
        if (!options.token) throw new Error("No token provided");

        const { data: { user }, error } = await supabase.auth.getUser(options.token);
        if (error) throw new Error("Invalid token");

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (profileError) throw new Error(profileError.message);

        if (profile.role === 'banned') {
            throw new Error('User is banned');
        }

        return { user, profile };
    }

    async onJoin(client, options, auth) {
        logger.info(`Player ${auth.profile.username} joined room ${this.roomId}`);
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
    app.use("/colyseus", monitor());
    server.listen(config.port, () => logger.info(`Game server running on port ${config.port}`));
})();