/**
 * Модуль для работы с Supabase.
 * Предоставляет клиент Supabase и методы для аутентификации и управления профилем.
 * @module Supabase
 */

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

/**
 * Клиент Supabase для работы с базой данных и аутентификацией.
 * @type {Object}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Типы для пользователя
/**
 * Профиль пользователя в Supabase.
 * @typedef {Object} Profile
 * @property {string} id - Уникальный идентификатор
 * @property {string} username - Имя пользователя
 * @property {string} created_at - Дата создания
 * @property {string} updated_at - Дата обновления
 */

/**
 * Объект методов аутентификации и работы с профилем в Supabase.
 */
export const auth = {
    /**
     * Регистрирует нового пользователя в Supabase.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @returns {Promise<Object>} Результат с данными или ошибкой
     */
    signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    },

    /**
     * Выполняет вход пользователя в Supabase.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @returns {Promise<Object>} Результат с данными или ошибкой
     */
    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    /**
     * Выполняет выход пользователя из Supabase.
     * @async
     * @returns {Promise<Object>} Результат с ошибкой или без
     */
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Получает текущего пользователя из Supabase.
     * @async
     * @returns {Promise<Object>} Данные пользователя или ошибка
     */
    getCurrentUser: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    },

    /**
     * Получает профиль пользователя из таблицы profiles.
     * @async
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} Данные профиля или ошибка
     */
    getProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    /**
     * Обновляет профиль пользователя в таблице profiles.
     * @async
     * @param {string} userId - ID пользователя
     * @param {Object} updates - Обновления профиля
     * @returns {Promise<Object>} Результат с данными или ошибкой
     */
    updateProfile: async (userId: string, updates: Partial<Profile>) => {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);
        return { data, error };
    }
};