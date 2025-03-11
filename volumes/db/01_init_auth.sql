-- Создание роли authenticator
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator'
   ) THEN
      CREATE ROLE authenticator WITH LOGIN PASSWORD 'authenticator++PoP221+' NOINHERIT;
   END IF;
END
$do$;

-- Создание схемы auth
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO authenticator;

-- Создание таблицы auth.users
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    encrypted_password text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_sign_in_at timestamptz,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

GRANT ALL ON auth.users TO authenticator;