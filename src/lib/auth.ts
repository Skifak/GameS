/**
 * Модуль для работы с аутентификацией через API.
 * Предоставляет функции для регистрации, входа и управления данными пользователя.
 * @module Auth
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Интерфейс пользователя.
 * @typedef {Object} User
 * @property {string} id - Уникальный идентификатор
 * @property {string} email - Электронная почта
 * @property {string} username - Имя пользователя
 */

/**
 * Ответ аутентификации.
 * @typedef {Object} AuthResponse
 * @property {User} user - Данные пользователя
 * @property {string} token - Токен доступа
 */

/**
 * Объект методов аутентификации.
 */
export const auth = {
    /**
     * Регистрирует нового пользователя.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @param {string} username - Имя пользователя
     * @returns {Promise<AuthResponse>} Данные пользователя и токен
     */
    signUp: async (email: string, password: string, username: string): Promise<AuthResponse> => {
        const response = await axios.post(`${API_URL}/api/auth/register`, {
            email,
            password,
            username
        });
        return response.data;
    },

    /**
     * Выполняет вход пользователя.
     * @async
     * @param {string} email - Электронная почта
     * @param {string} password - Пароль
     * @returns {Promise<AuthResponse>} Данные пользователя и токен
     */
    signIn: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password
        });
        return response.data;
    },

    /**
     * Выполняет выход пользователя.
     * @async
     */
    signOut: async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    /**
     * Возвращает текущего пользователя из локального хранилища.
     * @returns {User|null} Данные пользователя или null
     */
    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Возвращает токен из локального хранилища.
     * @returns {string|null} Токен или null
     */
    getToken: (): string | null => {
        return localStorage.getItem('token');
    },

    /**
     * Сохраняет данные аутентификации в локальное хранилище.
     * @param {AuthResponse} data - Данные аутентификации
     */
    setAuth: (data: AuthResponse) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
};