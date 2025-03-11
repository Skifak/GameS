-- Создаем расширения
create extension if not exists "uuid-ossp";      -- Для UUID
create extension if not exists "pgcrypto";       -- Для криптографии
create extension if not exists "pgjwt";          -- Для JWT

-- Создаем схему auth, если её нет
create schema if not exists auth;

-- Создаем таблицу пользователей
create table if not exists auth.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  encrypted_password text not null,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  deleted_at timestamptz
);

-- Создаем публичную схему, если её нет
create schema if not exists public;

-- Создаем таблицу профилей
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Включаем Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Создаем политики доступа
create policy "Профили доступны всем для чтения"
  on public.profiles for select
  using ( true );

create policy "Пользователи могут редактировать свой профиль"
  on public.profiles for update
  using ( auth.uid() = id );

-- Создаем функцию для автоматического обновления updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Создаем триггер для обновления updated_at
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();

-- Создаем триггер для автоматического создания профиля
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 