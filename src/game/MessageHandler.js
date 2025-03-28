/**
 * Обрабатывает сообщения и изменения состояния от Colyseus.
 * @module MessageHandler
 */
import logger from '../utils/logger';

export class MessageHandler {
  constructor(room, gameStateManager, uiManager, onDisconnect, hexGrid) {
    this.room = room;
    this.gameStateManager = gameStateManager;
    this.uiManager = uiManager;
    this.onDisconnect = onDisconnect;
    this.hexGrid = hexGrid;
    this.setupListeners();
  }

  setupListeners() {
    this.room.onStateChange.once((state) => {
      console.log('Initial state received: ', state);
      if (this.hexGrid) {
        this.hexGrid.initGrid();
        console.log('HexGrid initialized after state received');
      }
      if (state.players && this.gameStateManager) {
        const player = state.players.get(this.room.sessionId);
        if (player) {
          this.gameStateManager.updatePlayerPosition(player.x, player.y, false);
          this.hexGrid.updateMarker(); // Обновляем маркер при инициализации
        }
      }
    });

    this.room.onStateChange((state) => {
      console.log('State changed:', state);
      const playerData = state.players.get(this.room.sessionId);
      if (playerData) {
        this.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, true);
        this.hexGrid.updateMarker(); // Обновляем маркер при изменении состояния
      }
    });

    this.room.onMessage('playerMoved', (data) => {
      logger.info('Received playerMoved:', data);
      this.gameStateManager.updatePlayerPosition(data.x, data.y, true);
      this.hexGrid.updateMarker(); // Обновляем маркер при получении playerMoved
    });

    this.room.onMessage('error', (data) => {
      logger.error('Server error:', data.message);
    });

    this.room.onError((code, message) => {
      console.error('Colyseus error:', code, message);
      this.onDisconnect();
    });

    this.room.onLeave(() => {
      console.log('Left room:', this.room.roomId);
    });
  }
}