/**
 * Комната Colyseus для управления точками и позициями игроков.
 * @module PointRoom
 */
import { Room } from 'colyseus';
import { Schema, defineTypes } from '@colyseus/schema';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

/**
 * Схема данных игрока в комнате. Содержит идентификатор, имя пользователя и координаты.
 * @class
 * @extends Schema
 */
class Player extends Schema {
  constructor() {
    super();
    this.playerId = "";
    this.username = "";
    this.q = 0;
    this.r = 0;
  }
}

/**
 * Схема состояния комнаты.
 * @class
 * @extends Schema
 */
class State extends Schema {
  constructor() {
    super();
    this.players = new Map();
  }
}

defineTypes(Player, {
  playerId: "string",
  username: "string",
  q: "number",
  r: "number"
});

defineTypes(State, {
  players: { map: Player }
});

/**
 * Класс комнаты Colyseus для управления точками.
 * @class
 * @extends Room
 */
export class PointRoom extends Room {
  constructor() {
    super();
    this.supabaseUrl = null;
    this.anonKey = null;
    this.redisService = null;
  }

  /**
   * Инициализирует комнату с переданными параметрами.
   * @param {Object} options - Опции создания комнаты
   * @param {string} options.supabaseUrl - URL Supabase
   * @param {string} options.anonKey - Анонимный ключ Supabase
   * @param {RedisService} options.redisService - Сервис Redis
   */
  onCreate(options) {
    this.supabaseUrl = options.supabaseUrl;
    this.anonKey = options.anonKey;
    this.redisService = options.redisService;
    this.setState(new State());
    logger.info(`PointRoom created`);
    
    this.onMessage('moveToHex', (client, message) => {
      this.handleMoveToHex(client, message.q, message.r);
    });
  }

  /**
   * Аутентифицирует клиента через Supabase.
   * @async
   * @param {Object} client - Клиент Colyseus
   * @param {Object} options - Опции подключения
   * @returns {Object} Данные пользователя и профиля
   * @throws {Error} Если аутентификация не удалась
   */
  async onAuth(client, options) {
    if (!options || !options.token) throw new Error('No token provided');
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${options.token}` } }
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;

    if (profile.role === 'banned') throw new Error('User is banned');
    return { user, profile, token: options.token };
  }

  /**
   * Обрабатывает присоединение клиента к комнате.
   * @async
   * @param {Object} client - Клиент Colyseus
   * @param {Object} options - Опции подключения
   * @param {Object} auth - Данные аутентификации
   */
  async onJoin(client, options, auth) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${options.token}` } }
    });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('current_hex_q, current_hex_r')
      .eq('id', auth.user.id)
      .single();
    if (error) throw error;

    const player = new Player();
    player.playerId = auth.user.id;
    player.username = auth.profile.username;
    player.q = profile.current_hex_q || 0;
    player.r = profile.current_hex_r || 0;

    this.state.players.set(client.sessionId, player);

    await this.redisService.setPlayerSession(client.sessionId, {
      q: player.q,
      r: player.r,
      username: player.username,
      status: 'active'
    });

    logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} at q:${player.q}, r:${player.r}`);
  }

  /**
   * Обрабатывает перемещение игрока на новый гекс.
   * @async
   * @param {Object} client - Клиент Colyseus
   * @param {number} q - Координата q гекса
   * @param {number} r - Координата r гекса
   */
  async handleMoveToHex(client, q, r) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth?.token || this.anonKey}` } }
    });

    try {
      const { data, error } = await supabase
        .from('hexes')
        .select('q, r')
        .eq('q', q)
        .eq('r', r)
        .single();
      if (error || !data) throw new Error('Hex not found');

      const player = this.state.players.get(client.sessionId);
      if (!player) {
        logger.error(`Player ${client.sessionId} not found in room ${this.roomId}`);
        return;
      }

      player.q = q;
      player.r = r;

      // Сохраняем позицию в Supabase с отладкой
      logger.info(`Attempting to update Supabase for player ${player.playerId} to q:${q}, r:${r}`);
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ current_hex_q: q, current_hex_r: r })
        .eq('id', player.playerId)
        .select();
      if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`);
      logger.info(`Supabase updated successfully for player ${player.playerId}: ${JSON.stringify(updateData)}`);

      await this.redisService.setPlayerSession(client.sessionId, {
        q: player.q,
        r: player.r,
        username: player.username,
        status: 'active'
      });

      client.send('playerMoved', { q, r });
      logger.info(`Player ${player.playerId} moved to hex q:${q}, r:${r}`);
    } catch (error) {
      logger.error(`Move to hex q:${q}, r:${r} failed: ${error.message}`);
      client.send('error', { message: 'Move failed: ' + error.message });
    }
  }

  /**
   * Обрабатывает выход клиента из комнаты.
   * @async
   * @param {Object} client - Клиент Colyseus
   * @param {boolean} consented - Было ли отключение добровольным
   */
  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await this.redisService.deletePlayerSession(client.sessionId);
      this.state.players.delete(client.sessionId);
      logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
    }
  }
}