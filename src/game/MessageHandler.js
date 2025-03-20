export class MessageHandler {
    constructor(room, gameStateManager, uiManager, onDisconnect, hexGrid) {
      this.room = room;
      this.gameStateManager = gameStateManager;
      this.uiManager = uiManager;
      this.onDisconnect = onDisconnect;
      this.hexGrid = hexGrid; // Добавляем HexGrid
      this.setupListeners();
    }
  
    setupListeners() {
      this.room.onStateChange.once((state) => {
        console.log('Initial state received:', state);
        const playerData = state.players.get(this.room.sessionId);
        if (playerData) {
          this.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, false);
        }
        // Инициализируем гексы и точки после получения состояния
        this.hexGrid.initGrid().then(() => {
          console.log('HexGrid initialized after state received');
        }).catch(err => {
          console.error('HexGrid init failed:', err);
        });
      });
  
      this.room.onStateChange((state) => {
        const playerData = state.players.get(this.room.sessionId);
        if (playerData) {
          this.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, true);
        }
      });
  
      this.room.onMessage('joinNewRoom', (data) => {
        this.gameStateManager.connectToPoint(data.pointId);
      });
  
      this.room.onMessage('transitions', (data) => {
        console.log('Available transitions:', data.available);
      });
  
      this.room.onMessage('error', (data) => {
        this.uiManager.setStatus(`Server error: ${data.message}`);
      });
  
      this.room.onError((code, message) => {
        this.uiManager.setStatus(`Connection error: ${message}`);
        this.onDisconnect();
      });
  
      this.room.onLeave(() => {
        this.onDisconnect();
      });
    }
  }