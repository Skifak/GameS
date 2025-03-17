/**
 * Главный файл для инициализации игры Phaser.
 * Определяет конфигурацию и запускает игру с указанной сценой.
 * @module PhaserMain
 */

import Phaser from "phaser";
import HexGrid from "./scenes/HexGrid";

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
        width: 800,
        height: 600,
    },
    scene: [HexGrid],
};

/**
 * Запускает игру Phaser с заданным родительским элементом и данными пользователя.
 * @param {string} parent - ID родительского HTML-элемента
 * @param {Object} user - Данные текущего пользователя
 * @returns {Phaser.Game} Экземпляр игры Phaser
 */
export default function StartGame(parent, user) {
    return new Phaser.Game({ ...config, parent, user });
}