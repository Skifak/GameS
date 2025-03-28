/**
 * Рендерит гексагональную сетку и маркер игрока в сцене Phaser.
 * @module HexGrid
 */
import { EventBus } from '../EventBus';
import logger from '../../utils/logger';

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
    this.nodesGroup = this.scene.add.group(); // Добавляем группу для узлов
    this.currentHex = null;
    this.hexGraphics = null;
    this.lastPlayerX = null; // Последняя известная позиция X
    this.lastPlayerY = null; // Последняя известная позиция Y
  }

  initGrid() {
    this.create();
    console.log('[DEBUG] Initializing HexGrid for scene:', this.scene.key);
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
        if (this.scene.key === 'EditorScene') {
          EventBus.emit('hexClicked', { q: gameObject.q, r: gameObject.r });
        } else if (this.scene.key === 'Game') {
          EventBus.emit('moveToHexRequested', { q: gameObject.q, r: gameObject.r });
        }
      }
    });
  }

  clearGrid() {
    if (this.board) this.board.destroy();
    this.hexGroup.clear(true, true);
    this.clearPointsAndPaths();
    if (this.marker) this.marker.destroy();
  }

  clearPointsAndPaths() {
    this.pointsGroup.clear(true, true);
    this.pathsGraphics.clear();
    this.nodesGroup.clear(true, true); // Очищаем узлы
  }

  create() {
    this.board = this.scene.rexBoard.add.board({
      grid: {
        gridType: 'hexagonGrid',
        x: 0,
        y: 0,
        cellWidth: 500,
        cellHeight: 550,
        type: 'flat'
      },
      width: 100,
      height: 100
    });

    this.hexGraphics = this.scene.add.group();

    for (const [key, hex] of this.mapDataManager.hexes) {
      const [q, r] = key.split(':').map(Number);
      this.drawHex(q, r);
    }

    this.loadPoints();

    this.pathsGraphics = this.scene.add.graphics();
    this.pathsGraphics.lineStyle(3, 0xffffff, 0.8);

    this.setupInput();
  }

  async loadPoints() {
    try {
      const points = await this.mapDataManager.loadPoints();
      console.log('Loaded points in HexGrid:', points);
      this.pointsGroup.clear(true, true);
      points.forEach(point => {
        this.createPoint(point);
      });
    } catch (error) {
      console.error('Error loading points in HexGrid:', error);
    }
  }

  createPoint(pointData) {
    let fillColor;
    switch (pointData.type) {
      case 'camp': fillColor = 0x00ff00; break;
      case 'anomaly': fillColor = 0xff0000; break;
      case 'transition': fillColor = 0x0000ff; break;
      case 'faction': fillColor = 0xffff00; break;
      default: fillColor = 0xffffff;
    }

    const pointGraphic = this.scene.add.graphics();
    pointGraphic.fillStyle(fillColor, 0.8);
    pointGraphic.fillCircle(pointData.x, pointData.y, 10);
    pointGraphic.lineStyle(2, 0xffffff);
    pointGraphic.strokeCircle(pointData.x, pointData.y, 10);

    const pointLabel = this.scene.add.text(
      pointData.x,
      pointData.y - 20,
      pointData.name || 'Точка',
      { fontSize: '12px', color: '#ffffff' }
    ).setOrigin(0.5);

    const pointContainer = this.scene.add.container(0, 0, [pointGraphic, pointLabel]);
    pointGraphic.setInteractive(new Phaser.Geom.Circle(pointData.x, pointData.y, 15), Phaser.Geom.Circle.Contains);
    pointGraphic.on('pointerdown', () => this.handlePointClick(pointData));
    pointGraphic.pointData = pointData;
    this.pointsGroup.add(pointContainer);

    return pointContainer;
  }

  drawHex(q, r) {
    const worldXY = this.board.tileXYToWorldXY(q, r);
    const hexGraphic = this.scene.add.graphics();
    let fillColor = 0x44aa44;

    hexGraphic.fillStyle(fillColor, 0.3);
    hexGraphic.lineStyle(2, 0xffffff, 0.8);

    const points = this.board.getGridPoints(q, r);
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

    const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
    const polygon = new Phaser.Geom.Polygon(polygonPoints);
    hexGraphic.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
    hexGraphic.type = 'hex';
    hexGraphic.q = q;
    hexGraphic.r = r;
    hexGraphic.geom = polygon;

    this.hexGraphics.add(hexGraphic);
    logger.info(`Hex drawn at q:${q}, r:${r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);

    return hexGraphic;
  }

  updateMarker() {
    if (!this.room || !this.room.state || !this.room.state.players || !this.board) {
      console.warn('Room state or board not ready for marker update');
      return;
    }

    const playerData = this.room.state.players.get(this.room.sessionId);
    if (playerData) {
      // Проверяем, изменилась ли позиция
      if (this.lastPlayerX !== playerData.x || this.lastPlayerY !== playerData.y) {
        this.scene.gameStateManager.updatePlayerPosition(playerData.x, playerData.y, false);
        if (!this.marker) {
          this.marker = this.scene.add.circle(playerData.x, playerData.y, 10, 0xff0000).setDepth(10);
        } else {
          this.marker.setPosition(playerData.x, playerData.y);
        }
        this.lastPlayerX = playerData.x;
        this.lastPlayerY = playerData.y;
        logger.info(`Marker updated to x:${playerData.x}, y:${playerData.y}`);
      }
    }
  }

  updateCurrentHex(q, r) {
    this.currentHex = { q, r };
    const hexData = this.mapDataManager.getHex(q, r);
    const worldXY = this.board.tileXYToWorldXY(q, r);
    logger.info(`Current hex set to q:${q}, r:${r}, worldX:${worldXY.x}, worldY:${worldXY.y}`);
    this.loadHexData(q, r);
    return { q, r, worldXY, hexData };
  }

  renderPaths(paths, clearOthers = false) {
    if (clearOthers) {
      this.pathsGraphics.clear();
      this.nodesGroup.clear(true, true); // Очищаем предыдущие узлы
    }
    if (!paths || paths.length === 0) {
      logger.info('No paths to render');
      return;
    }

    this.pathsGraphics.lineStyle(3, 0xffffff, 1);

    paths.forEach(path => {
      const startContainer = this.pointsGroup.getChildren().find(container => {
        const graphic = container.getAt(0);
        return graphic.pointData && graphic.pointData.id === path.start_point;
      });
      const endContainer = this.pointsGroup.getChildren().find(container => {
        const graphic = container.getAt(0);
        return graphic.pointData && graphic.pointData.id === path.end_point;
      });

      const startPoint = startContainer ? startContainer.getAt(0).pointData : null;
      const endPoint = endContainer ? endContainer.getAt(0).pointData : null;

      if (!startPoint || !endPoint) {
        logger.warn(`Cannot render path ${path.id}: startPoint or endPoint missing`);
        return;
      }

      const nodes = Array.isArray(path.nodes) ? path.nodes : JSON.parse(path.nodes || '[]');
      const allNodes = [startPoint, ...nodes, endPoint];

      // Рендерим линии
      for (let i = 0; i < allNodes.length - 1; i++) {
        this.pathsGraphics.lineBetween(allNodes[i].x, allNodes[i].y, allNodes[i + 1].x, allNodes[i + 1].y);
      }

      // Рендерим узлы (кроме startPoint и endPoint)
      nodes.forEach((node, index) => {
        const nodeGraphic = this.scene.add.circle(node.x, node.y, 5, 0x4B712E).setDepth(11);
        nodeGraphic.setInteractive();
        nodeGraphic.on('pointerdown', () => {
          EventBus.emit('moveToNode', { pathId: path.id, nodeIndex: index });
          logger.info(`Node clicked: pathId=${path.id}, nodeIndex=${index}`);
        });
        nodeGraphic.on('pointerover', () => nodeGraphic.setScale(1.2));
        nodeGraphic.on('pointerout', () => nodeGraphic.setScale(1));
        this.nodesGroup.add(nodeGraphic);
      });
    });
  }

  async handlePointClick(point) {
    logger.info(`Point clicked: id=${point.id}, type=${point.type}`);
    const { data: profile, error: profileError } = await this.scene.supabase
      .from('profiles')
      .select('current_point_id')
      .eq('id', this.scene.gameStateManager.player.id)
      .single();

    if (profileError) {
      logger.error(`Failed to load profile: ${profileError.message}`);
      return;
    }

    const { data: paths, error: pathsError } = await this.scene.supabase
      .from('paths')
      .select('*')
      .eq('start_point', profile.current_point_id)
      .eq('end_point', point.id);

    if (pathsError) {
      logger.error(`Failed to load paths: ${pathsError.message}`);
      return;
    }

    logger.info(`Paths loaded for start_point=${profile.current_point_id} to end_point=${point.id}:`, paths);
    this.renderPaths(paths, true); // Очищаем предыдущие пути и рендерим новые
  }
}