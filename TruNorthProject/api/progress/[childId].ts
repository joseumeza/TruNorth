/**
 * [EXT] GET/PUT /api/progress/:childId — remote progress sync (spec §12.3).
 * Not part of the MVP: requires parent authentication, Postgres with RLS, and
 * counsel-approved data retention (ADR-003, ADR-006) before any implementation.
 */
interface NodeReq {
  method?: string;
}
interface NodeRes {
  status(code: number): NodeRes;
  json(data: unknown): void;
}

export default function handler(_req: NodeReq, res: NodeRes) {
  res.status(501).json({
    error: 'not_implemented',
    detail: 'RemoteProgressStore is an EXT feature gated on parent auth + counsel review (spec §12.3, §16.3).',
  });
}
