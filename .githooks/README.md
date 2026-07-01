# Shared git hooks

These hooks help keep [`product.md`](../product.md) in sync with the code.

## Enable (once per clone)

```bash
git config core.hooksPath .githooks
```

That points git at this directory instead of `.git/hooks/`. Because it lives in the repo,
every teammate gets the same hooks — but each person must run the command above once
(git does not auto-enable hooks, by design, for security).

## Hooks

- **`pre-push`** — warns (never blocks) when a push changes implementation under
  `TruNorthProject/` without updating `product.md` or `TruNorthContextFiles/`.

## Notes

- Hooks are a **local, early reminder**. The authoritative backstop is the GitHub Action
  `.github/workflows/product-md-sync.yml`, which runs on every PR regardless of local setup.
- To temporarily bypass: `git push --no-verify`.
