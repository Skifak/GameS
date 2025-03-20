import { Room } from 'colyseus';
import { Schema, defineTypes } from '@colyseus/schema';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

class Player extends Schema {
  constructor() {
    super();
    this.playerId = "";
    this.username = "";
    this.q = 0; // Координата q гекса
    this.r = 0; // Координата r гекса
  }
}

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

export class PointRoom extends Room {
  constructor() {
    super();
    this.supabaseUrl = null;
    this.anonKey = null;
    this.redisService = null;
  }

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

  async onJoin(client, options, auth) {
    const player = new Player();
    player.playerId = auth.user.id;
    player.username = auth.profile.username;
    player.q = 0; // Начальная позиция гекса
    player.r = 0;

    this.state.players.set(client.sessionId, player);

    await this.redisService.setPlayerSession(client.sessionId, {
      q: player.q,
      r: player.r,
      username: player.username,
      status: 'active'
    });

    logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId}`);
  }

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

  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      await this.redisService.deletePlayerSession(client.sessionId);
      this.state.players.delete(client.sessionId);
      logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
    }
  }
}