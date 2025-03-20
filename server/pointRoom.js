import { Room } from 'colyseus';
import { Schema, defineTypes } from '@colyseus/schema';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

class Player extends Schema {
  constructor() {
    super();
    this.playerId = "";
    this.username = "";
    this.x = 0;
    this.y = 0;
  }
}

class Point extends Schema {
  constructor() {
    super();
    this.id = 0;
    this.hex_q = 0;
    this.hex_r = 0;
    this.type = "";
    this.x = 0;
    this.y = 0;
  }
}

class State extends Schema {
  constructor() {
    super();
    this.players = new Map();
    this.point = new Point();
  }
}

defineTypes(Player, {
  playerId: "string",
  username: "string",
  x: "number",
  y: "number"
});

defineTypes(Point, {
  id: "number",
  hex_q: "number",
  hex_r: "number",
  type: "string",
  x: "number",
  y: "number"
});

defineTypes(State, {
  players: { map: Player },
  point: Point
});

export class PointRoom extends Room {
  constructor() {
    super();
    this.supabaseUrl = null;
    this.anonKey = null;
    this.redisService = null;
    this.pointId = null;
  }

  onCreate(options) {
    this.supabaseUrl = options.supabaseUrl;
    this.anonKey = options.anonKey;
    this.redisService = options.redisService;
    this.pointId = options.pointId;
    this.maxClients = 10;

    this.setState(new State());
    logger.info(`PointRoom created for point ${this.pointId}`);
    this.loadPointData();
  }

  async loadPointData() {
    const supabase = createClient(this.supabaseUrl, this.anonKey);
    try {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('id, hex_q, hex_r, type, x, y')
        .eq('id', this.pointId)
        .single();
      if (error) throw error;

      this.state.point.id = data.id;
      this.state.point.hex_q = data.hex_q;
      this.state.point.hex_r = data.hex_r;
      this.state.point.type = data.type;
      this.state.point.x = data.x;
      this.state.point.y = data.y;

      logger.info(`Point ${this.pointId} loaded:`, data);
    } catch (error) {
      logger.error(`Failed to load point ${this.pointId}:`, error.message);
    }
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
    return { user, profile };
  }

  async onJoin(client, options, auth) {
    if (options.pointId !== this.pointId) {
      logger.warn(`Player ${auth.profile.username} tried to join wrong room. Expected pointId: ${this.pointId}, got: ${options.pointId}`);
      throw new Error('Invalid pointId');
    }

    if (!this.state.point.id) await this.loadPointData();

    const player = new Player();
    player.playerId = auth.user.id;
    player.username = auth.profile.username;
    player.x = this.state.point.x || 0;
    player.y = this.state.point.y || 0;
    this.state.players.set(client.sessionId, player);

    await this.redisService.setPlayerSession(client.sessionId, {
      pointId: this.pointId,
      x: player.x,
      y: player.y,
      username: player.username,
      status: 'active'
    });

    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
    });
    await supabase.from('profiles').update({ current_point_id: this.pointId }).eq('id', auth.user.id);

    logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} for point ${this.pointId}`);
    this.checkTransitions(client);
  }

  onMessage(client, message) {
    if (message.type === 'moveToPoint') {
      this.handleMoveToPoint(client, message.pointId);
    } else if (message.type === 'transition') {
      this.handleTransition(client, message.toPointId);
    } else if (message.type === 'click') {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = message.x;
        player.y = message.y;
        this.redisService.setPlayerSession(client.sessionId, {
          pointId: this.state.point.id,
          x: player.x,
          y: player.y,
          username: player.username,
          status: 'active'
        });
        logger.info(`Player ${client.sessionId} clicked at (${message.x}, ${message.y})`);
      }
    }
  }

  async handleMoveToPoint(client, pointId) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
    });
    try {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('id, x, y, hex_q, hex_r')
        .eq('id', pointId)
        .single();
      if (error) throw new Error(error.message);

      const player = this.state.players.get(client.sessionId);
      client.send('joinNewRoom', { pointId: data.id });
      await this.redisService.setPlayerSession(client.sessionId, {
        pointId: data.id,
        x: data.x,
        y: data.y,
        username: player.username,
        status: 'active'
      });
      await supabase.from('profiles').update({ current_point_id: pointId }).eq('id', player.playerId);
      this.state.players.delete(client.sessionId);
      logger.info(`Player ${player.playerId} requested move to point ${pointId}`);
    } catch (error) {
      logger.error(`Move to point ${pointId} failed: ${error.message}`);
      client.send('error', { message: 'Move failed: ' + error.message });
    }
  }

  async handleTransition(client, toPointId) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
    });
    try {
      const { data, error } = await supabase
        .from('point_transitions')
        .select('to_point_id')
        .eq('from_point_id', this.state.point.id)
        .eq('to_point_id', toPointId)
        .single();
      if (error || !data) throw new Error('Invalid transition');

      const { data: newPoint, error: pointError } = await supabase
        .from('points_of_interest')
        .select('id, x, y, hex_q, hex_r')
        .eq('id', toPointId)
        .single();
      if (pointError) throw new Error(pointError.message);

      const player = this.state.players.get(client.sessionId);
      client.send('joinNewRoom', { pointId: toPointId });
      await this.redisService.setPlayerSession(client.sessionId, {
        pointId: toPointId,
        x: newPoint.x,
        y: newPoint.y,
        username: player.username,
        status: 'active'
      });
      await supabase.from('profiles').update({ current_point_id: toPointId }).eq('id', player.playerId);
      this.state.players.delete(client.sessionId);
      logger.info(`Player ${player.playerId} transitioned to point ${toPointId}`);
    } catch (error) {
      logger.error(`Transition to point ${toPointId} failed: ${error.message}`);
      client.send('error', { message: 'Transition failed: ' + error.message });
    }
  }

  async checkTransitions(client) {
    if (this.state.point.type !== 'transition') {
      client.send('transitions', { available: [] });
      return;
    }

    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
    });
    try {
      const { data, error } = await supabase
        .from('point_transitions')
        .select('to_point_id')
        .eq('from_point_id', this.state.point.id);
      if (error) throw new Error(error.message);

      client.send('transitions', { available: data.map(t => t.to_point_id) });
    } catch (error) {
      logger.error(`Failed to check transitions: ${error.message}`);
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