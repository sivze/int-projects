# Interview Projects

Shared Next.js workspace for interview and take-home projects.

This repository is intentionally one deployable app. Each assignment gets its own
route and project folder, while shared dependencies, deployment config, and
environment setup stay at the repo root.

## Projects

| Project | Route | Docs |
| --- | --- | --- |
| Uplane Image Transform | `/uplane` | [`projects/uplane/README.md`](projects/uplane/README.md) |

## Local Development

Install and run from the repository root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/uplane
```

The root route redirects to the active project route.

## Environment

Create `.env.local` at the repository root. Do not commit it.

Required for the Uplane project:

```text
NEXT_PUBLIC_SITE_URL=https://int-projects.vercel.app/uplane
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REPLICATE_API_TOKEN=
```

Server-only variables must not use the `NEXT_PUBLIC_` prefix.

## Deploy

Deploy from the repository root.

For Vercel:

```bash
npx vercel --prod
```

Use the repository root as the project root in Vercel. Do not deploy from
`projects/uplane`; that folder contains project-specific documentation, not a
separate app package.

The deployed Uplane URL is:

```text
https://int-projects.vercel.app/uplane
```

## Verification

Run from the repository root:

```bash
npm test
npm run lint
npm run build
```

## Adding Future Projects

Use the same pattern:

- Add a route under `src/app/<project>/`.
- Keep project docs under `projects/<project>/`.
- Namespace storage, tables, and API routes when the project needs separate
  backend resources.
- Keep shared environment and deployment config at the repository root.
