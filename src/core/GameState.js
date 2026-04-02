// src/core/GameState.js
// REQ-CORE-019: Wave management logic preserved (20 waves)
// REQ-CORE-020: Difficulty system logic preserved (baseSpawnRate: 400)
// Migrated from game.js:74-90 global `game` object

export class GameState {
  constructor() {
    // Migrated from game.js:74-90
    this.gold = 100;
    this.lives = 10;
    this.wave = 1;
    this.score = 0;
    this.waveActive = false;
    this.gameOver = false;

    // Wave management state — REQ-CORE-019
    this.enemies = [];
    this.bullets = [];
    this.weaponDrops = [];
    this.numberGates = [];
    this.spawnInterval = null;
    this.baseSpawnRate = 400; // REQ-CORE-020: preserved from game.js:88
    this.waveKills = 0;
    this.waveGoldEarned = 0;

    // Spawn counters — REQ-CORE-019
    this.totalToSpawn = 0;
    this.alreadySpawned = 0;
  }

  /**
   * Reset wave-level counters for a new wave.
   * REQ-CORE-019: wave structure preserved
   */
  nextWave() {
    this.wave += 1;
    this.waveKills = 0;
    this.waveGoldEarned = 0;
    this.waveActive = false;
  }

  /**
   * Add gold and score on enemy kill.
   * GOLD_PER_KILL=10, SCORE_PER_KILL=100 — from game.js:7-23
   */
  recordKill() {
    this.gold += 10;
    this.score += 100;
    this.waveKills += 1;
    this.waveGoldEarned += 10;
  }

  /**
   * Deduct a life when an enemy reaches the defense line.
   * REQ-CORE-008 (via GameScene)
   */
  loseLife() {
    this.lives -= 1;
  }
}
