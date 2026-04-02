// src/main.js
// REQ-CORE-001: Initialize Phaser 3 Game instance (900×700)
// REQ-CORE-002: Phaser.AUTO selects WebGL first, Canvas as fallback
// REQ-CORE-016: ES module entry point for Vite dev server

import Phaser from 'phaser';
import gameConfig from './config/gameConfig.js';
import { setupEventListeners } from './init.js';

// REQ-CORE-001, REQ-CORE-002: Create Phaser Game — AUTO renderer picks WebGL or Canvas
const game = new Phaser.Game(gameConfig);

// Expose game to window for debugging
window.game = game;

// Setup event listeners after game initialization
setupEventListeners(game);

export default game;
