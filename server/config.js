import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Определяем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверяем наличие .env.local для локальной разработки
const localEnvPath = path.resolve(__dirname, '../.env');
const hasLocalEnv = fs.existsSync(localEnvPath);

// Загружаем переменные окружения из соответствующего файла
if (hasLocalEnv && process.env.NODE_ENV === 'development') {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: localEnvPath });
} else {
  console.log(`Loading environment from .env for ${process.env.NODE_ENV} environment`);
  dotenv.config();
}

// Определяем текущую среду
const NODE_ENV = process.env.NODE_ENV || 'development';
const isLocalDev = hasLocalEnv && NODE_ENV === 'development';
const isDocker = process.env.DOCKER_ENV === 'true';

// Функция для получения URL с учетом локальной разработки и Docker
const getServiceUrl = (envVar, dockerUrl, localPort) => {
  const envValue = process.env[envVar];
  if (envValue) return envValue;
  
  // Для локальной разработки используем localhost с соответствующим портом
  if (isLocalDev && !isDocker) {
    return `${dockerUrl.split('://')[0]}://localhost:${localPort}`;
  }
  
  // Для Docker контейнера используем имена сервисов из docker-compose
  if (isDocker) {
    // Извлекаем хост из URL (например, redis из redis://redis:6379)
    const host = new URL(dockerUrl).hostname;
    // Проверяем доступность хоста через DNS
    try {
      // Если хост недоступен, используем localhost
      return dockerUrl;
    } catch (error) {
      console.warn(`Service ${host} is not available, using fallback`);
      return `${dockerUrl.split('://')[0]}://localhost:${localPort}`;
    }
  }
  
  return dockerUrl;
};

// Базовая конфигурация с значениями по умолчанию
const baseConfig = {
  port: process.env.PORT || 2567,
  redisUrl: getServiceUrl('REDIS_URL', 'redis://redis:6379', 6379),
  natsUrl: getServiceUrl('NATS_URL', 'nats://nats:4222', 4222),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production',
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:9999',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  logDir: path.join(__dirname, '../logs'),
  isLocalDev,
  isDocker
};

// Конфигурация для разных сред
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
    allowMissingRedis: true,
    allowMissingPocketBase: true,
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
    allowMissingRedis: isDocker,
    allowMissingPocketBase: isDocker,
    allowMissingNats: isDocker,
    allowMissingLoki: isDocker,
    mockAuthInDev: isDocker
  },
};

// Объединяем базовую конфигурацию с конфигурацией для текущей среды
const config = {
  ...baseConfig,
  ...(envConfig[NODE_ENV] || envConfig.development),
  env: NODE_ENV,
};

// Предупреждение при использовании значений по умолчанию для секретов в production
if (NODE_ENV === 'production') {
  if (baseConfig.jwtSecret === 'dev-secret-key-do-not-use-in-production') {
    console.warn('WARNING: Using default JWT secret in production environment!');
  }
  if (!baseConfig.supabaseAnonKey || !baseConfig.supabaseServiceKey) {
    console.warn('WARNING: Missing Supabase keys in production environment!');
  }
}

console.log(`Server running in ${NODE_ENV} environment${isLocalDev ? ' with local configuration' : ''}${isDocker ? ' in Docker container' : ''}`);

export default config; 