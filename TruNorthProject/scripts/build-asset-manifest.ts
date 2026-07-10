/**
 * Builds public/assets/manifest.json from assets-src/manifest.yaml (spec §7.4)
 * and validates that every referenced file actually exists under public/assets/.
 * Fails the build on any missing file.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = resolve(root, 'assets-src/manifest.yaml');
const outPath = resolve(root, 'public/assets/manifest.json');

interface Entry {
  file: string;
  [key: string]: unknown;
}
type Section = Record<string, Entry>;
interface SourceManifest {
  version: string;
  styleGuide?: string;
  characters?: Section;
  backgrounds?: Section;
  fx?: Section;
  ui?: Section;
  collectibles?: Section;
}

const manifest = parse(readFileSync(srcPath, 'utf-8')) as SourceManifest;
const sections = ['characters', 'backgrounds', 'fx', 'ui', 'collectibles'] as const;

let errors = 0;
let count = 0;
for (const section of sections) {
  for (const [ref, entry] of Object.entries(manifest[section] ?? {})) {
    count += 1;
    const filePath = resolve(root, 'public/assets', entry.file);
    if (!existsSync(filePath)) {
      console.error(`✗ ${section}/${ref}: missing file public/assets/${entry.file}`);
      errors += 1;
    }
  }
}

if (errors > 0) {
  console.error(`\nAsset manifest build FAILED: ${errors} missing file(s).`);
  process.exit(1);
}

const output = {
  version: manifest.version,
  characters: manifest.characters ?? {},
  backgrounds: manifest.backgrounds ?? {},
  fx: manifest.fx ?? {},
  ui: manifest.ui ?? {},
  collectibles: manifest.collectibles ?? {},
};
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✓ public/assets/manifest.json written (${count} assets, all files present).`);
