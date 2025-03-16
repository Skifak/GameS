/**
 * Хук для управления аутентификацией пользователя.
 * Предоставляет методы для входа, регистрации и выхода, а также состояние пользователя.
 * @module useAuth
 */

import { useState, useEffect } from 'react';
import { auth, User } from '../lib/auth';

/**
 * Хук аутентификации.
 * @returns {Object} Объект с методами и состоянием аутентификации
 * @returns {User|null} returns.user - Текущий пользователь
 * @returns {boolean} returns.loading - Состояние загрузки
 * @returns {Function} returns.signIn - Функция входа
 * @returns {Function} returns.signUp - Функция регистрации
 * @returns {Function} returns.signOut - Функция выхода
 * @returns {boolean} returns.isAuthenticated - Флаг аутентификации
 */
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Проверяем наличие сохраненного пользователя
        const savedUser = auth.getCurrentUser();
        setUser(savedUser);
        setLoading(false);
    }, []);

    /**
     * Выполняет вход пользователя.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @returns {Promise<Object>} Результат с данными или ошибкой
     */
    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            const response = await auth.signIn(email, password);
            auth.setAuth(response);
            setUser(response.user);
            return { data: response, error: null };
        } catch (error) {
            return { data: null, error };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Выполняет регистрацию пользователя.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @param {string} username - Имя пользователя
     * @returns {Promise<Object>} Результат с данными или ошибкой
     */
    const signUp = async (email: string, password: string, username: string) => {
        try {
            setLoading(true);
            const response = await auth.signUp(email, password, username);
            return { data: response, error: null };
        } catch (error) {
            return { data: null, error };
        } finally {
            setLoading(false);
        }
    };

    /**
     * Выполняет выход пользователя.
     * @async
     * @returns {Promise<Object>} Результат с ошибкой или без
     */
    const signOut = async () => {
        try {
            await auth.signOut();
            setUser(null);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    return {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user
    };
}