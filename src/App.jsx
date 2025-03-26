/**
 * Главный компонент приложения.
 * Управляет аутентификацией, отображением игры Phaser и уведомлениями.
 * @module App
 */

import { useRef, useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import AuthForm from './components/AuthForm';
import { useAuth } from './hooks/useAuth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { canEditMap } from './utils/authUtils';

/**
 * Компонент приложения.
 * Отображает форму аутентификации или игру в зависимости от состояния пользователя.
 * @returns {JSX.Element} Основной интерфейс приложения
 */
function App() {
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const phaserRef = useRef();
  const [activeScene, setActiveScene] = useState('Game');

  if (loading) return <div className="auth-container"><h1>Загрузка...</h1></div>;
  if (!isAuthenticated) return <AuthForm />;

  const handleRedactMap = () => canEditMap(user) ? setActiveScene('EditorScene') : alert('Доступно только для администраторов');
  const handleBackToGame = () => setActiveScene('Game');

  return (
    <div id="game-container">
      <div className="interface">
        <div className="info-panel">
          <div className="location-name">Привет, {user?.profile?.username || 'Игрок'}!</div>
          <div className="tab-content-buttons">
            <button className="profile-text">Профиль</button>
            {activeScene === 'Game' ? (
              <button className="profile-text" onClick={handleRedactMap}>Редактор</button>
            ) : (
              <button className="profile-text" onClick={handleBackToGame}>Вернуться в игру</button>
            )}
            <button className="logout-text" onClick={signOut}>Выйти</button>
          </div>
        </div>
      </div>
      <PhaserGame ref={phaserRef} activeScene={activeScene} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;