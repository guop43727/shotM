// src/gameobjects/Enemy.js
// REQ-ENEMY-001: Enemy rendered with Phaser Graphics, 3-face box
// REQ-ENEMY-002: Perspective projection based on z coordinate
// REQ-ENEMY-003: Arcade Physics body enabled

import Phaser from 'phaser';
import { projectToScreen } from '../utils/PerspectiveProjection.js';

// Enemy type color palettes — migrated from game.js Enemy.draw()
const TYPE_COLORS = {
  grunt: { face: '#8b0000', side: '#4a0000', edge: '#ff4060', eye: '#ff4060', depth: 2 },
  heavy: { face: '#1a1a4e', side: '#0d0d2b', edge: '#4040ff', eye: '#00aaff', depth: 3 },
  elite: { face: '#2d0050', side: '#1a0030', edge: '#cc00ff', eye: '#ff00ff', depth: 4 },
};

/**
 * Enemy — Phaser Graphics object that draws a perspective-scaled 2.5D soldier.
 * REQ-ENEMY-001: 3-face box (front/side/top) via _drawBox helper.
 * REQ-ENEMY-002: position and scale derived from z via perspectiveScale().
 * REQ-ENEMY-003: Arcade Physics body for bullet/player overlap.
 */
export class Enemy extends Phaser.GameObjects.Graphics {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} wave   Current wave number (affects HP and speed)
   * @param {number|null} customLaneOffset  Override lane position
   */
  constructor(scene, wave, customLaneOffset = null) {
    super(scene);

    // REQ-ENEMY-002: depth starts at far end (z=0 maps to vanishing point)
    this.z = 0;
    this.laneOffset = customLaneOffset !== null
      ? customLaneOffset
      : (Math.random() - 0.5) * 100;

    // HP/speed scaled by wave — migrated from game.js Enemy constructor
    const BASE_HP    = 10;
    const HP_PER_WAVE = 5;
    const BASE_SPEED  = 1.5;  // world-units per second (z-axis)
    const SPEED_PER_WAVE = 0.1;

    this.hp     = BASE_HP    + wave * HP_PER_WAVE;
    this.maxHp  = this.hp;
    this.speed  = BASE_SPEED + wave * SPEED_PER_WAVE; // units/s in z-space
    this.baseSize = 40;

    // Enemy type by wave — grunt / heavy / elite
    this.type = wave <= 3 ? 'grunt' : wave <= 7 ? 'heavy' : 'elite';

    // Walk animation phase (random offset so enemies don't sync)
    this.walkPhase = Math.random() * Math.PI * 2;

    scene.add.existing(this);
    // REQ-ENEMY-003: Arcade Physics body
    scene.physics.add.existing(this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** @returns {boolean} true when this enemy should be removed (reached player) */
  get isDead() { return this.hp <= 0; }
  get isPassed() { return this.z >= 1000; }

  /**
   * Apply damage to this enemy.
   * @param {number} amount
   */
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  /**
   * Compute screen position from current z depth.
   * REQ-ENEMY-002: perspective projection preserved from game.js.
   * @returns {{ x: number, y: number, scale: number }}
   */
  getScreenPosition() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    return projectToScreen(this.laneOffset, this.z, w, h);
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  /**
   * Advance z and redraw.
   * REQ-ENEMY-002: z increases → enemy moves toward player (near = large).
   * @param {number} delta  Frame delta in ms
   * @returns {boolean} true if enemy reached the player plane
   */
  update(delta) {
    // REQ-ENEMY-002: move along z axis, perspective handles screen position
    this.z += this.speed * (delta / 1000) * 1000;
    const pos = this.getScreenPosition();
    this.setPosition(pos.x, pos.y);
    // Update Arcade Physics body position
    if (this.body) {
      this.body.reset(pos.x, pos.y);
    }
    this._draw(pos.scale);
    return this.isPassed;
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  /**
   * REQ-ENEMY-001: Draw 3-face box soldier scaled by perspective.
   * Migrated from game.js Enemy.draw().
   * @param {number} s  Scale factor from perspective projection
   */
  _draw(s) {
    this.clear();
    const c = TYPE_COLORS[this.type] || TYPE_COLORS.grunt;
    const walkCycle = Math.sin(Date.now() * 0.008 + this.walkPhase);
    const bodyBob   = Math.abs(walkCycle) * 1.5 * s;

    // Legs
    this._drawBox( 2*s, (10 + bodyBob)*s,  7*s, 14*s, c.face, c.side, c.edge, c.depth*s);
    this._drawBox(-9*s, (10 + bodyBob)*s,  7*s, 14*s, c.side, c.side, c.edge, c.depth*s);

    // Torso
    this._drawBox(-11*s, (-8 + bodyBob)*s, 22*s, 18*s, c.face, c.side, c.edge, c.depth*s);

    // Arms
    this._drawBox(-16*s, (-6 + bodyBob)*s, 5*s, 12*s, c.side, c.side, c.edge, c.depth*s);
    this._drawBox( 11*s, (-6 + bodyBob)*s, 5*s, 12*s, c.face, c.side, c.edge, c.depth*s);

    // Head
    this._drawBox(-9*s, (-22 + bodyBob)*s, 18*s, 14*s, c.face, c.side, c.edge, c.depth*s);

    // Eyes
    const eyeInt = Phaser.Display.Color.HexStringToColor(c.eye).color;
    this.fillStyle(eyeInt, 1);
    this.fillRect(-6*s, (-18 + bodyBob)*s, 4*s, 3*s);
    this.fillRect( 2*s, (-18 + bodyBob)*s, 4*s, 3*s);

    // Elite shoulder pads
    if (this.type === 'elite') {
      this._drawBox(-14*s, (-10 + bodyBob)*s, 5*s, 6*s, c.face, c.side, c.edge, c.depth*s);
      this._drawBox(  9*s, (-10 + bodyBob)*s, 5*s, 6*s, c.face, c.side, c.edge, c.depth*s);
    }

    // HP bar
    this._drawHpBar(s);
  }

  /**
   * Draw HP bar above the enemy.
   * Migrated from game.js Enemy.draw() HP section.
   * @param {number} s  Scale factor
   */
  _drawHpBar(s) {
    const hpPercent = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    const barW = 50 * s;
    const barH = 4  * s;
    const bx   = -barW / 2;
    const by   = -30 * s;

    // Background
    this.fillStyle(0x333333, 1);
    this.fillRect(bx, by, barW, barH);

    // Fill color: green > 50%, yellow > 25%, red otherwise
    const fillColor = hpPercent > 0.5 ? 0x8eff71
                    : hpPercent > 0.25 ? 0xffeb3b
                    : 0xff4060;
    this.fillStyle(fillColor, 1);
    this.fillRect(bx, by, barW * hpPercent, barH);

    // Border
    this.lineStyle(1, 0xffffff, 0.2);
    this.strokeRect(bx, by, barW, barH);
  }

  /**
   * Draw a 2.5D box: front face + right side + top face.
   * REQ-ENEMY-001: 3-face box primitive, migrated from game.js _drawBox().
   */
  _drawBox(x, y, w, h, faceColor, sideColor, edgeColor, depth) {
    const face = Phaser.Display.Color.HexStringToColor(faceColor).color;
    const side = Phaser.Display.Color.HexStringToColor(sideColor).color;
    const edge = Phaser.Display.Color.HexStringToColor(edgeColor).color;

    // Right side face
    this.fillStyle(side, 1);
    this.fillPoints([
      { x: x + w,         y: y },
      { x: x + w + depth, y: y - depth },
      { x: x + w + depth, y: y + h - depth },
      { x: x + w,         y: y + h },
    ], true);

    // Top face
    this.fillStyle(edge, 0.4);
    this.fillPoints([
      { x: x,             y: y },
      { x: x + w,         y: y },
      { x: x + w + depth, y: y - depth },
      { x: x + depth,     y: y - depth },
    ], true);

    // Front face
    this.fillStyle(face, 1);
    this.fillRect(x, y, w, h);

    // Edge outline
    this.lineStyle(0.8, edge, 1);
    this.strokeRect(x, y, w, h);
  }
}


