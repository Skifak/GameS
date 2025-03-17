/**
 * Главный файл для инициализации игры Phaser.
 * Определяет конфигурацию и запускает игру с указанной сценой.
 * @module PhaserMain
 */

import Phaser from "phaser";
import { Game } from "./scenes/Game";

/**
 * Конфигурация игры Phaser.
 * @type {Object}
 */
const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#000000",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth - 20, // Учитываем border 10px с каждой стороны
        height: window.innerHeight - 20,
    },
    scene: [Game],
};

/**
 * Запускает игру Phaser с заданным родительским элементом.
 * @param {string} parent - ID родительского HTML-элемента
 * @returns {Phaser.Game} Экземпляр игры Phaser
 */
export default function StartGame(parent) {
    return new Phaser.Game({ ...config, parent });
}