import { EventBus } from '../EventBus';
import logger from '../../utils/logger';

export class HexGrid {
  constructor(scene, room, mapDataManager) {
    this.scene = scene;
    this.room = room;
    this.mapDataManager = mapDataManager;
    this.hexSize = 100;
    this.board = null;
    this.hexGroup = this.scene.add.group();
    this.marker = null;
  }

  clearGrid() {
    if (this.board) {
      this.board.destroy();
    }
    this.hexGroup.clear(true, true);
    if (this.marker) {
      this.marker.destroy();
    }
  }

  async initGrid() {
    this.clearGrid();

    if (!this.scene.rexBoard) {
      logger.error('rexBoard plugin is not initialized');
      return;
    }

    // Создаем доску
    this.board = this.scene.rexBoard.add.board({
      grid: {
        gridType: 'hexagonGrid',
        x: 500, // Смещаем центр карты для видимости
        y: 500,
        size: this.hexSize,
        staggeraxis: 'y',
        staggerindex: 'odd'
      },
      width: 20,
      height: 20
    });

    // Загружаем и рисуем гексы
    const hexes = this.mapDataManager.getHexes();
    hexes.forEach(hex => {
      const tileXY = { x: hex.q, y: hex.r };
      const worldXY = this.board.tileXYToWorldXY(tileXY.x, tileXY.y);

      const graphics = this.scene.add.graphics();
      graphics.lineStyle(2, 0x00ff00);
      const polygon = this.board.getGridPoints(tileXY.x, tileXY.y, true);
      graphics.beginPath();
      graphics.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i++) {
        graphics.lineTo(polygon[i].x, polygon[i].y);
      }
      graphics.closePath();
      graphics.strokePath();

      // Делаем гекс интерактивным
      graphics.setInteractive(new Phaser.Geom.Polygon(polygon), Phaser.Geom.Polygon.Contains);
      graphics.on('pointerdown', () => this.handleHexClick(hex.q, hex.r));
      this.hexGroup.add(graphics);

      logger.info(`Hex drawn at q:${hex.q}, r:${hex.r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);
    });

    this.updateMarker();
  }

  updateMarker() {
    if (!this.room || !this.room.state || !this.room.state.players || !this.board) {
      logger.warn('Room state or board not ready for marker update');
      return;
    }

    const playerData = this.room.state.players.get(this.room.sessionId);
    if (playerData) {
      const worldXY = this.board.tileXYToWorldXY(playerData.q, playerData.r);
      if (this.marker) {
        this.marker.setPosition(worldXY.x, worldXY.y);
      } else {
        this.marker = this.scene.add.circle(worldXY.x, worldXY.y, 10, 0xffcf5b).setDepth(2);
      }
      logger.info(`Marker updated to q:${playerData.q}, r:${playerData.r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);
    }
  }

  handleHexClick(q, r) {
    logger.info(`Hex clicked: q:${q}, r:${r}`);
    this.room.send('moveToHex', { q, r });
  }

  updateRoom(room) {
    this.room = room;
    this.updateMarker();
  }
}