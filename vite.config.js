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
      __IS_DEV__: mode === 'development',
      __IS_PROD__: mode === 'production'
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
        proxy: {
          '/api': {
            target: 'http://localhost:2567',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path
          },
          '/colyseus': {
            target: 'http://localhost:2567',
            changeOrigin: true,
            secure: false,
            ws: true
          }
        }
      }
    };
  } else {
    // Конфигурация для сборки (production)
    return {
      ...baseConfig,
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: true,
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