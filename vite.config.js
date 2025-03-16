import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  console.log(`Building for ${mode} mode`);

  return {
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
});