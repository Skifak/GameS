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

    /**
     * Инициализирует состояние пользователя и подписывается на изменения состояния аутентификации.
     */
    useEffect(() => {
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

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                setUser(null);
            } else if (session?.user) {
                setUser({ ...session.user, profile: session.user.profile });
            }
            setLoading(false);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    /**
     * Выполняет вход пользователя.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @returns {Promise<{success: boolean, message: string, user?: Object}>} Результат операции входа
     */
    const signIn = async (email, password) => {
        try {
            setLoading(true);
            const { user: signedInUser, profile } = await auth.signIn(email, password);
            const updatedUser = { ...signedInUser, profile };
            setUser(updatedUser); // Синхронно обновляем user
            logger.info(`Player ${profile.username} signed in`);
            toast.success('Вход выполнен', { position: 'top-right', autoClose: 3000 });
            return { success: true, message: 'Вход выполнен', user: updatedUser };
        } catch (error) {
            logger.error('Sign-in error:', error.message);
            toast.error(`Ошибка входа: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Регистрирует нового пользователя.
     * @async
     * @param {string} email - Электронная почта пользователя
     * @param {string} password - Пароль пользователя
     * @param {string} username - Имя пользователя
     * @returns {Promise<{success: boolean, message: string}>} Результат операции регистрации
     */
    const signUp = async (email, password, username) => {
        try {
            setLoading(true);
            const { profile } = await auth.signUp(email, password, username);
            logger.info(`Player ${username} registered`);
            await supabase.auth.signOut();
            setUser(null);
            toast.success('Регистрация успешна! Теперь вы можете войти', {
                position: 'top-right',
                autoClose: 3000,
            });
            return { success: true, message: 'Регистрация успешна! Теперь вы можете войти' };
        } catch (error) {
            logger.error('Sign-up error:', error.message);
            await supabase.auth.signOut();
            setUser(null);
            toast.error(`Ошибка регистрации: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Выполняет выход пользователя.
     * @async
     * @returns {Promise<{success: boolean, message: string}>} Результат операции выхода
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