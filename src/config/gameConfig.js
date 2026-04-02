// src/config/gameConfig.js
// REQ-CORE-001: Phaser 3 WebGL renderer, 900×700 canvas
// REQ-CORE-002: AUTO type — falls back to Canvas when WebGL unavailable
// REQ-CORE-003: Scene update() drives game loop

import Phaser from 'phaser';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { GameScene } from '../scenes/GameScene.js';

// REQ-CORE-001, REQ-CORE-002: Phaser.AUTO selects WebGL first, Canvas as fallback
const gameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#0a0a0a',
  scene: [PreloadScene, GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

export default gameConfig;
