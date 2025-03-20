export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.statusText = this.scene.add.text(10, 10, 'Connecting to Colyseus...', {
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        }).setScrollFactor(0).setDepth(10);
    }

    setStatus(message) {
        this.statusText.setText(message);
    }
}