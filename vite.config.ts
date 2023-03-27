import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    minify: true,
    lib: {
      entry: 'src/MessagePipe.ts',
      name: 'window-pipe',
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },  
})
