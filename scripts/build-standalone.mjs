import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const vendorRoot = path.join(repoRoot, 'vendor', 'vue-devtools-plugin');
const vendorWebpackConfigPath = path.join(vendorRoot, 'webpack.config.js');
const vendorStandaloneRoot = path.join(vendorRoot, 'packages', 'standalone');
const vendorStandaloneIndexPath = path.join(vendorStandaloneRoot, 'index.js');
const vendorStandaloneDist = path.join(vendorStandaloneRoot, 'dist');
const standaloneSourcePath = path.join(repoRoot, 'standalone', 'index.js');
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

function ensureStandaloneFiles() {
  if (!fs.existsSync(standaloneSourcePath)) {
    console.error(`Missing standalone source: ${path.relative(repoRoot, standaloneSourcePath)}`);
    process.exit(1);
  }

  fs.mkdirSync(vendorStandaloneRoot, { recursive: true });
  fs.copyFileSync(standaloneSourcePath, vendorStandaloneIndexPath);
}

function ensureVendorWebpackStandaloneConfig() {
  if (!fs.existsSync(vendorWebpackConfigPath)) {
    console.error(`Missing vendor webpack config: ${vendorWebpackConfigPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(vendorWebpackConfigPath, 'utf8');
  if (content.includes('packages/standalone/index.js')) return;

  // The vendor config exports an array: module.exports = [ {...}, {...} ]
  // Insert a third object *before* the final closing `]` (after the last `}`).
  const idx = content.lastIndexOf(']');
  if (idx === -1) {
    console.error('Failed to patch vendor webpack config (unexpected format).');
    process.exit(1);
  }

  const snippet = `,
{
  entry: {
    "vue-devtools-standalone.min": Path.resolve(__dirname, "./packages/standalone/index.js")
  },
  output: {
    path: Path.resolve(__dirname, "./packages/standalone/dist"),
    filename: "[name].js",
    library: "VueDevtoolsStandalone",
    libraryTarget: "umd",
    umdNamedDefine: true,
    globalObject: "this"
  },
  ...common
}
`;

  const patched = content.slice(0, idx) + snippet + content.slice(idx);
  fs.writeFileSync(vendorWebpackConfigPath, patched, 'utf8');
}

// 1) install + build in vendor
if (!fs.existsSync(path.join(vendorRoot, 'package.json'))) {
  console.error('Missing submodule. Run: git submodule update --init --recursive');
  process.exit(1);
}

run('corepack', ['enable']);
ensureStandaloneFiles();
ensureVendorWebpackStandaloneConfig();
run('yarn', ['--cwd', vendorRoot, 'install', '--frozen-lockfile']);
run('yarn', ['--cwd', vendorRoot, 'build']);

// 2) copy artifacts to ./dist (white-list)
if (!fs.existsSync(vendorStandaloneDist)) {
  console.error(`Standalone dist not found: ${vendorStandaloneDist}`);
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
  const ok = copyIfExists(path.join(vendorStandaloneDist, f), outDir);
  if (ok) copied++;
}

if (copied === 0) {
  console.error('No standalone artifacts were copied. Check build output in vendor/vue-devtools-plugin/packages/standalone/dist');
  process.exit(1);
}

console.log(`Done. Copied ${copied} file(s) to ${path.relative(repoRoot, outDir)}/`);

