import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  // Принудительно привязываем сборку к вашей подпапке на GitHub Pages
  base: '/-sanaks-client/', 
  
  plugins: [
    solidPlugin()
  ],
  
  server: {
    port: 3000,
    host: true
  },
  
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser'
  }
});
