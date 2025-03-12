import Phaser from "phaser";
import client from "../../utils/socket";
import { EventBus } from "../EventBus";

export default class HexGrid extends Phaser.Scene {
    constructor() {
        super("HexGrid");
    }

    create() {
        this.statusText = this.add.text(100, 100, "Connecting to Colyseus...", { color: "#ffffff" });
        this.time.delayedCall(100, this.connectToRoom, [], this); // Отложим подключение
        EventBus.emit("current-scene-ready", this);
    }

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