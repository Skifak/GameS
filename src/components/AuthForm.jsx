/**
 * React-компонент формы аутентификации.
 * Предоставляет интерфейс для входа и регистрации пользователей с переключением между режимами.
 * @module AuthForm
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Компонент формы для входа или регистрации пользователя.
 * @returns {JSX.Element} Элемент формы аутентификации
 */
function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const { signIn, signUp, loading } = useAuth();

    /**
     * Обрабатывает отправку формы для входа или регистрации.
     * @async
     * @param {Event} e - Событие отправки формы
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (isLogin) {
            const { success, message } = await signIn(email, password);
            setMessage(message);
            setIsError(!success);
        } else {
            if (!username.match(/^[a-zA-Z0-9]{3,20}$/)) {
                setMessage('Имя пользователя: 3-20 символов, только буквы и цифры');
                setIsError(true);
                return;
            }
            if (!email.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
                setMessage('Неверный формат email');
                setIsError(true);
                return;
            }
            const { success, message } = await signUp(email, password, username);
            setMessage(message);
            setIsError(!success);
            if (success) {
                setIsLogin(true);
                setUsername('');
                setEmail('');
                setPassword('');
            }
        }
    };

    return (
        <div className="auth-container">
            <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
            <p>{isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}</p>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <input
                        className="auth-input"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Имя пользователя"
                        required
                        disabled={loading}
                    />
                )}
                <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    disabled={loading}
                />
                <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    required
                    disabled={loading}
                />
                {message && (
                    <div className={isError ? 'auth-error' : 'auth-success'}>{message}</div>
                )}
                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>
            </form>
            <button
                className="back-button"
                onClick={() => {
                    setIsLogin(!isLogin);
                    setMessage('');
                    setUsername('');
                    setEmail('');
                    setPassword('');
                }}
                disabled={loading}
            >
                {isLogin ? 'Создать аккаунт' : 'У меня уже есть аккаунт'}
            </button>
        </div>
    );
}

export default AuthForm;