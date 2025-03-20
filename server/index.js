/**
 * Главный файл серверной части приложения.
 * Настраивает Express-сервер, Colyseus-комнаты и интеграцию с Redis.
 * @module Server
 */

import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { createClient } from "redis";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from 'url';
import path from 'path';
import adminRouter from './admin.js';
import { PointRoom } from './pointRoom.js';
import logger from "./logger.js";
import config from "./config.js";

// Определяем __dirname для ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env.local из корня проекта
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
const gameServer = new Server({ transport });

let redisClient;

async function initRedis() {
    if (config.allowMissingRedis) {
        logger.warn("Redis initialization skipped as per configuration");
        return;
    }
    redisClient = createClient({ url: config.redisUrl });
    redisClient.on("error", (err) => logger.error("Redis Client Error", err));
    redisClient.on("connect", () => logger.info("Connected to Redis at " + config.redisUrl));
    try {
        await redisClient.connect();
        logger.info("Redis connection established");
        // Тестовая запись
        await redisClient.set('test_key', 'Redis works!');
        const testValue = await redisClient.get('test_key');
        logger.info("Redis test value: " + testValue);
    } catch (err) {
        logger.error("Failed to connect to Redis", err);
        redisClient = null;
    }
}

app.use(cors(config.cors));
app.use(express.json());
app.use('/admin', adminRouter);

class HexRoom extends Room {
    onCreate(options) {
        this.maxClients = 20;
        logger.info("Hex room created");
    }

    async onAuth(client, options) {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        if (!options.token) throw new Error("No token provided");
        const supabase = createSupabaseClient(process.env.SUPABASE_PUBLIC_URL, process.env.ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${options.token}` } }
        });
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw new Error("Invalid token");
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (profileError) throw new Error(profileError.message);
        if (profile.role === 'banned') throw new Error('User is banned');
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
    try {
        // Проверка переменных окружения внутри функции
        const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
        const anonKey = process.env.ANON_KEY;

        console.log('SUPABASE_PUBLIC_URL:', supabaseUrl || 'Not set');
        console.log('ANON_KEY:', anonKey || 'Not set');

        if (!supabaseUrl) {
            logger.error('SUPABASE_PUBLIC_URL is missing in .env.local');
            process.exit(1);
        }
        if (!anonKey) {
            logger.error('ANON_KEY is missing in .env.local');
            process.exit(1);
        }

        await initRedis();
        console.log('Registering rooms...');
        console.log('HexRoom defined');
        gameServer.define("hex", HexRoom);
        console.log('PointRoom defined:', typeof PointRoom === 'function' ? 'Yes' : 'No');
        gameServer.define("point", PointRoom, { supabaseUrl, anonKey });
        console.log('Rooms registered successfully');

        app.use("/colyseus", monitor());
        server.listen(config.port, () => {
            logger.info(`Game server running on port ${config.port}`);
            console.log(`Server started on http://localhost:${config.port}`);
        });
    } catch (error) {
        logger.error('Server startup failed:', error.message);
        console.error('Server startup error:', error);
        process.exit(1);
    }
})();