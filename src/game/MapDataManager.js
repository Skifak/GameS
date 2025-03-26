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
    this.cache = {};
    this.cacheTTL = {};
    this.points = new Map();
    this.paths = new Map();
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

  /**
   * Загружает данные для текущего гекса (точки и пути).
   * @param {number} hexQ - Q-координата гекса
   * @param {number} hexR - R-координата гекса
   * @returns {Promise<Object>} Данные гекса, включая точки и пути
   */
  loadHexData(hexQ, hexR) {
    const cacheKey = `hex_${hexQ}_${hexR}`;
    
    // Проверяем кэш
    if (this.cache[cacheKey] && Date.now() < this.cacheTTL[cacheKey]) {
      return Promise.resolve(this.cache[cacheKey]);
    }
    
    // Если нет в кэше, запрашиваем из Supabase
    return this.fetchCurrentHexData(hexQ, hexR).then(data => {
      // Сохраняем в кэш на 10 минут
      this.cache[cacheKey] = data;
      this.cacheTTL[cacheKey] = Date.now() + 600000;
      
      // Планируем очистку кэша
      setTimeout(() => {
        delete this.cache[cacheKey];
        delete this.cacheTTL[cacheKey];
      }, 600000);
      
      return data;
    });
  }

  /**
   * Загружает данные точек и путей для гекса из Supabase.
   * @param {number} hexQ - Q-координата гекса
   * @param {number} hexR - R-координата гекса
   * @returns {Promise<Object>} Объект с точками и путями
   */
  async fetchCurrentHexData(hexQ, hexR) {
    try {
      // Загружаем точки для этого гекса
      const { data: points, error: pointsError } = await supabase
        .from('points_of_interest')
        .select('*')
        .eq('hex_q', hexQ)
        .eq('hex_r', hexR);
      
      if (pointsError) throw new Error(pointsError.message);
      
      // Если точек нет, возвращаем пустой объект
      if (!points || points.length === 0) {
        return { points: [], paths: [] };
      }
      
      // Получаем ID всех точек
      const pointIds = points.map(p => p.id);
      
      // Загружаем пути, связанные с этими точками
      const { data: paths, error: pathsError } = await supabase
        .from('point_transitions')
        .select('*')
        .in('from_point_id', pointIds);
      
      if (pathsError) throw new Error(pathsError.message);
      
      return {
        points: points || [],
        paths: paths || []
      };
    } catch (error) {
      console.error('Failed to fetch hex data:', error.message);
      return { points: [], paths: [] };
    }
  }

  /**
   * Проверяет валидность полей точки и применяет значения по умолчанию
   * @param {Object} pointData - Данные точки
   * @returns {Object} - Валидированные данные точки
   */
  validatePointData(pointData) {
    const data = { ...pointData };
    
    // Проверяем и устанавливаем значения по умолчанию
    if (!data.name) data.name = 'Новая точка';
    if (!data.type) data.type = 'camp';
    
    // Округляем координаты до целых чисел
    data.x = Math.round(data.x);
    data.y = Math.round(data.y);
    
    return data;
  }

  /**
   * Сохраняет данные точки в Supabase.
   * @param {Object} pointData - Данные точки
   * @param {boolean} isNew - Флаг новой точки
   * @returns {Promise<Object>} - Результат операции
   */
  async savePoint(pointData, isNew = false) {
    try {
      // Валидируем данные
      const dataToSave = this.validatePointData(pointData);
      
      console.log(`Saving point ${isNew ? 'new' : 'existing'}:`, dataToSave);
      
      if (isNew) {
        // Удаляем ID, чтобы Supabase сгенерировал новый
        const { id, ...data } = dataToSave;
        
        const { data: result, error } = await supabase
          .from('points_of_interest')
          .insert(data)
          .select();
          
        if (error) {
          console.error('Error saving point:', error);
          throw error;
        }
        
        return result[0];
      } else {
        // Обновляем существующую точку
        const { data: result, error } = await supabase
          .from('points_of_interest')
          .update(dataToSave)
          .eq('id', dataToSave.id)
          .select();
          
        if (error) {
          console.error('Error updating point:', error);
          throw error;
        }
        
        return result[0];
      }
    } catch (error) {
      console.error('Error saving point:', error);
      throw error;
    }
  }

  /**
   * Сохраняет данные пути в Supabase.
   * @param {Object} pathData - Данные пути
   * @returns {Promise<Object>} Результат операции
   */
  async savePath(pathData) {
    // Если у пути есть ID из БД, обновляем, иначе создаем
    const isNew = typeof pathData.id === 'number' && pathData.id > 1000000; // Временные ID большие
    
    try {
      // Преобразуем массив узлов в JSON
      const dataToSave = {
        ...pathData,
        nodes: JSON.stringify(pathData.nodes)
      };
      
      if (isNew) {
        // Удаляем ID, чтобы Supabase сгенерировал новый
        const { id, ...data } = dataToSave;
        
        const { data: result, error } = await supabase
          .from('point_transitions')
          .insert([data])
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('point_transitions')
          .update(dataToSave)
          .eq('id', dataToSave.id)
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        return result;
      }
    } catch (error) {
      console.error('Failed to save path:', error.message);
      throw error;
    }
  }

  /**
   * Загружает все точки из базы данных.
   * @returns {Promise<Array>} Массив точек
   */
  async loadPoints() {
    try {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('*');
      
      if (error) {
        console.error('Error loading points:', error);
        return [];
      }
      
      console.log('Loaded points from database:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to load points:', error);
      return [];
    }
  }
}