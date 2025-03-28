/**
 * Управляет состоянием игры, синхронизируя данные между клиентом и сервером.
 * @module GameStateManager
 */
import { EventBus } from './EventBus';
import logger from '../utils/logger';

/**
 * Класс для управления состоянием игры.
 * @class
 * @param {ConnectionManager} connectionManager - Менеджер подключения к Colyseus
 * @param {PlayerController} playerController - Контроллер позиции игрока
 * @param {UIManager} uiManager - Менеджер UI (может быть null)
 * @param {Object} supabase - Клиент Supabase для доступа к данным
 */
export class GameStateManager {
  constructor(connectionManager, playerController, uiManager, supabase) {
    this.connectionManager = connectionManager;
    this.playerController = playerController;
    this.uiManager = uiManager;
    this.supabase = supabase;
    this.player = { id: null, username: null, x: 0, y: 0 };
    this.room = null;
    this.setupListeners();
  }

  /**
   * Настраивает слушатели событий для обработки команд и статуса.
   */
  setupListeners() {
    EventBus.on('moveToPointRequested', (pointId) => this.moveToPoint(pointId));
    EventBus.on('connectionStatusChanged', (status) => this.uiManager?.setStatus(status));
  }

  /**
   * Инициализирует состояние игрока и подключается к комнате.
   * @async
   */
  async init() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.player.id = session.user.id;
      this.player.username = session.user.user_metadata.username || 'Unknown';

      // Загружаем текущую позицию из profiles
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('current_point_id, current_path_id, current_node_index')
        .eq('id', this.player.id)
        .single();
      if (error) {
        logger.error(`Failed to load profile: ${error.message}`);
      } else {
        const { current_point_id, current_path_id, current_node_index } = profile;
        let x, y;
        if (current_path_id && current_node_index !== null) {
          // Игрок на узле пути
          const { data: path, error: pathError } = await this.supabase
            .from('paths')
            .select('nodes')
            .eq('id', current_path_id)
            .single();
          if (pathError) {
            logger.error(`Failed to load path: ${pathError.message}`);
          } else {
            const nodes = path.nodes;
            x = nodes[current_node_index].x;
            y = nodes[current_node_index].y;
          }
        } else if (current_point_id) {
          // Игрок на точке
          const { data: point, error: pointError } = await this.supabase
            .from('points_of_interest')
            .select('x, y')
            .eq('id', current_point_id)
            .single();
          if (pointError) {
            logger.error(`Failed to load point: ${pointError.message}`);
          } else {
            x = point.x;
            y = point.y;
          }
        }
        if (x && y) {
          this.player.x = x;
          this.player.y = y;
          this.playerController.updatePosition({ x, y }, false);
        }
      }
    }

    await this.connectToPoint();
  }

  /**
   * Подключается к комнате Colyseus для текущей точки.
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Если подключение не удалось
   */
  async connectToPoint() {
    try {
      if (this.room) {
        await this.room.leave();
        this.room = null;
      }
      this.room = await this.connectionManager.connect(1);
      EventBus.emit('connectionStatusChanged', 'Connected to Colyseus');
      logger.info(`Connected to room`);

      return new Promise((resolve) => {
        this.room.onStateChange.once((state) => {
          const playerData = state.players.get(this.room.sessionId);
          if (playerData) {
            this.updatePlayerPosition(playerData.x, playerData.y, false);
          }
          resolve();
        });
      });
    } catch (error) {
      EventBus.emit('connectionStatusChanged', `Failed to connect: ${error.message}`);
      logger.error(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Обновляет позицию игрока на карте.
   * @param {number} x - Координата x
   * @param {number} y - Координата y
   * @param {boolean} [useTween=false] - Использовать ли анимацию
   */
  updatePlayerPosition(x, y, useTween = false) {
    this.player.x = x;
    this.player.y = y;
    this.playerController.updatePosition({ x, y }, useTween);
    logger.info(`Player position updated to x:${x}, y:${y}`);
  }

  /**
   * Перемещает игрока к указанной точке (не используется в MVP).
   * @param {number} pointId - Идентификатор точки
   */
  async moveToPoint(pointId) {
    logger.warn('moveToPoint is not used in MVP');
  }
}