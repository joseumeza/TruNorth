/**
 * DemoCompanionClient — offline showcase companion (spec §15.2).
 * Zero network: reads frozen canned responses from showcase.bundle.json keyed
 * `{sceneId}:{decisionPointId}:{band}`. Typed input is scored with the local
 * rubric heuristic. Distress/safety phrases still get the authored safe lines.
 */
import bundleData from '../../content/demo/showcase.bundle.json';
import type { CompanionRequest, CompanionResponse, SkillId } from '../types';
import type { CompanionClientApi, CompanionResult } from './CompanionClient';
import { fallbackLine, globalLine } from '../content/fallbackLines';
import { scoreTypedInput } from './typedRubric';

const DISTRESS_PATTERNS: RegExp[] = [
  /\b(hurt|kill) myself\b/i,
  /\bwant to (die|disappear|not exist)\b/i,
  /\bsuicide|self[- ]harm|cutting myself\b/i,
  /\b(hits|hurts) me at home\b/i,
  /\bnobody (loves|wants) me\b/i,
];

interface Bundle {
  responses: Record<string, CompanionResponse>;
}

export class DemoCompanionClient implements CompanionClientApi {
  private bundle: Bundle = bundleData as unknown as Bundle;

  async request(req: CompanionRequest & { selSkills: SkillId[] }): Promise<CompanionResult> {
    // Distress protocol applies even offline.
    if (DISTRESS_PATTERNS.some((re) => re.test(req.childInput))) {
      const line = globalLine('distress');
      return {
        scoreBand: 'partial',
        skill: req.selSkills[0],
        matchedCriterion: 'distress_protocol',
        confidence: 1,
        companionLine: line,
        companionLines: [line],
        redirect: true,
        safetyFlag: 'distress',
      };
    }

    const band = req.knownBand ?? scoreTypedInput(req.childInput).band;
    const key = `${req.sceneId}:${req.decisionPointId}:${band}`;
    const canned = this.bundle.responses[key];
    if (canned) {
      return { ...canned, companionLines: [canned.companionLine] };
    }
    const line = fallbackLine(req.decisionPointId, band);
    return {
      scoreBand: band,
      skill: req.selSkills[0],
      matchedCriterion: 'demo_fallback',
      confidence: 1,
      companionLine: line,
      companionLines: [line],
      redirect: false,
      safetyFlag: 'none',
      fallbackReason: 'demo_bundle_miss',
    };
  }
}
