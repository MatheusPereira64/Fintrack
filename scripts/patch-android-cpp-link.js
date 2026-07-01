/**
 * Windows + NDK 27: bibliotecas nativas precisam linkar c++_shared explicitamente.
 * Aplica patches idempotentes apos npm install.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const patches = [
  {
    file: 'node_modules/react-native-worklets/android/CMakeLists.txt',
    needle: 'target_link_libraries(worklets android log ReactAndroid::reactnative',
    insert: 'target_link_libraries(worklets android log c++_shared ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-reanimated/android/CMakeLists.txt',
    needle: 'target_link_libraries(\n  reanimated\n  log\n  ReactAndroid::reactnative',
    insert: 'target_link_libraries(\n  reanimated\n  log\n  c++_shared\n  ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-gesture-handler/android/CMakeLists.txt',
    needle: 'target_link_libraries(\n  react_codegen_rngesturehandler_codegen\n  fbjni',
    insert: 'target_link_libraries(\n  react_codegen_rngesturehandler_codegen\n  c++_shared\n  fbjni',
  },
  {
    file: 'node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
    needle: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  ReactAndroid::reactnative',
    insert: 'target_link_libraries(\n  ${PACKAGE_NAME}\n  c++_shared\n  ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-screens/android/src/main/jni/CMakeLists.txt',
    needle: 'target_link_libraries(\n  ${LIB_TARGET_NAME}\n  ReactAndroid::reactnative',
    insert: 'target_link_libraries(\n  ${LIB_TARGET_NAME}\n  c++_shared\n  ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-screens/android/CMakeLists.txt',
    needle: 'target_link_libraries(rnscreens\n    ReactAndroid::reactnative',
    insert: 'target_link_libraries(rnscreens\n    c++_shared\n    ReactAndroid::reactnative',
  },
  {
    file: 'node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
    needle: '          ${LIB_TARGET_NAME}\n          fbjni\n          jsi\n          reactnative',
    insert: '          ${LIB_TARGET_NAME}\n          c++_shared\n          fbjni\n          jsi\n          reactnative',
  },
  {
    file: 'node_modules/react-native-svg/android/src/main/jni/CMakeLists.txt',
    needle: '    react_codegen_rnsvg\n    ReactAndroid::reactnative',
    insert: '    react_codegen_rnsvg\n    c++_shared\n    ReactAndroid::reactnative',
  },
];

let applied = 0;

for (const { file, needle, insert } of patches) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('c++_shared')) {
    continue;
  }
  if (!content.includes(needle)) {
    console.warn(`[patch-android-cpp-link] padrao nao encontrado: ${file}`);
    continue;
  }

  fs.writeFileSync(fullPath, content.replace(needle, insert));
  applied += 1;
  console.log(`[patch-android-cpp-link] ok: ${file}`);
}

if (applied > 0) {
  console.log(`[patch-android-cpp-link] ${applied} arquivo(s) corrigido(s).`);
}
