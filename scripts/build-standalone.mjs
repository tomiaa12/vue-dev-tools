import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const vendorRoot = path.join(repoRoot, 'vendor', 'vue-devtools-plugin');
const standaloneDist = path.join(vendorRoot, 'packages', 'standalone', 'dist');
const outDir = path.join(repoRoot, 'dist');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function emptyDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
  fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, destDir) {
  if (!fs.existsSync(src)) return false;
  ensureDir(destDir);
  const filename = path.basename(src);
  fs.copyFileSync(src, path.join(destDir, filename));
  return true;
}

// 1) install + build in vendor
if (!fs.existsSync(path.join(vendorRoot, 'package.json'))) {
  console.error('Missing submodule. Run: git submodule update --init --recursive');
  process.exit(1);
}

run('corepack', ['enable']);
run('yarn', ['--cwd', vendorRoot, 'install', '--frozen-lockfile']);
run('yarn', ['--cwd', vendorRoot, 'build:standalone']);

// 2) copy artifacts to ./dist (white-list)
if (!fs.existsSync(standaloneDist)) {
  console.error(`Standalone dist not found: ${standaloneDist}`);
  process.exit(1);
}

emptyDir(outDir);

const expected = [
  'vue-devtools-standalone.min.js',
  'vue-devtools-standalone.min.js.map',
  'vue-devtools-standalone.js',
  'vue-devtools-standalone.js.map',
  'vue-devtools-standalone.esm.js',
  'vue-devtools-standalone.esm.js.map'
];

let copied = 0;
for (const f of expected) {
  const ok = copyIfExists(path.join(standaloneDist, f), outDir);
  if (ok) copied++;
}

if (copied === 0) {
  console.error('No standalone artifacts were copied. Check build output in vendor/vue-devtools-plugin/packages/standalone/dist');
  process.exit(1);
}

console.log(`Done. Copied ${copied} file(s) to ${path.relative(repoRoot, outDir)}/`);

