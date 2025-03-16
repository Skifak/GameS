/**
 * Сцена с шестиугольной сеткой для Phaser.
 * Подключается к комнате Colyseus и отображает статус соединения.
 * @module HexGridScene
 */

import Phaser from "phaser";
import client from "../../utils/socket";
import { EventBus } from "../EventBus";

/**
 * Класс сцены с шестиугольной сеткой.
 * @extends Phaser.Scene
 */
export default class HexGrid extends Phaser.Scene {
    /**
     * Создаёт экземпляр сцены HexGrid.
     */
    constructor() {
        super("HexGrid");
    }

    /**
     * Инициализирует сцену, отображая текст статуса и подключаясь к комнате Colyseus.
     */
    create() {
        this.statusText = this.add.text(100, 100, "Connecting to Colyseus...", { color: "#ffffff" });
        this.time.delayedCall(100, this.connectToRoom, [], this); // Отложим подключение
        EventBus.emit("current-scene-ready", this);
    }

    /**
     * Подключается к комнате Colyseus с именем "hex".
     * Обновляет текст статуса в зависимости от результата.
     * @async
     */
    async connectToRoom() {
        try {
            this.room = await client.joinOrCreate("hex", { hexId: "hex_1" });
            if (this.scene.isActive()) { // Проверяем, активна ли сцена
                this.statusText.setText("Connected to Colyseus");
                console.log("Client connected to room");
            }
        } catch (error) {
            console.error("Failed to join room:", error);
            if (this.scene.isActive()) {
                this.statusText.setText("Failed to connect");
            }
        }
    }
}