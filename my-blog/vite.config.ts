import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const chatProxyTarget =
    env.VITE_CHAT_PROXY_TARGET || "http://127.0.0.1:8080";

  return {
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: ["43.142.87.78", "all"],
      cors: true,
      proxy: {
        "/api/v1": {
          target: chatProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
