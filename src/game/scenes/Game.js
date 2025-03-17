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

/**
 * Класс сцены основной игры.
 * @extends Scene
 */
export class Game extends Scene {
    /**
     * Создаёт экземпляр сцены игры.
     */
    constructor() {
        super('Game');
        this.client = new Client('ws://localhost:2567');
        this.statusText = null;
        this.room = null;
        this.hexGrid = null;
        this.player = null;
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
        this.cameras.main.setZoom(2); // Начальный масштаб 2x

        // Масштабирование через колесо мыши
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Math.max(0.5, Math.min(2, newZoom)));
        });

        // Текст статуса
        this.statusText = this.add.text(10, 10, 'Connecting to Colyseus...', { 
            color: '#ffffff', fontSize: '24px', fontFamily: 'Arial' 
        }).setScrollFactor(0).setDepth(10);

        // Подключение к Colyseus
        this.time.delayedCall(100, this.connectToRoom, [], this);
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

    changeScene() {
        this.scene.start('GameOver');
    }
}