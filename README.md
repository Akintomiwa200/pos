# POS

Point of sale for supermarket, hotel, and restaurant operations: a till, an HQ
console, a shared API, and a price-check app.

## Apps

| App | Directory | Dev URL | Stack |
| --- | --- | --- | --- |
| API | [`backend/`](backend/) | http://localhost:3001/api | NestJS |
| HQ console | [`web/`](web/) | http://localhost:3000 | Next.js |
| Till | [`pos/`](pos/) | http://localhost:1420 | Vite + React |
| Price check | [`price-check/`](price-check/) | http://localhost:1430 | Vite + React |

The till and HQ proxy `/api` to the backend. A till must be activated with a
code issued in HQ (**Setup → Others → Till**) before the first sign-in. The
licence lasts one year from activation.

## Requirements

- Node.js 22 ([`.nvmrc`](.nvmrc))
- [pnpm](https://pnpm.io)

## Quick start

```bash
cd backend
pnpm install
pnpm dev
```

In two more terminals:

```bash
cd web && pnpm install && pnpm dev
cd pos && pnpm install && pnpm dev
```

Optional local API settings: copy [`.env.example`](.env.example) to
`backend/.env`. Runtime files under `backend/data/` are local only and are not
committed.

## Documentation

- [Build EXE, APK, and Windows services](docs/build/README.md)
- [GitHub Releases](docs/build/github-releases.md)
- [Contributing](CONTRIBUTING.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE.md)

## License

This project is licensed under the [MIT License](LICENSE.md).
