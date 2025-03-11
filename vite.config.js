import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Загружаем переменные окружения в зависимости от режима
  // Приоритет: .env.local > .env.[mode] > .env
  const env = loadEnv(mode, process.cwd(), '');
  
  // Проверяем наличие .env.local для локальной разработки
  const useLocalEnv = fs.existsSync('.env.local') && command === 'serve';
  
  console.log(`Running in ${mode} mode with ${useLocalEnv ? '.env.local' : '.env'} configuration`);
  
  const isProduction = mode === 'production';
  
  const baseConfig = {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@game': resolve(__dirname, 'src/game'),
        '@utils': resolve(__dirname, 'src/utils')
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __APP_ENV__: JSON.stringify(mode),
      __IS_DEV__: !isProduction,
      __IS_PROD__: isProduction,
      __API_URL__: isProduction 
        ? JSON.stringify('https://150.241.69.143')
        : JSON.stringify('http://localhost:2567')
    },
    // Настройка для использования .env.local при локальной разработке
    envDir: process.cwd(),
    envPrefix: 'VITE_'
  };

  if (command === 'serve') {
    // Конфигурация для режима разработки
    return {
      ...baseConfig,
      server: {
        port: parseInt(env.CLIENT_PORT || '3002'),
        strictPort: true,
        proxy: isProduction ? {
          '/api': {
            target: 'https://150.241.69.143',
            changeOrigin: true,
            secure: true,
          },
          '/auth': {
            target: 'https://150.241.69.143',
            changeOrigin: true,
            secure: true,
          }
        } : {
          '/api': 'http://localhost:2567',
          '/auth': 'http://localhost:9999'
        }
      }
    };
  } else {
    // Конфигурация для сборки (production)
    return {
      ...baseConfig,
      build: {
        outDir: 'dist',
        sourcemap: !isProduction,
        minify: isProduction,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              phaser: ['phaser']
            }
          }
        }
      }
    };
  }
}); 