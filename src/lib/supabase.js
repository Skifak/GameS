/**
 * Модуль для работы с Supabase.
 * Предоставляет клиент Supabase и методы для аутентификации и управления профилем.
 * @module supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_PUBLIC_URL;
const supabaseAnonKey = import.meta.env.VITE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in .env');
}

/**
 * Клиент Supabase для взаимодействия с базой данных и аутентификацией.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

/**
 * Объект методов для аутентификации и управления профилем в Supabase.
 * @namespace auth
 */
export const auth = {
    /**
     * Регистрирует нового пользователя в Supabase и создаёт профиль.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @param {string} username - Имя пользователя (3-20 символов, только буквы и цифры)
     * @returns {Promise<{user: object, profile: object, session: object}>} Объект с данными пользователя, профиля и сессии
     * @throws {Error} Если регистрация или создание профиля не удались
     */
    async signUp(email, password, username) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                username,
                email,
                role: 'player',
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                status: 'online',
            })
            .select()
            .single();

        if (profileError) throw new Error(profileError.message);
        return { user: data.user, profile: profileData, session: data.session };
    },

    /**
     * Выполняет вход пользователя в Supabase и обновляет или создаёт профиль.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @returns {Promise<{user: object, profile: object, session: object}>} Объект с данными пользователя, профиля и сессии
     * @throws {Error} Если вход или работа с профилем не удались
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);

        // Проверяем, существует ли профиль
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        let profile;
        if (profileError && profileError.code === 'PGRST116') {
            // Если профиля нет (PGRST116 - no rows returned), создаём новый
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    username: email.split('@')[0], // Используем часть email как временное имя
                    email,
                    role: 'player',
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                    status: 'online',
                })
                .select()
                .single();
            if (insertError) throw new Error(insertError.message);
            profile = newProfile;
        } else if (profileError) {
            throw new Error(profileError.message);
        } else {
            // Если профиль есть, обновляем last_login и status
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString(), status: 'online' })
                .eq('id', data.user.id)
                .select()
                .single();
            if (updateError) throw new Error(updateError.message);
            profile = updatedProfile;
        }

        return { user: data.user, profile, session: data.session };
    },

    /**
     * Выполняет выход пользователя из Supabase и обновляет статус в профиле.
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Если выход не удался
     */
    async signOut() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
    },

    /**
     * Получает данные текущего пользователя и его профиля.
     * @async
     * @returns {Promise<object|null>} Объект с данными пользователя и профиля или null, если пользователь не авторизован
     * @throws {Error} Если запрос профиля не удался
     */
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw new Error(profileError.message);
        return { ...user, profile };
    },
};