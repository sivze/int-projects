# Uplane Image Transform

Full-stack TypeScript image transformation service for the Uplane engineering
assignment.

The app lets a user upload an image, remove its background with Replicate BRIA,
flip the result horizontally with `sharp`, host the processed image in Supabase
Storage, copy the final processed URL, view recent uploads, and delete
uploaded/processed assets.

## Live Demo

Deployment target: `https://int-projects.vercel.app/uplane`

## Repository Layout

This project lives inside the shared `int-projects` Next.js app.

- App route: `src/app/uplane`
- API routes: `src/app/api/images`
- Project docs: `projects/uplane`

Clone, install, run, and deploy from the repository root. Do not deploy from
`projects/uplane`; this folder is documentation for the Uplane assignment, not a
separate package.

## Tech Stack

- Next.js App Router
- TypeScript
- Replicate BRIA for third-party background removal
- `sharp` for local image flipping
- Supabase Postgres for image metadata
- Supabase Storage for original and processed image hosting

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/uplane`.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```text
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REPLICATE_API_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY` and `REPLICATE_API_TOKEN` are server-only. They must
not use the `NEXT_PUBLIC_` prefix.

## API Design

```text
POST   /api/images
GET    /api/images
POST   /api/images/:id/remove-background
POST   /api/images/:id/flip
DELETE /api/images/:id
```

Upload is the only processing action. The backend runs the full pipeline before
returning the processed record:

1. Upload image.
2. Remove background with Replicate BRIA.
3. Flip the background-removed image horizontally with `sharp`.
4. Copy or open the final processed URL.
5. Delete the image set.

## Data Model

Supabase table: `uplane_images`

One row represents one uploaded image and its latest processed result.

```text
original_url      uploaded source image
processed_url     latest transformed image
processed_stage   none | background_removed | flipped
status            uploaded | processing | complete | failed | deleted
```

The user-facing model is simple: original image and processed image. Internally,
the app stores separate objects under `uplane/{id}/` so deletion can remove the
entire image set.

## Storage

Bucket: `uplane-images`

Paths:

```text
uplane/{id}/original.{ext}
uplane/{id}/processed-bg.png
uplane/{id}/processed-flipped-horizontal.png
uplane/{id}/processed-flipped-vertical.png
```

Processed outputs are PNG to preserve transparency after background removal.

## Tradeoffs

- Processing is synchronous in the API route for clarity and a small take-home
  scope. At production scale, background removal and flip should move to queued
  jobs with polling or realtime status updates.
- Uploads are limited to PNG, JPEG, and WebP under 8 MB. HEIC/HEIF and image
  downscaling are reasonable future improvements but add complexity that is not
  central to the assignment.
- The final processed image is hosted in Supabase Storage rather than relying on
  the Replicate delivery URL, so retrieval and deletion are under app control.

## Verification

```bash
npm test
npm run lint
npm run build
```
