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
    this.player = { id: null, username: null, q: 0, r: 0 };
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
        .select('current_hex_q, current_hex_r')
        .eq('id', this.player.id)
        .single();
      if (error) {
        logger.error(`Failed to load profile: ${error.message}`);
      } else {
        this.player.q = profile.current_hex_q || 0;
        this.player.r = profile.current_hex_r || 0;
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
            this.updatePlayerPosition(playerData.q, playerData.r, false);
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
   * @param {number} q - Координата q гекса
   * @param {number} r - Координата r гекса
   * @param {boolean} [useTween=false] - Использовать ли анимацию
   */
  updatePlayerPosition(q, r, useTween = false) {
    this.player.q = q;
    this.player.r = r;
    this.playerController.updatePosition({ q, r }, useTween);
    logger.info(`Player position updated to q:${q}, r:${r}`);
  }

  /**
   * Перемещает игрока к указанной точке (не используется в MVP).
   * @param {number} pointId - Идентификатор точки
   */
  async moveToPoint(pointId) {
    logger.warn('moveToPoint is not used in MVP');
  }
}