/**
 * App entry point: boots the viewport, loads the asset manifest, restores or
 * creates a save, runs onboarding when needed, and starts the rAF game loop.
 * Demo mode (spec §15): `?demo=1` or VITE_DEMO_MODE=true → offline canned
 * companion, in-memory store, no analytics, visible demo pill.
 */
import './styles.css';
import type { AssetManifest, GameState } from './types';
import { ContentLibrary } from './content/ContentLibrary';
import { Viewport } from './render/Viewport';
import { SceneRenderer } from './render/SceneRenderer';
import { BubbleManager } from './render/BubbleManager';
import { ParticleSystem } from './render/ParticleSystem';
import { MeterHUD } from './ui/MeterHUD';
import { ChoicePanel } from './ui/ChoicePanel';
import { ParentGate } from './ui/ParentGate';
import { TrustScreen } from './ui/TrustScreen';
import { OnboardingFlow } from './ui/OnboardingFlow';
import { Overlays } from './ui/Overlays';
import { AudioManager } from './audio/AudioManager';
import { InputController } from './input/InputController';
import { LocalProgressStore } from './store/LocalProgressStore';
import { DemoProgressStore } from './store/DemoProgressStore';
import { createInitialState } from './store/GameStateFactory';
import { CompanionClient } from './companion/CompanionClient';
import { DemoCompanionClient } from './companion/DemoCompanionClient';
import { OutputSanitizer } from './safety/OutputSanitizer';
import { SceneEngine } from './engine/SceneEngine';

// Demo-mode activation (spec §15.1).
const demoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' || new URLSearchParams(location.search).has('demo');

async function loadManifest(): Promise<AssetManifest> {
  const res = await fetch('/assets/manifest.json');
  if (!res.ok) throw new Error('asset manifest missing — run `npm run build:manifest`');
  return (await res.json()) as AssetManifest;
}

async function boot(): Promise<void> {
  const app = document.getElementById('app')!;
  const manifest = await loadManifest();

  const content = new ContentLibrary();
  const viewport = new Viewport(app);
  const renderer = new SceneRenderer(viewport, manifest);
  const bubbles = new BubbleManager(viewport);
  const particles = new ParticleSystem(viewport);
  const audio = new AudioManager();
  const hud = new MeterHUD(viewport, () => audio.toggleMuted());
  const choicePanel = new ChoicePanel(viewport);
  const trustScreen = new TrustScreen(viewport);
  const parentGate = new ParentGate(viewport, () => trustScreen.show());
  const overlays = new Overlays(viewport);
  const input = new InputController();
  input.attach();

  const store = demoMode ? new DemoProgressStore() : new LocalProgressStore();
  const companion = demoMode ? new DemoCompanionClient() : new CompanionClient();
  const sanitizer = new OutputSanitizer();

  let state: GameState | null = await store.load();
  let resume = state !== null;

  if (!state) {
    if (demoMode) {
      // Showcase skips onboarding and jumps straight to the golden-path chapter (spec §15).
      state = createInitialState(
        {
          ageBand: '8-10',
          chapterId: 'ch2',
          avatar: { skinTone: 'tone_2', hair: 'hair_short' },
          companionName: 'Pip',
          companionArchetype: 'companion_fox',
          baselineStrength: 'worry_brave',
          demoMode: true,
        },
        content.getChapter('ch2').entrySceneId,
      );
    } else {
      const onboarding = new OnboardingFlow(viewport, trustScreen, content.firstChapterId());
      const profile = await onboarding.run();
      state = createInitialState(profile, content.getChapter(profile.chapterId).entrySceneId);
    }
    await store.save(state);
    resume = false;
  }

  const engine = new SceneEngine({
    content,
    viewport,
    renderer,
    bubbles,
    particles,
    hud,
    choicePanel,
    parentGate,
    overlays,
    audio,
    input,
    store,
    companion,
    sanitizer,
  });

  await engine.start(state, resume);

  // Main game loop (spec §5.2).
  let last = performance.now();
  function gameLoop(now: number): void {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    engine.update(delta);
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
}

void boot();
