/**
 * Инициализирует игру Phaser с заданной конфигурацией.
 * @module MainGame
 */
import Phaser from "phaser";
import { Game } from "./scenes/Game";
import { EditorScene } from './scenes/EditorScene';
import RexBoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin.js';

/**
 * Конфигурация для экземпляра игры Phaser.
 * @type {Object}
 */
const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth - 20,
    height: window.innerHeight - 20,
  },
  scene: [Game, EditorScene],
  plugins: {
    scene: [
      { key: 'rexBoard', plugin: RexBoardPlugin, mapping: 'rexBoard' }
    ]
  }
};

/**
 * Создаёт экземпляр игры Phaser.
 * @param {string} parent - ID элемента-контейнера для игры
 * @returns {Phaser.Game} Экземпляр игры Phaser
 */
export default function StartGame(parent) {
  const game = new Phaser.Game({ ...config, parent });

  // По умолчанию запускаем только сцену Game
  game.scene.start('Game');
  game.scene.stop('EditorScene');

  return game;
}