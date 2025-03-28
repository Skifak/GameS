/**
 * Комната Colyseus для управления точками и позициями игроков.
 * @module PointRoom
 */
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

class State extends Schema {
  constructor() {
    super();
    this.players = new Map();
  }
}

defineTypes(Player, {
  playerId: "string",
  username: "string",
  x: "number",
  y: "number"
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

    this.onMessage('moveToNode', (client, message) => {
      this.handleMoveToNode(client, message.pathId, message.nodeIndex);
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
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${options.token}` } }
    });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('current_point_id, current_path_id, current_node_index')
      .eq('id', auth.user.id)
      .single();
    if (error) throw error;

    const player = new Player();
    player.playerId = auth.user.id;
    player.username = auth.profile.username;

    if (profile.current_path_id && profile.current_node_index !== null) {
      const { data: path } = await supabase
        .from('paths')
        .select('nodes')
        .eq('id', profile.current_path_id)
        .single();
      const nodes = path.nodes;
      player.x = nodes[profile.current_node_index].x;
      player.y = nodes[profile.current_node_index].y;
    } else if (profile.current_point_id) {
      const { data: point } = await supabase
        .from('points_of_interest')
        .select('x, y')
        .eq('id', profile.current_point_id)
        .single();
      player.x = point.x;
      player.y = point.y;
    }

    this.state.players.set(client.sessionId, player);

    await this.redisService.setPlayerSession(client.sessionId, {
      x: player.x,
      y: player.y,
      username: player.username,
      status: 'active'
    });

    logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} at x:${player.x}, y:${player.y}`);
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

      const worldXY = this.board.tileXYToWorldXY(q, r);
      player.x = worldXY.x;
      player.y = worldXY.y;

      logger.info(`Attempting to update Supabase for player ${player.playerId} to x:${player.x}, y:${player.y}`);
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ current_hex_q: q, current_hex_r: r })
        .eq('id', player.playerId)
        .select();
      if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`);
      logger.info(`Supabase updated successfully for player ${player.playerId}: ${JSON.stringify(updateData)}`);

      await this.redisService.setPlayerSession(client.sessionId, {
        x: player.x,
        y: player.y,
        username: player.username,
        status: 'active'
      });

      client.send('playerMoved', { x: player.x, y: player.y });
      logger.info(`Player ${player.playerId} moved to hex x:${player.x}, y:${player.y}`);
    } catch (error) {
      logger.error(`Move to hex q:${q}, r:${r} failed: ${error.message}`);
      client.send('error', { message: 'Move failed: ' + error.message });
    }
  }

  async handleMoveToNode(client, pathId, nodeIndex) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth?.token || this.anonKey}` } }
    });

    try {
      logger.info(`Handling moveToNode for client ${client.sessionId}: pathId=${pathId}, nodeIndex=${nodeIndex}`);
      const { data: path, error } = await supabase
        .from('paths')
        .select('nodes, end_point')
        .eq('id', pathId)
        .single();
      if (error || !path) throw new Error('Path not found');

      const player = this.state.players.get(client.sessionId);
      if (!player) throw new Error('Player not found');

      const nodes = path.nodes;
      if (nodeIndex < 0 || nodeIndex >= nodes.length) {
        if (nodeIndex === nodes.length) {
          // Достигнут end_point
          const { data: point } = await supabase
            .from('points_of_interest')
            .select('x, y')
            .eq('id', path.end_point)
            .single();
          player.x = point.x;
          player.y = point.y;
          await supabase
            .from('profiles')
            .update({ current_point_id: path.end_point, current_path_id: null, current_node_index: null })
            .eq('id', player.playerId);
          logger.info(`Player ${player.playerId} reached end_point ${path.end_point} at x:${player.x}, y:${player.y}`);
        } else {
          throw new Error('Invalid node index');
        }
      } else {
        player.x = nodes[nodeIndex].x;
        player.y = nodes[nodeIndex].y;
        await supabase
          .from('profiles')
          .update({ current_path_id: pathId, current_node_index: nodeIndex })
          .eq('id', player.playerId);
        logger.info(`Player ${player.playerId} moved to node ${nodeIndex} on path ${pathId} at x:${player.x}, y:${player.y}`);
      }

      await this.redisService.setPlayerSession(client.sessionId, {
        x: player.x,
        y: player.y,
        username: player.username,
        status: 'active'
      });

      client.send('playerMoved', { x: player.x, y: player.y });
      logger.info(`Sent playerMoved to client ${client.sessionId}: x=${player.x}, y=${player.y}`);
    } catch (error) {
      logger.error(`Move to node failed: ${error.message}`);
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