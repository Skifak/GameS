CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid NULL,
    id uuid NOT NULL UNIQUE,
    aud varchar(255) NULL,
    role varchar(255) NULL,
    email varchar(255) NULL UNIQUE,
    encrypted_password varchar(255) NULL,
    confirmed_at timestamptz NULL,
    invited_at timestamptz NULL,
    confirmation_token varchar(255) NULL,
    confirmation_sent_at timestamptz NULL,
    recovery_token varchar(255) NULL,
    recovery_sent_at timestamptz NULL,
    email_change_token varchar(255) NULL,
    email_change varchar(255) NULL,
    email_change_sent_at timestamptz NULL,
    last_sign_in_at timestamptz NULL,
    raw_app_meta_data jsonb NULL,
    raw_user_meta_data jsonb NULL,
    is_super_admin bool NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS users_instance_id_email_idx ON auth.users USING btree (instance_id, email);
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users USING btree (instance_id);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid NULL,
    id bigserial NOT NULL,
    token varchar(255) NULL,
    user_id varchar(255) NULL,
    revoked bool NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens USING btree (token);

CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid NOT NULL,
    uuid uuid NULL,
    raw_base_config text NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    CONSTRAINT instances_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid NULL,
    id uuid NOT NULL,
    payload json NULL,
    created_at timestamptz NULL,
    CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);

CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version varchar(255) NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
$$ LANGUAGE sql STABLE;

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create authenticator role if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator'
   ) THEN
      CREATE ROLE authenticator WITH LOGIN PASSWORD 'authenticator' NOINHERIT;
   END IF;
END
$do$;

-- Create anon role if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon'
   ) THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
   END IF;
END
$do$;

-- Create authenticated role if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated'
   ) THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
   END IF;
END
$do$;

-- Grant roles to authenticator
GRANT anon, authenticated TO authenticator;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO authenticator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO authenticator;

-- Allow authenticator to create in auth schema
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON TABLES TO authenticator;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON SEQUENCES TO authenticator;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth
GRANT ALL ON FUNCTIONS TO authenticator;

-- Grant access to public schema
GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticator;

-- Allow authenticator to create in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO authenticator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO authenticator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON FUNCTIONS TO authenticator;

-- Создаем базовую таблицу пользователей
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    encrypted_password varchar(255) NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу профилей
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    username varchar(255) NOT NULL,
    avatar_url varchar(255),
    updated_at timestamptz DEFAULT now()
);

-- Даем права на чтение схемы auth для anon
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON auth.users TO anon;

-- Даем права на работу с профилями для authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Создаем политики доступа
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политика для profiles: пользователи могут видеть все профили
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT USING (true);

-- Политика для profiles: пользователи могут редактировать только свой профиль
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Функция для регистрации
CREATE OR REPLACE FUNCTION auth.register(
    email text,
    password text,
    username text
) RETURNS auth.users AS $$
DECLARE
    new_user auth.users;
BEGIN
    -- Создаем пользователя
    INSERT INTO auth.users (email, encrypted_password)
    VALUES (email, crypt(password, gen_salt('bf')))
    RETURNING * INTO new_user;

    -- Создаем профиль
    INSERT INTO public.profiles (id, username)
    VALUES (new_user.id, username);

    RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для входа
CREATE OR REPLACE FUNCTION auth.login(
    email text,
    password text
) RETURNS auth.users AS $$
DECLARE
    user_data auth.users;
BEGIN
    SELECT * INTO user_data
    FROM auth.users
    WHERE users.email = login.email
    AND users.encrypted_password = crypt(password, encrypted_password);

    IF user_data.id IS NULL THEN
        RAISE EXCEPTION 'Invalid email or password';
    END IF;

    RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 