-- Sakura Prompt Studio — Initial Schema
-- Tables: items, versions, tags
-- RLS, triggers, indexes, rotate_versions function

-- ── Helper: updated_at trigger ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Table: items ──────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  category text not null check (category in ('template','plan','data_output','agente','skill')),
  tags jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  owner uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger items_updated_at
  before update on public.items
  for each row
  execute function public.set_updated_at();

-- Index: owner for RLS + join performance
create index items_owner_idx on public.items (owner);

-- ── Table: versions ───────────────────────────────────────────────────────────
create table public.versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  content_snapshot text not null,
  created_at timestamptz not null default now()
);

-- Indexes: FK + sort order for rotation
create index versions_item_id_idx on public.versions (item_id);
create index versions_item_created_at_idx on public.versions (item_id, created_at);

-- ── Table: tags ───────────────────────────────────────────────────────────────
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  label text,
  owner uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tags_updated_at
  before update on public.tags
  for each row
  execute function public.set_updated_at();

-- Index: owner for RLS + join performance
create index tags_owner_idx on public.tags (owner);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.items enable row level security;
alter table public.items force row level security;

alter table public.versions enable row level security;
alter table public.versions force row level security;

alter table public.tags enable row level security;
alter table public.tags force row level security;

-- Helper: check if current user owns an item (used by versions RLS)
create or replace function public.is_item_owner(item_uuid uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.items
    where id = item_uuid
      and owner = (select auth.uid())
  );
$$;

-- Policy: items — owner only
create policy items_owner_policy on public.items
  for all
  to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

-- Policy: tags — owner only
create policy tags_owner_policy on public.tags
  for all
  to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

-- Policy: versions — accessible if parent item is owned
create policy versions_owner_policy on public.versions
  for all
  to authenticated
  using ((select public.is_item_owner(item_id)))
  with check ((select public.is_item_owner(item_id)));

-- ── Version Rotation ──────────────────────────────────────────────────────────
-- Called after inserting a version. When total > 50, deletes the 25 oldest.
create or replace function public.rotate_versions(item_uuid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_count int;
begin
  select count(*) into version_count
  from public.versions
  where item_id = item_uuid;

  if version_count > 50 then
    delete from public.versions
    where id in (
      select id
      from public.versions
      where item_id = item_uuid
      order by created_at asc
      limit 25
    );
  end if;
end;
$$;
