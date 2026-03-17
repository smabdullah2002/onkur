create table if not exists public.daily_routines (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_date date not null,
  plant_fingerprint text not null,
  routine_text text not null,
  source text not null default 'gemini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, routine_date)
);

create or replace function public.set_daily_routines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_routines_updated_at on public.daily_routines;
create trigger trg_daily_routines_updated_at
before update on public.daily_routines
for each row
execute function public.set_daily_routines_updated_at();
