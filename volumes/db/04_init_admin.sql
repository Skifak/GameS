-- Создаем администратора в auth.users
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  is_super_admin,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'skif7511@gmail.com', -- замените на ваш email
  crypt('75115754Ss++', gen_salt('bf')), -- замените на ваш пароль
  now(),
  true,
  '{"role": "service_role"}',
  '{"name": "Admin"}'
);

-- Создание профиля для администратора
INSERT INTO public.profiles (
    id,
    username
) 
SELECT 
    id,
    'admin'
FROM auth.users 
WHERE email = 'skif7511@gmail.com'; 