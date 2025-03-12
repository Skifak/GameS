import { useState, useEffect } from 'react';
import { auth, User } from '../lib/auth';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Проверяем наличие сохраненного пользователя
        const savedUser = auth.getCurrentUser();
        setUser(savedUser);
        setLoading(false);
    }, []);

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