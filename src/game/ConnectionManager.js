import { Client } from 'colyseus.js';
import { EventBus } from './EventBus';
import logger from '../utils/logger';

export class ConnectionManager {
  constructor(supabase) {
    this.client = new Client('ws://localhost:2567');
    this.room = null;
    this.isConnecting = false;
    this.supabase = supabase;
    this.currentPointId = null;
  }

  async connect(pointId) {
    if (this.isConnecting || this.room) return this.room;
    this.isConnecting = true;
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) throw new Error('No authenticated user found');

      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError || !session) throw new Error('No active session found');

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (profileError) throw new Error('Profile fetch failed');

      const options = {
        pointId,
        userId: user.id,
        username: profile.username || 'Unknown',
        token: session.access_token,
        supabaseUrl: 'http://127.0.0.1:54321',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      };

      this.currentPointId = pointId;
      this.room = await this.client.joinOrCreate('point', options);
      logger.info(`Connected to room ${this.room.roomId} for point ${pointId}`);
      return this.room;
    } catch (error) {
      logger.error(`Connection failed: ${error.message}`);
      EventBus.emit('connectionStatusChanged', `Failed to connect: ${error.message}`);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async reconnect() {
    if (!this.currentPointId) return;
    this.room?.leave();
    this.room = null;
    await this.connect(this.currentPointId);
    logger.info(`Reconnected to point ${this.currentPointId}`);
  }

  getRoom() {
    return this.room;
  }
}