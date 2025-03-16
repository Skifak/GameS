/**
 * Главный компонент приложения.
 * Управляет аутентификацией и отображением игры Phaser.
 * @module App
 */

import { useRef } from 'react';
import { PhaserGame } from './game/PhaserGame';
import AuthForm from './components/AuthForm';
import { useAuth } from './hooks/useAuth';

/**
 * Компонент приложения.
 * @returns {JSX.Element} Основной интерфейс приложения
 */
function App() {
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const phaserRef = useRef();

  if (loading) {
    return (
      <div className="auth-container">
        <h1>Загрузка...</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <div id="game-container">
      <div className="interface">
        <div className="info-panel">
          <div className="location-name">Привет, {user.profile?.username || 'Игрок'}!</div>
          <div className="tab-content-buttons">
            <button className="profile-text">Профиль</button>
            <button className="logout-text" onClick={signOut}>
              Выйти
            </button>
          </div>
        </div>
      </div>
      <PhaserGame ref={phaserRef} />
    </div>
  );
}

export default App;