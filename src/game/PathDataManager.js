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
        id: pathData.id,
        start_point: typeof pathData.start_point === 'object' ? pathData.start_point.id : pathData.start_point,
        end_point: typeof pathData.end_point === 'object' ? pathData.end_point.id : pathData.end_point,
        nodes: pathData.nodes || [],
        parameters: pathData.parameters || {}
      };

      if (isNew) {
        const { id, ...data } = dataToSave;
        const { data: result, error } = await supabase.from('paths').insert([data]).select().single();
        if (error) throw error;
        logger.info('Path saved:', result);
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('paths')
          .update({
            start_point: dataToSave.start_point,
            end_point: dataToSave.end_point,
            nodes: dataToSave.nodes,
            parameters: dataToSave.parameters
          })
          .eq('id', dataToSave.id)
          .select()
          .single();
        if (error) throw error;
        logger.info('Path updated:', result);
        return result;
      }
    } catch (error) {
      logger.error('Failed to save path:', error);
      throw error;
    }
  }

  async deletePath(pathId) {
    try {
      const { error } = await supabase.from('paths').delete().eq('id', pathId);
      if (error) throw error;
      logger.info(`Path deleted: ${pathId}`);
      this.paths.delete(pathId);
    } catch (error) {
      logger.error('Failed to delete path:', error);
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