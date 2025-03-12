import Phaser from "phaser";
import HexGrid from "./scenes/HexGrid";

const config = {
    type: Phaser.AUTO,
    parent: "game-content",
    backgroundColor: "#000000",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
    },
    scene: [HexGrid],
};

export default function StartGame(parent) {
    return new Phaser.Game({ ...config, parent });
}