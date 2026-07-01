const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Pastas de build nativo mudam durante o Gradle e derrubam o Metro (ENOENT no watcher)
    blockList: exclusionList([
      /android\/app\/\.cxx\/.*/,
      /android\/build\/.*/,
      /android\/\.gradle\/.*/,
      /node_modules\/.*\/android\/\.cxx\/.*/,
      /node_modules\/.*\/android\/build\/.*/,
    ]),
  },
  watcher: {
    additionalExts: ['cjs', 'mjs'],
    watchman: {
      deferStates: ['hg.update'],
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
