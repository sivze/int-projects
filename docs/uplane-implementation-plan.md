# Uplane Image Transformation Plan

## Goal

Build a polished full-stack image transformation tool that lets a user upload an
image, remove its background with a third-party service, flip it, host the
result, copy a unique URL, view history, and delete uploaded/processed assets.

## Product Flow

1. User uploads one image via drag/drop or file picker.
2. App immediately shows the original preview and creates a history item.
3. User clicks `Remove background`.
4. Backend calls Replicate BRIA, stores the transparent PNG as the current
   processed image, and updates `processed_stage` to `background_removed`.
5. User clicks `Flip`.
6. Backend flips the current processed image locally with `sharp`, stores a new
   processed PNG, updates `processed_stage` to `flipped`, and returns the hosted
   processed URL.
7. User can copy the processed URL.
8. User can delete the image record, which removes the original and all
   processed objects under that image's storage prefix.

## UX Requirements

- Upload card with drag/drop and file picker.
- Clear current-image workspace with two user-facing previews:
  - `Original`
  - `Processed`
- Explicit buttons after upload:
  - `Remove background`
  - `Flip horizontal`
  - `Flip vertical` if implemented via parameter support
  - `Copy URL`
  - `Delete`
- Per-step loading states and disabled buttons.
- Toasts for success and errors.
- History list with status badge, original thumbnail, processed thumbnail when
  available, processed URL, and delete action.
- Empty state and friendly invalid-file errors.

Button rules:

- `Remove background` is enabled after upload and can regenerate the processed
  image from the original.
- `Flip horizontal` is enabled only when `processed_stage` is
  `background_removed`.
- After flip, `Copy URL` and `Open result` are enabled.
- Do not make flip behave as a toggle. The assignment asks for horizontal flip,
  not reversible editing.

## UI Components

Use `react-dropzone` for drag/drop and a small local UI layer for reusable
primitives. The template does not include Tailwind/shadcn, so adding shadcn
would create setup churn that does not improve the assignment's core signal.

Implemented primitives:

- `Button`
- `Card`
- `Badge`
- `EmptyState`

Implemented app component:

- `ImageTransformApp`

## API Structure

```text
POST   /api/images
GET    /api/images
POST   /api/images/:id/remove-background
POST   /api/images/:id/flip
DELETE /api/images/:id
```

### POST /api/images

- Accept multipart upload.
- Validate content type and file size.
- Store original image in Supabase Storage.
- Insert DB record with `uploaded` status.
- Return image metadata and original URL.

### GET /api/images

- Return non-deleted image records, newest first.

### POST /api/images/:id/remove-background

- Validate record exists and is not deleted.
- Set status to `processing`.
- Call Replicate BRIA with the stored original URL.
- Download Replicate output as a binary.
- Store the transparent PNG in Supabase Storage as a processed object.
- Set `processed_path`, `processed_url`, `processed_stage =
  background_removed`, and `status = complete`.
- Return updated metadata.

### POST /api/images/:id/flip

Request body:

```json
{
  "direction": "horizontal"
}
```

Allowed directions:

- `horizontal` maps to `sharp(...).flop()`
- `vertical` maps to `sharp(...).flip()`

Default and primary UI action should be horizontal because the assignment
explicitly asks for horizontal flipping. Supporting both directions through a
typed parameter is a small quality improvement, but the UI should emphasize
horizontal.

Flip input/output rule:

- Input is the current `processed_path` only when `processed_stage` is
  `background_removed`.
- Output is a new processed object, not an overwrite, to avoid cache confusion.
- DB `processed_path` and `processed_url` are updated to point to the latest
  processed image.
- `processed_stage` becomes `flipped`.

### DELETE /api/images/:id

- List and delete all storage objects under `uplane/{id}/`.
- Mark record as `deleted`.
- Return success even if a storage object was already missing.

## Data Model

Table: `uplane_images`

```text
id uuid primary key
original_path text not null
processed_path text
original_url text not null
processed_url text
processed_stage text not null default 'none'
status text not null
error text
original_file_name text not null
mime_type text not null
size_bytes integer not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz
```

Status values:

```text
uploaded
processing
complete
failed
deleted
```

Processed stage values:

```text
none
background_removed
flipped
```

User-facing model:

```text
Original  = uploaded source image
Processed = latest transformed image
```

The background-removed image is not a separate user-facing final deliverable.
It is the current `processed_url` after the first step. After flip,
`processed_url` points to the horizontally flipped image.

Storage paths:

```text
uplane/{id}/original.{ext}
uplane/{id}/processed-bg.png
uplane/{id}/processed-flipped-horizontal.png
uplane/{id}/processed-flipped-vertical.png   # optional API support only
```

## Provider Choice

Use Replicate BRIA:

- Model: `bria/remove-background`
- Env var: `REPLICATE_API_TOKEN`
- Server-only; never expose with `NEXT_PUBLIC_`.
- Input: original image URL from Supabase Storage.
- Output: Replicate file output, downloaded and stored in Supabase Storage.

Reasoning:

- Meets the third-party background-removal requirement.
- Good TypeScript/Node SDK.
- Official/warm model with predictable pricing.
- Avoids building segmentation locally, which is outside scope.

## Image Formats

Allowed upload formats:

- `image/png`
- `image/jpeg`
- `image/webp`

Do not support HEIC/HEIF for the first version.

Reasoning:

- HEIC/HEIF support adds conversion complexity and platform-specific edge cases.
- PNG/JPEG/WebP cover normal web uploads and are enough for the assignment.
- Better to spend time on reliability, UX, and process clarity.

Output format:

- Store processed images as PNG to preserve transparency.

Do not convert final output to WebP in the first version.

Reasoning:

- Transparency is central to background removal.
- PNG keeps the result predictable and easy to inspect.
- WebP optimization is a reasonable future improvement, but not worth adding
  complexity unless time remains.

## File Size And Validation

Initial max upload size: 8 MB.

Validation:

- Reject unsupported MIME types.
- Reject oversized files.
- Generate server-side object keys.
- Do not trust client-provided paths.

Compression:

- Do not compress originals before background removal in v1.
- Replicate quality is likely better with the original input.
- Use `sharp` only for the flip output.
- Add optional future improvement: downscale very large images before processing
  to control latency and cost.

## Secure Env Management

`.env.local` should include:

```text
NEXT_PUBLIC_SITE_URL=https://int-projects.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
REPLICATE_API_TOKEN=...
```

Server-only variables, if needed:

```text
SUPABASE_SERVICE_ROLE_KEY=...
```

Rules:

- Never commit `.env.local`.
- Never expose `REPLICATE_API_TOKEN`.
- Never expose Supabase service-role keys.
- Use public Supabase key only for client-safe operations.

## Code Organization

```text
src/app/api/images/route.ts
src/app/api/images/[id]/remove-background/route.ts
src/app/api/images/[id]/flip/route.ts
src/app/api/images/[id]/route.ts
src/lib/images/types.ts
src/lib/images/validation.ts
src/lib/images/storage.ts
src/lib/images/repository.ts
src/lib/images/replicate.ts
src/lib/images/transform.ts
src/lib/api/errors.ts
src/components/ui.tsx
src/components/image-transform-app.tsx
```

## Defensibility Notes

- Synchronous processing is acceptable for this take-home because the workflow is
  small and easy to understand.
- At production scale, `remove-background` and `flip` should become queued jobs.
- Supabase Storage satisfies online hosting and deletion without extra object
  storage plumbing.
- Supabase Postgres metadata makes history, status, processed-stage tracking,
  and deletion reliable.
- Replicate is isolated behind one module, so the provider can be swapped later.

## Next Steps

### Completed

- Created Supabase migration for `uplane_images`.
- Created Supabase Storage bucket `uplane-images`.
- Added `replicate`, `react-dropzone`, `sharp`, and `vitest`.
- Built typed image validation, storage, repository, Replicate, transform, and
  API error modules.
- Built API routes for upload/list, background removal, flip, and delete.
- Built the upload, transform, preview, history, copy URL, and delete UI.
- Updated README and `.env.example`.
- Verified unit tests and lint locally.

### Remaining

1. Add local secrets and deployment env.
   - Add `REPLICATE_API_TOKEN` to local `.env.local`.
   - Add `SUPABASE_SERVICE_ROLE_KEY` to local `.env.local`.
   - Add `REPLICATE_API_TOKEN` to Vercel production env.
   - Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel production env.
   - Keep it server-only; no `NEXT_PUBLIC_` prefix.

2. Verify locally.
   - Upload valid PNG/JPEG/WebP.
   - Reject invalid MIME and oversized files.
   - Run background removal.
   - Run horizontal flip.
   - Confirm final URL opens publicly.
   - Confirm history reload shows original and latest processed image.
   - Delete and confirm storage objects/record are removed or marked deleted.

3. Polish submission.
   - Run `npm run build`.
   - Run a browser visual pass on desktop and mobile.
   - Deploy Uplane branch to Vercel.
   - Submit deployed URL and GitHub branch.
