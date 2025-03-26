/**
 * Управляет данными путей в Supabase и localStorage.
 * @module PathDataManager
 */
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

export class PathDataManager {
  constructor() {
    this.paths = new Map();
  }

  async loadPaths() {
    try {
      const { data, error } = await supabase.from('paths').select('*');
      if (error) throw error;
      data.forEach(path => this.paths.set(path.id, path));
      return Array.from(this.paths.values());
    } catch (error) {
      logger.error('Failed to load paths:', error);
      return [];
    }
  }

  async savePath(pathData, isNew = false) {
    try {
      const dataToSave = {
        ...pathData,
        nodes: pathData.nodes || []
      };
      if (isNew) {
        const { id, ...data } = dataToSave;
        const { data: result, error } = await supabase.from('paths').insert([data]).select().single();
        if (error) throw error;
        logger.info('Path saved:', result);
        return result;
      } else {
        const { data: result, error } = await supabase.from('paths').update(dataToSave).eq('id', dataToSave.id).select().single();
        if (error) throw error;
        logger.info('Path updated:', result);
        return result;
      }
    } catch (error) {
      logger.error('Failed to save path:', error);
      throw error;
    }
  }

  saveDraft(pathData) {
    const drafts = JSON.parse(localStorage.getItem('pathDrafts') || '{}');
    drafts[pathData.id] = pathData;
    localStorage.setItem('pathDrafts', JSON.stringify(drafts));
    logger.info('Path draft saved to localStorage:', pathData);
  }

  loadDrafts() {
    return JSON.parse(localStorage.getItem('pathDrafts') || '{}');
  }
}