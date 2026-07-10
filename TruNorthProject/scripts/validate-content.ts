/**
 * Content validation CI gate (spec §9.5):
 *  - every scene and decision point validates against its JSON Schema
 *    (including a complete 4-field emotionalArc);
 *  - every assetRef exists in assets-src/manifest.yaml;
 *  - routing targets exist and every chapter scene is reachable from its entry;
 *  - the fallback library covers every decisionPointId × band + timeout;
 *  - demo bundle keys reference real scenes/decision points and validate
 *    against the companion-response schema.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

const ajv = new Ajv({ allErrors: true });
// Wrapped as plain booleans: Ajv's `data is T` guard would narrow docs to `never`
// in the failure branches below.
const sceneValidator = ajv.compile(read('content/schema/scene.schema.json'));
const dpValidator = ajv.compile(read('content/schema/decision-point.schema.json'));
const responseValidator = ajv.compile(read('content/schema/companion-response.schema.json'));
const validateScene = (d: unknown): boolean => sceneValidator(d);
const validateDp = (d: unknown): boolean => dpValidator(d);
const validateResponse = (d: unknown): boolean => responseValidator(d);

let errors = 0;
const fail = (msg: string) => {
  console.error(`✗ ${msg}`);
  errors += 1;
};

// ── Load content ─────────────────────────────────────────────────────────────
const chaptersDir = resolve(root, 'content/chapters');
const chapterIds = readdirSync(chaptersDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

interface SceneDoc { id: string; chapterId: string; background: string; characters: { assetRef: string }[]; fx?: { assetRef: string }[]; collectibles: { assetRef: string }[]; triggers: { action: string; target: string }[]; decisionPoints: string[]; }
interface DpDoc { id: string; themeSensitivity: string; consequences: { band: string; sceneId: string }[]; emotionalArc: Record<string, unknown>; }
interface ChapterDoc { chapterId: string; entrySceneId: string; nextChapterId: string | null; }

const scenes = new Map<string, SceneDoc>();
const dps = new Map<string, DpDoc>();
const chapters = new Map<string, ChapterDoc>();

for (const chapterId of chapterIds) {
  const dir = join(chaptersDir, chapterId);
  const chapter = read(`content/chapters/${chapterId}/chapter.json`) as ChapterDoc;
  chapters.set(chapter.chapterId, chapter);
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.scene.json')) {
      const scene = read(`content/chapters/${chapterId}/${file}`) as SceneDoc;
      if (!validateScene(scene)) fail(`${chapterId}/${file}: ${ajv.errorsText(sceneValidator.errors)}`);
      scenes.set(scene.id, scene);
    }
    if (file === 'decision-points.json') {
      const docs = read(`content/chapters/${chapterId}/${file}`) as Record<string, DpDoc>;
      for (const dp of Object.values(docs)) {
        if (!validateDp(dp)) fail(`${chapterId}/${file} → ${dp.id}: ${ajv.errorsText(dpValidator.errors)}`);
        dps.set(dp.id, dp);
      }
    }
  }
}

// ── Asset refs exist in the manifest ─────────────────────────────────────────
const manifest = parse(readFileSync(resolve(root, 'assets-src/manifest.yaml'), 'utf-8')) as Record<string, Record<string, unknown>>;
const knownRefs = new Set<string>();
for (const section of ['characters', 'backgrounds', 'fx', 'ui', 'collectibles']) {
  for (const ref of Object.keys(manifest[section] ?? {})) knownRefs.add(ref);
}
for (const scene of scenes.values()) {
  const refs = [
    scene.background,
    ...scene.characters.map((c) => c.assetRef),
    ...(scene.fx ?? []).map((f) => f.assetRef),
    ...scene.collectibles.map((c) => c.assetRef),
  ];
  for (const ref of refs) {
    if (!knownRefs.has(ref)) fail(`scene ${scene.id}: assetRef "${ref}" not in assets-src/manifest.yaml`);
  }
}

// ── Routing integrity + reachability ─────────────────────────────────────────
for (const scene of scenes.values()) {
  for (const trigger of scene.triggers) {
    if (trigger.action === 'goToScene' && !scenes.has(trigger.target)) {
      fail(`scene ${scene.id}: trigger targets unknown scene "${trigger.target}"`);
    }
    if (trigger.action === 'startDecision' && !dps.has(trigger.target)) {
      fail(`scene ${scene.id}: trigger targets unknown decision point "${trigger.target}"`);
    }
    if (trigger.action === 'completeChapter' && !chapters.has(trigger.target)) {
      fail(`scene ${scene.id}: completeChapter targets unknown chapter "${trigger.target}"`);
    }
  }
  for (const dpId of scene.decisionPoints) {
    if (!dps.has(dpId)) fail(`scene ${scene.id}: lists unknown decision point "${dpId}"`);
  }
}
for (const dp of dps.values()) {
  for (const consequence of dp.consequences) {
    if (!scenes.has(consequence.sceneId)) fail(`decision ${dp.id}: consequence routes to unknown scene "${consequence.sceneId}"`);
  }
}

for (const chapter of chapters.values()) {
  if (chapter.nextChapterId && !chapters.has(chapter.nextChapterId)) {
    fail(`chapter ${chapter.chapterId}: nextChapterId "${chapter.nextChapterId}" unknown`);
  }
  const reachable = new Set<string>();
  const queue = [chapter.entrySceneId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const scene = scenes.get(id);
    if (!scene) {
      fail(`chapter ${chapter.chapterId}: routes to unknown scene "${id}"`);
      continue;
    }
    for (const trigger of scene.triggers) {
      if (trigger.action === 'goToScene') queue.push(trigger.target);
      if (trigger.action === 'startDecision') {
        for (const consequence of dps.get(trigger.target)?.consequences ?? []) queue.push(consequence.sceneId);
      }
    }
  }
  for (const scene of scenes.values()) {
    if (scene.chapterId === chapter.chapterId && !reachable.has(scene.id)) {
      fail(`chapter ${chapter.chapterId}: scene "${scene.id}" is unreachable from entry "${chapter.entrySceneId}"`);
    }
  }
}

// ── Fallback coverage: every dp × band + timeout (spec §11.3 layer 5) ────────
const fallbacks = read('content/fallbacks/companion-fallbacks.json') as {
  global: Record<string, string>;
  decisionPoints: Record<string, Record<string, string>>;
};
for (const key of ['timeout', 'safety_redirect', 'distress', 'model_unavailable', 'resume', 'error']) {
  if (!fallbacks.global[key]) fail(`fallback library: missing global "${key}" line`);
}
for (const dpId of dps.keys()) {
  for (const band of ['strong', 'partial', 'poor', 'timeout']) {
    if (!fallbacks.decisionPoints[dpId]?.[band]) fail(`fallback library: missing ${dpId} × ${band}`);
  }
}

// ── Demo bundle keys + response contract (spec §15.3) ────────────────────────
const bundle = read('content/demo/showcase.bundle.json') as { responses: Record<string, unknown> };
for (const [key, response] of Object.entries(bundle.responses)) {
  const [sceneId, dpId, band] = key.split(':');
  if (!scenes.has(sceneId)) fail(`demo bundle key "${key}": unknown scene`);
  if (!dps.has(dpId)) fail(`demo bundle key "${key}": unknown decision point`);
  if (!['strong', 'partial', 'poor'].includes(band)) fail(`demo bundle key "${key}": bad band`);
  if (!validateResponse(response)) fail(`demo bundle "${key}": ${ajv.errorsText(responseValidator.errors)}`);
}
// Golden-path decision points must have all three bands canned.
for (const scene of scenes.values()) {
  for (const dpId of scene.decisionPoints) {
    for (const band of ['strong', 'partial', 'poor']) {
      if (!bundle.responses[`${scene.id}:${dpId}:${band}`]) {
        fail(`demo bundle: missing ${scene.id}:${dpId}:${band}`);
      }
    }
  }
}

if (errors > 0) {
  console.error(`\nContent validation FAILED with ${errors} error(s).`);
  process.exit(1);
}
console.log(
  `✓ Content valid: ${chapters.size} chapters, ${scenes.size} scenes, ${dps.size} decision points, fallback + demo coverage complete.`,
);
