const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "api-express",
          include: ["tests/unit/api-express/**/*.test.js"],
          environment: "node",
          globals: true,
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "public",
          include: ["tests/unit/public/**/*.test.js"],
          environment: "happy-dom",
          globals: true,
          clearMocks: true,
          restoreMocks: true,
        },
      },
    ],
  },
});
