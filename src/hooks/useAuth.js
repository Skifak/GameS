/**
 * Хук для управления аутентификацией пользователя.
 * Предоставляет методы для входа, регистрации и выхода, а также состояние пользователя.
 * @module useAuth
 */

import { useState, useEffect } from 'react';
import { supabase, auth } from '../lib/supabase';
import logger from '../utils/logger';
import { toast } from 'react-toastify';

/**
 * Хук аутентификации.
 * Управляет состоянием пользователя и предоставляет методы аутентификации.
 * @returns {Object} Объект с методами и состоянием аутентификации
 * @returns {Object|null} user - Текущий пользователь с данными профиля или null, если не авторизован
 * @returns {boolean} loading - Флаг состояния загрузки (true во время операций)
 * @returns {Function} signIn - Функция для входа пользователя
 * @returns {Function} signUp - Функция для регистрации пользователя
 * @returns {Function} signOut - Функция для выхода пользователя
 * @returns {boolean} isAuthenticated - Флаг, указывающий, авторизован ли пользователь
 */
export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        /**
         * Проверяет наличие текущего пользователя при монтировании компонента.
         * Устанавливает начальное состояние пользователя.
         * @async
         */
        const fetchUser = async () => {
            try {
                const currentUser = await auth.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                logger.error('Failed to fetch current user:', error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();

        /**
         * Подписка на изменения состояния аутентификации через Supabase.
         * Обновляет состояние пользователя при входе, выходе или изменении сессии.
         */
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ? { ...session.user, profile: session.user.profile } : null);
            setLoading(false);
        });

        // Очистка подписки при размонтировании компонента
        return () => authListener.subscription.unsubscribe();
    }, []);

    /**
     * Выполняет вход пользователя через Supabase.
     * Устанавливает данные пользователя в состояние при успехе.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @returns {Promise<{success: boolean, message: string}>} Результат операции (успех или ошибка)
     */
    const signIn = async (email, password) => {
        try {
            setLoading(true);
            const { user, profile } = await auth.signIn(email, password);
            logger.info(`Player ${profile.username} signed in`);
            setUser({ ...user, profile });
            return { success: true, message: 'Вход выполнен' };
        } catch (error) {
            logger.error('Sign-in error:', error.message);
            toast.error(`Ошибка входа: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Выполняет регистрацию пользователя через Supabase.
     * После успеха показывает уведомление и через 3 секунды завершает сессию для перехода к форме входа.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @param {string} username - Имя пользователя (3-20 символов, только буквы и цифры)
     * @returns {Promise<{success: boolean, message: string}>} Результат операции (успех или ошибка)
     */
    const signUp = async (email, password, username) => {
        try {
            setLoading(true);
            const { profile } = await auth.signUp(email, password, username);
            logger.info(`Player ${username} registered`);

            // Показываем уведомление об успешной регистрации
            toast.success('Регистрация успешна! Перенаправляем на вход...', {
                position: 'top-right',
                autoClose: 3000,
            });

            // Через 3 секунды завершаем сессию и сбрасываем состояние пользователя
            setTimeout(async () => {
                await auth.signOut();
                setUser(null);
            }, 3000);

            return { success: true, message: 'Регистрация успешна! Теперь вы можете войти' };
        } catch (error) {
            logger.error('Sign-up error:', error.message);
            toast.error(`Ошибка регистрации: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Выполняет выход пользователя из Supabase.
     * Сбрасывает состояние пользователя при успехе.
     * @async
     * @returns {Promise<{success: boolean, message: string}>} Результат операции (успех или ошибка)
     */
    const signOut = async () => {
        try {
            setLoading(true);
            await auth.signOut();
            logger.info(`Player ${user?.profile?.username || 'unknown'} signed out`);
            setUser(null);
            return { success: true, message: 'Выход выполнен' };
        } catch (error) {
            logger.error('Sign-out error:', error.message);
            toast.error(`Ошибка выхода: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    return { user, loading, signIn, signUp, signOut, isAuthenticated: !!user };
}