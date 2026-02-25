-- Player UID, friendship graph, and notification center support

alter table public.profiles
  add column if not exists player_uid varchar(8);

create or replace function public.generate_player_uid()
returns varchar
language plpgsql
as $$
declare
  generated_uid varchar(8);
begin
  loop
    generated_uid := lpad((floor(random() * 100000000)::bigint)::text, 8, '0');
    exit when not exists (select 1 from public.profiles where player_uid = generated_uid);
  end loop;

  return generated_uid;
end;
$$;

update public.profiles
set player_uid = public.generate_player_uid()
where player_uid is null
   or player_uid !~ '^[0-9]{8}$';

alter table public.profiles
  alter column player_uid set not null;

create unique index if not exists profiles_player_uid_key on public.profiles(player_uid);

create or replace function public.ensure_profile_uid()
returns trigger
language plpgsql
as $$
begin
  if new.player_uid is null or new.player_uid !~ '^[0-9]{8}$' then
    new.player_uid := public.generate_player_uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_player_uid on public.profiles;
create trigger trg_profiles_player_uid
before insert or update on public.profiles
for each row
execute function public.ensure_profile_uid();

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  kind text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.friendships enable row level security;
alter table public.player_notifications enable row level security;

drop policy if exists "Users can read their friendship rows" on public.friendships;
create policy "Users can read their friendship rows"
on public.friendships for select
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can create friendship requests" on public.friendships;
create policy "Users can create friendship requests"
on public.friendships for insert
with check (auth.uid() = requester_id);

drop policy if exists "Users can update friendship rows they are involved in" on public.friendships;
create policy "Users can update friendship rows they are involved in"
on public.friendships for update
using (auth.uid() = requester_id or auth.uid() = addressee_id)
with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can read their notifications" on public.player_notifications;
create policy "Users can read their notifications"
on public.player_notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.player_notifications;
create policy "Users can update their notifications"
on public.player_notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.player_notifications;
create policy "Authenticated users can insert notifications"
on public.player_notifications for insert
with check (auth.role() = 'authenticated');

create or replace function public.touch_friendship_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
before update on public.friendships
for each row execute function public.touch_friendship_updated_at();
