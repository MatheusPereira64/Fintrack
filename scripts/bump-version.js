#!/usr/bin/env node
/**
 * Sobe a versão do app em todos os lugares de uma vez:
 *   package.json, package-lock.json, android/app/build.gradle (versionName e
 *   versionCode + 1) e o projeto iOS (MARKETING_VERSION e CURRENT_PROJECT_VERSION).
 * Também cria docs/release-notes/v<versão>.md se ainda não existir.
 *
 * Uso: npm run version:bump -- 1.0.8 [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const version = args.find(a => !a.startsWith('--'));

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Informe a versão no formato X.Y.Z, por exemplo: npm run version:bump -- 1.0.8');
  process.exit(1);
}

function update(file, transform) {
  const abs = path.join(root, file);
  const before = fs.readFileSync(abs, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`${file}: nada foi alterado`);
  if (!dryRun) fs.writeFileSync(abs, after);
  console.log(`${dryRun ? '[dry-run] ' : ''}atualizado ${file}`);
}

function replaceOnce(text, pattern, replacement, label) {
  if (!pattern.test(text)) throw new Error(`não encontrei ${label}`);
  return text.replace(pattern, replacement);
}

const gradlePath = 'android/app/build.gradle';
const gradle = fs.readFileSync(path.join(root, gradlePath), 'utf8');
const currentCode = Number((gradle.match(/versionCode\s+(\d+)/) || [])[1]);
const currentName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
if (!currentCode || !currentName) throw new Error('versionCode/versionName não encontrados no build.gradle');
const nextCode = currentCode + 1;

console.log(`${currentName} (${currentCode}) → ${version} (${nextCode})`);

update('package.json', s => replaceOnce(s, /("version":\s*")[^"]+(")/, `$1${version}$2`, 'version no package.json'));

update('package-lock.json', s => {
  // Só a versão do próprio app: a raiz e o pacote "" — nunca as dependências.
  const lock = JSON.parse(s);
  lock.version = version;
  if (lock.packages && lock.packages['']) lock.packages[''].version = version;
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  return JSON.stringify(lock, null, 2).replace(/\n/g, eol) + eol;
});

update(gradlePath, s => {
  s = replaceOnce(s, /versionCode\s+\d+/, `versionCode ${nextCode}`, 'versionCode');
  return replaceOnce(s, /versionName\s+"[^"]+"/, `versionName "${version}"`, 'versionName');
});

update('ios/FinTrackApp.xcodeproj/project.pbxproj', s => {
  s = replaceOnce(s, /MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`, 'MARKETING_VERSION');
  return replaceOnce(s, /CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextCode};`, 'CURRENT_PROJECT_VERSION');
});

const notes = path.join(root, 'docs', 'release-notes', `v${version}.md`);
if (!fs.existsSync(notes)) {
  if (!dryRun) {
    fs.mkdirSync(path.dirname(notes), { recursive: true });
    fs.writeFileSync(notes, '### Novidades\n\n- \n');
  }
  console.log(`${dryRun ? '[dry-run] ' : ''}criado docs/release-notes/v${version}.md (preencha as novidades)`);
}

console.log(`\nPróximos passos:\n  git commit -am "release: FinTrack ${version}"\n  git tag v${version} && git push origin main v${version}`);
