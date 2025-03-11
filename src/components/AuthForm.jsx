import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function AuthForm() {
    const { signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) throw error;
            } else {
                const { error } = await signUp(email, password, username);
                if (error) throw error;
                setSuccessMessage("Регистрация успешна! Теперь вы можете войти.");
                setIsLogin(true);
                setUsername("");
                setEmail("");
                setPassword("");
            }
        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message || "Произошла ошибка при обработке запроса");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
            <h2>{isLogin ? "Вход" : "Регистрация"}</h2>
            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div className="form-group">
                        <label>Имя пользователя:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Введите имя пользователя"
                        />
                    </div>
                )}
                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Введите ваш email"
                    />
                </div>
                <div className="form-group">
                    <label>Пароль:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Введите пароль"
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
                </button>
            </form>
            <button 
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setSuccessMessage("");
                    setUsername("");
                    setEmail("");
                    setPassword("");
                }}
                className="switch-button"
                disabled={loading}
            >
                {isLogin ? "Создать аккаунт" : "У меня уже есть аккаунт"}
            </button>
            
            <style>{`
                .auth-form-container {
                    max-width: 400px;
                    margin: 50px auto;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    background-color: #fff;
                }
                
                h2 {
                    text-align: center;
                    color: #2c3e50;
                    margin-bottom: 30px;
                }
                
                .form-group {
                    margin-bottom: 20px;
                }
                
                label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #34495e;
                }
                
                input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: border-color 0.3s ease;
                }
                
                input:focus {
                    border-color: #3498db;
                    outline: none;
                }
                
                .error-message {
                    color: #e74c3c;
                    margin: 10px 0;
                    padding: 10px;
                    background-color: #fdeaea;
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                .success-message {
                    color: #27ae60;
                    margin: 10px 0;
                    padding: 12px;
                    background-color: #d4edda;
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                .submit-button {
                    width: 100%;
                    padding: 14px;
                    background-color: #3498db;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-size: 16px;
                    font-weight: 600;
                    transition: background-color 0.3s ease;
                }
                
                .submit-button:hover {
                    background-color: #2980b9;
                }
                
                .submit-button:disabled {
                    background-color: #95a5a6;
                    cursor: not-allowed;
                }
                
                .switch-button {
                    width: 100%;
                    background: none;
                    border: none;
                    color: #3498db;
                    cursor: pointer;
                    margin-top: 20px;
                    padding: 10px;
                    font-size: 14px;
                    text-decoration: underline;
                    transition: color 0.3s ease;
                }
                
                .switch-button:hover {
                    color: #2980b9;
                }
                
                .switch-button:disabled {
                    color: #95a5a6;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

export default AuthForm;