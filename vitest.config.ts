import type { UserConfig } from "vitest/config";
import { defineConfig } from "vitest/config";

const config: UserConfig = defineConfig({
  test: {
    setupFiles: ["./test-setup"],
  },
});

export default config;
