// REQ-COMBAT-001: Arcade Physics collision detection
// REQ-COMBAT-002: Damage calculation logic preserved
// REQ-COMBAT-003: Enemy death effects with Phaser Particles

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  setupCollisions(bullets, enemies, player, numberGates) {
    // REQ-COMBAT-001: Use Arcade Physics overlap
    this.scene.physics.add.overlap(
      bullets,
      enemies,
      this.onBulletHitEnemy,
      null,
      this
    );

    this.scene.physics.add.overlap(
      player,
      enemies,
      this.onPlayerHitEnemy,
      // Process callback: only collide when enemy has reached the player plane
      (playerObj, enemy) => enemy.z >= 950,
      this
    );
  }

  onBulletHitEnemy(bullet, enemy) {
    // REQ-COMBAT-002: Preserve damage calculation logic
    const damage = bullet.damage || 50;
    enemy.hp -= damage;

    bullet.destroy();

    if (enemy.hp <= 0) {
      this.handleEnemyDeath(enemy);
    }
  }

  onPlayerHitEnemy(player, enemy) {
    // Player loses life when enemy reaches them
    this.scene.lives--;
    enemy.destroy();

    if (this.scene.lives <= 0) {
      this.scene.triggerGameOver();
    }
  }

  handleEnemyDeath(enemy) {
    // REQ-COMBAT-003: Death effects with Phaser Particles
    const x = enemy.x;
    const y = enemy.y;

    // Create particle emitter for death effect
    const particles = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 10,
      blendMode: 'ADD'
    });

    particles.explode();

    // Update game state
    this.scene.gold += 10;
    this.scene.score += 100;
    this.scene.waveKills++;

    enemy.destroy();
  }
}
