export class PlayerController {
    constructor(scene) {
        this.scene = scene;
        this.player = this.scene.add.circle(1024, 1024, 5, 0xffcf5b).setDepth(2);
    }

    updatePosition(playerData, useTween = false) {
        if (useTween) {
            this.scene.tweens.add({
                targets: this.player,
                x: playerData.x,
                y: playerData.y,
                duration: 500,
                ease: 'Linear',
                onComplete: () => console.log('Player moved to:', playerData.x, playerData.y)
            });
        } else {
            this.player.setPosition(playerData.x, playerData.y);
            console.log('Player position set to:', playerData.x, playerData.y);
        }
    }
}