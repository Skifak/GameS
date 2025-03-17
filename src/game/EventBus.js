/**
 * Событийная шина для взаимодействия между React-компонентами и сценами Phaser.
 * @module EventBus
 */

import Phaser from 'phaser';

// Used to emit events between React components and Phaser scenes
// https://newdocs.phaser.io/docs/3.70.0/Phaser.Events.EventEmitter
/**
 * Экземпляр событийной шины Phaser.
 * Используется для передачи событий между React-компонентами и сценами Phaser.
 * @type {Phaser.Events.EventEmitter}
 */
export const EventBus = new Phaser.Events.EventEmitter();