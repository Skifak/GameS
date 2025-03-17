/**
 * Класс для управления гексагональной сеткой в Phaser.
 * Создаёт и отрисовывает гексы на карте.
 * @module HexGrid
 */

export class HexGrid {
    /**
     * Создаёт экземпляр гексагональной сетки.
     * @param {Phaser.Scene} scene - Сцена Phaser, где отображаются гексы
     */
    constructor(scene) {
        this.scene = scene;
        this.hexSize = 115;
        this.hexes = [];
        this.hexGroup = this.scene.add.group();
    }

    /**
     * Создаёт гексагональную сетку на основе заданных размеров.
     */
    createGrid() {
        const worldWidth = 2048;
        const worldHeight = 2048;
        const hexWidth = this.hexSize * Math.sqrt(3);
        const hexHeight = this.hexSize * 2;
        const cols = Math.ceil(worldWidth / (hexWidth * 0.75)) + 1;
        const rows = Math.ceil(worldHeight / (hexHeight * 0.75)) + 1;

        for (let q = 0; q < cols; q++) {
            for (let r = 0; r < rows; r++) {
                const x = hexWidth * (q + r % 2 * 0.5);
                const y = hexHeight * 0.75 * r;
                if (this.isHexInsideBounds(x, y, worldWidth, worldHeight)) {
                    this.addHex(q, r, x + 10, y + 60);
                }
            }
        }
    }

    /**
     * Проверяет, находится ли гекс в пределах карты.
     * @param {number} x - Координата X центра гекса
     * @param {number} y - Координата Y центра гекса
     * @param {number} worldWidth - Ширина мира
     * @param {number} worldHeight - Высота мира
     * @returns {boolean} True, если гекс внутри границ
     */
    isHexInsideBounds(x, y, worldWidth, worldHeight) {
        const hexHalfWidth = this.hexSize * Math.sqrt(3) / 2;
        const hexHalfHeight = this.hexSize;
        return (
            x - hexHalfWidth >= 10 &&
            x + hexHalfWidth <= worldWidth - 10 &&
            y - hexHalfHeight >= 45 &&
            y + hexHalfHeight <= worldHeight - 45
        );
    }

    /**
     * Добавляет гекс на карту.
     * @param {number} q - Координата q в гексагональной системе
     * @param {number} r - Координата r в гексагональной системе
     * @param {number} x - Координата X в пикселях
     * @param {number} y - Координата Y в пикселях
     */
    addHex(q, r, x, y) {
        const type = 'closed';
        const points = [
            0, -this.hexSize,
            this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2,
            this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
            0, this.hexSize,
            -this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
            -this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2
        ];

        const hex = this.scene.add.polygon(x, y, points, 0xaaaaaa, 0.7);
        this.hexes.push({ q, r, x, y, type, closed: true, gameObject: hex });
        this.hexGroup.add(hex);
    }
}