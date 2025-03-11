-- Создание таблицы public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

GRANT ALL ON public.profiles TO authenticator;
GRANT ALL ON public.profiles TO postgres;

-- Опционально: создание начального администратора
INSERT INTO auth.users (email, encrypted_password, created_at)
VALUES ('skif7511@gmail.com', crypt('75115754Ss++', gen_salt('bf')), now());
INSERT INTO public.profiles (id, username)
SELECT id, 'admin' FROM auth.users WHERE email = 'skif7511@gmail.com';