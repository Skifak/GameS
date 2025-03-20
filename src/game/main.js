import Phaser from "phaser";
import { Game } from "./scenes/Game";
import RexBoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin.js';

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
  scene: [Game],
  plugins: {
    scene: [
      { key: 'rexBoard', plugin: RexBoardPlugin, mapping: 'rexBoard' }
    ]
  }
};

export default function StartGame(parent) {
  return new Phaser.Game({ ...config, parent });
}