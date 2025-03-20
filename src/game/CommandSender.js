import { EventBus } from './EventBus';

export class CommandSender {
    constructor(room) {
        this.room = room;
        this.setupListeners();
    }

    setupListeners() {
        EventBus.on('moveToPoint', (pointId) => {
            if (this.room) {
                console.log('Sending moveToPoint to server:', pointId);
                this.room.send({ type: 'moveToPoint', pointId });
            } else {
                console.warn('Cannot move: not connected to a room');
            }
        });
    }
}