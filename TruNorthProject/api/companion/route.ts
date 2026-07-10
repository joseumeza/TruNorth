/**
 * POST /api/companion — serverless companion proxy (spec §11).
 * Holds the Anthropic credentials server-side; the browser never sees them.
 * Vercel Functions Node runtime (ADR-002).
 */
import { runCompanionPipeline } from '../_lib/pipeline';

interface NodeReq {
  method?: string;
  body?: unknown;
}
interface NodeRes {
  status(code: number): NodeRes;
  setHeader(name: string, value: string): void;
  json(data: unknown): void;
  end(data?: string): void;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const result = await runCompanionPipeline(req.body, {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      COMPANION_MODEL: process.env.COMPANION_MODEL,
      CONFIDENCE_FLOOR: process.env.CONFIDENCE_FLOOR,
    });
    res.status(200).json(result);
  } catch {
    // Never surface a raw server error to the child (spec §6.2 system.error).
    res.status(200).json({
      scoreBand: 'partial',
      skill: 'worry_brave',
      matchedCriterion: 'fallback',
      confidence: 0,
      companionLine: 'Whoops, a little hiccup on my end — not yours! Let’s try that again together.',
      companionLines: ['Whoops, a little hiccup on my end — not yours! Let’s try that again together.'],
      redirect: false,
      safetyFlag: 'none',
      fallbackReason: 'server_error',
    });
  }
}
