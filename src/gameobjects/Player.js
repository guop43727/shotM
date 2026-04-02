// src/gameobjects/Player.js
// REQ-PLAYER-001: Player rendered with Phaser Graphics, 3-face box (front/left/right)
// REQ-PLAYER-002: Left/right movement via A/D or arrow keys
// REQ-PLAYER-003: Shoot with Space; bullets use Phaser Sprite (see Bullet.js)
// REQ-ENEMY-003: Arcade Physics body enabled

import Phaser from 'phaser';
import { perspectiveScale } from '../utils/PerspectiveProjection.js';

// Player visual constants — migrated from game.js drawCyberSoldier
const NEON      = '#00e3fd';
const DARK      = '#003a4a';
const MID       = '#005f7a';
const LIGHT     = '#7ff8ff';
const ACCENT    = '#8eff71';

const MOVE_SPEED    = 220; // px/s  REQ-PLAYER-002
const LANE_MIN_X    = 350; // left road edge at player depth
const LANE_MAX_X    = 550; // right road edge at player depth
const PLAYER_Z      = 0;   // player is always at z=0 (near plane)
const FIRE_COOLDOWN = 50;  // ms — default rifle, REQ-PLAYER-003

/**
 * Player — Phaser Graphics object that draws a 2.5D cyber-soldier box.
 * REQ-PLAYER-001: 3-face box (front / left-side / top) via _drawBox helper.
 * REQ-PLAYER-002: movement driven by cursor keys or WASD.
 * REQ-PLAYER-003: fires Bullet instances on Space.
 * REQ-ENEMY-003: Arcade Physics body for overlap detection.
 */
export class Player extends Phaser.GameObjects.Graphics {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x  Initial screen x
   * @param {number} y  Initial screen y (bottom area)
   */
  constructor(scene, x, y) {
    super(scene);

    // REQ-PLAYER-001: position on screen
    this.x = x;
    this.y = y;
    this.z = PLAYER_Z;

    // REQ-PLAYER-002: keyboard state
    this._cursors = null;
    this._wasd   = null;

    // REQ-PLAYER-003: shooting state
    this._lastFire    = 0;
    this._fireCooldown = FIRE_COOLDOWN;
    this._weaponColor  = '#ff7948'; // default rifle color
    this._weaponDamage = 50;
    this._bulletCount  = 1;

    // Count of simultaneous player instances (multiplier display)
    this.count = 1;

    scene.add.existing(this);
    // REQ-ENEMY-003: Arcade Physics body
    scene.physics.add.existing(this);

    this._setupInput();
  }

  // ── Input setup ────────────────────────────────────────────────────────────

  /** REQ-PLAYER-002: bind cursor keys and WASD */
  _setupInput() {
    this._cursors = this.scene.input.keyboard.createCursorKeys();
    this._wasd = this.scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      fire:  Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Set active weapon parameters.
   * Called by WeaponManager when weapon changes.
   * @param {{ color: string, damage: number, bulletCount: number, fireRate: number }} weapon
   */
  setWeapon(weapon) {
    this._weaponColor  = weapon.color       || '#ff7948';
    this._weaponDamage = weapon.damage      || 50;
    this._bulletCount  = weapon.bulletCount || 1;
    this._fireCooldown = weapon.fireRate    || FIRE_COOLDOWN;
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  /**
   * REQ-PLAYER-002: move left/right; REQ-PLAYER-003: fire on Space.
   * @param {number} delta  Frame delta in ms
   * @param {number} time   Scene time in ms
   * @param {Phaser.GameObjects.Group} bulletGroup  Group to add bullets to
   */
  update(delta, time, bulletGroup) {
    this._handleMovement(delta);
    this._handleFiring(time, bulletGroup);
    this._draw();
  }

  // ── Movement ────────────────────────────────────────────────────────────────

  /** REQ-PLAYER-002: keyboard-driven lateral movement */
  _handleMovement(delta) {
    const dt = delta / 1000; // convert ms → seconds
    const moveLeft  = this._cursors.left.isDown  || this._wasd.left.isDown;
    const moveRight = this._cursors.right.isDown || this._wasd.right.isDown;

    if (moveLeft) {
      this.x = Math.max(LANE_MIN_X, this.x - MOVE_SPEED * dt);
    } else if (moveRight) {
      this.x = Math.min(LANE_MAX_X, this.x + MOVE_SPEED * dt);
    }
  }

  // ── Firing ──────────────────────────────────────────────────────────────────

  /**
   * REQ-PLAYER-003: fire bullet(s) on Space key with cooldown.
   * @param {number} time          Scene time ms
   * @param {Phaser.GameObjects.Group} bulletGroup
   */
  _handleFiring(time, bulletGroup) {
    const fireKey = this._cursors.space || this._wasd.fire;
    if (!fireKey || !fireKey.isDown) return;
    if (time - this._lastFire < this._fireCooldown) return;

    this._lastFire = time;
    // REQ-PLAYER-003: emit event so GameScene can create Bullet objects
    this.scene.events.emit('player-fire', {
      x:           this.x,
      y:           this.y - 20,
      bulletCount: this._bulletCount,
      damage:      this._weaponDamage,
      color:       this._weaponColor,
    });
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  /**
   * REQ-PLAYER-001: draw 3-face box cyber-soldier using Phaser Graphics.
   * Migrated from game.js drawCyberSoldier() / _drawBox().
   */
  _draw() {
    this.clear();
    // REQ-ENEMY-002: player is always at z=0, scale=1
    const s = perspectiveScale(this.z); // = 1.0
    this._drawCyberSoldier(s, false);
  }

  /**
   * Draw a single cyber-soldier at current Graphics origin.
   * REQ-PLAYER-001: front face + right side + top face (3-face box).
   * @param {number}  s       Scale factor
   * @param {boolean} hasGun  Whether to draw gun (center player)
   */
  _drawCyberSoldier(s, hasGun) {
    // Ground shadow
    this.fillStyle(0x000000, 0.25);
    this.fillEllipse(0, 32 * s, 28 * s, 8 * s);

    // Legs — right (front) and left (back)
    this._drawBox(2*s,  10*s,  7*s, 14*s, MID,  DARK,       NEON,   3*s);
    this._drawBox(-9*s, 10*s,  7*s, 14*s, DARK, '#001f28',  MID,    3*s);

    // Torso
    this._drawBox(-11*s, -8*s, 22*s, 18*s, MID, DARK, NEON, 5*s);

    // Chest highlight
    this.fillStyle(0x7ff8ff, 0.15);
    this.fillTriangle(-9*s, -6*s,  9*s, -6*s,  7*s, 2*s);
    this.fillTriangle(-9*s, -6*s,  7*s,  2*s, -7*s, 2*s);

    // Energy core
    this.fillStyle(Phaser.Display.Color.HexStringToColor(ACCENT).color, 1);
    this.fillCircle(0, -1*s, 3*s);

    // Arms — left (back) and right (front)
    this._drawBox(-16*s, -6*s, 5*s, 12*s, DARK, '#001f28', MID,  2*s);
    this._drawBox( 11*s, -6*s, 5*s, 12*s, MID,  DARK,      NEON, 2*s);

    // Head
    this._drawBox(-9*s, -22*s, 18*s, 14*s, MID, DARK, NEON, 4*s);

    // Helmet top bevel
    this.fillStyle(Phaser.Display.Color.HexStringToColor(LIGHT).color, 1);
    this.fillTriangle(-9*s, -22*s,  9*s, -22*s, 11*s, -24*s);
    this.fillTriangle(-9*s, -22*s, 11*s, -24*s, -7*s, -24*s);

    // Visor eyes
    const accentInt = Phaser.Display.Color.HexStringToColor(ACCENT).color;
    this.fillStyle(accentInt, 1);
    this.fillRect(-7*s, -18*s, 5*s, 4*s);
    this.fillRect( 2*s, -18*s, 5*s, 4*s);
  }

  /**
   * Draw a 2.5D box: front face + right side + top face.
   * REQ-PLAYER-001: 3-face box primitive, migrated from game.js _drawBox().
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
      { x: x,         y: y },
      { x: x + w,     y: y },
      { x: x + w + depth, y: y - depth },
      { x: x + depth, y: y - depth },
    ], true);

    // Front face
    this.fillStyle(face, 1);
    this.fillRect(x, y, w, h);

    // Edge outline
    this.lineStyle(0.8, edge, 1);
    this.strokeRect(x, y, w, h);
  }
}


