/**
 * The GitHub Pages demo is served from /split-bill/, everything else from the
 * domain root. EXPO_BASE_URL is set only by the Pages build.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
