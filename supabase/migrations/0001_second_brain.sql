-- Second Brain schema. Run with `supabase db push` or paste into the SQL editor.
-- Every collection is a document table keyed by (user_id, id) with RLS so a
-- user can only ever see and modify their own rows.

create or replace function public.sb_create_collection(tbl text) returns void
language plpgsql as $$
begin
  execute format($f$
    create table if not exists public.%1$I (
      id         text        not null,
      user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
      data       jsonb       not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, id)
    );
    alter table public.%1$I enable row level security;
    drop policy if exists "%1$s_owner" on public.%1$I;
    create policy "%1$s_owner" on public.%1$I
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create index if not exists %1$s_updated_idx on public.%1$I (user_id, updated_at desc);
    create index if not exists %1$s_data_gin on public.%1$I using gin (data jsonb_path_ops);
  $f$, tbl);
end $$;

select public.sb_create_collection(t)
from unnest(array['pages', 'ideas', 'links', 'projects', 'conversations', 'activity']) as t;

drop function public.sb_create_collection(text);

create table if not exists public.user_settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profile     jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "user_settings_owner" on public.user_settings;
create policy "user_settings_owner" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
