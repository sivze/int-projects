# Interview Projects

Reusable skeleton for AI coding take-homes and interview demos.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and fill in the project values.

Required for Supabase-connected assignments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Older Supabase projects may use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the helper in
`src/lib/supabase/client.ts` supports both.

## Deployment

This repo is Vercel-ready. For each assignment, either:

- deploy the root app as a fresh Vercel project, or
- create an assignment folder and set the Vercel root directory to that folder.

Do not commit `.env.local`, `.vercel`, build outputs, or assignment-specific
private notes.
