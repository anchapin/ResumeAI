import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '/app/verification_dist',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: '/app/verification_dist/index.html'
    }
  }
});
