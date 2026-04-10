import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/table-converter/',
  server: {
    port: 19090,
    open: false,
  },
});
