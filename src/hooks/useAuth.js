/**
 * Хук для управления аутентификацией пользователя.
 * Предоставляет методы для входа, регистрации и выхода, а также состояние пользователя.
 * @module useAuth
 */

import { useState, useEffect } from 'react';
import { supabase, auth } from '../lib/supabase';
import logger from '../utils/logger';

/**
 * Хук аутентификации.
 * @returns {Object} Объект с методами и состоянием аутентификации
 * @returns {Object|null} user - Текущий пользователь с профилем
 * @returns {boolean} loading - Состояние загрузки
 * @returns {Function} signIn - Функция входа
 * @returns {Function} signUp - Функция регистрации
 * @returns {Function} signOut - Функция выхода
 * @returns {boolean} isAuthenticated - Флаг аутентификации
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Проверяет наличие текущего пользователя при монтировании компонента.
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
     * Подписка на изменения состояния аутентификации.
     */
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? { ...session.user, profile: session.user.profile } : null);
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  /**
   * Выполняет вход пользователя.
   * @async
   * @param {string} email - Электронная почта
   * @param {string} password - Пароль
   * @returns {Promise<{success: boolean, message: string}>} Результат операции
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
      return { success: false, message: error.message };
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
   * @returns {Promise<{success: boolean, message: string}>} Результат операции
   */
  const signUp = async (email, password, username) => {
    try {
      setLoading(true);
      const { profile } = await auth.signUp(email, password, username);
      logger.info(`Player ${username} registered`);
      return { success: true, message: 'Регистрация успешна! Теперь вы можете войти' };
    } catch (error) {
      logger.error('Sign-up error:', error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Выполняет выход пользователя.
   * @async
   * @returns {Promise<{success: boolean, message: string}>} Результат операции
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
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, signIn, signUp, signOut, isAuthenticated: !!user };
}