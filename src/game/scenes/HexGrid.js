/**
 * Сцена с шестиугольной сеткой для Phaser.
 * Подключается к комнате Colyseus, отображает статус соединения и интегрируется с данными пользователя.
 * @module HexGridScene
 */

import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { EventBus } from '../EventBus';
import { supabase } from '../../lib/supabase';

/**
 * Класс сцены с шестиугольной сеткой.
 * @extends Phaser.Scene
 */
export default class HexGrid extends Phaser.Scene {
    /**
     * Создаёт экземпляр сцены HexGrid.
     * Инициализирует клиент Colyseus с указанием URL сервера.
     */
    constructor() {
        super('HexGrid');
        this.client = new Client('ws://localhost:2567');
        this.statusText = null;
        this.room = null;
    }

    /**
     * Инициализирует сцену, отображая текст статуса и подключаясь к комнате Colyseus.
     * Вызывает событие готовности сцены через EventBus.
     */
    create() {
        this.statusText = this.add.text(100, 100, 'Connecting to Colyseus...', { 
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        });
        this.time.delayedCall(100, this.connectToRoom, [], this);
        EventBus.emit('current-scene-ready', this);
    }

    /**
     * Подключается к комнате Colyseus с именем "hex".
     * Использует данные текущего пользователя и токен сессии из Supabase для аутентификации.
     * Обновляет текст статуса в зависимости от результата подключения.
     * @async
     */
    async connectToRoom() {
        try {
            const user = this.game.config.user;
            if (!user) {
                throw new Error('No authenticated user found');
            }

            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                throw new Error('No active session found');
            }

            this.room = await this.client.joinOrCreate('hex', { 
                hexId: 'hex_1',
                userId: user.id,
                username: user.profile.username,
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
}