// src/systems/WeaponManager.js
// REQ-WEAPON-001: Weapon collection and persistence (migrated from weaponManager.js)
// L0-AC-001: Weapon inventory with localStorage + sessionStorage fallback
// L0-AC-002: 3:1 synthesis with atomic rollback
// L0-AC-003: Ultimate fusion (3 Super → Ultimate Laser)
// REQ-WEAPON-002: Phaser EventEmitter integration for weapon events

import { WEAPON_CONFIG, buildEvolutionTree, canMerge } from './WeaponEvolution.js';
import { mergeWeapons, mergeToMax, fuseUltimateWeapon } from './WeaponMerge.js';

// Storage key — migrated from weaponManager.js
const STORAGE_KEY = 'weapon_inventory';

/**
 * StorageAdapter: localStorage with sessionStorage fallback.
 * Migrated from weaponManager.js StorageAdapter.
 */
const StorageAdapter = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      try { return sessionStorage.getItem(key); } catch { return null; }
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      try { sessionStorage.setItem(key, value); return true; } catch { return false; }
    }
  }
};

/**
 * WeaponManager — Phaser Scene system component.
 * Attach as `this.weaponManager = new WeaponManager(this)` in GameScene.create().
 * REQ-WEAPON-001: preserves inventory, evolution, merge, drop logic.
 * REQ-WEAPON-002: emits events via scene.events (Phaser EventEmitter).
 */
export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.inventory = {};
    this.activeWeaponId = null;
    this._saveTimer = null;
    this._loadInventory();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /** L0-AC-001: Load inventory from storage, default to { rifle: 1 } on first run. */
  _loadInventory() {
    try {
      const raw = StorageAdapter.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.inventory = (typeof parsed === 'object' && parsed !== null) ? parsed : {};
      } else {
        this.inventory = { rifle: 1 };
      }
    } catch {
      this.inventory = { rifle: 1 };
    }
  }

  /**
   * Persist a given inventory snapshot.
   * Returns true on success, false on failure.
   */
  _saveInventory(inventorySnapshot) {
    try {
      return StorageAdapter.setItem(STORAGE_KEY, JSON.stringify(inventorySnapshot));
    } catch {
      return false;
    }
  }

  /** Debounced save (300 ms) — migrated from weaponManager.js debouncedSave(). */
  _debouncedSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._saveInventory(this.inventory), 300);
  }

  // ── Inventory queries ─────────────────────────────────────────────────────

  /** Return a shallow copy of the current inventory (immutable guard). */
  getInventory() {
    return { ...this.inventory };
  }

  /** REQ-WEAPON-001: getWeaponCount — migrated from weaponManager.js:148. */
  getWeaponCount(weaponId) {
    return this.inventory[weaponId] || 0;
  }

  /** REQ-WEAPON-001: getTotalWeaponCount — migrated from weaponManager.js:156. */
  getTotalWeaponCount() {
    return Object.values(this.inventory).reduce((a, b) => a + b, 0);
  }

  /** Return WEAPON_CONFIG entry for a given id. */
  getWeaponConfig(weaponId) {
    return WEAPON_CONFIG[weaponId] || null;
  }

  /** Build evolution tree for UI consumption. */
  getEvolutionTree() {
    return buildEvolutionTree(this.inventory);
  }

  // ── Inventory mutations ───────────────────────────────────────────────────

  /**
   * Add a weapon to the inventory.
   * REQ-WEAPON-001: addWeapon() migrated from weaponManager.js:163.
   * REQ-WEAPON-002: emits 'weapon:added' event.
   */
  addWeapon(weaponId) {
    if (!WEAPON_CONFIG[weaponId]) return false;
    const newInventory = { ...this.inventory, [weaponId]: (this.inventory[weaponId] || 0) + 1 };
    const saved = this._saveInventory(newInventory);
    if (!saved) return false;
    this.inventory = newInventory;
    this.scene.events.emit('weapon:added', { weaponId, count: this.inventory[weaponId] });
    return true;
  }

  /**
   * Remove one copy of a weapon from inventory.
   * REQ-WEAPON-001: removeWeapon() migrated from weaponManager.js:186.
   */
  removeWeapon(weaponId) {
    const count = this.inventory[weaponId] || 0;
    if (count <= 0) return false;
    const newCount = count - 1;
    const newInventory = { ...this.inventory, [weaponId]: newCount };
    if (newCount === 0) delete newInventory[weaponId];
    const saved = this._saveInventory(newInventory);
    if (!saved) return false;
    this.inventory = newInventory;
    return true;
  }

  // ── Evolution / Merge ─────────────────────────────────────────────────────

  /**
   * Evolve (merge) a weapon type one step.
   * L0-AC-002: delegates to WeaponMerge.mergeWeapons for atomic rollback.
   * REQ-WEAPON-002: emits 'weapon:merged' on success.
   */
  evolveWeapon(weaponId) {
    const result = mergeWeapons(
      weaponId,
      this.inventory,
      this.activeWeaponId,
      (inv) => this._saveInventory(inv)
    );
    if (result.success) {
      this.inventory = result.inventory;
      this.scene.events.emit('weapon:merged', { from: weaponId, to: result.result });
    }
    return result;
  }

  /**
   * Merge a weapon type to the highest reachable tier.
   * L0-AC-002: delegates to WeaponMerge.mergeToMax.
   * REQ-WEAPON-002: emits 'weapon:mergedToMax' on success.
   */
  evolveToMax(weaponId) {
    const result = mergeToMax(
      weaponId,
      this.inventory,
      this.activeWeaponId,
      (inv) => this._saveInventory(inv)
    );
    if (result.success) {
      this.inventory = result.inventory;
      this.scene.events.emit('weapon:mergedToMax', { weaponId, finalWeapon: result.finalWeapon });
    }
    return result;
  }

  /**
   * Fuse the three super weapons into ultimate laser.
   * L0-AC-003: delegates to WeaponMerge.fuseUltimateWeapon.
   * REQ-WEAPON-002: emits 'weapon:fused' on success.
   */
  fuseUltimate() {
    const result = fuseUltimateWeapon(
      this.inventory,
      (inv) => this._saveInventory(inv)
    );
    if (result.success) {
      this.inventory = result.inventory;
      this.scene.events.emit('weapon:fused', { result: result.result });
    }
    return result;
  }

  /** Check merge eligibility for a weapon. */
  canMerge(weaponId) {
    return canMerge(weaponId, this.inventory, this.activeWeaponId);
  }

  // ── Active weapon ─────────────────────────────────────────────────────────

  /**
   * Set the currently equipped weapon.
   * REQ-WEAPON-001: setActiveWeapon() migrated from weaponManager.js:264.
   * REQ-WEAPON-002: emits 'weapon:equipped' event.
   */
  setActiveWeapon(weaponId) {
    if (!WEAPON_CONFIG[weaponId]) return false;
    this.activeWeaponId = weaponId;
    this.scene.events.emit('weapon:equipped', { weaponId, config: WEAPON_CONFIG[weaponId] });
    return true;
  }

  getActiveWeapon() {
    if (!this.activeWeaponId) return null;
    const config = WEAPON_CONFIG[this.activeWeaponId];
    if (!config) return null;
    return { ...config, lastFire: 0 };
  }

  // ── Drop handling ─────────────────────────────────────────────────────────

  /**
   * Apply a weapon drop pickup.
   * REQ-WEAPON-003: called when player collides with WeaponDrop sprite.
   * REQ-WEAPON-002: emits 'weapon:dropped' event.
   */
  collectDrop(weaponId) {
    const added = this.addWeapon(weaponId);
    if (added) {
      this.scene.events.emit('weapon:dropped', { weaponId });
    }
    return added;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Call from GameScene.update() if periodic save is needed. */
  update() {
    // No per-frame logic required; saves are event-driven
  }

  /** Expose static config for other modules. */
  static getConfig(weaponId) {
    return WEAPON_CONFIG[weaponId] || null;
  }
}

