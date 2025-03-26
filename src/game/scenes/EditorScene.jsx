import { Scene, Cameras } from 'phaser';
import { EventBus } from '../EventBus.js';
import { MapDataManager } from '../MapDataManager.js';
import { HexGrid } from './HexGrid.js';
import { Point } from './Point.js';
import logger from '../../utils/logger.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Toolbar from '../../components/editor/Toolbar.jsx';
import PointForm from '../../components/editor/PointForm.jsx';
import EditPointForm from '../../components/editor/EditPointForm.jsx';

export class EditorScene extends Scene {
  constructor() {
    super({ key: 'EditorScene' });
    this.mapDataManager = new MapDataManager();
    this.hexGrid = null;
    this.controls = null;
    this.editMode = 'select';
    this.currentHex = null;
    this.newPointX = null;
    this.newPointY = null;
    this.previewPoint = null;
    this.points = null;
    this.selectedPoint = null;
    this.reactRoot = null;
  }

  preload() {
    this.load.image('fon', 'assets/fon.jpg');
  }

  async create() {
    this.add.image(0, 0, 'fon').setOrigin(0, 0).setDepth(0).setScale(2048 / 1920);
    this.cameras.main.setBounds(0, 0, 2048, 2048);

    await this.mapDataManager.loadData();
    this.hexGrid = new HexGrid(this, null, this.mapDataManager);
    this.hexGrid.initGrid();

    this.points = this.add.group();
    const loadedPoints = await this.mapDataManager.loadPoints();
    loadedPoints.forEach(point => this.createPoint(point.x, point.y, point.type, point.name, point));

    this.setupInputHandlers();
    this.renderReactUI();

    this.controls = new Cameras.Controls.SmoothedKeyControl({
      camera: this.cameras.main,
      left: this.input.keyboard.createCursorKeys().left,
      right: this.input.keyboard.createCursorKeys().right,
      up: this.input.keyboard.createCursorKeys().up,
      down: this.input.keyboard.createCursorKeys().down,
      acceleration: 0.02,
      drag: 0.0005,
      maxSpeed: 1.0,
    });

    EventBus.emit('current-scene-ready', this);
  }

  update(time, delta) {
    this.controls?.update(delta);
  }

  setupInputHandlers() {
    logger.info('[DEBUG] Setting up input handlers for EditorScene');

    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.type === 'hex') {
        logger.info(`[DEBUG] Direct hex click in EditorScene: q=${gameObject.q}, r=${gameObject.r}`);
        const worldXY = this.hexGrid.board.tileXYToWorldXY(gameObject.q, gameObject.r);
        this.currentHex = { q: gameObject.q, r: gameObject.r, worldX: worldXY.x, worldY: worldXY.y };
        this.renderReactUI();

        const clickWorldX = pointer.x + this.cameras.main.scrollX;
        const clickWorldY = pointer.y + this.cameras.main.scrollY;
        if (this.isPointInCurrentHex({ x: clickWorldX, y: clickWorldY })) {
          this.newPointX = clickWorldX;
          this.newPointY = clickWorldY;
          logger.info(`[DEBUG] Click coordinates saved: x=${this.newPointX}, y=${this.newPointY}`);
        }
      }
    });

    this.game.events.on('point-clicked', (point) => {
      if (this.editMode === 'select') {
        this.selectedPoint = point;
        this.showEditPointForm(point);
      }
    });

    EventBus.on('hexClicked', ({ q, r }) => {
      logger.info(`[DEBUG] EventBus hexClicked received: q=${q}, r=${r}, mode=${this.editMode}`);
      if (this.editMode === 'select') {
        const worldXY = this.hexGrid.board.tileXYToWorldXY(q, r);
        this.currentHex = { q, r, worldX: worldXY.x, worldY: worldXY.y };
        this.renderReactUI();
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        const worldX = pointer.x + this.cameras.main.scrollX;
        const worldY = pointer.y + this.cameras.main.scrollY;
        const tileXY = this.hexGrid.board.worldXYToTileXY(worldX, worldY);
        const { q, r } = tileXY;
        const hexGraphic = this.hexGrid.hexGraphics.getChildren().find(h => h.q === q && h.r === r);
        if (hexGraphic) {
          this.currentHex = { q, r, worldX: hexGraphic.worldX, worldY: hexGraphic.worldY };
          this.newPointX = worldX;
          this.newPointY = worldY;
          logger.info(`[DEBUG] Right-click coordinates saved: x=${this.newPointX}, y=${this.newPointY}`);
          this.renderReactUI();
        }
      }
    });
  }

  renderReactUI() {
    const rootElement = document.getElementById('editor-interface');
    if (!this.reactRoot) {
      this.reactRoot = ReactDOM.createRoot(rootElement);
    }
  
    this.reactRoot.render(
      <div className="interface editor-interface">
        <Toolbar
          currentHex={this.currentHex}
          editMode={this.editMode}
          onAddPoint={() => this.enterAddPointMode()}
          onAddPath={() => this.enterAddPathMode()}
          onSave={() => this.saveMap()}
        />
        {this.editMode === 'addPoint' && (
          <PointForm
            currentHex={this.currentHex}
            onCreate={(data) => this.createPointFromForm(data)}
            onCancel={() => this.resetMode()}
          />
        )}
        {this.editMode === 'editPoint' && this.selectedPoint && (
          <EditPointForm
            point={this.selectedPoint}
            onSave={(data) => this.updatePointFromForm(data)}
            onDelete={() => this.deletePoint()}
            onCancel={() => this.resetMode()}
          />
        )}
      </div>
    );
  }

  enterAddPointMode() {
    logger.info(`[DEBUG] Entering addPoint mode, currentHex:`, this.currentHex);
    if (!this.currentHex || this.currentHex.q === undefined || this.currentHex.r === undefined) {
      logger.warn('[DEBUG] No valid hex selected');
      alert('Сначала выберите гекс!');
      return;
    }
    this.editMode = 'addPoint';
    const worldXY = this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r);
    this.newPointX = worldXY.x;
    this.newPointY = worldXY.y;
    this.renderReactUI();
  }

  createPointFromForm({ name, type }) {
    const pointData = {
      id: Date.now(),
      name: name || 'Новая точка',
      type,
      hex_q: this.currentHex.q,
      hex_r: this.currentHex.r,
      x: Math.round(this.newPointX || this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r).x),
      y: Math.round(this.newPointY || this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r).y),
    };

    this.createPoint(pointData.x, pointData.y, pointData.type, pointData.name, pointData);
    this.resetMode();
    this.mapDataManager.savePoint(pointData, true)
      .then(saved => logger.info('Point saved:', saved))
      .catch(err => logger.error('Save failed:', err));
  }

  createPoint(x, y, type, name, pointData) {
    const point = new Point(this, { id: pointData.id, name, type, hex_q: pointData.hex_q, hex_r: pointData.hex_r, x, y });
    this.points.add(point.graphic);
    return point;
  }

  enterAddPathMode() {
    this.editMode = 'addPath';
    this.renderReactUI();
  }

  async saveMap() {
    const pointsData = this.points.getChildren().map(p => p.pointData);
    try {
      for (const point of pointsData) {
        await this.mapDataManager.savePoint(point, !point.id || point.id > 1000000);
      }
      alert('Карта сохранена!');
    } catch (error) {
      logger.error('Save error:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  resetMode() {
    this.editMode = 'select';
    this.newPointX = null;
    this.newPointY = null;
    this.selectedPoint = null;
    if (this.previewPoint) {
      this.previewPoint.destroy();
      this.previewPoint = null;
    }
    this.renderReactUI();
  }

  isPointInCurrentHex(point) {
    const hexGraphic = this.hexGrid.hexGraphics.getChildren().find(h => h.q === this.currentHex.q && h.r === this.currentHex.r);
    return hexGraphic && Phaser.Geom.Polygon.Contains(hexGraphic.geom, point.x, point.y);
  }

  showEditPointForm(point) {
    this.editMode = 'editPoint';
    this.selectedPoint = point;
    this.renderReactUI();
  }

  updatePointFromForm({ name, type }) {
    if (!this.selectedPoint) return;

    const updatedData = {
      id: this.selectedPoint.id,
      name: name || this.selectedPoint.name,
      type,
      hex_q: this.selectedPoint.hex_q,
      hex_r: this.selectedPoint.hex_r,
      x: this.selectedPoint.x,
      y: this.selectedPoint.y,
    };

    this.selectedPoint.update(updatedData);
    this.mapDataManager.savePoint(updatedData, false)
      .then(saved => logger.info('Point updated:', saved))
      .catch(err => logger.error('Update failed:', err));
    this.resetMode();
  }

  async deletePoint() {
    if (!this.selectedPoint) return;

    try {
      await this.mapDataManager.deletePoint(this.selectedPoint.id);
      this.selectedPoint.destroy();
      this.points.remove(this.selectedPoint.graphic);
      logger.info(`Point ${this.selectedPoint.id} deleted`);
      this.resetMode();
    } catch (error) {
      logger.error('Delete failed:', error);
      alert(`Ошибка при удалении: ${error.message}`);
    }
  }

  destroy() {
    if (this.reactRoot) {
      this.reactRoot.unmount();
    }
    super.destroy();
  }
}