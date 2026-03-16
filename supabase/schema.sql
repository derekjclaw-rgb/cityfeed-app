-- ============================================================
-- City Feed — Database Schema
-- ============================================================
-- Run this in the Supabase SQL editor to bootstrap the database.
-- All tables use UUID primary keys and have RLS enabled.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- One profile per auth user; extended user info + role
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  avatar_url    text,
  role          text not null default 'advertiser' check (role in ('advertiser', 'host', 'admin')),
  bio           text,
  phone         text,
  stripe_account_id text,       -- Stripe Connect account id for hosts
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'advertiser')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- LISTINGS
-- Ad placements listed by hosts
-- ============================================================
create table if not exists public.listings (
  id            uuid primary key default uuid_generate_v4(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null check (category in (
    'billboard', 'digital_screen', 'window', 'storefront',
    'vehicle_wrap', 'event_space', 'transit', 'other'
  )),
  address       text not null,
  city          text not null,
  state         text not null,
  zip           text,
  lat           float8,
  lng           float8,
  price_per_day numeric(10,2) not null,
  min_days      int not null default 1,
  max_days      int,
  images        text[],           -- Supabase Storage URLs
  specs         jsonb,            -- dimensions, format requirements, etc.
  availability  jsonb,            -- date ranges available
  status        text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  views         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Active listings are viewable by everyone"
  on public.listings for select using (status = 'active' or host_id = auth.uid());

create policy "Hosts can insert their own listings"
  on public.listings for insert with check (auth.uid() = host_id);

create policy "Hosts can update their own listings"
  on public.listings for update using (auth.uid() = host_id);

create policy "Hosts can delete their own listings"
  on public.listings for delete using (auth.uid() = host_id);

-- ============================================================
-- BOOKINGS
-- Advertisers booking a listing for a date range
-- ============================================================
create table if not exists public.bookings (
  id              uuid primary key default uuid_generate_v4(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  advertiser_id   uuid not null references public.profiles(id) on delete cascade,
  host_id         uuid not null references public.profiles(id) on delete cascade,
  start_date      date not null,
  end_date        date not null,
  total_price     numeric(10,2) not null,
  platform_fee    numeric(10,2) not null default 0,
  status          text not null default 'pending' check (status in (
    'pending', 'confirmed', 'cancelled', 'completed', 'disputed'
  )),
  stripe_payment_intent_id text,
  creative_url    text,           -- uploaded ad creative
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint valid_dates check (end_date >= start_date)
);

alter table public.bookings enable row level security;

create policy "Advertisers can view their own bookings"
  on public.bookings for select using (
    auth.uid() = advertiser_id or auth.uid() = host_id
  );

create policy "Advertisers can create bookings"
  on public.bookings for insert with check (auth.uid() = advertiser_id);

create policy "Booking parties can update their bookings"
  on public.bookings for update using (
    auth.uid() = advertiser_id or auth.uid() = host_id
  );

-- ============================================================
-- MESSAGES
-- In-app messaging between advertiser and host
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
  on public.messages for select using (
    auth.uid() = sender_id or auth.uid() = recipient_id
  );

create policy "Users can send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

create policy "Recipients can mark messages as read"
  on public.messages for update using (auth.uid() = recipient_id);

-- ============================================================
-- POP SUBMISSIONS (Proof of Posting)
-- Hosts submit photos/proof that the ad went live
-- ============================================================
create table if not exists public.pop_submissions (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  images      text[] not null,    -- Supabase Storage URLs
  notes       text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz
);

alter table public.pop_submissions enable row level security;

create policy "Booking parties can view POP submissions"
  on public.pop_submissions for select using (
    auth.uid() = host_id or
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.advertiser_id = auth.uid()
    )
  );

create policy "Hosts can create POP submissions"
  on public.pop_submissions for insert with check (auth.uid() = host_id);

-- ============================================================
-- REVIEWS
-- Mutual reviews after booking completion
-- ============================================================
create table if not exists public.reviews (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid references public.listings(id) on delete set null,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (booking_id, reviewer_id)    -- one review per booking per reviewer
);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select using (true);

create policy "Users can submit one review per booking"
  on public.reviews for insert with check (auth.uid() = reviewer_id);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
create index if not exists listings_host_id_idx on public.listings(host_id);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists listings_category_idx on public.listings(category);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists bookings_advertiser_id_idx on public.bookings(advertiser_id);
create index if not exists bookings_host_id_idx on public.bookings(host_id);
create index if not exists bookings_listing_id_idx on public.bookings(listing_id);
create index if not exists messages_booking_id_idx on public.messages(booking_id);
create index if not exists reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index if not exists reviews_listing_id_idx on public.reviews(listing_id);
