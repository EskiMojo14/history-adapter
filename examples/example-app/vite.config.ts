import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  resolve: {
    alias: {
      "history-adapter": resolve("../../src"),
    },
  },
});
