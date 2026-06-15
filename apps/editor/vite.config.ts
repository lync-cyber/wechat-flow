import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](@codemirror|@lezer|codemirror)[\\/]/.test(id)) {
            return "codemirror";
          }
          if (/[\\/]node_modules[\\/](@vue|vue|vue-router|pinia)[\\/]/.test(id)) {
            return "vue";
          }
          return "vendor";
        },
      },
    },
  },
});
