import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Dev-only middleware that serves the same companion pipeline used by the
 * Vercel functions in api/, so `npm run dev` exercises live mode locally.
 * Production deploys use api/companion/route.ts on the serverless host.
 */
function apiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'trunorth-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true, service: 'trunorth', env: 'dev' }));
      });
      server.middlewares.use('/api/companion', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method_not_allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          res.setHeader('content-type', 'application/json');
          try {
            const { runCompanionPipeline } = await import('./api/_lib/pipeline');
            const result = await runCompanionPipeline(JSON.parse(body), {
              ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
              COMPANION_MODEL: env.COMPANION_MODEL,
              CONFIDENCE_FLOOR: env.CONFIDENCE_FLOOR,
            });
            res.end(JSON.stringify(result));
          } catch {
            // Never leak a raw server error to the child surface (spec §6.2 system.error).
            res.end(
              JSON.stringify({
                scoreBand: 'partial',
                skill: 'worry_brave',
                matchedCriterion: 'fallback',
                confidence: 0,
                companionLine: 'Hmm, my thoughts got a little tangled. Let’s try that together again.',
                redirect: false,
                safetyFlag: 'none',
                fallbackReason: 'server_error',
              }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;
  return {
    plugins: [apiDevPlugin(env)],
    build: {
      target: 'es2022',
      sourcemap: false,
    },
    test: {
      environment: 'node',
    },
  };
});
