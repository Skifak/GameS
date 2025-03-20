import { supabase } from '../lib/supabase';

export class MapDataManager {
    constructor() {
        this.hexes = new Map();
        this.points = new Map();
    }

    async loadData() {
        console.log('Loading map data...');
        await this.loadHexes();
        await this.loadPoints();
        console.log('Map data loaded:', this.hexes.size, 'hexes,', this.points.size, 'points');
        if (this.hexes.size === 0) console.warn('No hexes loaded!');
        if (this.points.size === 0) console.warn('No points loaded!');
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

    async loadPoints() {
        try {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('id, hex_q, hex_r, type, x, y');
            if (error) throw new Error(error.message);

            console.log('Raw points data from Supabase:', data);
            data.forEach(point => {
                this.points.set(point.id, point);
            });
            console.log('Points cached:', this.points.size);
        } catch (error) {
            console.error('Failed to load points:', error.message);
        }
    }

    getHex(q, r) {
        return this.hexes.get(`${q}:${r}`);
    }

    getPoint(pointId) {
        return this.points.get(pointId);
    }

    getPointsInHex(q, r) {
        return Array.from(this.points.values()).filter(point => point.hex_q === q && point.hex_r === r);
    }
}