// src/scenes/PreloadScene.js
// REQ-CORE-003: Phaser Scene lifecycle — preload() loads assets before GameScene
// REQ-CORE-016: ES module, no global variables

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Display a simple loading bar while assets load
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x222244);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 20, 0x8eff71);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
    });

    // No external asset files in this unit — audio is synthesised via Web Audio API
    // Future units (UNIT-002+) will load weapon sprites here
  }

  create() {
    // Transition to main game scene
    this.scene.start('GameScene');
  }
}
