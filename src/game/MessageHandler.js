/**
 * Обрабатывает сообщения и изменения состояния от Colyseus.
 * @module MessageHandler
 */

/**
 * Класс для обработки сообщений сервера.
 * @class
 * @param {Colyseus.Room} room - Комната Colyseus для получения сообщений
 * @param {GameStateManager} gameStateManager - Менеджер состояния игры
 * @param {UIManager} uiManager - Менеджер UI (может быть null)
 * @param {Function} onDisconnect - Коллбэк для обработки отключения
 * @param {HexGrid} hexGrid - Сетка гексов для обновления
 */

export class MessageHandler {
  constructor(room, gameStateManager, uiManager, onDisconnect, hexGrid) {
    this.room = room;
    this.gameStateManager = gameStateManager;
    this.uiManager = uiManager;
    this.onDisconnect = onDisconnect;
    this.hexGrid = hexGrid;
    this.setupListeners();
  }
  
  /**
   * Настраивает слушатели событий от Colyseus.
   */
  setupListeners() {
    this.room.onStateChange.once((state) => {
      console.log('Initial state received: ', state);
      
      // Исправляем ссылку на hexGrid
      if (this.hexGrid) {
        this.hexGrid.initGrid();
        console.log('HexGrid initialized after state received');
      }
      
      // Обновляем позицию игрока по начальному состоянию
      if (state.players && this.gameStateManager) {
        const player = state.players.get(this.room.sessionId);
        if (player) {
          this.gameStateManager.updatePlayerPosition(player.q, player.r, false);
        }
      }
    });
    
    this.room.onStateChange((state) => {
      console.log('State changed:', state);
      const playerData = state.players.get(this.room.sessionId);
      if (playerData) {
        this.gameStateManager.updatePlayerPosition(playerData.q, playerData.r, true);
      }
    });
    
    this.room.onMessage('playerMoved', (data) => {
      console.log('Received playerMoved:', data);
      this.gameStateManager.updatePlayerPosition(data.q, data.r, true);
      this.hexGrid.updateMarker(); // Обновляем маркер
    });
    
    this.room.onMessage('error', (data) => {
      console.error('Server error:', data.message);
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