-- Run this once in Supabase → SQL Editor
-- Table used for ResumeTailor generation history (optional; app works without it)

create table if not exists public.generation_history (
  id text primary key,
  client_id text not null,
  target_role text not null,
  match_score integer,
  source text not null default 'groq',
  tailored_content jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists generation_history_client_generated_idx
  on public.generation_history (client_id, generated_at desc);

-- Backend uses the service role key (bypasses RLS).
-- Keep RLS on; no public anon access required.
alter table public.generation_history enable row level security;
