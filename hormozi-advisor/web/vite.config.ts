import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const evePort = process.env.EVE_PORT ?? "2000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/eve": {
        target: `http://127.0.0.1:${evePort}`,
        changeOrigin: true,
      },
    },
  },
});
