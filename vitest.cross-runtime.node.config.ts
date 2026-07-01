import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/cross-runtime/node.test.ts"],
    environment: "node",
  },
});
