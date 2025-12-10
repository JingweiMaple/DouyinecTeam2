// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // ✅ 前端端口固定为 5173
    strictPort: true, // ✅ 这个很关键：如果 5173 被占用就报错，而不是随便换成 5174/5175
    proxy: {
      // 下面是关键：把 /api 代理到后端
      "/api": {
        target: "http://localhost:3002", //
        changeOrigin: true,
      },
    },
  },
});
