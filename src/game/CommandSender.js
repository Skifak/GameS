/**
 * Отправляет команды в комнату Colyseus через событийную шину.
 * @module CommandSender
 */
import { EventBus } from './EventBus';
import logger from '../utils/logger'; // Добавляем логгер

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

  setupListeners() {
    EventBus.on('moveToPoint', (pointId) => {
      if (this.room) {
        logger.info('Sending moveToPoint to server:', pointId);
        this.room.send({ type: 'moveToPoint', pointId });
      } else {
        logger.warn('Cannot move: not connected to a room');
      }
    });

    EventBus.on('moveToNode', ({ pathId, nodeIndex }) => {
      if (this.room) {
        logger.info('Sending moveToNode to server:', { pathId, nodeIndex });
        this.room.send({ type: 'moveToNode', pathId, nodeIndex });
      } else {
        logger.warn('Cannot move: not connected to a room');
      }
    });
  }
}