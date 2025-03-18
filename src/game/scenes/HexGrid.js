/**
 * Класс для управления гексагональной сеткой в Phaser.
 * Отвечает за отрисовку гексов и точек интереса на основе данных с сервера.
 * @module HexGrid
 */

import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class HexGrid {
    constructor(scene, room) {
        this.scene = scene;
        this.room = room;
        this.hexSize = 117;
        this.hexGroup = this.scene.add.group();
        this.pointsGroup = this.scene.add.group();
    }

    async initGrid() {
        await this.loadHexes();
        await this.loadPoints();
    }

    async loadHexes() {
        try {
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

    async loadPoints() {
        try {
            const { data, error } = await this.scene.supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y');
            if (error) throw new Error(error.message);

            console.log('Loaded points:', data);
            data.forEach(point => this.drawPoint(point));
            this.pointsGroup.getChildren().forEach(point => point.setDepth(2));
        } catch (error) {
            console.error('Failed to load points:', error.message);
        }
    }

    drawHex(q, r, type) {
        const hexWidth = this.hexSize * Math.sqrt(3);
        const hexHeight = this.hexSize * 2;
        const x = hexWidth * (q + (r % 2) * 0.5) + 10;
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
        hex.setData({ q, r, type });
        this.hexGroup.add(hex);
    }

    drawPoint(point) {
        const typeColors = {
            camp: 0x4B712E,
            transition: 0xffcf5b,
            normal: 0xaaaaaa,
            anomaly: 0xff0000,
            faction: 0x0000ff
        };

        const circle = this.scene.add.circle(point.x, point.y, 10, typeColors[point.type] || 0xaaaaaa, 0.7);
        circle.setInteractive();
        circle.on('pointerdown', () => {
            console.log('Point clicked:', point.id, 'at', point.x, point.y);
            this.handlePointClick(point.id);
        });
        circle.setData({ id: point.id, type: point.type, hex_q: point.hex_q, hex_r: point.hex_r });
        this.pointsGroup.add(circle);
    }

    handlePointClick(pointId) {
        console.log('Emitting moveToPoint for point:', pointId);
        EventBus.emit('moveToPoint', pointId); // Локальное событие вместо Colyseus
    }

    clearGrid() {
        this.hexGroup.clear(true, true);
        this.pointsGroup.clear(true, true);
    }
}