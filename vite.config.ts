import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2019',
    minify: true,
    lib: {
      entry: 'src/WindowPipe.ts',
      name: 'WindowPipe',
      formats: ['cjs','umd','es'],
      fileName: (format) => `window-pipe.${format}.js`
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },  
})
