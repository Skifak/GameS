/**
 * Загружает и кэширует данные карты из Supabase.
 * @module MapDataManager
 */
import { supabase } from '../lib/supabase';

/**
 * Класс для управления данными карты.
 * @class
 */
export class MapDataManager {
  constructor() {
    this.hexes = new Map();
  }

  /**
   * Загружает данные карты из Supabase.
   * @async
   */
  async loadData() {
    console.log('Loading map data...');
    await this.loadHexes();
    console.log('Map data loaded:', this.hexes.size, 'hexes');
    if (this.hexes.size === 0) console.warn('No hexes loaded!');
  }

  /**
   * Загружает данные гексов из Supabase.
   * @async
   * @throws {Error} Если загрузка не удалась
   */
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

  /**
   * Получает данные гекса по координатам.
   * @param {number} q - Координата q
   * @param {number} r - Координата r
   * @returns {Object|undefined} Данные гекса или undefined, если не найден
   */
  getHex(q, r) {
    return this.hexes.get(`${q}:${r}`);
  }

  /**
   * Возвращает все загруженные гексы.
   * @returns {Array<Object>} Массив данных гексов
   */
  getHexes() {
    return Array.from(this.hexes.values());
  }
}