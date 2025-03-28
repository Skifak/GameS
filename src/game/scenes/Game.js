/**
 * Главная сцена игры Phaser.
 * Инициализирует игровые менеджеры и отображает карту.
 * @module GameScene
 */
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { supabase } from '../../lib/supabase';
import { ConnectionManager } from '../ConnectionManager';
import { MapDataManager } from '../MapDataManager';
import { GameStateManager } from '../GameStateManager';
import { MessageHandler } from '../MessageHandler';
import { PlayerController } from '../../components/PlayerController';
import { HexGrid } from './HexGrid';
import { CommandSender } from '../CommandSender';
import logger from '../../utils/logger';

/**
 * Главная сцена игры.
 * @class
 * @extends Phaser.Scene
 */
export class Game extends Scene {
  constructor() {
    super('Game');
    this.supabase = supabase;
    this.connectionManager = new ConnectionManager(this.supabase);
    this.mapDataManager = new MapDataManager();
    this.playerController = null;
    this.hexGrid = null;
    this.gameStateManager = null;
    this.commandSender = null;
    this.activePath = null;
  }

  preload() {
    this.load.image('fon', 'assets/fon.jpg');
  }

  async create() {
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

    this.cameras.main.setBounds(0, 0, 2048, 2048);
    this.playerController = new PlayerController(this);
    this.cameras.main.startFollow(this.playerController.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Math.max(0.5, Math.min(2, newZoom)));
    });

    await this.mapDataManager.loadData();

    this.gameStateManager = new GameStateManager(
      this.connectionManager,
      this.playerController,
      null,
      this.supabase
    );
    await this.gameStateManager.init();

    const room = this.connectionManager.getRoom();
    logger.info('Room in Game.js:', room ? room.id : 'null');

    this.hexGrid = new HexGrid(this, room, this.mapDataManager);
    await this.hexGrid.initGrid();

    this.commandSender = new CommandSender(room);
    logger.info('CommandSender initialized with room:', room ? room.id : 'null');

    new MessageHandler(
      room,
      this.gameStateManager,
      null,
      () => this.connectionManager.reconnect(),
      this.hexGrid
    );

    this.game.events.on('path-clicked', (path) => {
      this.activePath = path;
      this.hexGrid.renderPaths([path.pathData], true);
    });

    EventBus.emit('current-scene-ready', this);
  }

  update() {
    // Убираем updateMarker() из цикла update
  }
}