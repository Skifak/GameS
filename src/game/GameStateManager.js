import { EventBus } from './EventBus';
import logger from '../utils/logger';

export class GameStateManager {
  constructor(connectionManager, playerController, uiManager, supabase) {
    this.connectionManager = connectionManager;
    this.playerController = playerController;
    this.uiManager = uiManager;
    this.supabase = supabase;
    this.player = { id: null, username: null, x: 1024, y: 1024 };
    this.currentPoint = null;
    this.room = null;
    this.setupListeners();
  }

  setupListeners() {
    EventBus.on('moveToPointRequested', (pointId) => this.moveToPoint(pointId));
    EventBus.on('connectionStatusChanged', (status) => this.uiManager.setStatus(status));
  }

  async init() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.player.id = session.user.id;
      this.player.username = session.user.user_metadata.username || 'Unknown';
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('current_point_id')
      .eq('id', this.player.id)
      .single();

    const pointId = profile?.current_point_id || 1;
    await this.connectToPoint(pointId);
  }

  async connectToPoint(pointId) {
    try {
      if (this.room) {
        await this.room.leave();
        this.room = null;
      }
      this.room = await this.connectionManager.connect(pointId);
      this.currentPoint = { id: pointId };
      EventBus.emit('connectionStatusChanged', 'Connected to Colyseus');
      logger.info(`Connected to point ${pointId}`);

      return new Promise((resolve) => {
        this.room.onStateChange.once((state) => {
          const playerData = state.players.get(this.room.sessionId);
          if (playerData) {
            this.updatePlayerPosition(playerData.x, playerData.y, true);
          }
          console.log('New room state received:', state);
          resolve();
        });
      });
    } catch (error) {
      EventBus.emit('connectionStatusChanged', `Failed to connect: ${error.message}`);
      logger.error(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  updatePlayerPosition(x, y, useTween = false) {
    this.player.x = x;
    this.player.y = y;
    this.playerController.updatePosition({ x, y }, useTween);
    logger.info(`Player position updated to (${x}, ${y})`);
  }

  async moveToPoint(pointId) {
    if (this.currentPoint?.id === pointId) {
      logger.info(`Already at point ${pointId}, ignoring move`);
      return;
    }
    try {
      const message = { type: 'moveToPoint', pointId: pointId };
      console.log('Sending moveToPoint:', message);
      this.room.send('moveToPoint', message); // Явно указываем тип
      logger.info(`Requested move to point ${pointId}`);
    } catch (error) {
      this.uiManager.setStatus(`Move failed: ${error.message}`);
      logger.error(`Move to point ${pointId} failed: ${error.message}`);
    }
  }
}