/**
 * Конфигурационный файл для клиентской части приложения
 * Централизует доступ к переменным окружения и другим настройкам
 */

// Определяем текущую среду
export const APP_ENV = import.meta.env.MODE || 'development';

// Базовые URL для API и WebSocket с значениями по умолчанию
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:2567';
export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Настройки в зависимости от окружения
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

// Экспортируем конфигурацию для текущей среды
export default CONFIG[APP_ENV] || CONFIG.development; 