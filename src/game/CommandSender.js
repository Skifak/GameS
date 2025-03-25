/**
 * Отправляет команды в комнату Colyseus через событийную шину.
 * @module CommandSender
 */
import { EventBus } from './EventBus';

/**
 * Класс для отправки игровых команд на сервер.
 * @class
 * @param {Colyseus.Room} room - Комната Colyseus для отправки команд
 */
export class CommandSender {
    constructor(room) {
        this.room = room;
        this.setupListeners();
    }
    
    /**
   * Настраивает слушатели событий для отправки команд.
   */
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