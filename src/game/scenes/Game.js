/**
 * Сцена игры для Phaser.
 * Отображает карту с гексагональной сеткой, подключается к Colyseus и управляет камерой.
 * @module GameScene
 */

import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { Client } from 'colyseus.js';
import { supabase } from '../../lib/supabase';
import { HexGrid } from './HexGrid';

export class Game extends Scene {
    constructor() {
        super('Game');
        this.client = new Client('ws://localhost:2567');
        this.statusText = null;
        this.room = null;
        this.hexGrid = null;
        this.player = null;
        this.pointsOfInterest = []; // Хранит графические объекты точек интереса
    }

    preload() {
        this.load.image('fon', 'assets/fon.jpg');
    }

    create() {
        // Фон
        let background;
        if (this.textures.exists('fon')) {
            background = this.add.image(0, 0, 'fon').setOrigin(0, 0).setDepth(0);
            const bgWidth = background.width;
            const bgHeight = background.height;
            if (bgWidth < 2048 || bgHeight < 2048) {
                background.setScale(Math.max(2048 / bgWidth, 2048 / bgHeight));
            }
        } else {
            this.cameras.main.setBackgroundColor(0xaaaaaa);
            console.warn('Background image "fon.jpg" not found, using gray background');
        }

        // Создание гексагональной сетки
        this.hexGrid = new HexGrid(this);
        this.hexGrid.createGrid();
        this.hexGrid.hexGroup.getChildren().forEach(hex => hex.setDepth(1));

        // Маркер игрока в центре карты
        this.player = this.add.circle(1024, 1024, 5, 0xffcf5b).setDepth(2);

        // Настройка камеры
        this.cameras.main.setBounds(0, 0, 2048, 2048);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.5); // Начальный масштаб 2x

        // Масштабирование через колесо мыши
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Math.max(0.5, Math.min(2, newZoom)));
        });

        // Текст статуса
        this.statusText = this.add.text(10, 10, 'Connecting to Colyseus...', { 
            color: '#ffffff', fontSize: '24px', fontFamily: 'Arial' 
        }).setScrollFactor(0).setDepth(10);

        // Подключение к Colyseus и загрузка точек интереса
        this.time.delayedCall(100, this.connectToRoom, [], this);
        this.time.delayedCall(200, this.loadPointsOfInterest, [], this);
        EventBus.emit('current-scene-ready', this);
    }

    async connectToRoom() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('No authenticated user found');

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error('No active session found');

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw new Error(profileError.message);

            this.room = await this.client.joinOrCreate('hex', { 
                hexId: 'hex_1',
                userId: user.id,
                username: profile.username,
                token: session.access_token
            });

            if (this.scene.isActive()) {
                this.statusText.setText('Connected to Colyseus');
                console.log('Client connected to room:', this.room.id);
            }
        } catch (error) {
            console.error('Failed to join room:', error.message);
            if (this.scene.isActive()) {
                this.statusText.setText(`Failed to connect: ${error.message}`);
            }
        }
    }

    async loadPointsOfInterest() {
        try {
            // Находим текущий гекс игрока
            const currentHex = this.hexGrid.findHexAt(this.player.x, this.player.y);
            if (!currentHex) {
                console.warn('Player is not in any hex');
                return;
            }

            // Очищаем предыдущие точки интереса
            this.pointsOfInterest.forEach(point => point.destroy());
            this.pointsOfInterest = [];

            // Запрашиваем точки интереса для текущего гекса из Supabase
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('*')
                .eq('hex_q', currentHex.q)
                .eq('hex_r', currentHex.r);

            if (error) throw new Error(error.message);
            if (!data || data.length === 0) {
                this.statusText.setText('No points of interest in this hex');
                return;
            }

            // Отображаем точки интереса как прозрачные круги
            const typeColors = {
                camp: 0x4B712E,      // --green
                transition: 0xffcf5b, // --orange
                normal: 0xaaaaaa,     // --silver-chalice
                anomaly: 0xff0000,    // красный
                faction: 0x0000ff     // синий
            };

            data.forEach(point => {
                const x = currentHex.x + point.x_offset;
                const y = currentHex.y + point.y_offset;
                const color = typeColors[point.type] || 0xaaaaaa;
                const circle = this.add.circle(x, y, 10, color, 0.7).setDepth(2);
                this.pointsOfInterest.push(circle);
            });

            this.statusText.setText(`Points of interest loaded: ${data.length}`);
            currentHex.pointsOfInterest = data; // Сохраняем данные в гексе
        } catch (error) {
            console.error('Failed to load points of interest:', error.message);
            this.statusText.setText(`Error: ${error.message}`);
        }
    }

    update() {
        // Проверяем, изменился ли гекс игрока, и обновляем точки интереса
        const currentHex = this.hexGrid.findHexAt(this.player.x, this.player.y);
        if (currentHex && (!this.lastHex || this.lastHex.q !== currentHex.q || this.lastHex.r !== currentHex.r)) {
            this.loadPointsOfInterest();
            this.lastHex = currentHex;
        }
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}