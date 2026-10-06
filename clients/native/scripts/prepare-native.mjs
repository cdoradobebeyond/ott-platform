import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '..');
const target = process.argv[2];
const output = resolve(process.argv[3] || join(source, 'generated', target || ''));
const targets = {
  android: { name: 'UmbralAndroid', appId: 'com.umbral.ott.android', tv: false },
  ios: { name: 'UmbralIOS', appId: 'com.umbral.ott.ios', tv: false },
  androidtv: { name: 'UmbralAndroidTV', appId: 'com.umbral.ott.androidtv', tv: true },
  tvos: { name: 'UmbralAppleTV', appId: 'com.umbral.ott.appletv', tv: true },
};
const config = targets[target];
if (!config) throw new Error(`Target no válido: ${target}. Usa android, ios, androidtv o tvos.`);

await rm(output, { recursive: true, force: true });
await mkdir(dirname(output), { recursive: true });
const args = ['--yes', '@react-native-community/cli@20.1.0', 'init', config.name,
  '--version', '0.85.0', '--directory', output, '--package-name', config.appId,
  '--skip-install', '--skip-git-init', '--pm', 'npm'];
if (config.tv) args.push('--template', '@react-native-tvos/template-tv');
const init = spawnSync('npx', args, { stdio: 'inherit' });
if (init.status !== 0) throw new Error(`React Native init terminó con ${init.status ?? init.signal}.`);

const dependencies = JSON.parse(await readFile(join(source, 'package.json'), 'utf8')).dependencies;
const generatedPackagePath = join(output, 'package.json');
const generatedPackage = JSON.parse(await readFile(generatedPackagePath, 'utf8'));
generatedPackage.dependencies = { ...generatedPackage.dependencies, ...dependencies };
await writeFile(generatedPackagePath, `${JSON.stringify(generatedPackage, null, 2)}\n`);

for (const entry of ['App.tsx', 'src', 'assets']) {
  await cp(join(source, entry), join(output, entry), { recursive: true });
}
await writeFile(join(output, 'index.js'), `import 'react-native-get-random-values';\nimport 'react-native-url-polyfill/auto';\nimport {AppRegistry} from 'react-native';\nimport App from './App';\nimport {name as appName} from './app.json';\nAppRegistry.registerComponent(appName, () => App);\n`);

if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  const configSource = `export const SUPABASE_URL = ${JSON.stringify(process.env.VITE_SUPABASE_URL)};\nexport const SUPABASE_ANON_KEY = ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY)};\n`;
  await writeFile(join(output, 'src/config.ts'), configSource);
}

if (target === 'android' || target === 'androidtv') {
  const settingsPath = join(output, 'android/settings.gradle');
  let settings = await readFile(settingsPath, 'utf8');
  const repo = `maven { url = uri('https://github.com/VdoCipher/maven-repo/raw/master/repo') }`;
  if (!settings.includes('github.com/VdoCipher/maven-repo')) {
    if (/dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/.test(settings)) {
      settings = settings.replace(/(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/,
        `$1\n        ${repo}`);
      if (!/repositoriesMode\.set\(RepositoriesMode\.(PREFER_SETTINGS|FAIL_ON_PROJECT_REPOS)\)/.test(settings)) {
        settings = settings.replace(/(dependencyResolutionManagement\s*\{)/,
          '$1\n    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)');
      }
    } else {
      settings += `\n\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)\n    repositories {\n        google()\n        mavenCentral()\n        ${repo}\n    }\n}\n`;
    }
    await writeFile(settingsPath, settings);
  }
}

const installArgs = ['install', '--no-audit', '--no-fund'];
if (config.tv) installArgs.push('--legacy-peer-deps');
const install = spawnSync('npm', installArgs, { cwd: output, stdio: 'inherit' });
if (install.status !== 0) throw new Error(`npm install terminó con ${install.status ?? install.signal}.`);
console.log(`Proyecto ${target} preparado en ${output}`);
