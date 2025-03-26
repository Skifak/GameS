/**
 * Рендерит гексагональную сетку и маркер игрока в сцене Phaser.
 * @module HexGrid
 */

import { EventBus } from '../EventBus';
import logger from '../../utils/logger';

/**
 * Класс для отображения и управления гексагональной сеткой.
 * @class
 * @param {Phaser.Scene} scene - Экземпляр сцены Phaser
 * @param {Colyseus.Room} room - Комната Colyseus для синхронизации
 * @param {MapDataManager} mapDataManager - Менеджер данных карты
 */
export class HexGrid {
  constructor(scene, room, mapDataManager) {
    this.scene = scene;
    console.log('[DEBUG] HexGrid initialized with scene key:', this.scene.key);
    this.room = room;
    this.mapDataManager = mapDataManager;
    this.hexSize = 100;
    this.board = null;
    this.hexGroup = this.scene.add.group();
    this.marker = null;
    this.pointsGroup = this.scene.add.group();
    this.pathsGraphics = this.scene.add.graphics();
    this.currentHex = null;
    this.hexGraphics = null;
  }

  /**
   * Инициализирует гексагональную сетку (для совместимости)
   */
  initGrid() {
    this.create();
    console.log('[DEBUG] Initializing HexGrid for scene:', this.scene.key);
    // Загружаем точки после инициализации сетки
    this.loadPoints().then(() => {
      console.log('Points loaded after grid initialization');
    }).catch(error => {
      console.error('Failed to load points:', error);
    });
  }

  setupInput() {
    if (!this.scene) {
      console.error('[ERROR] Scene is not defined in HexGrid');
      return;
    }

    this.scene.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.type === 'hex') {
        logger.info(`Hex clicked: q:${gameObject.q}, r:${gameObject.r}`);
        console.log(`[DEBUG] Scene key: ${this.scene.key}`);
        if (this.scene.key === 'EditorScene') {
          console.log(`[DEBUG] Emitting hexClicked: q=${gameObject.q}, r=${gameObject.r}`);
          EventBus.emit('hexClicked', { q: gameObject.q, r: gameObject.r });
        } else if (this.scene.key === 'Game') {
          console.log(`[DEBUG] Emitting moveToHexRequested: q=${gameObject.q}, r=${gameObject.r}`);
          EventBus.emit('moveToHexRequested', { q: gameObject.q, r: gameObject.r });
        }
      }
    });
  }
  
  /**
   * Очищает текущую сетку перед перерисовкой. Вызывается перед загрузкой новой карты.
   */
  clearGrid() {
    if (this.board) this.board.destroy();
    this.hexGroup.clear(true, true);
    this.clearPointsAndPaths();
    if (this.marker) this.marker.destroy();
  }

  /**
   * Очищает точки и пути без удаления гексов.
   */
  clearPointsAndPaths() {
    this.pointsGroup.clear(true, true);
    this.pathsGraphics.clear();
  }

  /**
   * Создает и отображает гексагональную сетку.
   */
  create() {
    // Создание и настройка сетки
    this.board = this.scene.rexBoard.add.board({
      grid: {
        gridType: 'hexagonGrid',
        x: 0,
        y: 0,
        cellWidth: 150,
        cellHeight: 173.205, // 150 * sqrt(3)
        type: 'flat'
      },
      width: 100,
      height: 100
    });

    // Создание графики для отображения гексов
    this.hexGraphics = this.scene.add.group();
    
    // Отрисовываем гексы, которые есть в кэше
    for (const [key, hex] of this.mapDataManager.hexes) {
      const [q, r] = key.split(':').map(Number);
      this.drawHex(q, r);
    }
    
    // Загружаем и отображаем точки
    this.loadPoints();

    // Создаем графику для отображения путей
    this.pathsGraphics = this.scene.add.graphics();
    this.pathsGraphics.lineStyle(3, 0xffffff, 0.8);
    
    // Добавляем обработчик кликов по гексам
    this.scene.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.type === 'hex') {
        logger.info(`Hex clicked: q:${gameObject.q}, r:${gameObject.r}`);
        console.log(`[DEBUG] Scene key: ${this.scene.key}`); // Добавьте для проверки
        if (this.scene.key === 'EditorScene') {
          console.log(`[DEBUG] Emitting hexClicked: q=${gameObject.q}, r=${gameObject.r}`);
          EventBus.emit('hexClicked', { q: gameObject.q, r: gameObject.r });
        } else if (this.scene.key === 'Game') {
          EventBus.emit('moveToHexRequested', { q: gameObject.q, r: gameObject.r });
        }
      }
    });
  }

  /**
   * Загружает и отображает все точки из базы данных
   */
  async loadPoints() {
    try {
      // Загружаем точки из базы данных через MapDataManager
      const points = await this.mapDataManager.loadPoints();
      console.log('Loaded points in HexGrid:', points);
      
      // Очищаем текущие точки
      this.pointsGroup.clear(true, true);
      
      // Отображаем каждую точку
      points.forEach(point => {
        this.createPoint(point);
      });
    } catch (error) {
      console.error('Error loading points in HexGrid:', error);
    }
  }

  /**
   * Создает графическое представление точки
   * @param {Object} pointData - Данные точки из базы
   */
  createPoint(pointData) {
    // Определяем цвет в зависимости от типа
    let fillColor;
    switch (pointData.type) {
      case 'camp':
        fillColor = 0x00ff00; // Зелёный
        break;
      case 'anomaly':
        fillColor = 0xff0000; // Красный
        break;
      case 'transition':
        fillColor = 0x0000ff; // Синий
        break;
      case 'faction':
        fillColor = 0xffff00; // Жёлтый
        break;
      default:
        fillColor = 0xffffff; // Белый по умолчанию
    }
    
    // Создаем графику точки
    const pointGraphic = this.scene.add.graphics();
    pointGraphic.fillStyle(fillColor, 0.8);
    pointGraphic.fillCircle(pointData.x, pointData.y, 10);
    pointGraphic.lineStyle(2, 0xffffff);
    pointGraphic.strokeCircle(pointData.x, pointData.y, 10);
    
    // Добавляем текст с названием
    const pointLabel = this.scene.add.text(
      pointData.x, 
      pointData.y - 20,
      pointData.name || 'Точка', 
      { fontSize: '12px', color: '#ffffff' }
    ).setOrigin(0.5);
    
    // Группируем графику точки и текст
    const pointContainer = this.scene.add.container(0, 0, [pointGraphic, pointLabel]);
    
    // Делаем точку интерактивной
    pointGraphic.setInteractive(new Phaser.Geom.Circle(pointData.x, pointData.y, 15), Phaser.Geom.Circle.Contains);
    pointGraphic.on('pointerdown', () => this.handlePointClick(pointData));
    
    // Сохраняем данные точки
    pointGraphic.pointData = pointData;
    
    // Добавляем в группу точек
    this.pointsGroup.add(pointContainer);
    
    return pointContainer;
  }

  /**
   * Отрисовывает гекс по координатам q и r.
   * @param {number} q - Координата q гекса
   * @param {number} r - Координата r гекса
   * @returns {Phaser.GameObjects.Graphics} - Графический объект гекса
   */
  drawHex(q, r) {
    // Получаем мировые координаты центра гекса
    const worldXY = this.board.tileXYToWorldXY(q, r);
    
    // Создаем графику для гекса
    const hexGraphic = this.scene.add.graphics();
    
    // Определяем цвет гекса в зависимости от типа
    let fillColor = 0x44aa44; // Обычный гекс
    
    // Рисуем гекс
    hexGraphic.fillStyle(fillColor, 0.3);
    hexGraphic.lineStyle(2, 0xffffff, 0.8);
    
    // Получаем точки для рисования шестиугольника
    const points = this.board.getGridPoints(q, r);
    
    // Рисуем контур и заливку
    hexGraphic.beginPath();
    for (let i = 0; i < 6; i++) {
      const point = points[i];
      if (i === 0) {
        hexGraphic.moveTo(point.x, point.y);
      } else {
        hexGraphic.lineTo(point.x, point.y);
      }
    }
    hexGraphic.closePath();
    hexGraphic.fillPath();
    hexGraphic.strokePath();
    
    // Создаем полигон для проверки кликов
    const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
    const polygon = new Phaser.Geom.Polygon(polygonPoints);
    
    // Добавляем свойства для интерактивности
    hexGraphic.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
    hexGraphic.type = 'hex';
    hexGraphic.q = q;
    hexGraphic.r = r;
    hexGraphic.geom = polygon; // Сохраняем геометрию для последующих проверок
    
    // Добавляем в группу
    this.hexGraphics.add(hexGraphic);
    
    logger.info(`Hex drawn at q:${q}, r:${r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);
    
    return hexGraphic;
  }

  /**
   * Обновляет маркер позиции игрока на сетке. Вызывается при изменении позиции игрока.
   */
  updateMarker() {
    if (!this.room || !this.room.state || !this.room.state.players || !this.board) {
      console.warn('Room state or board not ready for marker update');
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

  /**
   * Обновляет информацию о текущем гексе.
   * @param {number} q - Координата q
   * @param {number} r - Координата r
   */
  updateCurrentHex(q, r) {
    this.currentHex = { q, r };
    
    // Получаем информацию о гексе из MapDataManager
    const hexData = this.mapDataManager.getHex(q, r);
    const worldXY = this.board.tileXYToWorldXY(q, r);
    
    // Обновляем данные гекса
    logger.info(`Current hex set to q:${q}, r:${r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);
    
    // Загружаем точки и пути для этого гекса
    this.loadHexData(q, r);
    
    return { q, r, worldXY, hexData };
  }

  /**
   * Отрисовывает пути для текущего гекса.
   * @param {Array<Object>} paths - Массив путей
   */
  renderPaths(paths) {
    if (!paths || paths.length === 0) return;
    
    paths.forEach(path => {
      // Определяем стиль пути
      const lineWidth = path.isActive ? 3 : 2;
      const lineColor = path.isActive ? 0x00ff00 : 0x888888;
      const lineAlpha = 0.9;
      
      // Начинаем рисовать путь
      this.pathsGraphics.lineStyle(lineWidth, lineColor, lineAlpha);
      
      // Парсим узлы из JSON если нужно
      let nodes = path.nodes;
      if (typeof nodes === 'string') {
        try {
          nodes = JSON.parse(nodes);
        } catch (error) {
          logger.error(`Failed to parse path nodes: ${error.message}`);
          return;
        }
      }
      
      // Рисуем линии между узлами
      for (let i = 0; i < nodes.length - 1; i++) {
        this.pathsGraphics.lineBetween(
          nodes[i].x, 
          nodes[i].y, 
          nodes[i+1].x, 
          nodes[i+1].y
        );
        
        // Рисуем узлы как круги (кроме первого и последнего)
        if (i > 0 && i < nodes.length - 1) {
          this.pathsGraphics.fillStyle(0x888888, 1);
          this.pathsGraphics.fillCircle(nodes[i].x, nodes[i].y, 5); // 10px диаметр = 5px радиус
        }
      }
    });
  }

  /**
   * Обрабатывает клик по точке.
   * @param {Object} point - Данные точки
   */
  handlePointClick(point) {
    logger.info(`Point clicked: id=${point.id}, type=${point.type}`);
    
    // В игре
    if (this.scene.key === 'Game') {
      // Отправляем событие в EventBus
      EventBus.emit('moveToPointRequested', point.id);
    }
    // В редакторе обработка происходит в EditorScene
  }
}