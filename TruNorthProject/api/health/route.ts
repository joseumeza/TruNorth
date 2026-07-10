/** GET /api/health — liveness probe; no PII, no child data. */
interface NodeReq {
  method?: string;
}
interface NodeRes {
  status(code: number): NodeRes;
  json(data: unknown): void;
}

export default function handler(_req: NodeReq, res: NodeRes) {
  res.status(200).json({
    ok: true,
    service: 'trunorth',
    modelConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    ts: Date.now(),
  });
}
