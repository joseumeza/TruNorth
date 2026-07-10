/**
 * SceneEngine — orchestrates load → explore → encounter → decide →
 * consequence → route (spec §5.1, §5.3). Owns the canonical GameState and
 * persists it through ProgressStore on every decision resolution (spec §10.4).
 */
import type {
  ChapterConfig,
  DecisionPoint,
  GameState,
  ProgressStore,
  Scene,
  SceneCollectible,
  SceneTrigger,
  SkillId,
} from '../types';
import { expressionForBand } from '../types';
import type { ContentLibrary } from '../content/ContentLibrary';
import { SceneGraph } from './SceneGraph';
import { MovementController } from './MovementController';
import { TileMap } from './TileMap';
import { aabbOverlap, avatarBox, boundsToBox, collectibleBox } from './CollisionSystem';
import { applyMeterDeltas, appendDecisionEvent, resolveConsequence } from './DecisionResolver';
import { getResidue, residueExpression, setResidue } from './EmotionalResidue';
import type { SceneRenderer } from '../render/SceneRenderer';
import type { Viewport } from '../render/Viewport';
import type { BubbleManager } from '../render/BubbleManager';
import type { ParticleSystem } from '../render/ParticleSystem';
import type { MeterHUD } from '../ui/MeterHUD';
import type { ChoicePanel, ChoiceResult } from '../ui/ChoicePanel';
import type { ParentGate } from '../ui/ParentGate';
import type { Overlays } from '../ui/Overlays';
import type { AudioManager } from '../audio/AudioManager';
import type { InputController } from '../input/InputController';
import type { CompanionClientApi } from '../companion/CompanionClient';
import type { OutputSanitizer } from '../safety/OutputSanitizer';
import { globalLine } from '../content/fallbackLines';

type Phase =
  | 'loading'
  | 'exploring'
  | 'encounter'
  | 'decision'
  | 'awaiting_companion'
  | 'consequence'
  | 'transitioning'
  | 'climb'
  | 'chapter_end';

export interface EngineDeps {
  content: ContentLibrary;
  viewport: Viewport;
  renderer: SceneRenderer;
  bubbles: BubbleManager;
  particles: ParticleSystem;
  hud: MeterHUD;
  choicePanel: ChoicePanel;
  parentGate: ParentGate;
  overlays: Overlays;
  audio: AudioManager;
  input: InputController;
  store: ProgressStore;
  companion: CompanionClientApi;
  sanitizer: OutputSanitizer;
}

export class SceneEngine {
  readonly graph: SceneGraph;
  readonly movement = new MovementController();
  phase: Phase = 'loading';
  state!: GameState;
  scene!: Scene;
  chapter!: ChapterConfig;

  private paused = false;
  private disarmedTriggers = new Set<string>();
  private triggerZoneEls: HTMLElement[] = [];
  private removeBanner: (() => void) | null = null;

  constructor(private deps: EngineDeps) {
    this.graph = new SceneGraph(deps.content);
    deps.input.onPause = () => void this.togglePause();
  }

  async start(state: GameState, resume: boolean): Promise<void> {
    this.state = state;
    this.chapter = this.deps.content.getChapter(state.profile.chapterId);
    this.deps.renderer.mountAvatar(state.profile.avatar);
    this.deps.hud.mount(state, this.chapter.visibleMeters);
    await this.loadScene(state.progress.currentSceneId);
    if (resume) {
      // In-character re-entry (spec §6.2 system.resume).
      await this.deps.bubbles.showBubble(this.companionAnchor(), [globalLine('resume')], {
        speaker: this.state.profile.companionName,
      });
    }
  }

  /** Called every animation frame; delta in seconds. */
  update(delta: number): void {
    if (this.paused || this.phase !== 'exploring') return;
    if (this.scene.movementTier === 'B' && !this.deps.input.isFrozen) {
      this.movement.update(delta, this.deps.input.keys);
      this.deps.renderer.setAvatarPosition(this.movement.x, this.movement.y, this.movement.facing, this.movement.moving);
      this.checkCollisions();
    }
  }

  // ── Scene lifecycle ─────────────────────────────────────────────────────────

  private async loadScene(sceneId: string, opts: { narration?: boolean } = {}): Promise<void> {
    this.phase = 'loading';
    this.deps.input.freeze();
    this.clearTriggerZones();
    this.scene = this.graph.getScene(sceneId);
    this.chapter = this.deps.content.getChapter(this.scene.chapterId);
    this.state.progress.currentSceneId = sceneId;
    this.disarmedTriggers.clear();

    const residueExpr = new Map<string, string>();
    for (const character of this.scene.characters) {
      if (character.expression) continue;
      const expr = residueExpression(getResidue(this.state, this.scene.chapterId, character.id));
      if (expr) residueExpr.set(character.id, expr);
    }

    this.deps.renderer.renderScene(this.scene, {
      collected: new Set(this.state.progress.kindnessSparksFound[this.scene.chapterId] ?? []),
      residueExpr,
    });
    this.applySparkGates();

    this.movement.setTileMap(this.scene.tileMap ? new TileMap(this.scene.tileMap) : TileMap.openRoom());
    const [ax, ay] = this.scene.avatarStart ?? [300, 840];
    this.movement.setPosition(ax, ay);
    this.deps.renderer.setAvatarPosition(ax, ay, 'down', false);

    this.state.eventLog.push({ ts: Date.now(), type: 'scene_enter', sceneId });
    await this.deps.store.save(this.state);

    if (opts.narration !== false && this.scene.narration) {
      await this.deps.bubbles.showNarration(this.scene.narration);
    }

    if (this.scene.movementTier === 'A') {
      this.mountTriggerZones();
      this.mountClickableCollectibles();
    }

    if (this.scene.climb) {
      await this.runClimb();
      return;
    }

    this.phase = 'exploring';
    this.deps.input.release();
  }

  private async transitionTo(sceneId: string): Promise<void> {
    this.phase = 'transitioning';
    await this.deps.store.save(this.state);
    await this.loadScene(sceneId);
  }

  // ── Tier A (click) & Tier B (collision) interactions ───────────────────────

  private mountTriggerZones(): void {
    for (const trigger of this.scene.triggers) {
      const zone = document.createElement('button');
      zone.className = 'trigger-zone';
      zone.style.left = `${trigger.bounds[0]}px`;
      zone.style.top = `${trigger.bounds[1]}px`;
      zone.style.width = `${trigger.bounds[2]}px`;
      zone.style.height = `${trigger.bounds[3]}px`;
      zone.setAttribute(
        'aria-label',
        trigger.action === 'startDecision' ? 'Talk' : trigger.action === 'goToScene' ? 'Go this way' : 'Finish the chapter',
      );
      zone.addEventListener('click', () => void this.fireTrigger(trigger));
      this.deps.viewport.layers.overlay.appendChild(zone);
      this.triggerZoneEls.push(zone);
    }
  }

  private mountClickableCollectibles(): void {
    for (const collectible of this.scene.collectibles) {
      const el = document.querySelector<HTMLElement>(`[data-collectible-id="${collectible.id}"]`);
      if (!el) continue;
      el.classList.add('clickable');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Pick up the kindness spark');
      el.addEventListener('click', () => void this.collect(collectible), { once: true });
    }
  }

  private clearTriggerZones(): void {
    for (const el of this.triggerZoneEls) el.remove();
    this.triggerZoneEls = [];
  }

  private checkCollisions(): void {
    const box = avatarBox(this.movement.x, this.movement.y);
    for (const trigger of this.scene.triggers) {
      if (this.disarmedTriggers.has(trigger.id)) continue;
      if (aabbOverlap(box, boundsToBox(trigger.bounds))) {
        void this.fireTrigger(trigger);
        return;
      }
    }
    const collected = new Set(this.state.progress.kindnessSparksFound[this.scene.chapterId] ?? []);
    for (const collectible of this.scene.collectibles) {
      if (collected.has(collectible.id)) continue;
      if (this.isGateHidden(collectible)) continue;
      if (aabbOverlap(box, collectibleBox(collectible.position))) {
        void this.collect(collectible);
      }
    }
  }

  private async fireTrigger(trigger: SceneTrigger): Promise<void> {
    if (this.phase !== 'exploring') return;
    this.disarmedTriggers.add(trigger.id);
    if (trigger.action === 'startDecision') {
      this.removeBanner?.();
      this.removeBanner = null;
      await this.runDecision(this.deps.content.getDecisionPoint(trigger.target));
    } else if (trigger.action === 'goToScene') {
      await this.transitionTo(trigger.target);
    } else {
      await this.completeChapter();
    }
  }

  // ── Collectibles ────────────────────────────────────────────────────────────

  private isGateHidden(collectible: SceneCollectible): boolean {
    if (collectible.gate !== 'strong_path') return false;
    return !this.state.eventLog.some((e) => e.type === 'decision_resolved' && e.band === 'strong');
  }

  private async collect(collectible: SceneCollectible): Promise<void> {
    const chapterId = this.scene.chapterId;
    const found = this.state.progress.kindnessSparksFound[chapterId] ?? [];
    if (found.includes(collectible.id)) return;
    found.push(collectible.id);
    this.state.progress.kindnessSparksFound[chapterId] = found;
    this.state.progress.browniePoints += 1;
    this.state.eventLog.push({ ts: Date.now(), type: 'collectible_found', sceneId: this.scene.id });
    this.deps.renderer.removeCollectible(collectible.id);
    this.deps.audio.play('pickup');
    this.deps.hud.update(this.state);
    await this.deps.store.save(this.state);
  }

  private applySparkGates(): void {
    for (const collectible of this.scene.collectibles) {
      if (this.isGateHidden(collectible)) this.deps.renderer.removeCollectible(collectible.id);
    }
  }

  // ── Decision flow (spec §5.3 Decision → AwaitingCompanion → Consequence) ──

  private async runDecision(dp: DecisionPoint): Promise<void> {
    this.phase = 'decision';
    this.deps.input.freeze(); // §5.4: unmap movement during the decision + fetch

    const result: ChoiceResult = await this.deps.choicePanel.show(dp, this.state.profile.ageBand);

    this.phase = 'awaiting_companion';
    this.deps.audio.play('bloop');
    const stopThinking = this.deps.bubbles.showThinking(this.companionAnchor(), this.state.profile.companionName);

    const response = await this.deps.companion.request({
      decisionPointId: dp.id,
      sceneId: this.scene.id,
      chapterId: this.scene.chapterId,
      ageBand: this.state.profile.ageBand,
      inputMode: result.kind,
      childInput: result.kind === 'choice' ? result.option.label : result.text,
      knownBand: result.kind === 'choice' ? result.option.selScore : undefined,
      companionContext: dp.companionContext,
      strengthsSnapshot: [this.state.profile.baselineStrength],
      companion: { name: this.state.profile.companionName, archetype: this.state.profile.companionArchetype },
      selSkills: dp.selSkills,
    });
    stopThinking();

    if (response.fallbackReason) {
      this.state.eventLog.push({ ts: Date.now(), type: 'fallback_used', sceneId: this.scene.id, decisionPointId: dp.id });
    }

    const lines = this.deps.sanitizer.sanitizeAll(response.companionLines ?? [response.companionLine]);

    // Safety redirects re-open the decision after the companion speaks (spec §11.1).
    if (response.safetyFlag !== 'none') {
      this.state.flags.lastSafetyFlag = response.safetyFlag;
      this.state.eventLog.push({ ts: Date.now(), type: 'safety_flag', sceneId: this.scene.id, decisionPointId: dp.id, safetyFlag: response.safetyFlag });
      await this.deps.store.save(this.state);
      await this.deps.bubbles.showBubble(this.companionAnchor(), lines, { speaker: this.state.profile.companionName });
      if (response.safetyFlag === 'distress') {
        await this.deps.overlays.distressSupport();
      }
      await this.runDecision(dp);
      return;
    }

    // ── Consequence ────────────────────────────────────────────────────────────
    this.phase = 'consequence';
    const band = response.scoreBand;
    const consequence = resolveConsequence(dp, band);

    this.deps.renderer.setExpression('companion', expressionForBand(band, dp.themeSensitivity));
    this.applyConsequenceFx(consequence.fx);

    if (band === 'strong') this.deps.audio.play('harp');
    if (band === 'poor') this.deps.audio.play('thud');

    // Meter juice: particles along a Bézier into the meter, then fill (spec §10.3).
    const changes = applyMeterDeltas(this.state, consequence.meterDeltas);
    for (const change of changes) {
      if (change.delta > 0) {
        await this.deps.particles.burst(this.companionAnchor(), this.deps.hud.meterAnchor(change.skill));
        this.deps.hud.pulse(change.skill);
      }
    }
    this.deps.hud.update(this.state);

    appendDecisionEvent(this.state, this.scene.id, dp, band, consequence.meterDeltas);
    setResidue(this.state, this.scene.chapterId, consequence.residue);
    await this.deps.store.save(this.state); // immediate auto-save (spec §10.4)

    await this.deps.bubbles.showBubble(this.companionAnchor(), lines, { speaker: this.state.profile.companionName });

    // ── Repair actions: a performed gesture, not a bare re-click (spec §9.6) ──
    if (consequence.repairAction) {
      if (consequence.repairAction === 'walk-back') {
        // Re-arm the trigger; walking back re-opens the decision.
        this.phase = 'exploring';
        this.deps.input.release();
        this.disarmedTriggers.clear();
        this.removeBanner = this.deps.overlays.banner('Walk back over and try a gentler way.');
        if (this.scene.movementTier === 'A') this.mountTriggerZones();
        return;
      }
      await this.deps.overlays.repairGesture(consequence.repairAction);
      this.state.eventLog.push({ ts: Date.now(), type: 'repair_completed', sceneId: this.scene.id, decisionPointId: dp.id });
      await this.deps.store.save(this.state);
      await this.runDecision(dp);
      return;
    }

    const next = this.graph.nextSceneId(this.scene.id, consequence);
    if (next) {
      await this.transitionTo(next);
    } else {
      this.phase = 'exploring';
      this.deps.input.release();
    }
  }

  private applyConsequenceFx(fx: string[] | undefined): void {
    for (const effect of fx ?? []) {
      switch (effect) {
        case 'worry_cloud_shrink':
          this.deps.renderer.setFxVariant('worry_cloud', 'small');
          break;
        case 'worry_cloud_soften':
          this.deps.renderer.setFxVariant('worry_cloud', 'medium');
          break;
        case 'worry_cloud_darken':
          this.deps.renderer.setFxVariant('worry_cloud', 'big');
          break;
        case 'world_bloom':
          this.deps.viewport.stage.classList.add('world-bloom');
          setTimeout(() => this.deps.viewport.stage.classList.remove('world-bloom'), 1600);
          break;
        case 'soft_dim':
          this.deps.viewport.stage.classList.add('soft-dim');
          setTimeout(() => this.deps.viewport.stage.classList.remove('soft-dim'), 1200);
          break;
      }
    }
  }

  // ── W4 participatory climb (spec §22 Phase 2) ──────────────────────────────

  private async runClimb(): Promise<void> {
    const climb = this.scene.climb!;
    this.phase = 'climb';
    const overlay = document.createElement('div');
    overlay.className = 'climb-panel';
    const prompt = document.createElement('p');
    prompt.textContent = climb.prompt;
    overlay.appendChild(prompt);
    const btn = document.createElement('button');
    btn.className = 'primary-button climb-button';
    overlay.appendChild(btn);
    this.deps.viewport.layers.overlay.appendChild(overlay);

    let done = 0;
    const startY = this.movement.y;
    this.deps.renderer.setAvatarClimbing(true);
    await new Promise<void>((resolve) => {
      const label = () => (btn.textContent = `${climb.tapLabel} (${done}/${climb.taps})`);
      label();
      btn.addEventListener('click', () => {
        done += 1;
        this.deps.audio.play('pickup');
        // Avatar visibly climbs with each tap, facing away toward the rungs.
        const y = startY - done * 90;
        this.deps.renderer.setAvatarPosition(this.movement.x, y, 'up', true);
        label();
        if (done >= climb.taps) {
          btn.disabled = true;
          setTimeout(resolve, 400);
        }
      });
      btn.focus();
    });
    this.deps.renderer.setAvatarClimbing(false);
    overlay.remove();
    await this.completeChapter();
  }

  // ── Chapter completion → celebration → parent gate → next chapter ─────────

  private async completeChapter(): Promise<void> {
    this.phase = 'chapter_end';
    this.deps.input.freeze();
    const chapterId = this.chapter.chapterId;
    if (!this.state.progress.chaptersCompleted.includes(chapterId)) {
      this.state.progress.chaptersCompleted.push(chapterId);
    }
    this.state.eventLog.push({ ts: Date.now(), type: 'chapter_complete', sceneId: this.scene.id });
    await this.deps.store.save(this.state);

    const grown = this.chapter.visibleMeters.filter((skill: SkillId) => {
      const meter = this.state.meters[skill];
      return meter.level > 0 || meter.fill > 0;
    });
    const sparks = (this.state.progress.kindnessSparksFound[chapterId] ?? []).length;
    this.deps.audio.play('celebration');
    await this.deps.overlays.celebration(this.chapter.title, grown, sparks);

    const nextChapterId = this.chapter.nextChapterId;
    if (nextChapterId) {
      // Parent gate between chapters (spec §13.1).
      await this.deps.parentGate.show(this.state.parentGate.pinHash);
      this.state.parentGate.lastPassedChapter = chapterId;
      const next = this.deps.content.getChapter(nextChapterId);
      this.state.profile.chapterId = nextChapterId;
      this.state.profile.ageBand = next.ageBand; // content band drives UI tokens
      if (!this.state.progress.chaptersUnlocked.includes(nextChapterId)) {
        this.state.progress.chaptersUnlocked.push(nextChapterId);
      }
      this.chapter = next;
      this.deps.hud.mount(this.state, next.visibleMeters);
      await this.deps.store.save(this.state);
      await this.loadScene(next.entrySceneId);
    } else {
      await this.finale();
    }
  }

  private async finale(): Promise<void> {
    const remove = this.deps.overlays.banner('The End — more adventures are on the way! ✨');
    await new Promise((r) => setTimeout(r, 60)); // let the banner paint before idle
    this.phase = 'exploring';
    this.deps.input.release();
    void remove; // banner stays as the closing surface
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private companionAnchor(): { x: number; y: number } {
    const companion = this.scene.characters.find((c) => c.id === 'companion');
    if (companion) return this.deps.renderer.bubbleAnchorFor('companion', this.scene);
    return this.deps.renderer.avatarAnchor(this.movement.x, this.movement.y);
  }

  private async togglePause(): Promise<void> {
    if (this.paused || this.phase !== 'exploring') return;
    this.paused = true;
    this.deps.input.freeze();
    await this.deps.overlays.pause(this.state.flags.demoMode ? null : async () => this.deps.store.clear());
    this.paused = false;
    this.deps.input.release();
  }
}
