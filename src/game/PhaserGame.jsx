// src/game/PhaserGame.jsx
import PropTypes from 'prop-types';
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';
import { useAuth } from '../hooks/useAuth';

export const PhaserGame = forwardRef(function PhaserGame({ currentActiveScene, activeScene }, ref) {
  const game = useRef(null);
  const { loading } = useAuth();

  useLayoutEffect(() => {
    if (!loading && !game.current) {
      game.current = StartGame('game-container');
      if (ref !== null) {
        ref.current = {
          game: game.current,
          scene: null,
          switchScene: (sceneKey) => {
            game.current.scene.start(sceneKey);
            game.current.scene.stop(sceneKey === 'Game' ? 'EditorScene' : 'Game');
          },
        };
      }
    }

    return () => {
      if (game.current) {
        game.current.destroy(true);
        game.current = null;
      }
    };
  }, [ref, loading]);

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

  // Переключаем сцену, если activeScene изменился
  useEffect(() => {
    if (ref.current && ref.current.game && activeScene) {
      ref.current.switchScene(activeScene);
    }
  }, [activeScene]);

  if (loading) {
    return null;
  }

  return null; // Контейнер уже есть в HTML
});

PhaserGame.propTypes = {
  currentActiveScene: PropTypes.func,
  activeScene: PropTypes.string, // Добавляем пропс для текущей сцены
};