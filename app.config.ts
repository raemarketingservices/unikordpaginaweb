import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
    cloudflare: {
      r2Buckets: {
        CHAT_FILES: 'uniko-chat-files'
      }
    }
  },
  vite: {
    define: {
      'process.env.R2_PUBLIC_URL': JSON.stringify('https://chat-files.uniko-rd.com')
    }
  }
});
