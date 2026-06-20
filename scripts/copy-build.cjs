const fs = require('fs');
const path = require('path');

// 1. Find the repository root by walking up and looking for pnpm-workspace.yaml
let repoRoot = process.cwd();
while (repoRoot) {
  if (fs.existsSync(path.join(repoRoot, 'pnpm-workspace.yaml'))) {
    break;
  }
  const parent = path.dirname(repoRoot);
  if (parent === repoRoot) {
    console.error('Could not find repository root (pnpm-workspace.yaml)');
    process.exit(1);
  }
  repoRoot = parent;
}

// 2. Resolve absolute paths
const srcDir = path.resolve(repoRoot, 'artifacts/carbonpulse/dist');
const destDir = path.resolve(repoRoot, 'dist');

console.log(`Detected Repo Root: ${repoRoot}`);
console.log(`Source build directory: ${srcDir}`);
console.log(`Target deploy directory: ${destDir}`);

if (!fs.existsSync(srcDir)) {
  console.error(`Source build directory does not exist: ${srcDir}`);
  process.exit(1);
}

// 3. Copy files recursively
try {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Build assets successfully copied to the root deployment directory.');
} catch (err) {
  console.error('Failed to copy build assets:', err);
  process.exit(1);
}
