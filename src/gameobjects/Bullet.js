// src/gameobjects/Bullet.js
// REQ-PLAYER-003: Bullet uses Phaser Sprite + Arcade Physics body
// REQ-ENEMY-003: Arcade Physics overlap for bullet-enemy collision

import Phaser from 'phaser';

// Bullet travel speed as fraction of journey per second
const BULLET_SPEED = 20; // units/s in progress space (0→1 in ~50ms at 20/s)

/**
 * Bullet — Phaser Sprite that travels from player to target.
 * REQ-PLAYER-003: Sprite class with Arcade Physics body.
 * REQ-ENEMY-003: physics body enables overlap detection with enemies.
 *
 * Lifecycle: add to a Phaser.GameObjects.Group; each frame call update();
 * remove when update() returns true.
 */
export class Bullet extends Phaser.GameObjects.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} startX   Origin screen x (player position)
   * @param {number} startY   Origin screen y (player position)
   * @param {{ x: number, y: number }|null} target  Target screen position
   * @param {number} damage   Damage amount
   * @param {string} color    Hex color string e.g. '#ff7948'
   * @param {number} spread   Lateral spread offset for shotgun pellets
   */
  constructor(scene, startX, startY, target, damage, color, spread = 0) {
    // REQ-PLAYER-003: Phaser Sprite (texture key 'bullet' or fallback circle)
    super(scene, startX, startY, 'bullet');

    this._startX   = startX;
    this._startY   = startY;
    this._target   = target;   // { x, y } or null
    this._damage   = damage;
    this._color    = color || '#ff7948';
    this._spread   = spread;
    this._progress = 0;
    this._speed    = BULLET_SPEED; // progress units per second

    // Tint the sprite with weapon color
    const colorInt = Phaser.Display.Color.HexStringToColor(this._color).color;
    this.setTint(colorInt);
    this.setScale(0.5);

    scene.add.existing(this);
    // REQ-ENEMY-003: Arcade Physics body
    scene.physics.add.existing(this);
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  /** Damage value this bullet carries. */
  get damage() { return this._damage; }

  // ── Per-frame update ────────────────────────────────────────────────────────

  /**
   * Advance bullet toward target.
   * REQ-PLAYER-003: bullet travels toward enemy; on arrival deals damage.
   * @param {number} delta  Frame delta ms
   * @returns {boolean} true when bullet has reached its target and should be destroyed
   */
  update(delta) {
    this._progress += this._speed * (delta / 1000);

    const endX = this._target ? this._target.x : this._startX;
    const endY = this._target ? this._target.y : 0;

    const bx = this._startX + (endX - this._startX + this._spread) * this._progress;
    const by = this._startY + (endY - this._startY) * this._progress;

    this.setPosition(bx, by);
    if (this.body) {
      this.body.reset(bx, by);
    }

    return this._progress >= 1;
  }
}
