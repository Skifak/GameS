/**
 * Точка входа React-приложения.
 * Инициализирует рендеринг компонента App.
 * @module Main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

/**
 * Инициализирует приложение, рендеря App в корневой элемент.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)