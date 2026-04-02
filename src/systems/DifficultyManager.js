// REQ-DIFF-001: 20-wave progressive difficulty system
// REQ-DIFF-002: Enemy HP/speed/count scales with wave

import { difficultyConfig } from '../config/difficultyConfig.js';

export class DifficultyManager {
  constructor() {
    this.currentWave = 1;
    this.config = difficultyConfig;
  }

  getWaveConfig(wave) {
    // REQ-DIFF-001: Return config for wave 1-20
    const waveIndex = Math.min(wave, 20) - 1;
    return this.config.waves[waveIndex];
  }

  getEnemyStats(wave) {
    const config = this.getWaveConfig(wave);
    return {
      hp: config.enemyHp,
      speed: config.enemySpeed,
      count: config.enemyCount
    };
  }

  getSpawnRate(wave) {
    const config = this.getWaveConfig(wave);
    return config.spawnRate;
  }

  getEnemyType(wave) {
    // REQ-DIFF-002: Enemy type progression
    if (wave <= 3) return 'grunt';
    if (wave <= 7) return 'heavy';
    return 'elite';
  }
}
