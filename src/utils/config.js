/**
 * Конфигурационный файл для клиентской части приложения
 * Централизует доступ к переменным окружения и другим настройкам
 * @module ClientConfig
 */

/**
 * Текущая среда приложения (development, staging, production).
 * @type {string}
 */
export const APP_ENV = import.meta.env.MODE || 'development';

/**
 * URL для WebSocket-соединения.
 * @type {string}
 */
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:2567';

/**
 * Версия приложения.
 * @type {string}
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * Конфигурации для разных сред.
 * @type {Object}
 */
export const CONFIG = {
  development: {
    apiTimeout: 10000,
    logLevel: 'debug',
    enableDevTools: true,
    socketOptions: {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    }
  },
  staging: {
    apiTimeout: 8000,
    logLevel: 'info',
    enableDevTools: true,
    socketOptions: {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    }
  },
  production: {
    apiTimeout: 5000,
    logLevel: 'error',
    enableDevTools: false,
    socketOptions: {
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
    }
  }
};

/**
 * Конфигурация для текущей среды.
 * @type {Object}
 */
export default CONFIG[APP_ENV] || CONFIG.development;