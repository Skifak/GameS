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
            console.warn('Background image "fon.jpg" not found');
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

        this.connectToRoom();
        EventBus.emit('current-scene-ready', this);

        EventBus.on('moveToPoint', (pointId) => {
            if (this.room) {
                console.log('Sending moveToPoint to server:', pointId);
                this.room.send({ type: 'moveToPoint', pointId }); // Исправлен формат сообщения
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
        console.log('Starting connection attempt...');

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
            if (profileError) throw new Error('Profile fetch failed');

            const options = {
                pointId: 1,
                userId: user.id,
                username: profile.username,
                token: session.access_token,
                supabaseUrl: 'http://127.0.0.1:54321', // Добавьте, если требуется сервером
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' // Добавьте ваш anonKey
            };

            console.log('Joining room with options:', options);
            this.room = await this.client.joinOrCreate('point', options);
            console.log('Room joined:', this.room.roomId, 'Session ID:', this.room.sessionId);

            this.statusText.setText('Connected to Colyseus');
            if (this.hexGrid) {
                console.log('Destroying existing HexGrid');
                this.hexGrid.destroy();
            }
            console.log('Creating new HexGrid');
            this.hexGrid = new HexGrid(this, this.room);
            console.log('Initializing HexGrid');
            await this.hexGrid.initGrid();
            console.log('HexGrid initialized successfully');

            this.room.onStateChange.once((state) => {
                console.log('Initial state received:', state);
                this.setupRoomListeners();
            });

            this.room.onError((code, message) => {
                console.error('Room error:', code, message);
                this.statusText.setText(`Connection error: ${message}`);
                this.room = null;
                this.time.delayedCall(1000, this.connectToRoom, [], this);
            });

        } catch (error) {
            console.error('Connection failed:', error.message);
            this.statusText.setText(`Failed to connect: ${error.message}`);
            this.room = null;
            this.time.delayedCall(1000, this.connectToRoom, [], this);
        } finally {
            this.isConnecting = false;
            console.log('Connection attempt finished');
        }
    }

    setupRoomListeners() {
        console.log('Setting up room listeners');

        this.room.onMessage('state', (state) => {
            console.log('Received state:', state);
            const playerData = state.players[this.room.sessionId];
            if (playerData) {
                this.player.setPosition(playerData.x, playerData.y);
                console.log('Player position set to:', playerData.x, playerData.y);
            }
        });

        this.room.onStateChange((state) => {
            console.log('State changed:', state);
            const playerData = state.players[this.room.sessionId];
            if (playerData) {
                this.tweens.add({
                    targets: this.player,
                    x: playerData.x,
                    y: playerData.y,
                    duration: 500,
                    ease: 'Linear',
                    onComplete: () => console.log('Player moved to:', playerData.x, playerData.y)
                });
            }
        });

        this.room.onMessage('joinNewRoom', (data) => {
            console.log('Received joinNewRoom:', data);
            this.room.leave();
            this.connectToNewRoom(data.pointId);
        });

        this.room.onMessage('transitions', (data) => {
            console.log('Available transitions:', data.available);
        });

        this.room.onMessage('error', (data) => {
            console.error('Server error:', data.message);
        });

        this.room.onLeave(() => {
            console.log('Disconnected from room:', this.room?.roomId);
            this.statusText.setText('Disconnected from Colyseus');
            this.room = null;
            this.time.delayedCall(1000, this.connectToRoom, [], this);
        });
    }

    async connectToNewRoom(pointId) {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            const options = {
                pointId,
                token: session.access_token,
                supabaseUrl: 'http://127.0.0.1:54321',
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI9OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
            };
            this.room = await this.client.joinOrCreate('point', options);
            this.hexGrid.room = this.room;
            await this.hexGrid.initGrid();
            this.room.onStateChange.once((state) => {
                this.setupRoomListeners();
            });
            console.log('Connected to new room:', this.room.roomId);
        } catch (error) {
            console.error('Failed to join new room:', error.message);
            this.statusText.setText(`Failed to connect: ${error.message}`);
        }
    }

    update() {}
}