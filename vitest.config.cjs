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
          name: "api-fastapi",
          include: ["tests/unit/api-fastapi/**/*.test.js"],
          environment: "node",
          globals: true,
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "microservices",
          include: ["tests/unit/microservices/**/*.test.js"],
          environment: "node",
          globals: true,
          clearMocks: true,
          restoreMocks: true,
        },
      },
      {
        test: {
          name: "public",
          include: ["tests/unit/public/**/*.test.js", "tests/unit/**/relatorios-cobertura.test.js"],
          environment: "happy-dom",
          globals: true,
          clearMocks: true,
          restoreMocks: true,
        },
      },
    ],
  },
});
