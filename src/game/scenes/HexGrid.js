/**
 * Сцена с шестиугольной сеткой для Phaser.
 * Подключается к комнате Colyseus, отображает статус соединения и интегрируется с данными пользователя.
 * @module HexGridScene
 */

import Phaser from 'phaser';
import { Client } from 'colyseus.js'; // Явный импорт клиента Colyseus
import { EventBus } from '../EventBus';
import { auth } from '../../lib/supabase'; // Импорт для получения текущего пользователя

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
        this.client = new Client('ws://localhost:2567'); // Инициализация клиента Colyseus с правильным URL
        this.statusText = null; // Текст статуса подключения
        this.room = null; // Ссылка на комнату Colyseus
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
        this.time.delayedCall(100, this.connectToRoom, [], this); // Отложенное подключение через 100 мс
        EventBus.emit('current-scene-ready', this); // Уведомление о готовности сцены
    }

    /**
     * Подключается к комнате Colyseus с именем "hex".
     * Использует данные текущего пользователя из Supabase для передачи в комнату.
     * Обновляет текст статуса в зависимости от результата подключения.
     * @async
     */
    async connectToRoom() {
        try {
            // Получаем текущего пользователя из Supabase
            const currentUser = await auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }

            // Подключаемся к комнате Colyseus, передавая ID и имя пользователя
            this.room = await this.client.joinOrCreate('hex', { 
                hexId: 'hex_1',
                userId: currentUser.id,
                username: currentUser.profile.username
            });

            if (this.scene.isActive()) { // Проверяем, активна ли сцена
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