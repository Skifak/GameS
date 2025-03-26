/**
 * Рендерит пути между точками в сцене Phaser.
 * @module Path
 *//**
 * Рендерит пути между точками в сцене Phaser.
 * @module Path
 */
import Phaser from 'phaser';

export class Path {
  constructor(scene, pathData) {
    this.scene = scene;
    this.pathData = pathData; // { id, start_point, end_point, nodes }
    this.graphics = scene.add.graphics().setDepth(10);
    this.nodesGroup = scene.add.group();
    this.isActive = false;

    this.render();
  }

  render() {
    this.graphics.clear();
    this.nodesGroup.clear(true, true);

    const lineWidth = this.isActive ? 5 : 3;
    this.graphics.lineStyle(lineWidth, 0xffffff, 1); // --white

    const startPoint = this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.start_point)?.pointData;
    const endPoint = this.scene.points.getChildren().find(p => p.pointData.id === this.pathData.end_point)?.pointData;

    if (!startPoint || !endPoint) return;

    const points = [startPoint, ...this.pathData.nodes, endPoint];
    for (let i = 0; i < points.length - 1; i++) {
      this.graphics.beginPath();
      this.graphics.moveTo(points[i].x, points[i].y);
      this.graphics.lineTo(points[i + 1].x, points[i + 1].y);
      this.graphics.strokePath();

      if (i < points.length - 2) { // Узлы (кроме start и end)
        const node = this.scene.add.circle(points[i + 1].x, points[i + 1].y, 5, 0x4B712E).setDepth(11); // --green
        node.setInteractive();
        this.scene.input.setDraggable(node);
        node.pathId = this.pathData.id;
        node.nodeIndex = i;
        this.nodesGroup.add(node);
      }
    }
  }

  setActive(active) {
    this.isActive = active;
    this.render();
  }

  destroy() {
    this.graphics.destroy();
    this.nodesGroup.destroy();
  }
}