import { Room } from 'colyseus';
import { Schema, defineTypes } from '@colyseus/schema';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

// Определяем класс Player
class Player extends Schema {
    constructor() {
        super();
        this.playerId = "";
        this.username = "";
        this.x = 0;
        this.y = 0;
    }
}

// Определяем класс Point
class Point extends Schema {
    constructor() {
        super();
        this.id = 0;
        this.hex_q = 0;
        this.hex_r = 0;
        this.type = "";
        this.x = 0;
        this.y = 0;
    }
}

// Определяем класс State
class State extends Schema {
    constructor() {
        super();
        this.players = new Map();
        this.point = new Point();
    }
}

// Определяем типы для схем
defineTypes(Player, {
    playerId: "string",
    username: "string",
    x: "number",
    y: "number"
});

defineTypes(Point, {
    id: "number",
    hex_q: "number",
    hex_r: "number",
    type: "string",
    x: "number",
    y: "number"
});

defineTypes(State, {
    players: { map: Player },
    point: Point
});

export class PointRoom extends Room {
    constructor() {
        super();
        this.supabaseUrl = null;
        this.anonKey = null;
        console.log('PointRoom constructed');
    }

    onCreate(options) {
        console.log('onCreate called with options:', options);
        this.supabaseUrl = options.supabaseUrl;
        this.anonKey = options.anonKey;
        this.pointId = options.pointId;
        this.maxClients = 10;

        // Устанавливаем начальное состояние через схему
        this.setState(new State());
        logger.info(`PointRoom created for point ${this.pointId}`);
        console.log('State initialized:', this.state);
        this.loadPointData();
    }

    async loadPointData() {
        console.log('loadPointData started for pointId:', this.pointId);
        const supabase = createClient(this.supabaseUrl, this.anonKey);
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y')
                .eq('id', this.pointId)
                .single();
            if (error) throw error;

            // Обновляем состояние точки
            this.state.point.id = data.id;
            this.state.point.hex_q = data.hex_q;
            this.state.point.hex_r = data.hex_r;
            this.state.point.type = data.type;
            this.state.point.x = data.x;
            this.state.point.y = data.y;

            logger.info(`Point ${this.pointId} loaded:`, data);
            console.log('Point data loaded:', data);
        } catch (error) {
            logger.error(`Failed to load point ${this.pointId}:`, error.message);
            console.error('loadPointData failed:', error.message);
        }
        console.log('loadPointData finished');
    }

    async onAuth(client, options) {
        console.log('onAuth started for client:', client.sessionId, 'options:', options);
        logger.info('Options received:', JSON.stringify(options, null, 2));
        if (!options || !options.token) {
            logger.error('No token provided in options:', options);
            console.error('No token provided');
            throw new Error('No token provided');
        }
        logger.info('Validating token:', options.token);
        console.log('Validating token:', options.token);

        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${options.token}` } }
        });

        try {
            console.log('Fetching user from Supabase');
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            logger.info('User authenticated:', user.id);
            console.log('User authenticated:', user.id);

            console.log('Fetching profile from Supabase');
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw profileError;
            logger.info('Profile loaded:', profile);
            console.log('Profile loaded:', profile);

            if (profile.role === 'banned') {
                logger.error('User banned:', user.id);
                console.error('User banned:', user.id);
                throw new Error('User is banned');
            }

            console.log('onAuth successful, returning user and profile');
            return { user, profile };
        } catch (err) {
            logger.error('Unexpected error during auth:', err.message, err.stack);
            console.error('onAuth failed:', err.message);
            throw err;
        }
    }

    async onJoin(client, options, auth) {
        console.log('onJoin started for client:', client.sessionId, 'options:', options, 'auth:', auth);
        if (options.pointId !== this.pointId) {
            logger.warn(`Player ${auth.profile.username} tried to join wrong room. Expected pointId: ${this.pointId}, got: ${options.pointId}`);
            console.warn('Wrong pointId, expected:', this.pointId, 'got:', options.pointId);
            throw new Error('Invalid pointId');
        }

        if (!this.state.point.id) {
            console.log('Waiting for point data to load...');
            await this.loadPointData();
        }

        const player = new Player();
        player.playerId = auth.user.id;
        player.username = auth.profile.username;
        player.x = this.state.point.x || 0;
        player.y = this.state.point.y || 0;
        this.state.players.set(client.sessionId, player);

        logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} for point ${this.pointId}`);
        console.log('Player added to state:', this.state.players.get(client.sessionId));
        this.checkTransitions(client);
        console.log('onJoin finished');
    }

    onMessage(client, message) {
        console.log('onMessage received from client:', client.sessionId, 'message:', message);
        if (message.type === 'moveToPoint') {
            console.log('Handling moveToPoint for pointId:', message.pointId);
            this.handleMoveToPoint(client, message.pointId);
        } else if (message.type === 'transition') {
            console.log('Handling transition for toPointId:', message.toPointId);
            this.handleTransition(client, message.toPointId);
        } else if (message.type === 'click') {
            console.log('Handling click at x:', message.x, 'y:', message.y);
            const player = this.state.players.get(client.sessionId);
            if (!player) {
                const newPlayer = new Player();
                newPlayer.x = message.x;
                newPlayer.y = message.y;
                this.state.players.set(client.sessionId, newPlayer);
                console.log('New player position set:', message.x, message.y);
            } else {
                player.x = message.x;
                player.y = message.y;
                console.log('Player position updated:', message.x, message.y);
            }
            logger.info(`Player ${client.sessionId} clicked at (${message.x}, ${message.y})`);
        } else {
            console.log('Unknown message type:', message.type);
        }
    }

    async handleMoveToPoint(client, pointId) {
        console.log('handleMoveToPoint started for client:', client.sessionId, 'pointId:', pointId);
        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
        try {
            console.log('Fetching point data for pointId:', pointId);
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, x, y, hex_q, hex_r')
                .eq('id', pointId)
                .single();
            if (error) throw new Error(error.message);
            console.log('Point data fetched:', data);

            const player = this.state.players.get(client.sessionId);
            console.log('Current point:', this.state.point, 'Target point:', data);

            // Всегда отправляем joinNewRoom для новой точки
            logger.info(`Player ${player.playerId} requested move to point ${pointId}`);
            console.log('Sending joinNewRoom to client for pointId:', pointId);
            client.send('joinNewRoom', { pointId: data.id });
            this.state.players.delete(client.sessionId); // Удаляем игрока из текущей комнаты
        } catch (error) {
            logger.error(`Move to point ${pointId} failed: ${error.message}`);
            console.error('Move failed:', error.message);
            client.send('error', { message: 'Move failed: ' + error.message });
        }
        console.log('handleMoveToPoint finished');
    }

    async handleTransition(client, toPointId) {
        console.log('handleTransition started for client:', client.sessionId, 'toPointId:', toPointId);
        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
        try {
            console.log('Checking transition validity');
            const { data, error } = await supabase
                .from('point_transitions')
                .select('to_point_id')
                .eq('from_point_id', this.state.point.id)
                .eq('to_point_id', toPointId)
                .single();
            if (error || !data) throw new Error('Invalid transition');
            console.log('Transition valid:', data);

            console.log('Fetching new point data');
            const { data: newPoint, error: pointError } = await supabase
                .from('points_of_interest')
                .select('id, x, y, hex_q, hex_r')
                .eq('id', toPointId)
                .single();
            if (pointError) throw new Error(pointError.message);
            console.log('New point data:', newPoint);

            const player = this.state.players.get(client.sessionId);
            console.log('Sending joinNewRoom to client');
            client.send('joinNewRoom', { pointId: toPointId });
            this.state.players.delete(client.sessionId);
            logger.info(`Player ${player.playerId} transitioned to point ${toPointId}`);
            console.log('Player removed from state:', this.state.players);
        } catch (error) {
            logger.error(`Transition to point ${toPointId} failed: ${error.message}`);
            console.error('Transition failed:', error.message);
            client.send('error', { message: 'Transition failed: ' + error.message });
            console.log('Error sent to client');
        }
        console.log('handleTransition finished');
    }

    async checkTransitions(client) {
        console.log('checkTransitions started for client:', client.sessionId);
        if (this.state.point.type !== 'transition') {
            console.log('Not a transition point, sending empty transitions');
            client.send('transitions', { available: [] });
            return;
        }

        const supabase = createClient(this.supabaseUrl, this.anonKey, {
            global: { headers: { Authorization: `Bearer ${client.auth.token}` } }
        });
        try {
            console.log('Fetching available transitions');
            const { data, error } = await supabase
                .from('point_transitions')
                .select('to_point_id')
                .eq('from_point_id', this.state.point.id);
            if (error) throw new Error(error.message);
            console.log('Transitions data:', data);

            console.log('Sending transitions to client');
            client.send('transitions', { available: data.map(t => t.to_point_id) });
        } catch (error) {
            logger.error(`Failed to check transitions: ${error.message}`);
            console.error('checkTransitions failed:', error.message);
        }
        console.log('checkTransitions finished');
    }

    async onLeave(client, consented) {
        console.log('onLeave started for client:', client.sessionId, 'consented:', consented);
        const player = this.state.players.get(client.sessionId);
        if (player) {
            logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
            console.log('Player leaving:', player);
            this.state.players.delete(client.sessionId);
            console.log('Player removed from state:', this.state.players);
        }
        console.log('onLeave finished');
    }
}