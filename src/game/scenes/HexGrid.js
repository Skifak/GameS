import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class HexGrid {
  constructor(scene, room, mapDataManager) {
    this.scene = scene;
    this.room = room;
    this.mapDataManager = mapDataManager;
    this.hexSize = 117;
    this.hexGroup = this.scene.add.group();
    this.pointsGroup = this.scene.add.group();
    this.renderedHexes = new Set();
    this.renderedPoints = new Set();
    console.log('HexGrid constructed');
  }

  async initGrid() {
    const currentPoint = this.mapDataManager.getPoint(this.room.state.point.id);
    if (!currentPoint) {
      console.error('Current point not found in cache:', this.room.state.point.id);
      return;
    }

    this.mapDataManager.hexes.forEach(hex => {
      this.drawHexIfNeeded(hex.q, hex.r);
    });

    this.updatePoints(currentPoint.hex_q, currentPoint.hex_r);
  }

  updatePoints(q, r) {
    this.pointsGroup.clear(true, true);
    this.renderedPoints.clear();
    this.drawPointsInHex(q, r);
  }

  drawHexIfNeeded(q, r) {
    const key = `${q}:${r}`;
    if (this.renderedHexes.has(key)) return;

    const hex = this.mapDataManager.getHex(q, r);
    if (!hex) return;

    const hexWidth = this.hexSize * Math.sqrt(3);
    const hexHeight = this.hexSize * 2;
    const x = hexWidth * (q + (r % 2) * 0.5) + 10;
    const y = hexHeight * 0.75 * r + 45;

    const colors = {
      neutral: 0xaaaaaa,
      free: 0x00ff00,
      danger: 0xff0000,
      controlled: 0x0000ff
    };

    const points = [
      0, -this.hexSize,
      this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2,
      this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
      0, this.hexSize,
      -this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
      -this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2
    ];

    const hexObj = this.scene.add.polygon(x, y, points, colors[hex.type] || 0xaaaaaa, 0.7);
    hexObj.setData({ q, r, type: hex.type });
    this.hexGroup.add(hexObj);
    hexObj.setDepth(1);
    this.renderedHexes.add(key);
  }

  drawPointsInHex(q, r) {
    const points = this.mapDataManager.getPointsInHex(q, r);
    points.forEach(point => {
      if (this.renderedPoints.has(point.id)) return;

      const typeColors = {
        camp: 0x4B712E,
        transition: 0xffcf5b,
        normal: 0xaaaaaa,
        anomaly: 0xff0000,
        faction: 0x0000ff
      };

      const circle = this.scene.add.circle(point.x, point.y, 10, typeColors[point.type] || 0xaaaaaa, 0.7);
      circle.setInteractive();
      circle.on('pointerdown', () => this.handlePointClick(point.id));
      circle.setData({ id: point.id, type: point.type, hex_q: point.hex_q, hex_r: point.hex_r });
      this.pointsGroup.add(circle);
      circle.setDepth(2);
      this.renderedPoints.add(point.id);
    });
  }

  handlePointClick(pointId) {
    if (this.room.state.point.id === pointId) return;
    EventBus.emit('moveToPointRequested', pointId);
  }

  updateRoom(room) {
    this.room = room;
    if (!room.state || !room.state.point || !room.state.point.id) {
      room.onStateChange.once(state => this.updateRoom(room));
      return;
    }
    const currentPoint = this.mapDataManager.getPoint(this.room.state.point.id);
    if (currentPoint) this.updatePoints(currentPoint.hex_q, currentPoint.hex_r);
  }
}