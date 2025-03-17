/**
 * Главный файл серверной части приложения.
 * Настраивает Express-сервер, Colyseus-комнаты и интеграцию с Redis и Supabase.
 * @module Server
 */

import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { createClient } from "redis";
import http from "http";
import dotenv from "dotenv";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import cors from "cors";
import adminRouter from './admin.js'; // Новый роутер для администрирования
import { PointRoom } from './pointRoom.js';

import logger from "./logger.js";
import config from "./config.js";

dotenv.config();

/**
 * Клиент Supabase для аутентификации и работы с базой данных.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createSupabaseClient(process.env.SUPABASE_PUBLIC_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Клиент Redis для хранения данных сессий.
 * @type {import('redis').RedisClientType|null}
 */
let redisClient;

/**
 * Инициализирует подключение к Redis.
 * @async
 */
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

/**
 * Экземпляр Express-приложения.
 * @type {import('express').Express}
 */
const app = express();

app.use(cors(config.cors));
app.use(express.json());
app.use('/admin', adminRouter); // Подключаем API администрирования

/**
 * Middleware для проверки JWT-токена в запросах.
 * @param {import('express').Request} req - Входящий запрос
 * @param {import('express').Response} res - Ответ сервера
 * @param {import('express').NextFunction} next - Следующая функция в цепочке middleware
 */
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

/**
 * HTTP-сервер для Express и WebSocket.
 * @type {import('http').Server}
 */
const server = http.createServer(app);

/**
 * WebSocket-транспорт для Colyseus.
 * @type {WebSocketTransport}
 */
const transport = new WebSocketTransport({ server });

/**
 * Экземпляр игрового сервера Colyseus.
 * @type {Server}
 */
const gameServer = new Server({ transport });

/**
 * Класс комнаты Colyseus для управления игровыми сессиями.
 * @extends Room
 */
class HexRoom extends Room {
    /**
     * Вызывается при создании комнаты.
     * @param {Object} options - Опции создания комнаты
     */
    onCreate(options) {
        this.maxClients = 20;
        logger.info("Hex room created");
    }

    /**
     * Проверяет аутентификацию клиента перед подключением к комнате.
     * @async
     * @param {import('colyseus').Client} client - Клиент, подключающийся к комнате
     * @param {Object} options - Опции подключения, включая токен
     * @returns {Promise<{user: Object, profile: Object}>} Данные пользователя и профиля
     * @throws {Error} Если токен отсутствует, недействителен или пользователь забанен
     */
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

    /**
     * Вызывается при успешном подключении клиента к комнате.
     * @async
     * @param {import('colyseus').Client} client - Подключившийся клиент
     * @param {Object} options - Опции подключения
     * @param {{user: Object, profile: Object}} auth - Данные аутентификации клиента
     */
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

    /**
     * Вызывается при отключении клиента от комнаты.
     * @async
     * @param {import('colyseus').Client} client - Отключившийся клиент
     * @param {boolean} consented - Указывает, было ли отключение добровольным
     */
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

/**
 * Инициализирует сервер, подключает Redis, определяет комнату и запускает сервер.
 * @async
 */
(async () => {
    await initRedis();
    gameServer.define("hex", HexRoom);
    gameServer.define("point", PointRoom); // Определяем новую комнату для точек
    app.use("/colyseus", monitor());
    server.listen(config.port, () => logger.info(`Game server running on port ${config.port}`));
})();