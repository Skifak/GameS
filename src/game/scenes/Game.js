/**
 * Сцена игры для Phaser.
 * Отображает карту с гексагональной сеткой, подключается к Colyseus и управляет перемещением игрока.
 * @module GameScene
 */

import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { Client } from 'colyseus.js';
import { supabase } from '../../lib/supabase';
import { HexGrid } from './HexGrid';

/**
 * Класс сцены игры.
 * @extends Scene
 */
export class Game extends Scene {
    constructor() {
        super('Game');
        this.client = new Client('ws://localhost:2567');
        this.statusText = null;
        this.room = null;
        this.hexGrid = null;
        this.player = null;
        this.supabase = supabase; // Подключаем Supabase в сцену
    }

    /**
     * Загружает необходимые ресурсы.
     */
    preload() {
        this.load.image('fon', 'assets/fon.jpg');
    }

    /**
     * Создает сцену игры.
     */
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

        // Инициализация гексагональной сетки
        this.hexGrid = new HexGrid(this, this.room);
        this.hexGrid.initGrid(); // Асинхронная загрузка гексов и точек

        // Маркер игрока
        this.player = this.add.circle(1024, 1024, 5, 0xffcf5b).setDepth(2); // Начальная позиция в центре

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
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        }).setScrollFactor(0).setDepth(10);

        // Подключение к Colyseus
        this.time.delayedCall(100, this.connectToRoom, [], this);
        EventBus.emit('current-scene-ready', this);
    }

    /**
     * Подключается к комнате Colyseus для управления точкой интереса.
     * @async
     */
    async connectToRoom() {
        try {
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) throw new Error('No authenticated user found');

            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            if (sessionError || !session) throw new Error('No active session found');

            const { data: profile, error: profileError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw new Error(profileError.message);

            // Подключаемся к комнате первой точки интереса (для теста — точка с ID 1)
            this.room = await this.client.joinOrCreate('point', {
                pointId: 1, // Тестовая точка, позже будет динамически
                userId: user.id,
                username: profile.username,
                token: session.access_token
            });

            if (this.scene.isActive()) {
                this.statusText.setText('Connected to Colyseus');
                console.log('Client connected to room:', this.room.id);

                // Обновляем позицию игрока на основе данных из комнаты
                this.room.onStateChange((state) => {
                    const playerData = state.players[this.room.sessionId];
                    if (playerData) {
                        this.player.setPosition(playerData.x, playerData.y);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to join room:', error.message);
            if (this.scene.isActive()) {
                this.statusText.setText(`Failed to connect: ${error.message}`);
            }
        }
    }

    /**
     * Обновляет сцену.
     */
    update() {
        // Здесь можно добавить дополнительную логику, если нужно
    }

    /**
     * Переключает сцену на GameOver.
     */
    changeScene() {
        this.scene.start('GameOver');
    }
}