import { EventBus } from './EventBus';
import logger from '../utils/logger';

export class GameStateManager {
  constructor(connectionManager, playerController, uiManager, supabase) {
    this.connectionManager = connectionManager;
    this.playerController = playerController;
    this.uiManager = uiManager;
    this.supabase = supabase;
    this.player = { id: null, username: null, q: 0, r: 0 }; // Заменяем x, y на q, r
    this.room = null;
    this.setupListeners();
  }

  setupListeners() {
    EventBus.on('moveToPointRequested', (pointId) => this.moveToPoint(pointId));
    EventBus.on('connectionStatusChanged', (status) => this.uiManager?.setStatus(status));
  }

  async init() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.player.id = session.user.id;
      this.player.username = session.user.user_metadata.username || 'Unknown';
    }

    await this.connectToPoint();
  }

  async connectToPoint() {
    try {
      if (this.room) {
        await this.room.leave();
        this.room = null;
      }
      this.room = await this.connectionManager.connect(1); // Используем фиктивный pointId, так как точки убраны
      EventBus.emit('connectionStatusChanged', 'Connected to Colyseus');
      logger.info(`Connected to room`);

      return new Promise((resolve) => {
        this.room.onStateChange.once((state) => {
          const playerData = state.players.get(this.room.sessionId);
          if (playerData) {
            this.updatePlayerPosition(playerData.q, playerData.r, false);
          }
          resolve();
        });
      });
    } catch (error) {
      EventBus.emit('connectionStatusChanged', `Failed to connect: ${error.message}`);
      logger.error(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  updatePlayerPosition(q, r, useTween = false) {
    this.player.q = q;
    this.player.r = r;
    this.playerController.updatePosition({ q, r }, useTween); // Передаем q, r вместо x, y
    logger.info(`Player position updated to q:${q}, r:${r}`);
  }

  async moveToPoint(pointId) {
    // Убираем эту функцию, так как точки интереса не используются
    logger.warn('moveToPoint is not used in MVP');
  }
}