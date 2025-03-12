import { useRef } from 'react';
import Phaser from 'phaser';
import { PhaserGame } from './game/PhaserGame';
import AuthForm from './components/AuthForm';
import { useAuth } from './hooks/useAuth';

function App() {
    const { isAuthenticated, loading, user, logout } = useAuth();
    const phaserRef = useRef();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
                <style>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background-color: #f5f6fa;
                    }
                    
                    .loading-spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    p {
                        color: #2c3e50;
                        font-size: 18px;
                    }
                `}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthForm />;
    }

    return (
        <div id="app">
            <div className="header">
                <div className="user-info">
                    <span>Привет, {user?.name || 'Игрок'}!</span>
                </div>
                <button onClick={logout} className="logout-button">
                    Выйти
                </button>
            </div>
            
            <PhaserGame ref={phaserRef} />
            
            <style>{`
                #app {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    background-color: #2c3e50;
                    color: white;
                }
                
                .user-info {
                    font-size: 16px;
                }
                
                .logout-button {
                    padding: 8px 16px;
                    background-color: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s ease;
                }
                
                .logout-button:hover {
                    background-color: #c0392b;
                }
            `}</style>
        </div>
    );
}

export default App;