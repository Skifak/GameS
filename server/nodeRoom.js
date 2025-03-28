/**
 * Комната Colyseus для управления узлами (nodes).
 * @module NodeRoom
 */
const { Room } = require('colyseus');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

class NodeRoom extends Room {
  constructor() {
    super();
    this.maxClients = 10; // Лимит 10 игроков
    this.supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
    this.anonKey = process.env.ANON_KEY;
  }

  onCreate(options) {
    this.setState({ players: new Map() });
    this.pathId = options.pathId;
    this.nodeIndex = options.nodeIndex;
    logger.info(`Node room created for node ${this.pathId}_${this.nodeIndex}: ${this.roomId}`);
    this.onMessage('moveToNode', (client, message) => this.handleMoveToNode(client, message));
  }

  async onAuth(client, options) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
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

  onJoin(client, options, auth) {
    logger.info(`Client ${client.sessionId} joined room ${this.roomId} for node ${this.pathId}_${this.nodeIndex}`);
    const player = { x: 742, y: 469 }; // Начальная позиция по умолчанию
    this.state.players.set(client.sessionId, player);
    this.broadcast('playerJoined', { sessionId: client.sessionId, x: player.x, y: player.y }, { except: client });
  }

  onLeave(client) {
    logger.info(`Client ${client.sessionId} left room ${this.roomId}`);
    this.state.players.delete(client.sessionId);
    this.broadcast('playerLeft', { sessionId: client.sessionId });
    if (this.clients.length === 0) {
      logger.info(`Room ${this.roomId} is empty, disconnecting...`);
      this.disconnect();
    }
  }

  async handleMoveToNode(client, { pathId, nodeIndex }) {
    const supabase = createClient(this.supabaseUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${client.auth?.token || this.anonKey}` } }
    });

    try {
      logger.info(`Handling moveToNode for client ${client.sessionId}: pathId=${pathId}, nodeIndex=${nodeIndex}`);
      const { data: pathData, error } = await supabase
        .from('paths')
        .select('nodes')
        .eq('id', pathId)
        .single();

      if (error || !pathData || !pathData.nodes[nodeIndex]) {
        throw new Error('Path or node not found');
      }

      const node = pathData.nodes[nodeIndex];
      const player = this.state.players.get(client.sessionId);
      player.x = node.x;
      player.y = node.y;

      this.broadcast('playerMoved', { sessionId: client.sessionId, x: player.x, y: player.y });
      logger.info(`Broadcasted playerMoved for client ${client.sessionId}: x=${player.x}, y=${player.y}`);
    } catch (error) {
      logger.error(`Move to node failed: ${error.message}`);
      client.send('error', { message: 'Move failed: ' + error.message });
    }
  }
}

module.exports = { NodeRoom };