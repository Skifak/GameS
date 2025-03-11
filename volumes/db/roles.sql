-- Создаем роль supabase_admin
CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;

-- Создаем роль authenticator
CREATE ROLE authenticator NOINHERIT LOGIN NOREPLICATION;

-- Создаем роль anon
CREATE ROLE anon NOLOGIN NOINHERIT;

-- Создаем роль authenticated
CREATE ROLE authenticated NOLOGIN NOINHERIT;

-- Создаем роль service_role
CREATE ROLE service_role NOLOGIN NOINHERIT;

-- Даем права на схемы
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Даем права на таблицы
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Устанавливаем пароль для postgres
ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD}'; 