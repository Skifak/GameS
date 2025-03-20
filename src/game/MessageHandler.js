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
        console.log('Initial state received:', state);
        const playerData = state.players.get(this.room.sessionId);
        if (playerData) {
          this.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, false);
        }
        this.hexGrid.initGrid().then(() => {
          console.log('HexGrid initialized after state received');
        }).catch(err => {
          console.error('HexGrid init failed:', err);
        });
      });
  
      this.room.onStateChange((state) => {
        console.log('State changed:', state);
        const playerData = state.players.get(this.room.sessionId);
        if (playerData) {
          this.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, true);
        }
      });
  
      this.room.onMessage('joinNewRoom', (data) => {
        console.log('Received joinNewRoom:', data);
        if (this.gameStateManager.currentPoint?.id !== data.pointId) {
          this.gameStateManager.connectToPoint(data.pointId).then(() => {
            this.hexGrid.updateRoom(this.room);
            this.hexGrid.initGrid(); // Перерисовываем гексы
            console.log('Connected to new room for point:', data.pointId);
          }).catch(err => {
            console.error('Failed to connect to new point:', err);
          });
        } else {
          logger.info(`Already at point ${data.pointId}, ignoring joinNewRoom`);
        }
      });
  
      this.room.onMessage('playerMoved', (data) => {
        console.log('Received playerMoved:', data);
        this.gameStateManager.updatePlayerPosition(data.x, data.y, true); // Анимация перемещения
      });
  
      this.room.onMessage('transitions', (data) => {
        console.log('Available transitions:', data.available);
      });
  
      this.room.onMessage('error', (data) => {
        this.uiManager.setStatus(`Server error: ${data.message}`);
        console.error('Server error:', data.message);
      });
  
      this.room.onError((code, message) => {
        this.uiManager.setStatus(`Connection error: ${message}`);
        console.error('Colyseus error:', code, message);
        this.onDisconnect();
      });
  
      this.room.onLeave(() => {
        console.log('Left room:', this.room.roomId);
        // Не переподключаемся автоматически
      });
    }
  }