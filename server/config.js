/**
 * Модуль конфигурации сервера.
 * Загружает переменные окружения, определяет среду выполнения и предоставляет настройки для разных сред.
 * @module ServerConfig
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Определяем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Проверяет наличие файла .env.local и определяет, используется ли локальная разработка.
 * @type {boolean}
 */
const localEnvPath = path.resolve(__dirname, '../.env');
const hasLocalEnv = fs.existsSync(localEnvPath);

/**
 * Загружает переменные окружения из файла .env в зависимости от среды.
 */
if (hasLocalEnv && process.env.NODE_ENV === 'development') {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: localEnvPath });
} else {
  console.log(`Loading environment from .env for ${process.env.NODE_ENV} environment`);
  dotenv.config();
}

/**
 * Текущая среда выполнения (development или production).
 * @type {string}
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Флаг локальной разработки.
 * @type {boolean}
 */
const isLocalDev = hasLocalEnv && NODE_ENV === 'development';

/**
 * Флаг работы в Docker-контейнере.
 * @type {boolean}
 */
const isDocker = process.env.DOCKER_ENV === 'true';

/**
 * Получает URL сервиса с учётом среды (локальная разработка или Docker).
 * @param {string} envVar - Имя переменной окружения для URL сервиса
 * @param {string} dockerUrl - URL по умолчанию для Docker
 * @param {number} localPort - Порт для локальной разработки
 * @returns {string} Итоговый URL сервиса
 */
const getServiceUrl = (envVar, dockerUrl, localPort) => {
  const envValue = process.env[envVar];
  if (envValue) {
    console.log(`Using ${envVar} from .env: ${envValue}`);
    return envValue;
  }
  
  if (isLocalDev && !isDocker) {
    console.log(`Local dev mode: using localhost:${localPort}`);
    return `${dockerUrl.split('://')[0]}://localhost:${localPort}`;
  }
  
  if (isDocker) {
    console.log(`Docker mode: using ${dockerUrl}`);
    return dockerUrl;
  }
  
  console.log(`Default mode: using ${dockerUrl}`);
  return dockerUrl;
};

/**
 * Базовая конфигурация сервера с значениями по умолчанию.
 * @type {Object}
 */
const baseConfig = {
  port: process.env.PORT || 2567,
  //для докер окружения:
  //  redisUrl: process.env.REDIS_URL || (isLocalDev && !isDocker ? 'redis://localhost:6379' : 'redis://redis:6379'),
  redisUrl: 'redis://localhost:6379', // Временно форсируем для теста
  natsUrl: getServiceUrl('NATS_URL', 'nats://nats:4222', 4222),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production',
  logDir: path.join(__dirname, '../logs'),
  isLocalDev,
  isDocker
};
// Добавь это сразу после baseConfig
console.log('process.env.REDIS_URL:', process.env.REDIS_URL);
console.log('Final redisUrl:', baseConfig.redisUrl);
/**
 * Конфигурации для разных сред (development и production).
 * @type {Object}
 */
const envConfig = {
  development: {
    debug: true,
    logLevel: 'debug',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Флаги для обработки недоступных сервисов в режиме разработки
    allowMissingRedis: false,
    allowMissingNats: true,
    allowMissingLoki: true,
    mockAuthInDev: true
  },
  production: {
    debug: false,
    logLevel: 'info',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://150.241.69.143'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // В Docker-контейнере разрешаем отсутствие сервисов и в production
    allowMissingRedis: false,
    allowMissingNats: isDocker,
    allowMissingLoki: isDocker,
    mockAuthInDev: isDocker
  },
};

/**
 * Итоговая конфигурация сервера, объединяющая базовые настройки и настройки для текущей среды.
 * @type {Object}
 */
const config = {
  ...baseConfig,
  ...(envConfig[NODE_ENV] || envConfig.development),
  env: NODE_ENV,
};

/**
 * Выводит предупреждение, если используется дефолтный секрет JWT в продакшене.
 */
if (NODE_ENV === 'production') {
  if (baseConfig.jwtSecret === 'dev-secret-key-do-not-use-in-production') {
    console.warn('WARNING: Using default JWT secret in production environment!');
  }
}

console.log(`Server running in ${NODE_ENV} environment${isLocalDev ? ' with local configuration' : ''}${isDocker ? ' in Docker container' : ''}`);

export default config;