module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@src':        './src',
          '@models':     './src/models',
          '@theme':      './src/theme',
          '@components': './src/components',
          '@navigation': './src/navigation',
          '@hooks':      './src/hooks',
          '@store':      './src/store',
          '@services':   './src/services',
          '@database':   './src/database',
          '@utils':      './src/utils',
          '@constants':  './src/constants',
          '@modules':    './src/modules',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
