create extension if not exists "pgcrypto";

create table if not exists public.uplane_images (
  id uuid primary key default gen_random_uuid(),
  original_path text not null,
  processed_path text,
  original_url text not null,
  processed_url text,
  processed_stage text not null default 'none',
  status text not null default 'uploaded',
  error text,
  original_file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint uplane_images_processed_stage_check check (
    processed_stage in ('none', 'background_removed', 'flipped')
  ),
  constraint uplane_images_status_check check (
    status in ('uploaded', 'processing', 'complete', 'failed', 'deleted')
  )
);

alter table public.uplane_images enable row level security;

create index if not exists uplane_images_created_at_idx
  on public.uplane_images (created_at desc);

create index if not exists uplane_images_deleted_at_idx
  on public.uplane_images (deleted_at);

create or replace function public.set_uplane_images_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_uplane_images_updated_at on public.uplane_images;

create trigger set_uplane_images_updated_at
before update on public.uplane_images
for each row
execute function public.set_uplane_images_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uplane-images',
  'uplane-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
