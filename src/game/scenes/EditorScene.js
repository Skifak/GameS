import { Scene, Cameras } from 'phaser';
import { EventBus } from '../EventBus';
import { MapDataManager } from '../MapDataManager';
import { HexGrid } from './HexGrid';
import { Point } from './Point';
import { createToolbar, createPointForm } from '../../utils/editorUtils';

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

    this.toolbar = createToolbar(this);
    this.pointFormContainer = createPointForm(this);

    this.setupInputHandlers();

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
    console.log('[DEBUG] Setting up input handlers for EditorScene');
  
    // Обработка кликов по объектам (левый клик)
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.type === 'hex') {
        console.log(`[DEBUG] Direct hex click in EditorScene: q=${gameObject.q}, r=${gameObject.r}`);
        const worldXY = this.hexGrid.board.tileXYToWorldXY(gameObject.q, gameObject.r);
        this.currentHex = { q: gameObject.q, r: gameObject.r, worldX: worldXY.x, worldY: worldXY.y };
        this.toolbar.hexInfoText.setText(`Гекс: q=${gameObject.q}, r=${gameObject.r}`);
  
        // Сохраняем координаты клика
        const clickWorldX = pointer.x + this.cameras.main.scrollX;
        const clickWorldY = pointer.y + this.cameras.main.scrollY;
        if (this.isPointInCurrentHex({ x: clickWorldX, y: clickWorldY })) {
          this.newPointX = clickWorldX;
          this.newPointY = clickWorldY;
          console.log(`[DEBUG] Click coordinates saved: x=${this.newPointX}, y=${this.newPointY}`);
        }
      }
    });
  
    // Обработка через EventBus (левый клик)
    EventBus.on('hexClicked', ({ q, r }) => {
      console.log(`[DEBUG] EventBus hexClicked received: q=${q}, r=${r}, mode=${this.editMode}`);
      if (this.editMode === 'select') {
        const worldXY = this.hexGrid.board.tileXYToWorldXY(q, r);
        this.currentHex = { q, r, worldX: worldXY.x, worldY: worldXY.y };
        this.toolbar.hexInfoText.setText(`Гекс: q=${q}, r=${r}`);
      }
    });
  
    // Обработка правого клика (опционально)
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
          console.log(`[DEBUG] Right-click coordinates saved: x=${this.newPointX}, y=${this.newPointY}`);
        }
      }
    });
  }

  enterAddPointMode() {
    console.log(`[DEBUG] Entering addPoint mode, currentHex:`, this.currentHex);
    if (!this.currentHex || this.currentHex.q === undefined || this.currentHex.r === undefined) {
      console.log('[DEBUG] No valid hex selected');
      alert('Сначала выберите гекс!');
      return;
    }
    this.editMode = 'addPoint';
    this.toolbar.modeText.setText('Режим: добавление точки');
    const worldXY = this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r);
    this.newPointX = worldXY.x;
    this.newPointY = worldXY.y;
    this.pointFormContainer.setVisible(true);
  }

  createPointFromForm() {
    const name = this.pointFormContainer.nameInput.node.value || 'Новая точка';
    const type = this.pointFormContainer.typeOptions[this.pointFormContainer.currentTypeIndex];

    const pointData = {
      id: Date.now(),
      name,
      type,
      hex_q: this.currentHex.q,
      hex_r: this.currentHex.r,
      x: Math.round(this.newPointX || this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r).x),
      y: Math.round(this.newPointY || this.hexGrid.board.tileXYToWorldXY(this.currentHex.q, this.currentHex.r).y),
    };

    this.createPoint(pointData.x, pointData.y, pointData.type, pointData.name, pointData);
    this.resetMode();
    this.mapDataManager.savePoint(pointData, true)
      .then(saved => console.log('Point saved:', saved))
      .catch(err => console.error('Save failed:', err));
  }

  createPoint(x, y, type, name, pointData) {
    const point = new Point(this, { id: pointData.id, name, type, hex_q: pointData.hex_q, hex_r: pointData.hex_r, x, y });
    this.points.add(point.graphic);
    return point;
  }

  enterAddPathMode() {
    this.editMode = 'addPath';
    this.toolbar.modeText.setText('Режим: добавление пути');
    // Реализация позже
  }

  async saveMap() {
    const pointsData = this.points.getChildren().map(p => p.getData('pointData'));
    try {
      for (const point of pointsData) {
        await this.mapDataManager.savePoint(point, true);
      }
      alert('Карта сохранена!');
    } catch (error) {
      console.error('Save error:', error);
      alert(`Ошибка: ${error.message}`);
    }
  }

  resetMode() {
    this.editMode = 'select';
    this.toolbar.modeText.setText('Режим: выбор гекса');
    this.pointFormContainer.setVisible(false);
    if (this.previewPoint) {
      this.previewPoint.destroy();
      this.previewPoint = null;
    }
    this.newPointX = null;
    this.newPointY = null;
  }

  isPointInCurrentHex(point) {
    const hexGraphic = this.hexGrid.hexGraphics.getChildren().find(h => h.q === this.currentHex.q && h.r === this.currentHex.r);
    return hexGraphic && Phaser.Geom.Polygon.Contains(hexGraphic.geom, point.x, point.y);
  }
}