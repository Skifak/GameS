/**
 * Главный файл серверной части приложения.
 * Настраивает Express-сервер, Colyseus-комнаты и интеграцию с Redis.
 * @module Server
 */

import express from "express";
import { Server, Room } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from 'url';
import path from 'path';
import adminRouter from './admin.js';
import { PointRoom } from './pointRoom.js';
import { RedisService } from './redisService.js';
import logger from "./logger.js";
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const server = http.createServer(app);
const transport = new WebSocketTransport({ server });
const gameServer = new Server({ transport });

const redisService = new RedisService();

async function initRedis() {
  if (config.allowMissingRedis) {
    logger.warn("Redis initialization skipped as per configuration");
    return;
  }
  try {
    await redisService.connect();
    await redisService.client.set('test_key', 'Redis works!');
    const testValue = await redisService.client.get('test_key');
    logger.info("Redis test value: " + testValue);
  } catch (err) {
    logger.error("Failed to connect to Redis", err);
    throw err;
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
    await redisService.setPlayerSession(client.sessionId, { status: "active" });
  }

  async onLeave(client, consented) {
    logger.info(`Player ${client.sessionId} left`);
    await redisService.deletePlayerSession(client.sessionId);
  }
}

(async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
    const anonKey = process.env.ANON_KEY;

    console.log('SUPABASE_PUBLIC_URL:', supabaseUrl || 'Not set');
    console.log('ANON_KEY:', anonKey || 'Not set');

    if (!supabaseUrl || !anonKey) {
      logger.error('SUPABASE_PUBLIC_URL or ANON_KEY missing in .env.local');
      process.exit(1);
    }

    await initRedis();
    console.log('Registering rooms...');
    gameServer.define("hex", HexRoom);
    gameServer.define("point", PointRoom, { supabaseUrl, anonKey, redisService });
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