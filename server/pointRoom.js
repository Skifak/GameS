/**
 * Класс комнаты Colyseus для управления точками интереса.
 * Каждая точка интереса имеет свою комнату с лимитом игроков.
 * @module PointRoom
 */

import { Room } from 'colyseus';
import { supabase } from './index.js';
import logger from './logger.js';

/**
 * Класс комнаты для точки интереса.
 * @extends Room
 */
export class PointRoom extends Room {
    /**
     * Инициализирует комнату для точки интереса.
     * @param {Object} options - Опции создания комнаты
     */
    onCreate(options) {
        this.pointId = options.pointId; // ID точки интереса
        this.maxClients = 10; // Максимум 10 игроков
        this.setState({
            players: {}, // Состояние игроков: { [sessionId]: { x, y, playerId } }
            point: null // Данные о точке интереса
        });
        logger.info(`PointRoom created for point ${this.pointId}`);

        // Загружаем данные точки из Supabase
        this.loadPointData();
    }

    /**
     * Загружает данные точки интереса из Supabase.
     * @async
     */
    async loadPointData() {
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y')
                .eq('id', this.pointId)
                .single();
            if (error) throw new Error(error.message);
            this.state.point = data;
        } catch (error) {
            logger.error(`Failed to load point ${this.pointId}: ${error.message}`);
        }
    }

    /**
     * Проверяет аутентификацию клиента перед подключением.
     * @async
     * @param {import('colyseus').Client} client - Клиент, подключающийся к комнате
     * @param {Object} options - Опции подключения
     * @returns {Promise<{user: Object, profile: Object}>} Данные пользователя и профиля
     * @throws {Error} Если аутентификация не удалась
     */
    async onAuth(client, options) {
        if (!options.token) throw new Error('No token provided');

        const { data: { user }, error } = await supabase.auth.getUser(options.token);
        if (error) throw new Error('Invalid token');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (profileError) throw new Error(profileError.message);
        if (profile.role === 'banned') throw new Error('User is banned');

        return { user, profile };
    }

    /**
     * Вызывается при подключении клиента к комнате.
     * @async
     * @param {import('colyseus').Client} client - Подключившийся клиент
     * @param {Object} options - Опции подключения
     * @param {{user: Object, profile: Object}} auth - Данные аутентификации
     */
    async onJoin(client, options, auth) {
        logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId}`);
        this.state.players[client.sessionId] = {
            playerId: auth.user.id,
            x: this.state.point?.x || 0,
            y: this.state.point?.y || 0
        };

        // Проверяем переходные возможности
        this.checkTransitions(client);
    }

    /**
     * Обрабатывает сообщения от клиента.
     * @param {import('colyseus').Client} client - Клиент, отправивший сообщение
     * @param {Object} message - Сообщение от клиента
     */
    onMessage(client, message) {
        if (message.type === 'moveToPoint') {
            this.handleMoveToPoint(client, message.pointId);
        } else if (message.type === 'transition') {
            this.handleTransition(client, message.toPointId);
        }
    }

    /**
     * Обрабатывает перемещение игрока к точке внутри гекса.
     * @param {import('colyseus').Client} client - Клиент
     * @param {number} pointId - ID целевой точки
     */
    async handleMoveToPoint(client, pointId) {
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, x, y, hex_q, hex_r')
                .eq('id', pointId)
                .single();
            if (error) throw new Error(error.message);

            const player = this.state.players[client.sessionId];
            const currentPoint = this.state.point;
            if (data.hex_q === currentPoint.hex_q && data.hex_r === currentPoint.hex_r) {
                player.x = data.x;
                player.y = data.y;
                this.state.point = data; // Обновляем текущую точку комнаты
                logger.info(`Player ${player.playerId} moved to point ${pointId}`);
                this.checkTransitions(client);
            }
        } catch (error) {
            logger.error(`Move to point ${pointId} failed: ${error.message}`);
        }
    }

    /**
     * Обрабатывает переход игрока в другой гекс.
     * @param {import('colyseus').Client} client - Клиент
     * @param {number} toPointId - ID целевой точки
     */
    async handleTransition(client, toPointId) {
        try {
            const { data, error } = await supabase
                .from('point_transitions')
                .select('to_point_id')
                .eq('from_point_id', this.state.point.id)
                .eq('to_point_id', toPointId)
                .single();
            if (error || !data) throw new Error('Invalid transition');

            const { data: newPoint, error: pointError } = await supabase
                .from('points_of_interest')
                .select('id, x, y, hex_q, hex_r')
                .eq('id', toPointId)
                .single();
            if (pointError) throw new Error(pointError.message);

            const player = this.state.players[client.sessionId];
            player.x = newPoint.x;
            player.y = newPoint.y;
            this.broadcast('playerTransition', { playerId: player.playerId, toPointId });
            client.send('joinNewRoom', { pointId: toPointId });
            this.onLeave(client, true); // Удаляем игрока из текущей комнаты
            logger.info(`Player ${player.playerId} transitioned to point ${toPointId}`);
        } catch (error) {
            logger.error(`Transition to point ${toPointId} failed: ${error.message}`);
            client.send('error', { message: 'Transition failed: ' + error.message });
        }
    }

    /**
     * Проверяет доступные переходы для игрока и отправляет информацию клиенту.
     * @param {import('colyseus').Client} client - Клиент
     */
    async checkTransitions(client) {
        if (this.state.point?.type !== 'transition') {
            client.send('transitions', { available: [] });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('point_transitions')
                .select('to_point_id')
                .eq('from_point_id', this.state.point.id);
            if (error) throw new Error(error.message);

            client.send('transitions', { available: data.map(t => t.to_point_id) });
        } catch (error) {
            logger.error(`Failed to check transitions: ${error.message}`);
        }
    }

    /**
     * Вызывается при отключении клиента.
     * @async
     * @param {import('colyseus').Client} client - Отключившийся клиент
     * @param {boolean} consented - Было ли отключение добровольным
     */
    async onLeave(client, consented) {
        const player = this.state.players[client.sessionId];
        if (player) {
            logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
            delete this.state.players[client.sessionId];
        }
    }
}