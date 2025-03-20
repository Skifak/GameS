export class MessageHandler {
    constructor(room, scene, onStateUpdate, onError, onDisconnect) {
        this.room = room;
        this.scene = scene;
        this.onStateUpdate = onStateUpdate;
        this.onError = onError;
        this.onDisconnect = onDisconnect;
        this.setupListeners();
    }

    setupListeners() {
        console.log('Setting up room listeners');

        this.room.onStateChange((state) => {
            console.log('State changed:', state);
            const playerData = state.players.get(this.room.sessionId);
            if (playerData) {
                this.onStateUpdate(playerData, true);
            }
        });

        this.room.onMessage('joinNewRoom', (data) => {
            console.log('Received joinNewRoom:', data);
            this.room.leave();
            this.scene.connectToNewRoom(data.pointId); // Переключаемся на новую комнату
        });

        this.room.onMessage('transitions', (data) => {
            console.log('Available transitions:', data.available);
        });

        this.room.onMessage('error', (data) => {
            console.error('Server error:', data.message);
            this.onError(`Server error: ${data.message}`);
        });

        this.room.onError((code, message) => {
            console.error('Room error:', code, message);
            this.onError(`Connection error: ${message}`);
            this.onDisconnect();
        });

        this.room.onLeave(() => {
            console.log('Disconnected from room:', this.room?.roomId);
            this.onDisconnect();
        });
    }
}