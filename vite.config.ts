import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    minify: true,
    lib: {
      entry: 'src/WindowPipe.ts',
      name: 'window-pipe',
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
