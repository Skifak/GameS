/**
 * React-компонент для интеграции игры Phaser в приложение.
 * Управляет созданием и уничтожением игры, а также передачей активной сцены.
 * @module PhaserGame
 */

import PropTypes from 'prop-types';
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';
import { useAuth } from '../hooks/useAuth';

/**
 * Компонент PhaserGame, обёрнутый в forwardRef для передачи ссылки на игру.
 * @param {Object} props - Свойства компонента
 * @param {Function} [props.currentActiveScene] - Коллбэк для получения текущей сцены
 * @param {Object} ref - Ссылка на объект с игрой и сценой
 * @returns {JSX.Element} Элемент контейнера игры
 */
export const PhaserGame = forwardRef(function PhaserGame({ currentActiveScene }, ref) {
    const game = useRef(null);
    const { user, loading } = useAuth();

    useLayoutEffect(() => {
        if (!loading && user && !game.current) {
            game.current = StartGame("game-container", user);
            if (ref !== null) {
                ref.current = { game: game.current, scene: null };
            }
        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                game.current = null;
            }
        };
    }, [ref, user, loading]);

    useEffect(() => {
        EventBus.on('current-scene-ready', (currentScene) => {
            if (currentActiveScene instanceof Function) {
                currentActiveScene(currentScene);
            }
            if (ref.current) {
                ref.current.scene = currentScene;
            }
        });

        return () => {
            EventBus.removeListener('current-scene-ready');
        };
    }, [currentActiveScene, ref]);

    if (loading || !user) {
        return null; // Не рендерим игру, пока user не загружен
    }

    return <div id="game-container"></div>;
});

PhaserGame.propTypes = {
    /**
     * Функция для обработки текущей активной сцены.
     * @type {Function}
     */
    currentActiveScene: PropTypes.func
};