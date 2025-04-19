import { defineConfig, type UserConfig as ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = defineConfig({
  test: {
    setupFiles: ["./test-setup"],
  },
});

export default config;
