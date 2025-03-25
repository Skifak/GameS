/**
 * Управляет пользовательским интерфейсом в сцене Phaser.
 * @module UIManager
 */

/**
 * Класс для отображения и управления UI-элементами в игре.
 * @class
 * @param {Phaser.Scene} scene - Экземпляр сцены Phaser для рендеринга UI
 */
export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.statusText = this.scene.add.text(10, 10, 'Connecting to Colyseus...', {
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        }).setScrollFactor(0).setDepth(10);
    }
    
    /**
   * Устанавливает текст статуса в UI.
   * @param {string} message - Сообщение для отображения
   */
    setStatus(message) {
        this.statusText.setText(message);
    }
}