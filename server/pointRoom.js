import { Room } from 'colyseus';
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

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
        this.setState({ players: {}, point: null });
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
            this.state.point = data;
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
    
        if (!this.state.point) {
            console.log('Waiting for point data to load...');
            await this.loadPointData();
        }
    
        this.state.players[client.sessionId] = {
            playerId: auth.user.id,
            username: auth.profile.username,
            x: this.state.point?.x || 0,
            y: this.state.point?.y || 0
        };
        logger.info(`Player ${auth.profile.username} joined PointRoom ${this.roomId} for point ${this.pointId}`);
        console.log('Player added to state:', this.state.players[client.sessionId]);
        this.checkTransitions(client);
    
        logger.info('Broadcasting state:', this.state);
        console.log('Broadcasting state to all clients:', this.state);
        this.broadcast('state', this.state);
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
            if (!this.state.players[client.sessionId]) {
                this.state.players[client.sessionId] = { x: message.x, y: message.y };
                console.log('New player position set:', message.x, message.y);
            } else {
                this.state.players[client.sessionId].x = message.x;
                this.state.players[client.sessionId].y = message.y;
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
    
            const player = this.state.players[client.sessionId];
            const currentPoint = this.state.point;
            console.log('Current point:', currentPoint, 'Target point:', data);
            if (data.hex_q === currentPoint.hex_q && data.hex_r === currentPoint.hex_r) {
                player.x = data.x;
                player.y = data.y;
                logger.info(`Player ${player.playerId} moved to point ${pointId}`);
                console.log('Player moved to:', player.x, player.y);
                this.checkTransitions(client);
                this.broadcast('state', this.state); // Убедимся, что состояние отправляется
            } else {
                logger.warn(`Point ${pointId} is not in the same hex as ${this.pointId}`);
                console.warn('Point not in same hex, no movement');
                client.send('error', { message: `Point ${pointId} is not in the same hex` });
            }
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

            const player = this.state.players[client.sessionId];
            console.log('Sending joinNewRoom to client');
            client.send('joinNewRoom', { pointId: toPointId });
            delete this.state.players[client.sessionId];
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
        if (this.state.point?.type !== 'transition') {
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
        const player = this.state.players[client.sessionId];
        if (player) {
            logger.info(`Player ${player.playerId} left PointRoom ${this.roomId}`);
            console.log('Player leaving:', player);
            delete this.state.players[client.sessionId];
            console.log('Player removed from state:', this.state.players);
        }
        console.log('onLeave finished');
    }
}