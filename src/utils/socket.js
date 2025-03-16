/**
 * Модуль для работы с WebSocket-клиентом Colyseus.
 * Создаёт клиент с токеном аутентификации.
 * @module SocketClient
 */

import { Client } from "colyseus.js";

/**
 * Токен аутентификации из локального хранилища.
 * @type {string|null}
 */
const token = localStorage.getItem("token");

/**
 * Клиент Colyseus для подключения к игровым комнатам.
 * @type {Object}
 */
const client = new Client(import.meta.env.VITE_WS_URL, { token });

export default client;