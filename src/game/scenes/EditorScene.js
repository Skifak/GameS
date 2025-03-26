import { Scene, Cameras } from 'phaser';
import { EventBus } from '../EventBus';
import { MapDataManager } from '../MapDataManager';
import { HexGrid } from './HexGrid';
import { Point } from './Point';
import { createToolbar, createPointForm } from '../../utils/editorUtils';
import logger from '../../utils/logger';

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
    this.selectedPoint = null; // Для хранения выбранной точки при редактировании
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

    this.toolbar = createToolbar(this); // Уже обновлён в editorUtils с классами
    this.pointFormContainer = createPointForm(this); // Уже обновлён в editorUtils с классами
    this.editPointFormContainer = this.createEditPointForm(); // Новая форма с классами

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
    logger.info('[DEBUG] Setting up input handlers for EditorScene');

    // Обработка кликов по объектам (левый клик)
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.type === 'hex') {
        logger.info(`[DEBUG] Direct hex click in EditorScene: q=${gameObject.q}, r=${gameObject.r}`);
        const worldXY = this.hexGrid.board.tileXYToWorldXY(gameObject.q, gameObject.r);
        this.currentHex = { q: gameObject.q, r: gameObject.r, worldX: worldXY.x, worldY: worldXY.y };
        this.toolbar.hexInfoText.setText(`Гекс: q=${gameObject.q}, r=${gameObject.r}`);

        const clickWorldX = pointer.x + this.cameras.main.scrollX;
        const clickWorldY = pointer.y + this.cameras.main.scrollY;
        if (this.isPointInCurrentHex({ x: clickWorldX, y: clickWorldY })) {
          this.newPointX = clickWorldX;
          this.newPointY = clickWorldY;
          logger.info(`[DEBUG] Click coordinates saved: x=${this.newPointX}, y=${this.newPointY}`);
        }
      }
    });

    // Обработка кликов по точкам через EventBus
    this.game.events.on('point-clicked', (point) => {
      if (this.editMode === 'select') {
        this.selectedPoint = point;
        this.showEditPointForm(point);
      }
    });

    // Обработка через EventBus (левый клик по гексу)
    EventBus.on('hexClicked', ({ q, r }) => {
      logger.info(`[DEBUG] EventBus hexClicked received: q=${q}, r=${r}, mode=${this.editMode}`);
      if (this.editMode === 'select') {
        const worldXY = this.hexGrid.board.tileXYToWorldXY(q, r);
        this.currentHex = { q, r, worldX: worldXY.x, worldY: worldXY.y };
        this.toolbar.hexInfoText.setText(`Гекс: q=${q}, r=${r}`);
      }
    });

    // Обработка правого клика
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
        }
      }
    });
  }

  enterAddPointMode() {
    logger.info(`[DEBUG] Entering addPoint mode, currentHex:`, this.currentHex);
    if (!this.currentHex || this.currentHex.q === undefined || this.currentHex.r === undefined) {
      logger.warn('[DEBUG] No valid hex selected');
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
    this.toolbar.modeText.setText('Режим: добавление пути');
    // Реализация позже
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
    this.toolbar.modeText.setText('Режим: выбор гекса');
    this.pointFormContainer.setVisible(false);
    this.editPointFormContainer.setVisible(false);
    if (this.previewPoint) {
      this.previewPoint.destroy();
      this.previewPoint = null;
    }
    this.newPointX = null;
    this.newPointY = null;
    this.selectedPoint = null;
  }

  isPointInCurrentHex(point) {
    const hexGraphic = this.hexGrid.hexGraphics.getChildren().find(h => h.q === this.currentHex.q && h.r === this.currentHex.r);
    return hexGraphic && Phaser.Geom.Polygon.Contains(hexGraphic.geom, point.x, point.y);
  }

  // Новая форма для редактирования точки с классами из redactStyle.css
  createEditPointForm() {
    const form = this.add.container(this.cameras.main.width - 250, 150)
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false)
      .setName('edit-point-form');

    form.add(this.add.rectangle(0, 0, 220, 300, 0x333333, 0.9).setStrokeStyle(1, 0xffffff));
    form.add(this.add.text(0, -120, 'Редактировать точку', { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5)
      .setName('form-title'));
    form.add(this.add.text(-90, -80, 'Название:', { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setName('form-label'));

    const nameBg = this.add.rectangle(0, -50, 180, 30, 0x555555)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive()
      .setName('form-input-bg');
    form.nameInput = this.add.dom(0, -50, 'input', { type: 'text', className: 'form-input' });
    form.add([nameBg, form.nameInput]);
    nameBg.on('pointerdown', () => form.nameInput.node.focus());

    form.add(this.add.text(-90, -10, 'Тип точки:', { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setName('form-label'));
    form.typeOptions = ['camp', 'transition', 'anomaly', 'faction'];
    form.currentTypeIndex = 0;
    const typeBg = this.add.rectangle(0, 20, 180, 30, 0x555555)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive()
      .setName('type-selector-bg');
    form.typeText = this.add.text(0, 20, form.typeOptions[0], { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setName('type-text');
    form.add([typeBg, form.typeText]);

    const prevBtn = this.add.triangle(-80, 20, 0, 0, 8, 8, 0, 16, 0x999999)
      .setInteractive()
      .setName('type-arrow');
    const nextBtn = this.add.triangle(80, 20, 0, 8, 8, 0, 8, 16, 0x999999)
      .setInteractive()
      .setName('type-arrow');
    prevBtn.on('pointerdown', () => {
      form.currentTypeIndex = (form.currentTypeIndex - 1 + form.typeOptions.length) % form.typeOptions.length;
      form.typeText.setText(form.typeOptions[form.currentTypeIndex]);
    });
    nextBtn.on('pointerdown', () => {
      form.currentTypeIndex = (form.currentTypeIndex + 1) % form.typeOptions.length;
      form.typeText.setText(form.typeOptions[form.currentTypeIndex]);
    });
    form.add([prevBtn, nextBtn]);

    const saveBtn = this.add.container(0, 70)
      .setName('form-button-container form-button-save');
    saveBtn.add([this.add.rectangle(0, 0, 120, 30, 0x00aa00)
      .setStrokeStyle(1, 0xffffff)
      .setName('form-button-bg'),
      this.add.text(0, 0, 'Сохранить', { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setName('form-button-text')]);
    saveBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
    saveBtn.on('pointerdown', () => this.updatePointFromForm());

    const deleteBtn = this.add.container(0, 110)
      .setName('form-button-container form-button-delete');
    deleteBtn.add([this.add.rectangle(0, 0, 120, 30, 0xff0000)
      .setStrokeStyle(1, 0xffffff)
      .setName('form-button-bg'),
      this.add.text(0, 0, 'Удалить', { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setName('form-button-text')]);
    deleteBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
    deleteBtn.on('pointerdown', () => this.deletePoint());

    const cancelBtn = this.add.container(0, 150)
      .setName('form-button-container form-button-cancel');
    cancelBtn.add([this.add.rectangle(0, 0, 120, 30, 0xaa0000)
      .setStrokeStyle(1, 0xffffff)
      .setName('form-button-bg'),
      this.add.text(0, 0, 'Отмена', { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setName('form-button-text')]);
    cancelBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
    cancelBtn.on('pointerdown', () => this.resetMode());

    form.coordinatesText = this.add.text(0, -80, 'x: 0, y: 0', { fontSize: '16px', color: '#ffffff' })
      .setName('coordinates-text');
    form.add([saveBtn, deleteBtn, cancelBtn, form.coordinatesText]);

    return form;
  }

  // Показать форму редактирования с данными точки
  showEditPointForm(point) {
    this.editPointFormContainer.setVisible(true);
    this.editPointFormContainer.nameInput.node.value = point.name;
    this.editPointFormContainer.currentTypeIndex = this.editPointFormContainer.typeOptions.indexOf(point.type);
    this.editPointFormContainer.typeText.setText(point.type);
    this.editPointFormContainer.coordinatesText.setText(`x: ${point.x}, y: ${point.y}`);
    this.toolbar.modeText.setText('Режим: редактирование точки');
  }

  // Обновить точку из формы
  updatePointFromForm() {
    if (!this.selectedPoint) return;

    const updatedData = {
      id: this.selectedPoint.id,
      name: this.editPointFormContainer.nameInput.node.value || this.selectedPoint.name,
      type: this.editPointFormContainer.typeOptions[this.editPointFormContainer.currentTypeIndex],
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

  // Удалить точку
  async deletePoint() {
    if (!this.selectedPoint) return;

    try {
      // Предполагается, что вы добавите метод deletePoint в MapDataManager
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
}