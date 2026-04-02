// src/scenes/GameScene.js
// REQ-CORE-003: Phaser Scene update() drives game loop
// REQ-CORE-004: Perspective road background (vanishing point y=50, bottom width 600px)

import Phaser from 'phaser';
import { GameState } from '../core/GameState.js';
import { Player } from '../gameobjects/Player.js';
import { Enemy } from '../gameobjects/Enemy.js';
import { Bullet } from '../gameobjects/Bullet.js';
import { WeaponDrop } from '../gameobjects/WeaponDrop.js';
import { NumberGate } from '../gameobjects/NumberGate.js';
import { EnemySpawner } from '../systems/EnemySpawner.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { WeaponManager } from '../systems/WeaponManager.js';
import { DifficultyManager } from '../systems/DifficultyManager.js';
import { HUD } from '../ui/HUD.js';
import { PauseMenu } from '../ui/PauseMenu.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // REQ-CORE-019, REQ-CORE-020: Initialize game state
    this.gameState = new GameState();

    // REQ-CORE-004: Perspective road graphics
    this.roadGraphics = this.add.graphics();

    // Initialize systems
    this.weaponManager = new WeaponManager(this);
    this.difficultyManager = new DifficultyManager();
    this.combatSystem = new CombatSystem(this);

    // Initialize UI
    this.hud = new HUD(this.gameState);
    this.pauseMenu = new PauseMenu(this);

    // Create Phaser groups
    // Use plain groups that accept any GameObject type
    this.enemies = this.add.group({ runChildUpdate: false });
    this.bullets = this.add.group();
    this.weaponDrops = this.add.group();
    this.numberGates = this.add.group();

    // REQ-PLAYER-001: Create player using Phaser Graphics
    this.player = new Player(this, this.scale.width / 2, this.scale.height - 120);

    // Initialize EnemySpawner with enemy group
    this.enemySpawner = new EnemySpawner(this, this.enemies);

    // Setup collision detection
    this.combatSystem.setupCollisions(this.bullets, this.enemies, this.player, this.numberGates);

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      a: this.input.keyboard.addKey('A'),
      d: this.input.keyboard.addKey('D'),
      space: this.input.keyboard.addKey('SPACE'),
      esc: this.input.keyboard.addKey('ESC')
    };

    // ESC pause
    this.keys.esc.on('down', () => this.pauseMenu.toggle());

    // Listen for wave spawn complete
    this.events.on('wave-spawn-complete', () => {
      if (this.enemies.children.size === 0) {
        this._onWaveComplete();
      }
    });
  }

  update(time, delta) {
    if (this.pauseMenu.isPaused || this.gameState.gameOver) return;

    // REQ-CORE-004: Draw perspective road
    this._drawRoad();

    // Update enemy spawner
    this.enemySpawner.update(delta);

    // Update player
    this.player.update(delta, this.cursors, this.keys);

    // Player firing
    if (this.keys.space.isDown && time - this.player.lastFire > this.player.fireRate) {
      this._fireBullet();
      this.player.lastFire = time;
    }

    // Update enemies
    this.enemies.children.entries.forEach(enemy => {
      enemy.update(delta);
      if (enemy.isPassed) {
        this.gameState.loseLife();
        this.hud.update();
        enemy.destroy();
      }
    });

    // Update bullets
    this.bullets.children.entries.forEach(bullet => {
      const arrived = bullet.update(delta);
      if (arrived) bullet.destroy();
    });

    // Update weapon drops
    this.weaponDrops.children.entries.forEach(drop => {
      if (drop.update(delta)) drop.destroy();
    });

    // Update number gates
    this.numberGates.children.entries.forEach(gate => {
      if (gate.update(delta)) gate.destroy();
    });

    // Update HUD
    this.hud.update();

    // Check wave completion
    if (this.gameState.waveActive &&
        this.enemies.children.size === 0 &&
        !this.enemySpawner.isActive) {
      this._onWaveComplete();
    }
  }

  _drawRoad() {
    const g = this.roadGraphics;
    g.clear();

    const W = this.scale.width;
    const H = this.scale.height;
    const vanishY = 50;
    const roadW = 300;

    // REQ-CORE-004: Perspective trapezoid
    g.fillStyle(0x1a1a1a);
    g.beginPath();
    g.moveTo(W/2 - roadW/2, vanishY);
    g.lineTo(W/2 + roadW/2, vanishY);
    g.lineTo(W/2 + roadW, H);
    g.lineTo(W/2 - roadW, H);
    g.closePath();
    g.fillPath();

    // Center line
    g.lineStyle(2, 0xffff00, 0.5);
    g.beginPath();
    g.moveTo(W/2, vanishY);
    g.lineTo(W/2, H);
    g.strokePath();
  }

  _fireBullet() {
    const bullet = new Bullet(this, this.player.x, this.player.y, this.player.z);
    this.bullets.add(bullet);
  }

  _startWave() {
    const config = this.difficultyManager.getWaveConfig(this.gameState.wave);
    this.enemySpawner.startWave(this.gameState.wave, config.enemyCount, config.spawnRate);
  }

  _onWaveComplete() {
    this.gameState.waveActive = false;
    this.gameState.wave++;

    // Show wave complete UI (simplified for now)
    setTimeout(() => this._startWave(), 2000);
  }
}
