/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:9999';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.ZopqoUt20nEV9cklpv9e9n4CZ3_ke_bDHcvw6J2JzZU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Типы для пользователя
export type Profile = {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
};

// Хелперы для работы с авторизацией
export const auth = {
  // Регистрация
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  // Вход
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Выход
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Получение текущего пользователя
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Получение профиля пользователя
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Обновление профиля
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    return { data, error };
  }
}; 