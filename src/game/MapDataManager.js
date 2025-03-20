import { supabase } from '../lib/supabase';

export class MapDataManager {
  constructor() {
    this.hexes = new Map();
  }

  async loadData() {
    console.log('Loading map data...');
    await this.loadHexes();
    console.log('Map data loaded:', this.hexes.size, 'hexes');
    if (this.hexes.size === 0) console.warn('No hexes loaded!');
  }

  async loadHexes() {
    try {
      const { data, error } = await supabase
        .from('hexes')
        .select('q, r, type');
      if (error) throw new Error(error.message);

      console.log('Raw hexes data from Supabase:', data);
      data.forEach(hex => {
        this.hexes.set(`${hex.q}:${hex.r}`, hex);
      });
      console.log('Hexes cached:', this.hexes.size);
    } catch (error) {
      console.error('Failed to load hexes:', error.message);
    }
  }

  getHex(q, r) {
    return this.hexes.get(`${q}:${r}`);
  }

  getHexes() {
    return Array.from(this.hexes.values());
  }
}