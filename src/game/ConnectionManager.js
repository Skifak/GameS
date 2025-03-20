import { Client } from 'colyseus.js';
import { supabase } from '../lib/supabase';

export class ConnectionManager {
    constructor() {
        this.client = new Client('ws://localhost:2567');
        this.room = null;
        this.isConnecting = false;
        this.supabase = supabase;
    }

    async connectToRoom(onSuccess, onError) {
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
                supabaseUrl: 'http://127.0.0.1:54321',
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
            };

            console.log('Joining room with options:', options);
            this.room = await this.client.joinOrCreate('point', options);
            console.log('Room joined:', this.room.roomId, 'Session ID:', this.room.sessionId);

            onSuccess(this.room);
        } catch (error) {
            console.error('Connection failed:', error.message);
            onError(error.message);
            this.room = null;
        } finally {
            this.isConnecting = false;
            console.log('Connection attempt finished');
        }
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
            console.log('Connected to new room:', this.room.roomId);
            return this.room;
        } catch (error) {
            console.error('Failed to join new room:', error.message);
            throw error;
        }
    }

    getRoom() {
        return this.room;
    }
}