// src/game/scenes/EditorScene.js
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class EditorScene extends Scene {
  constructor() {
    super({ key: 'EditorScene' }); // Уникальный ключ для сцены
  }

  preload() {
    // Здесь можно будет добавить загрузку ресурсов для редактора
  }

  create() {
    // Отображаем текст для проверки
    this.add.text(400, 300, 'Редактор карты', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Уведомляем React, что сцена готова
    EventBus.emit('current-scene-ready', this);
  }

  update() {
    // Пока пусто, можно добавить логику обновления позже
  }
}