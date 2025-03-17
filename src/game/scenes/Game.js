/**
 * Сцена игры для Phaser.
 * Отображает базовый игровой экран и управляет переключением сцен.
 * @module GameScene
 */

import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

/**
 * Класс сцены основной игры.
 * @extends Scene
 */
export class Game extends Scene {
    /**
     * Создаёт экземпляр сцены игры.
     */
    constructor() {
        super('Game');
    }

    /**
     * Инициализирует сцену, добавляя фон и текст.
     */
    create() {
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.add.image(512, 384, 'background').setAlpha(0.5);
        this.add.text(512, 384, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        EventBus.emit('current-scene-ready', this);
    }

    /**
     * Переключает текущую сцену на 'GameOver'.
     */
    changeScene() {
        this.scene.start('GameOver');
    }
}