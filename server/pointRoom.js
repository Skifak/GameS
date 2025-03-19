/**
 * Класс комнаты Colyseus для управления точками интереса.
 * Каждая точка интереса имеет свою комнату с лимитом игроков.
 * @module PointRoom
 */

import { Room } from 'colyseus';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

export class PointRoom extends Room {
    constructor() {
        super();
        this.supabaseUrl = null;
        this.anonKey = null;
    }

    onCreate(options) {
        this.supabaseUrl = options.supabaseUrl;
        this.anonKey = options.anonKey;
        this.pointId = options.pointId;
        this.maxClients = 10;
        this.setState({ players: {}, point: null });
        logger.info(`PointRoom created for point ${this.pointId}`);
        this.loadPointData();
    }

    async loadPointData() {
        const supabase = createClient(this.supabaseUrl, this.anonKey);
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y')
                .eq('id', this.pointId)
                .single();
            if (error) throw error;
            this.state.point = data;
            logger.info(`Point ${this.pointId} loaded:`, data);
        } catch (error) {
            logger.error(`Failed to load point ${this.pointId}:`, error.message);
        }
    }

    async onAuth(client, options) {
        logger.info('Options received:', JSON.stringify(options, null, 2));
        if (!options || !options.token) {
            logger.error('No token provided in options:', options);
            throw new Error('No token provided');
        }
        logger.info('Validating token:', options.token);

        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${options.token}` } }
        });

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            logger.info('User authenticated:', user.id);

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw profileError;
            logger.info('Profile loaded:', profile);

            if (profile.role === 'banned') {
                logger.error('User banned:', user.id);
                throw new Error('User is banned');
            }

            return { user, profile };
        } catch (err) {
            logger.error('Unexpected error during auth:', err.message, err.stack);
            throw err;
        }
    }

    async onJoin(client, options, auth) {
        if (options.pointId !== this.pointId) {
            logger.warn(`Player ${auth.profile.username} tried to join wrong room. Expected pointId: ${this.pointId}, got: ${options.pointId}`);
            throw new Error('Invalid pointId');
        }
    
        this.state.players[client.sessionId] = {
            playerId: auth.user.id,
            username: auth.profile.username,
            x: this.state.point?.x || 0,
            y: this.state.point?.y || 0
        };
        logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} for point ${this.pointId}`);
        this.checkTransitions(client);
    
        // Явно отправляем состояние клиенту
        logger.info('Broadcasting state:', this.state);
        this.broadcast('state', this.state);
    }

    onMessage(client, message) {
        console.log('Received message:', message);
        if (message.type === 'moveToPoint') {
            this.handleMoveToPoint(client, message.pointId);
        } else if (message.type === 'transition') {
            this.handleTransition(client, message.toPointId);
        } else if (message.type === 'click') {
            if (!this.state.players[client.sessionId]) {
                this.state.players[client.sessionId] = { x: message.x, y: message.y };
            } else {
                this.state.players[client.sessionId].x = message.x;
                this.state.players[client.sessionId].y = message.y;
            }
            logger.info(`Player ${client.sessionId} clicked at (${message.x}, ${message.y})`);
        }
    }

    async handleMoveToPoint(client, pointId) {
        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
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
                logger.info(`Player ${player.playerId} moved to point ${pointId}`);
                this.checkTransitions(client);
            } else {
                logger.warn(`Point ${pointId} is not in the same hex as ${this.pointId}`);
            }
        } catch (error) {
            logger.error(`Move to point ${pointId} failed: ${error.message}`);
            client.send('error', { message: 'Move failed: ' + error.message });
        }
    }

    async handleTransition(client, toPointId) {
        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
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
            client.send('joinNewRoom', { pointId: toPointId });
            delete this.state.players[client.sessionId];
            logger.info(`Player ${player.playerId} transitioned to point ${toPointId}`);
        } catch (error) {
            logger.error(`Transition to point ${toPointId} failed: ${error.message}`);
            client.send('error', { message: 'Transition failed: ' + error.message });
        }
    }

    async checkTransitions(client) {
        if (this.state.point?.type !== 'transition') {
            client.send('transitions', { available: [] });
            return;
        }

        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
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

    async onLeave(client, consented) {
        const player = this.state.players[client.sessionId];
        if (player) {
            logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
            delete this.state.players[client.sessionId];
        }
    }
}