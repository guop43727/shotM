// src/gameobjects/WeaponDrop.js
// REQ-WEAPON-003: Weapon drop sprite using Phaser Arcade Physics
// Migrated from game.js WeaponDrop class (lines 563-669)

import Phaser from 'phaser';

/**
 * WeaponDrop — Phaser Sprite for collectible weapon drops.
 * REQ-WEAPON-003: uses Phaser Sprite + Arcade Physics for collision detection.
 */
export class WeaponDrop extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, weaponType) {
    super(scene, x, y, 'weapon-drop');
    this.scene = scene;
    this.weaponType = weaponType;
    this.z = 0;
    this.speed = 0.0015;
    this.collected = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  /**
   * Update drop position along z-axis (perspective depth).
   * Returns true when drop should be removed (collected or passed).
   */
  update() {
    if (this.collected) return true;
    this.z += this.speed;
    if (this.z >= 1) return true;

    // Update screen position based on z
    const pos = this._getScreenPosition();
    this.setPosition(pos.x, pos.y);
    this.setScale(pos.scale);

    return false;
  }

  _getScreenPosition() {
    const vanishingY = 50;
    const canvasHeight = this.scene.scale.height;
    const y = vanishingY + (canvasHeight - vanishingY - 100) * this.z;
    const scale = 0.3 + this.z * 0.7;
    const laneOffset = (Math.random() - 0.5) * 100;
    const x = this.scene.scale.width / 2 + laneOffset * scale;
    return { x, y, scale };
  }

  /**
   * Mark as collected and trigger weapon manager.
   * REQ-WEAPON-003: collision detection handled by Phaser Physics.
   */
  collect() {
    if (this.collected) return;
    this.collected = true;
    this.scene.weaponManager.collectDrop(this.weaponType);
    this.destroy();
  }
}
