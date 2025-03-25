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
      this.player = this.scene.add.circle(0, 0, 5, 0xffcf5b).setDepth(2); // Начальная позиция будет обновлена
    }
    
    /**
   * Обновляет позицию игрока на основе данных гекса.
   * @param {Object} playerData - Данные позиции игрока
   * @param {number} playerData.q - Координата q гекса
   * @param {number} playerData.r - Координата r гекса
   * @param {boolean} [useTween=false] - Использовать ли анимацию для перемещения
   */
    updatePosition(playerData, useTween = false) {
      const hexGrid = this.scene.hexGrid;
      if (!hexGrid || !hexGrid.board) {
        console.warn('HexGrid or board not ready');
        return;
      }
  
      const worldXY = hexGrid.board.tileXYToWorldXY(playerData.q, playerData.r);
      if (useTween) {
        this.scene.tweens.add({
          targets: this.player,
          x: worldXY.x,
          y: worldXY.y,
          duration: 1000,
          ease: 'Linear',
          onComplete: () => console.log('Player moved to:', worldXY.x, worldXY.y)
        });
      } else {
        this.player.setPosition(worldXY.x, worldXY.y);
        console.log('Player position set to:', worldXY.x, worldXY.y);
      }
    }
  }