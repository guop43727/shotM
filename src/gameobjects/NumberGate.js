// REQ-GATE-001: Number gate using Phaser Graphics
// REQ-GATE-002: Buff/debuff effects on player pass-through

export class NumberGate extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, z) {
    super(scene);
    scene.add.existing(this);

    this.x = x;
    this.y = y;
    this.z = z;
    this.laneOffset = (Math.random() - 0.5) * 80;
    this.speed = 0.0015;

    // REQ-GATE-002: 50% positive (+1 to +5), 50% negative (-1 to -3)
    this.value = Math.random() < 0.5
      ? 1 + Math.floor(Math.random() * 5)
      : -1 - Math.floor(Math.random() * 3);

    this.hit = false;
    this.hitCount = 0;

    this.draw();
  }

  draw() {
    this.clear();

    const color = this.value >= 0 ? 0x8eff71 : 0xff7351;
    const width = 80 + Math.abs(this.value) * 15;
    const height = 100;

    // REQ-GATE-001: Draw gate with Graphics
    this.lineStyle(4, color, 1);

    // Left pillar
    this.strokeRect(-width/2, -height/2, 10, height);
    // Right pillar
    this.strokeRect(width/2 - 10, -height/2, 10, height);
    // Top bar
    this.strokeRect(-width/2, -height/2, width, 10);
  }

  applyEffect(player) {
    // REQ-GATE-002: Apply buff/debuff to player count
    if (!this.hit) {
      this.hit = true;
      const oldCount = player.count;
      player.count = Math.max(1, player.count + this.value);
      return player.count > oldCount;
    }
    return false;
  }

  update() {
    this.z += this.speed;

    // Check if gate reached player
    if (this.z > 0.9 && !this.hit) {
      return true; // Signal to apply effect
    }

    return this.z >= 1; // Remove if passed
  }
}
