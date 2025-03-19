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
        this.supabase = supabase;
        this.isConnecting = false;
    }

    preload() {
        this.load.image('fon', 'assets/fon.jpg');
    }

    create() {
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

        this.player = this.add.circle(1024, 1024, 5, 0xffcf5b).setDepth(2);

        this.cameras.main.setBounds(0, 0, 2048, 2048);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Math.max(0.5, Math.min(2, newZoom)));
        });

        this.statusText = this.add.text(10, 10, 'Connecting to Colyseus...', {
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        }).setScrollFactor(0).setDepth(10);

        this.time.delayedCall(100, this.connectToRoom, [], this);
        EventBus.emit('current-scene-ready', this);

        EventBus.on('moveToPoint', (pointId) => {
            if (this.room) {
                console.log('Sending moveToPoint to server:', pointId);
                this.room.send('moveToPoint', { pointId });
            } else {
                console.warn('Cannot move: not connected to a room');
            }
        });
    }

    async connectToRoom() {
        if (this.isConnecting || this.room) {
            console.log('Already connecting or connected, skipping...');
            return;
        }
        this.isConnecting = true;

        try {
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) throw new Error('No authenticated user found');
            console.log('User authenticated:', user.id);

            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            if (sessionError || !session) throw new Error('No active session found');
            console.log('Session retrieved:', session.access_token);

            const { data: profile, error: profileError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) throw new Error(profileError.message);
            console.log('Profile loaded:', profile.username);

            const options = {
                pointId: 1,
                userId: user.id,
                username: profile.username,
                token: session.access_token
            };
            console.log('Joining room with options:', options);

            this.room = await this.client.joinOrCreate('point', options);
            console.log('Joined room:', this.room.id);

            if (this.scene.isActive()) {
                this.statusText.setText('Connected to Colyseus');
                console.log('Client connected to room:', this.room.id);

                this.hexGrid = new HexGrid(this, this.room);
                await this.hexGrid.initGrid(); // Дожидаемся загрузки гексов и точек

                this.setupRoomListeners();
            }
        } catch (error) {
            console.error('Failed to join room:', error.message);
            this.statusText.setText(`Failed to connect: ${error.message}`);
            this.room = null;
            this.time.delayedCall(5000, this.connectToRoom, [], this);
        } finally {
            this.isConnecting = false;
        }
    }

    setupRoomListeners() {
        // Обрабатываем начальное состояние через onMessage
        this.room.onMessage('state', (state) => {
            console.log('Received initial state:', state);
            const playerData = state.players[this.room.sessionId];
            if (playerData) {
                this.player.setPosition(playerData.x, playerData.y);
                console.log('Player position updated:', playerData.x, playerData.y);
            }
        });

        this.room.onStateChange((state) => {
            const playerData = state.players[this.room.sessionId];
            if (playerData) {
                this.player.setPosition(playerData.x, playerData.y);
                console.log('Player position updated:', playerData.x, playerData.y);
            }
        });

        this.room.state.players.onChange((player, sessionId) => {
            if (sessionId === this.room.sessionId) {
                console.log('Player state changed:', player.x, player.y);
                this.tweens.add({
                    targets: this.player,
                    x: player.x,
                    y: player.y,
                    duration: 500,
                    ease: 'Linear',
                    onComplete: () => console.log('Player moved to:', player.x, player.y)
                });
            }
        });

        this.room.onMessage('joinNewRoom', (data) => {
            this.room.leave();
            this.connectToNewRoom(data.pointId);
        });

        this.room.onMessage('error', (data) => {
            console.error('Room error:', data.message);
            this.statusText.setText(data.message);
        });

        this.room.onMessage('transitions', (data) => {
            console.log('Available transitions:', data.available);
        });

        this.room.onLeave(() => {
            console.log('Disconnected from room:', this.room?.id);
            this.statusText.setText('Disconnected from Colyseus');
            this.room = null;
            this.hexGrid.room = null;
            this.time.delayedCall(1000, this.connectToRoom, [], this);
        });
    }

    async connectToNewRoom(pointId) {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            console.log('Attempting to join room with token:', session.access_token);

            const options = {
                pointId,
                token: session.access_token
            };
            console.log('Joining room with options:', options);

            this.room = await this.client.joinOrCreate('point', options);
            console.log('Joined room:', this.room.id);

            this.hexGrid.room = this.room;
            this.setupRoomListeners();
            console.log('Connected to new room for point:', pointId);
        } catch (error) {
            console.error('Failed to join new room:', error.message);
            this.statusText.setText(`Failed to connect: ${error.message}`);
        }
    }

    update() {}

    changeScene() {
        this.scene.start('GameOver');
    }
}