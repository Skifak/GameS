/**
 * Управляет визуальной позицией игрока в сцене Phaser.
 * @module PlayerController
 */

/**
 * Класс для управления позицией игрока на карте.
 * @class
 * @param {Phaser.Scene} scene - Экземпляр сцены Phaser, в которой отображается игрок
 */
export class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = this.scene.add.circle(0, 0, 5, 0x4B712E).setDepth(2); // Тёмный круг 10px диаметр
  }

  /**
   * Обновляет позицию игрока на основе данных.
   * @param {Object} positionData - Данные позиции игрока
   * @param {number} [positionData.x] - Координата x в мире
   * @param {number} [positionData.y] - Координата y в мире
   * @param {boolean} [useTween=false] - Использовать ли анимацию для перемещения
   */
  updatePosition(positionData, useTween = false) {
    if (!positionData.x || !positionData.y) {
      console.warn('Invalid position data:', positionData);
      return;
    }

    const { x, y } = positionData;
    if (useTween) {
      this.scene.tweens.add({
        targets: this.player,
        x: x,
        y: y,
        duration: 1000,
        ease: 'Linear',
        onComplete: () => console.log('Player moved to:', x, y)
      });
    } else {
      this.player.setPosition(x, y);
      console.log('Player position set to:', x, y);
    }
  }
}