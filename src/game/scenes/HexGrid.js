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
    constructor() {
        super('HexGrid');
        this.client = new Client('ws://localhost:2567');
        this.statusText = null;
        this.room = null;
    }

    create() {
        this.statusText = this.add.text(100, 100, 'Connecting to Colyseus...', { 
            color: '#ffffff',
            fontSize: '24px',
            fontFamily: 'Arial'
        });
        this.time.delayedCall(100, this.connectToRoom, [], this);
        EventBus.emit('current-scene-ready', this);
    }

    async connectToRoom() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('No authenticated user found');
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('No active session found');
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileError) {
                throw new Error(profileError.message);
            }

            this.room = await this.client.joinOrCreate('hex', { 
                hexId: 'hex_1',
                userId: user.id,
                username: profile.username,
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