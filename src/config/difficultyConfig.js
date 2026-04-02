// REQ-DIFF-001: 20-wave difficulty configuration
// REQ-DIFF-002: Progressive scaling of enemy attributes

export const difficultyConfig = {
  waves: [
    // Wave 1-5: Tutorial phase
    { wave: 1, enemyHp: 15, enemySpeed: 0.0015, enemyCount: 12, spawnRate: 400 },
    { wave: 2, enemyHp: 20, enemySpeed: 0.0016, enemyCount: 16, spawnRate: 380 },
    { wave: 3, enemyHp: 25, enemySpeed: 0.0017, enemyCount: 20, spawnRate: 360 },
    { wave: 4, enemyHp: 30, enemySpeed: 0.0018, enemyCount: 24, spawnRate: 340 },
    { wave: 5, enemyHp: 35, enemySpeed: 0.0019, enemyCount: 28, spawnRate: 320 },

    // Wave 6-10: Intermediate phase
    { wave: 6, enemyHp: 40, enemySpeed: 0.0020, enemyCount: 32, spawnRate: 300 },
    { wave: 7, enemyHp: 45, enemySpeed: 0.0021, enemyCount: 36, spawnRate: 280 },
    { wave: 8, enemyHp: 50, enemySpeed: 0.0022, enemyCount: 40, spawnRate: 260 },
    { wave: 9, enemyHp: 55, enemySpeed: 0.0023, enemyCount: 44, spawnRate: 240 },
    { wave: 10, enemyHp: 60, enemySpeed: 0.0024, enemyCount: 48, spawnRate: 220 },

    // Wave 11-15: Advanced phase
    { wave: 11, enemyHp: 65, enemySpeed: 0.0025, enemyCount: 52, spawnRate: 200 },
    { wave: 12, enemyHp: 70, enemySpeed: 0.0026, enemyCount: 56, spawnRate: 190 },
    { wave: 13, enemyHp: 75, enemySpeed: 0.0027, enemyCount: 60, spawnRate: 180 },
    { wave: 14, enemyHp: 80, enemySpeed: 0.0028, enemyCount: 64, spawnRate: 170 },
    { wave: 15, enemyHp: 85, enemySpeed: 0.0029, enemyCount: 68, spawnRate: 160 },

    // Wave 16-20: Expert phase
    { wave: 16, enemyHp: 90, enemySpeed: 0.0030, enemyCount: 72, spawnRate: 150 },
    { wave: 17, enemyHp: 95, enemySpeed: 0.0031, enemyCount: 76, spawnRate: 140 },
    { wave: 18, enemyHp: 100, enemySpeed: 0.0032, enemyCount: 80, spawnRate: 130 },
    { wave: 19, enemyHp: 105, enemySpeed: 0.0033, enemyCount: 84, spawnRate: 120 },
    { wave: 20, enemyHp: 110, enemySpeed: 0.0034, enemyCount: 88, spawnRate: 100 }
  ]
};
