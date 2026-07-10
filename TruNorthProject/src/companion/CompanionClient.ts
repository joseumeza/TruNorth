/**
 * Live companion client (spec §11). Calls the serverless proxy — never the
 * model directly, never with credentials. 8 s hard timeout; any failure
 * resolves to an approved fallback line so scene progression never breaks.
 */
import type { CompanionRequest, CompanionResponse, SkillId } from '../types';
import { fallbackLine, globalLine } from '../content/fallbackLines';

export interface CompanionResult extends CompanionResponse {
  companionLines: string[];
}

export interface CompanionClientApi {
  request(req: CompanionRequest & { selSkills: SkillId[] }): Promise<CompanionResult>;
}

const TIMEOUT_MS = 8000;

export class CompanionClient implements CompanionClientApi {
  constructor(private endpoint = '/api/companion') {}

  async request(req: CompanionRequest & { selSkills: SkillId[] }): Promise<CompanionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`companion_http_${res.status}`);
      const data = (await res.json()) as CompanionResult;
      if (!data.companionLine || !data.scoreBand) throw new Error('companion_bad_payload');
      if (!Array.isArray(data.companionLines) || data.companionLines.length === 0) {
        data.companionLines = [data.companionLine];
      }
      return data;
    } catch {
      return this.clientFallback(req);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Network/proxy unreachable: in-character line, never a raw error (spec §6.2). */
  private clientFallback(req: CompanionRequest & { selSkills: SkillId[] }): CompanionResult {
    const band = req.knownBand ?? 'partial';
    const line = req.knownBand
      ? fallbackLine(req.decisionPointId, req.knownBand)
      : globalLine('timeout');
    return {
      scoreBand: band,
      skill: req.selSkills[0],
      matchedCriterion: 'fallback',
      confidence: 1,
      companionLine: line,
      companionLines: [line],
      redirect: false,
      safetyFlag: 'none',
      fallbackReason: 'client_unreachable',
    };
  }
}
