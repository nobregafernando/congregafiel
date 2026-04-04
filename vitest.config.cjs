/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    include: ["tests/unit/**/*.test.js"],
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["tests/unit/public/**/*.test.js", "happy-dom"],
      ["tests/unit/api-express/**/*.test.js", "node"],
    ],
    clearMocks: true,
    restoreMocks: true,
  },
};
