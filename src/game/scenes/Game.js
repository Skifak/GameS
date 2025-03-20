import { EventBus } from '../EventBus';
import { supabase } from '../../lib/supabase';
import { Scene } from 'phaser';
import { ConnectionManager } from '../ConnectionManager';
import { MessageHandler } from '../MessageHandler';
import { CommandSender } from '../CommandSender';
import { PlayerController } from '../../components/PlayerController';
import { UIManager } from '../../components/UIManager';
import { HexGrid } from './HexGrid';
import { MapDataManager } from '../MapDataManager';
export class Game extends Scene {
    constructor() {
        super('Game');
        this.supabase = supabase;
        this.connectionManager = new ConnectionManager();
        this.mapDataManager = new MapDataManager();
        this.messageHandler = null;
        this.commandSender = null;
        this.playerController = null;
        this.uiManager = null;
        this.hexGrid = null;
    }

    preload() {
        this.load.image('fon', 'assets/fon.jpg');
    }

    async create() {
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

        this.cameras.main.setBounds(0, 0, 2048, 2048);
        this.cameras.main.startFollow(this.playerController?.player || { x: 1024, y: 1024 }, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.7);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Math.max(0.5, Math.min(2, newZoom)));
        });

        this.playerController = new PlayerController(this);
        this.uiManager = new UIManager(this);

        await this.mapDataManager.loadData();

        this.connectionManager.connectToRoom(
            (room) => {
                this.uiManager.setStatus('Connected to Colyseus');
                this.hexGrid = new HexGrid(this, room, this.mapDataManager);
                this.commandSender = new CommandSender(room);
                this.messageHandler = new MessageHandler(
                    room,
                    this,
                    (playerData, useTween) => this.playerController.updatePosition(playerData, useTween),
                    (error) => this.uiManager.setStatus(error),
                    () => {
                        this.uiManager.setStatus('Disconnected from Colyseus');
                        this.connectionManager.room = null;
                        this.time.delayedCall(1000, () => this.connectionManager.connectToRoom(
                            (room) => this.onConnectSuccess(room),
                            (error) => this.uiManager.setStatus(`Failed to connect: ${error}`)
                        ), [], this);
                    }
                );

                // Инициализируем HexGrid только после получения состояния
                room.onStateChange.once((state) => {
                    console.log('Initial state received:', state);
                    this.hexGrid.initGrid().then(() => {
                        console.log('HexGrid initialized after state received');
                    }).catch(err => {
                        console.error('HexGrid init failed:', err);
                    });
                });
            },
            (error) => {
                this.uiManager.setStatus(`Failed to connect: ${error}`);
                this.time.delayedCall(1000, () => this.connectionManager.connectToRoom(
                    (room) => this.onConnectSuccess(room),
                    (error) => this.uiManager.setStatus(`Failed to connect: ${error}`)
                ), [], this);
            }
        );

        EventBus.emit('current-scene-ready', this);
    }

    onConnectSuccess(room) {
        this.uiManager.setStatus('Connected to Colyseus');
        this.hexGrid.updateRoom(room);
        this.commandSender = new CommandSender(room);
        this.messageHandler = new MessageHandler(
            room,
            this,
            (playerData, useTween) => this.playerController.updatePosition(playerData, useTween),
            (error) => this.uiManager.setStatus(error),
            () => {
                this.uiManager.setStatus('Disconnected from Colyseus');
                this.connectionManager.room = null;
                this.time.delayedCall(1000, () => this.connectionManager.connectToRoom(
                    (room) => this.onConnectSuccess(room),
                    (error) => this.uiManager.setStatus(`Failed to connect: ${error}`)
                ), [], this);
            }
        );
    }

    async connectToNewRoom(pointId) {
        console.log('Connecting to new room for pointId:', pointId);
        try {
            const options = {
                pointId: pointId,
                userId: this.userId,
                username: this.username,
                token: this.token,
                supabaseUrl: this.supabaseUrl,
                anonKey: this.anonKey
            };
            const room = await this.connectionManager.connect(options); // Передаём все необходимые параметры
            this.hexGrid.updateRoom(room); // Обновляем HexGrid с новой комнатой
            this.commandSender = new CommandSender(room); // Обновляем отправителя команд
            this.messageHandler = new MessageHandler(
                room,
                this,
                (playerData, useTween) => this.playerController.updatePosition(playerData, useTween),
                (error) => this.uiManager.setStatus(error),
                () => {
                    this.uiManager.setStatus('Disconnected from Colyseus');
                    this.connectionManager.room = null;
                    this.time.delayedCall(1000, () => this.connectionManager.connect(
                        options, // Используем те же параметры для переподключения
                        (newRoom) => this.onConnectSuccess(newRoom),
                        (error) => this.uiManager.setStatus(`Failed to connect: ${error}`)
                    ), [], this);
                }
            );
            room.onStateChange.once((state) => {
                console.log('Initial state received:', state);
                this.hexGrid.updateRoom(room); // Убедимся, что HexGrid обновляется после получения состояния
            });
        } catch (error) {
            console.error('Failed to connect to new room:', error);
            this.uiManager.setStatus(`Failed to connect: ${error.message}`);
        }
    }

    update() {}
}