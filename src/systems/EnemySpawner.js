// src/systems/EnemySpawner.js
// REQ-ENEMY-001: Enemy spawning system
// REQ-ENEMY-002: Enemies use z-based perspective projection
// REQ-ENEMY-003: Spawned enemies have Arcade Physics bodies

import { Enemy } from '../gameobjects/Enemy.js';

// Default spawn interval in ms
const DEFAULT_SPAWN_INTERVAL = 1500;
// Maximum enemies alive simultaneously
const MAX_ENEMIES = 100;

/**
 * EnemySpawner — manages timed enemy creation for the current wave.
 *
 * Usage in GameScene.create():
 *   this.spawner = new EnemySpawner(this, this.enemyGroup);
 *   this.spawner.startWave(waveNumber, totalEnemies);
 *
 * Usage in GameScene.update():
 *   this.spawner.update(delta);
 */
export class EnemySpawner {
  /**
   * @param {Phaser.Scene}              scene       Host scene
   * @param {Phaser.GameObjects.Group}  enemyGroup  Group that owns spawned enemies
   */
  constructor(scene, enemyGroup) {
    this._scene      = scene;
    this._enemyGroup = enemyGroup;

    this._wave            = 1;
    this._remaining       = 0;   // enemies left to spawn this wave
    this._elapsed         = 0;   // ms since last spawn
    this._spawnInterval   = DEFAULT_SPAWN_INTERVAL;
    this._active          = false;
  }

  // ── Wave control ────────────────────────────────────────────────────────────

  /**
   * Begin spawning enemies for the given wave.
   * REQ-ENEMY-001: wave number determines HP/speed/type of enemies.
   *
   * @param {number} wave          Wave number (1-based)
   * @param {number} totalEnemies  How many enemies to spawn this wave
   * @param {number} [interval]    Ms between spawns (optional override)
   */
  startWave(wave, totalEnemies, interval) {
    this._wave          = wave;
    this._remaining     = totalEnemies;
    this._elapsed       = 0;
    this._spawnInterval = interval !== undefined ? interval : DEFAULT_SPAWN_INTERVAL;
    this._active        = true;
  }

  /** Stop spawning (e.g. wave cleared, game over). */
  stop() {
    this._active    = false;
    this._remaining = 0;
  }

  /** @returns {boolean} true while there are still enemies to spawn */
  get isActive() { return this._active && this._remaining > 0; }

  // ── Per-frame update ────────────────────────────────────────────────────────

  /**
   * Tick the spawner — emits 'enemy-spawned' event on the scene when a new
   * Enemy is created.  Caller is responsible for tracking live enemies.
   *
   * REQ-ENEMY-002: Enemy constructor receives wave so it can set z/speed.
   * REQ-ENEMY-003: Enemy constructor enables Arcade Physics body.
   *
   * @param {number} delta  Frame delta ms
   */
  update(delta) {
    if (!this._active || this._remaining <= 0) return;
    // Respect MAX_ENEMIES cap — wait if the field is full
    if (this._enemyGroup.getLength() >= MAX_ENEMIES) return;

    this._elapsed += delta;
    if (this._elapsed < this._spawnInterval) return;

    this._elapsed -= this._spawnInterval;
    this._remaining--;

    const enemy = new Enemy(this._scene, this._wave);
    this._enemyGroup.add(enemy);

    // Notify scene so it can wire up overlaps / UI counters
    this._scene.events.emit('enemy-spawned', enemy);

    if (this._remaining <= 0) {
      this._active = false;
      this._scene.events.emit('wave-spawn-complete', this._wave);
    }
  }
}
