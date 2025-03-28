/**
 * Рендерит пути между точками в сцене Phaser.
 * @module Path
 */
import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class Path extends Phaser.GameObjects.GameObject {
  constructor(scene, pathData) {
    super(scene, 'Path');
    this.pathData = pathData;
    this.graphics = scene.add.graphics().setDepth(10);
    this.nodesGroup = scene.add.group();
    this.isActive = false;

    scene.add.existing(this);
    this.render();
    this.makeInteractive();
  }

  render() {
    this.graphics.clear();
    this.nodesGroup.clear(true, true);

    const lineWidth = this.isActive ? 4 : 3;
    this.graphics.lineStyle(lineWidth, 0xffffff, 1);

    const startPoint = this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.start_point)?.pointData;
    const endPoint = this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.end_point)?.pointData;

    if (!startPoint || !endPoint) return;

    const points = [startPoint, ...this.pathData.nodes, endPoint];
    for (let i = 0; i < points.length - 1; i++) {
      this.graphics.beginPath();
      this.graphics.moveTo(points[i].x, points[i].y);
      this.graphics.lineTo(points[i + 1].x, points[i + 1].y);
      this.graphics.strokePath();

      if (i < points.length - 2) {
        const node = this.scene.add.circle(points[i + 1].x, points[i + 1].y, 5, 0x4B712E).setDepth(11);
        node.setInteractive();
        node.on('pointerdown', () => {
          EventBus.emit('moveToNode', { pathId: this.pathData.id, nodeIndex: i });
        });
        node.on('pointerover', () => node.setScale(1.2));
        node.on('pointerout', () => node.setScale(1));
        node.pathId = this.pathData.id;
        node.nodeIndex = i;
        this.nodesGroup.add(node);
      }
    }
  }

  makeInteractive() {
    // Делаем линии интерактивными
    const points = [
      this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.start_point)?.pointData,
      ...this.pathData.nodes,
      this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.end_point)?.pointData
    ].filter(p => p);

    if (points.length < 2) return;

    const hitArea = new Phaser.Geom.Polygon(points.flatMap(p => [p.x, p.y]));
    this.graphics.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
    this.graphics.on('pointerdown', () => {
      this.scene.game.events.emit('path-clicked', this);
    });
    this.graphics.on('pointerover', () => this.graphics.lineStyle(4, 0xffffff, 1));
    this.graphics.on('pointerout', () => this.graphics.lineStyle(3, 0xffffff, 1));
  }

  setActive(active) {
    this.isActive = active;
    this.render();
  }

  updateNode(index, x, y) {
    this.pathData.nodes[index] = { ...this.pathData.nodes[index], x, y };
    this.render();
  }

  destroy() {
    this.graphics.destroy();
    this.nodesGroup.destroy();
    super.destroy();
  }
}