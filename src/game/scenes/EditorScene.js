// src/game/scenes/EditorScene.js
import { Scene, Cameras } from 'phaser';
import { EventBus } from '../EventBus';
import { supabase } from '../../lib/supabase';
import { ConnectionManager } from '../ConnectionManager';
import { MapDataManager } from '../MapDataManager';
import { HexGrid } from './HexGrid';

export class EditorScene extends Scene {
  constructor() {
    super({ key: 'EditorScene' });
    this.supabase = supabase;
    this.connectionManager = new ConnectionManager(this.supabase);
    this.mapDataManager = new MapDataManager();
    this.hexGrid = null;
    this.controls = null;
  }

  preload() {
    this.load.image('fon', 'assets/fon.jpg');
  }

  async create() {
    // Добавляем фон
    let background;
    if (this.textures.exists('fon')) {
      background = this.add.image(0, 0, 'fon').setOrigin(0, 0).setDepth(0);
      const bgWidth = background.width;
      const bgHeight = background.height;
      if (bgWidth < 2048 || bgHeight < 2048) {
        background.setScale(Math.max(2048 / bgWidth, 2048 / bgHeight));
      }
    } else {
      this.cameras.main.setBackgroundColor(0xaaaaaa);
      console.warn('Background image "fon.jpg" not found');
    }

    // Устанавливаем границы камеры
    this.cameras.main.setBounds(0, 0, 2048, 2048);

    // Отображаем текст для обозначения редактора
    this.add.text(300, 30, 'Редактор карты', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(10).setScrollFactor(0);

    // Инициализация карты с гексами
    try {
      await this.mapDataManager.loadData();
      this.hexGrid = new HexGrid(this, this.connectionManager.getRoom(), this.mapDataManager);
      await this.hexGrid.initGrid();
    } catch (error) {
      console.error('Error initializing HexGrid:', error);
    }

    // Настройка управления камерой
    const cursors = this.input.keyboard.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      acceleration: 0.02,
      drag: 0.0005,
      maxSpeed: 1.0,
    };

    try {
      this.controls = new Cameras.Controls.SmoothedKeyControl(controlConfig);
      console.log('Camera controls initialized:', this.controls);
    } catch (error) {
      console.error('Error initializing camera controls:', error);
    }

    // Уведомляем React, что сцена готова
    EventBus.emit('current-scene-ready', this);


  }

  update(time, delta) {
    if (this.controls) {
      this.controls.update(delta);
    }
  }
}