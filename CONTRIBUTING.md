# Contributing

Thanks for helping improve this POS. Please read this guide before opening a
pull request.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## How we work

This repository is a small monorepo of apps that talk to one API:

| App | Path | Role |
| --- | --- | --- |
| API | `backend/` | NestJS service on port 3001 (`/api`) |
| HQ | `web/` | Next.js console on port 3000 |
| Till | `pos/` | Vite terminal on port 1420 |
| Price check | `price-check/` | Vite handheld on port 1430 |

Keep changes focused. Prefer one concern per pull request (for example “till
activation”, not “activation plus receipt layout plus CI”).

## Development setup

You need **Node.js 22** (see `.nvmrc`) and [pnpm](https://pnpm.io).

```bash
cd backend && pnpm install && pnpm dev
cd web && pnpm install && pnpm dev
cd pos && pnpm install && pnpm dev
```

Copy `.env.example` to `backend/.env` when you need local overrides. Do not
commit secrets.

Packaged till and price-check builds: [docs/build](docs/build/README.md).

## Branch and commit style

- Branch from the default branch: `feat/short-name`, `fix/short-name`, or `docs/short-name`
- Write commits in the imperative mood: `Add till heartbeat timeout`, not `Added` or `Adds`
- Keep commits small enough to review

## Pull requests

1. Rebase or merge the default branch so the PR is current.
2. Describe **why** the change exists, not only what files moved.
3. Note how you tested (HQ, till, or API).
4. Do not include credentials, live till codes for production stores, or dumps
   of `backend/data/`.
5. Fill in the pull request template.

Use the issue templates for bugs and features when you can.

## Code notes

- TypeScript throughout. Match the style of the file you are editing.
- Two-space indent, LF line endings (see `.editorconfig`).
- Do not add dependencies without a clear need.
- Till licensing, hardware hex, and HQ till codes are security-sensitive.
  Treat them as such in logs and UI copy.

## Security issues

Report vulnerabilities privately. See [SECURITY.md](SECURITY.md).
