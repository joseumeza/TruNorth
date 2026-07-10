/**
 * Build-artifact size audit (spec §19): showcase bundle target < 15 MB.
 * Warns when over target; fails only if the dist folder is missing.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const BUDGET_BYTES = 15 * 1024 * 1024;

if (!existsSync(dist)) {
  console.error('✗ dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const files: { path: string; size: number }[] = [];
function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) walk(full);
    else files.push({ path: relative(dist, full), size: stats.size });
  }
}
walk(dist);

const total = files.reduce((sum, f) => sum + f.size, 0);
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

console.log(`Bundle total: ${mb(total)} MB across ${files.length} files (budget ${mb(BUDGET_BYTES)} MB).`);
console.log('\nLargest files:');
for (const file of [...files].sort((a, b) => b.size - a.size).slice(0, 10)) {
  console.log(`  ${(file.size / 1024).toFixed(1).padStart(9)} KB  ${file.path}`);
}

if (total > BUDGET_BYTES) {
  console.warn(`\n⚠ Over the 15 MB showcase budget — document an exception or trim assets (spec §19).`);
  process.exitCode = 0; // warn, not block (budget table: "Warn if over")
} else {
  console.log('\n✓ Within the showcase bundle budget.');
}
