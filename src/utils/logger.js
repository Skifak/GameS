/**
 * Простой логгер для клиентской части приложения.
 * Выводит сообщения в консоль с меткой времени.
 * @module logger
 */

/**
 * Логирует информационное сообщение.
 * @param {string} message - Сообщение для логирования
 */
function info(message) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

/**
* Логирует сообщение об ошибке.
* @param {string} message - Сообщение об ошибке
*/
function error(message) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
}

export default { info, error };