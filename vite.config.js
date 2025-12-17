import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' ensures we load all env vars, not just those starting with VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This replaces `process.env.API_KEY` in your source code with the actual key string
      // This prevents the "ReferenceError: process is not defined" in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    server: {
      proxy: {
        // Redirect API calls to the backend server running on port 3000
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});