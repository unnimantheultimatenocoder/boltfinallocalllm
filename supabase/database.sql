
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table with profiles
create table public.users (
  id uuid references auth.users primary key,
  username text unique,
  email text unique,
  wallet_balance decimal default 0,
  game_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- User Settings table
create table public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  notification_preferences jsonb default '{
    "email": true,
    "push": true,
    "tournament_updates": true,
    "match_reminders": true
  }'::jsonb,
  display_name text,
  time_zone text default 'UTC',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tournaments table
create table public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  game_type text not null,
  entry_fee decimal not null check (entry_fee >= 0),
  prize_pool decimal not null check (prize_pool >= 0),
  max_players integer not null check (max_players > 1),
  current_players integer default 0 check (current_players >= 0),
  start_time timestamp with time zone not null,
  status text default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tournament participants table
create table public.tournament_participants (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(tournament_id, user_id)
);

-- Matches table
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id),
  player1_id uuid references users(id),
  player2_id uuid references users(id),
  winner_id uuid references users(id),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'disputed')),
  score text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Transactions table
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  amount decimal not null,
  type text check (type in ('deposit', 'withdrawal', 'entry_fee', 'prize')),
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  reference_id text,
  created_at timestamp with time zone default now()
);

-- Security Policies

-- Users table policies
alter table public.users enable row level security;

create policy "Users can read their own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- User Settings policies
alter table public.user_settings enable row level security;

create policy "Users can read their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Tournament policies
alter table public.tournaments enable row level security;

create policy "Tournaments are readable by everyone"
  on public.tournaments for select
  using (true);

create policy "Only authenticated users can create tournaments"
  on public.tournaments for insert
  with check (auth.role() = 'authenticated');

-- Tournament participants policies
alter table public.tournament_participants enable row level security;

create policy "Tournament participants are readable by everyone"
  on public.tournament_participants for select
  using (true);

create policy "Users can join tournaments"
  on public.tournament_participants for insert
  with check (auth.uid() = user_id);

-- Matches policies
alter table public.matches enable row level security;

create policy "Matches are readable by everyone"
  on public.matches for select
  using (true);

create policy "Players can update their matches"
  on public.matches for update
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Transactions policies
alter table public.transactions enable row level security;

create policy "Users can read their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Functions

-- Handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );

  insert into public.user_settings (
    user_id,
    display_name
  ) values (
    new.id,
    split_part(new.email, '@', 1)
  );

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Get user stats
create or replace function public.get_user_stats(user_id uuid)
returns json as $$
declare
  stats record;
begin
  select 
    count(distinct tp.tournament_id) as total_tournaments,
    count(distinct case when t.status = 'in_progress' then tp.tournament_id end) as active_tournaments,
    count(distinct case when m.winner_id = user_id then m.id end) as matches_won,
    u.wallet_balance as wallet_balance
  into stats
  from public.users u
  left join tournament_participants tp on tp.user_id = user_id
  left join tournaments t on t.id = tp.tournament_id
  left join matches m on (m.player1_id = user_id or m.player2_id = user_id)
  where u.id = user_id
  group by u.id, u.wallet_balance;

  return row_to_json(stats);
end;
$$ language plpgsql security definer;

-- Join tournament function
create or replace function public.join_tournament(
  p_tournament_id uuid,
  p_user_id uuid
)
returns json as $$
declare
  v_tournament record;
  v_balance decimal;
begin
  -- Get tournament details
  select * into v_tournament 
  from tournaments 
  where id = p_tournament_id;

  -- Check if tournament exists
  if not found then
    return json_build_object('success', false, 'message', 'Tournament not found');
  end if;

  -- Check if tournament is full
  if v_tournament.current_players >= v_tournament.max_players then
    return json_build_object('success', false, 'message', 'Tournament is full');
  end if;

  -- Check if tournament has started
  if v_tournament.status != 'upcoming' then
    return json_build_object('success', false, 'message', 'Tournament has already started');
  end if;

  -- Get user's wallet balance
  select wallet_balance into v_balance 
  from users 
  where id = p_user_id;

  -- Check if user has enough balance
  if v_balance < v_tournament.entry_fee then
    return json_build_object('success', false, 'message', 'Insufficient balance');
  end if;

  -- Begin transaction
  begin
    -- Deduct entry fee
    update users 
    set wallet_balance = wallet_balance - v_tournament.entry_fee 
    where id = p_user_id;

    -- Record transaction
    insert into transactions (user_id, amount, type, status)
    values (p_user_id, -v_tournament.entry_fee, 'entry_fee', 'completed');

    -- Add user to tournament
    insert into tournament_participants (tournament_id, user_id)
    values (p_tournament_id, p_user_id);

    return json_build_object('success', true, 'message', 'Successfully joined tournament');
  exception
    when others then
      return json_build_object('success', false, 'message', 'Failed to join tournament');
  end;
end;
$$ language plpgsql security definer;

-- Update timestamp trigger
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply update timestamp trigger to all tables
create trigger update_users_timestamp
  before update on users
  for each row execute procedure update_timestamp();

create trigger update_tournaments_timestamp
  before update on tournaments
  for each row execute procedure update_timestamp();

create trigger update_matches_timestamp
  before update on matches
  for each row execute procedure update_timestamp();

create trigger update_user_settings_timestamp
  before update on user_settings
  for each row execute procedure update_timestamp();

-- Tournament player count trigger
create or replace function update_tournament_player_count()
returns trigger as $$
begin
  update tournaments
  set current_players = (
    select count(*)
    from tournament_participants
    where tournament_id = new.tournament_id
  )
  where id = new.tournament_id;
  return new;
end;
$$ language plpgsql;

create trigger update_tournament_players
  after insert or delete on tournament_participants
  for each row execute procedure update_tournament_player_count();