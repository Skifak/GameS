/**
 * Класс для управления гексагональной сеткой в Phaser.
 * Отвечает за отрисовку гексов и точек интереса на основе данных с сервера.
 * @module HexGrid
 */

import Phaser from 'phaser';

/**
 * Класс гексагональной сетки.
 */
export class HexGrid {
    /**
     * Создает экземпляр гексагональной сетки.
     * @param {Phaser.Scene} scene - Сцена Phaser, в которой отображается сетка
     * @param {import('colyseus.js').Room} room - Комната Colyseus для получения данных с сервера
     */
    constructor(scene, room) {
        this.scene = scene;
        this.room = room; // Комната Colyseus для синхронизации
        this.hexSize = 117; // Размер гекса (радиус)
        this.hexGroup = this.scene.add.group(); // Группа для гексов
        this.pointsGroup = this.scene.add.group(); // Группа для точек интереса
    }

    /**
     * Инициализирует сетку, запрашивая данные о гексах и точках с сервера.
     * @async
     */
    async initGrid() {
        await this.loadHexes();
        await this.loadPoints();
        this.setupListeners();
    }

    /**
     * Загружает данные о гексах с сервера и отрисовывает их.
     * @async
     */
    async loadHexes() {
        try {
            // Предполагаем, что сервер отправляет список гексов через API или Colyseus
            const { data, error } = await this.scene.supabase
                .from('hexes')
                .select('q, r, type');
            if (error) throw new Error(error.message);

            data.forEach(hex => this.drawHex(hex.q, hex.r, hex.type));
            this.hexGroup.getChildren().forEach(hex => hex.setDepth(1));
        } catch (error) {
            console.error('Failed to load hexes:', error.message);
        }
    }

    /**
     * Загружает данные о точках интереса с сервера и отрисовывает их.
     * @async
     */
    async loadPoints() {
        try {
            const { data, error } = await this.scene.supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y');
            if (error) throw new Error(error.message);

            data.forEach(point => this.drawPoint(point));
            this.pointsGroup.getChildren().forEach(point => point.setDepth(2));
        } catch (error) {
            console.error('Failed to load points:', error.message);
        }
    }

    /**
     * Отрисовывает один гекс на карте.
     * @param {number} q - Координата q в гексагональной системе
     * @param {number} r - Координата r в гексагональной системе
     * @param {string} type - Тип гекса (neutral, free, danger, controlled)
     */
    drawHex(q, r, type) {
        const hexWidth = this.hexSize * Math.sqrt(3);
        const hexHeight = this.hexSize * 2;
        const x = hexWidth * (q + (r % 2) * 0.5) + 10; // Смещение для выравнивания
        const y = hexHeight * 0.75 * r + 45;

        const colors = {
            neutral: 0xaaaaaa,
            free: 0x00ff00,
            danger: 0xff0000,
            controlled: 0x0000ff
        };

        const points = [
            0, -this.hexSize,
            this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2,
            this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
            0, this.hexSize,
            -this.hexSize * Math.sqrt(3) / 2, this.hexSize / 2,
            -this.hexSize * Math.sqrt(3) / 2, -this.hexSize / 2
        ];

        const hex = this.scene.add.polygon(x, y, points, colors[type] || 0xaaaaaa, 0.7);
        hex.setData({ q, r, type }); // Сохраняем данные для идентификации
        this.hexGroup.add(hex);
    }

    /**
     * Отрисовывает одну точку интереса на карте.
     * @param {Object} point - Данные точки интереса
     * @param {number} point.id - Уникальный ID точки
     * @param {number} point.hex_q - Координата q гекса
     * @param {number} point.hex_r - Координата r гекса
     * @param {string} point.type - Тип точки (camp, transition, normal, anomaly, faction)
     * @param {number} point.x - Координата X на карте
     * @param {number} point.y - Координата Y на карте
     */
    drawPoint(point) {
        const typeColors = {
            camp: 0x4B712E,      // --green
            transition: 0xffcf5b, // --orange
            normal: 0xaaaaaa,     // --silver-chalice
            anomaly: 0xff0000,    // красный
            faction: 0x0000ff     // синий
        };

        const circle = this.scene.add.circle(point.x, point.y, 10, typeColors[point.type] || 0xaaaaaa, 0.7);
        circle.setInteractive(); // Делаем точку кликабельной
        circle.on('pointerdown', () => this.handlePointClick(point.id));
        circle.setData({ id: point.id, type: point.type, hex_q: point.hex_q, hex_r: point.hex_r });
        this.pointsGroup.add(circle);
    }

    /**
     * Обрабатывает клик по точке интереса и отправляет запрос на сервер.
     * @param {number} pointId - ID точки интереса
     */
    handlePointClick(pointId) {
        if (this.room) {
            this.room.send({ type: 'moveToPoint', pointId });
            console.log(`Requested move to point ${pointId}`);
        }
    }

    /**
     * Настраивает слушатели событий от сервера для динамического обновления.
     */
    setupListeners() {
        if (!this.room) return;

        // Обновление позиции игрока
        this.room.onMessage('playerMoved', (data) => {
            console.log(`Player ${data.playerId} moved to (${data.x}, ${data.y})`);
            // Логика обновления маркера игрока будет в Game.js
        });

        // Обновление точек интереса (например, при добавлении новой точки админом)
        this.room.onMessage('pointAdded', (point) => {
            this.drawPoint(point);
        });

        // Обновление гексов (например, при изменении типа админом)
        this.room.onMessage('hexUpdated', (hex) => {
            const existingHex = this.hexGroup.getChildren().find(h => 
                h.getData('q') === hex.q && h.getData('r') === hex.r
            );
            if (existingHex) {
                existingHex.fillColor = this.getHexColor(hex.type);
                existingHex.setData('type', hex.type);
            } else {
                this.drawHex(hex.q, hex.r, hex.type);
            }
        });
    }

    /**
     * Возвращает цвет для гекса в зависимости от его типа.
     * @param {string} type - Тип гекса
     * @returns {number} Код цвета в формате Phaser
     */
    getHexColor(type) {
        const colors = {
            neutral: 0xaaaaaa,
            free: 0x00ff00,
            danger: 0xff0000,
            controlled: 0x0000ff
        };
        return colors[type] || 0xaaaaaa;
    }

    /**
     * Очищает сетку (например, при выходе из сцены).
     */
    clearGrid() {
        this.hexGroup.clear(true, true);
        this.pointsGroup.clear(true, true);
    }
}