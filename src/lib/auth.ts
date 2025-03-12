import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export interface User {
    id: string;
    email: string;
    username: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export const auth = {
    // Регистрация
    signUp: async (email: string, password: string, username: string): Promise<AuthResponse> => {
        const response = await axios.post(`${API_URL}/api/auth/register`, {
            email,
            password,
            username
        });
        return response.data;
    },

    // Вход
    signIn: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password
        });
        return response.data;
    },

    // Выход
    signOut: async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Получение текущего пользователя
    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Получение токена
    getToken: (): string | null => {
        return localStorage.getItem('token');
    },

    // Установка данных аутентификации
    setAuth: (data: AuthResponse) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
}; 