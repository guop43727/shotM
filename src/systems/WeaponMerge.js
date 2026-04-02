// src/systems/WeaponMerge.js
// REQ-WEAPON-001: Weapon merge (synthesis) logic
// L0-AC-002: 3:1 synthesis with atomic rollback
// L0-AC-003: Ultimate fusion (3 Super → Ultimate Laser)

import { WEAPON_CONFIG } from './WeaponEvolution.js';

/**
 * Execute a single 3:1 merge step.
 * Migrated from weaponManager.js:221-267 (mergeWeapons).
 * L0-AC-002: atomic — snapshot/rollback on save failure.
 *
 * @param {string} weaponId
 * @param {Object} inventory - current inventory (will NOT be mutated)
 * @param {string|null} equippedId
 * @param {Function} saveFn - (inventory) => boolean
 * @returns {{ success: boolean, result?: string, inventory?: Object, error?: string, message?: string }}
 */
export function mergeWeapons(weaponId, inventory, equippedId, saveFn) {
  const config = WEAPON_CONFIG[weaponId];
  if (!config) {
    return { success: false, error: 'BIZ-002', message: '未知武器类型' };
  }
  if (!config.nextTier) {
    return { success: false, error: 'BIZ-004', message: `${config.name}已是最高级武器，无法继续合成` };
  }

  const count = inventory[weaponId] || 0;
  if (count < 3) {
    return { success: false, error: 'BIZ-002', message: `材料不足: 需要3个${config.name}，当前拥有${count}个` };
  }
  if (equippedId === weaponId) {
    return { success: false, error: 'BIZ-003', message: '无法合成当前装备的武器，请先切换' };
  }

  // L0-AC-002: snapshot for rollback
  const snapshot = { ...inventory };

  // Build new inventory (immutable — return new object)
  const newInventory = {
    ...inventory,
    [weaponId]: count - 3,
    [config.nextTier]: (inventory[config.nextTier] || 0) + 1
  };

  const saved = saveFn(newInventory);
  if (!saved) {
    // TXN-004: rollback
    return { success: false, error: 'TXN-004', message: '合成失败，已回滚', inventory: snapshot };
  }

  return { success: true, result: config.nextTier, inventory: newInventory };
}

/**
 * Merge a weapon type to the highest reachable tier in one operation.
 * Migrated from weaponManager.js:420-478 (mergeToMax).
 * L0-AC-002: atomic — snapshot/rollback on save failure.
 *
 * @param {string} weaponId
 * @param {Object} inventory
 * @param {string|null} equippedId
 * @param {Function} saveFn - (inventory) => boolean
 * @returns {{ success: boolean, steps?: Array, finalWeapon?: string, finalCount?: number, inventory?: Object, message?: string }}
 */
export function mergeToMax(weaponId, inventory, equippedId, saveFn) {
  const config = WEAPON_CONFIG[weaponId];
  if (!config) {
    return { success: false, message: '未知武器类型' };
  }

  const snapshot = { ...inventory };
  let current = { ...inventory };
  let currentId = weaponId;
  const steps = [];
  let merged = false;

  while (true) {
    const cfg = WEAPON_CONFIG[currentId];
    if (!cfg || !cfg.nextTier) break;
    if (equippedId === currentId) break;

    const available = current[currentId] || 0;
    const times = Math.floor(available / 3);
    if (times === 0) break;

    // Build new inventory for this step (immutable)
    current = {
      ...current,
      [currentId]: available - times * 3,
      [cfg.nextTier]: (current[cfg.nextTier] || 0) + times
    };

    steps.push({ from: currentId, to: cfg.nextTier, times });
    merged = true;
    currentId = cfg.nextTier;
  }

  if (!merged) {
    const count = inventory[weaponId] || 0;
    return { success: false, message: `材料不足或已是最高级（当前${count}个，需要至少3个）`, inventory: snapshot };
  }

  const saved = saveFn(current);
  if (!saved) {
    return { success: false, message: '合成失败，已回滚', inventory: snapshot };
  }

  const lastStep = steps[steps.length - 1];
  return {
    success: true,
    steps,
    finalWeapon: lastStep.to,
    finalCount: current[lastStep.to] || 0,
    inventory: current
  };
}

/**
 * Fuse the three super weapons into the ultimate laser.
 * Migrated from weaponManager.js:362-395 (fuseUltimateWeapon).
 * L0-AC-003: requires super_rifle + super_machinegun + super_shotgun.
 *
 * @param {Object} inventory
 * @param {Function} saveFn - (inventory) => boolean
 * @returns {{ success: boolean, result?: string, inventory?: Object, error?: string, message?: string }}
 */
export function fuseUltimateWeapon(inventory, saveFn) {
  if (
    (inventory.super_rifle || 0) < 1 ||
    (inventory.super_machinegun || 0) < 1 ||
    (inventory.super_shotgun || 0) < 1
  ) {
    return { success: false, error: 'BIZ-005', message: '需要集齐三个Super武器' };
  }

  const snapshot = { ...inventory };

  // Build new inventory (immutable)
  const newInventory = {
    ...inventory,
    super_rifle: inventory.super_rifle - 1,
    super_machinegun: inventory.super_machinegun - 1,
    super_shotgun: inventory.super_shotgun - 1,
    ultimate_laser: (inventory.ultimate_laser || 0) + 1
  };

  const saved = saveFn(newInventory);
  if (!saved) {
    return { success: false, error: 'TXN-004', message: '融合失败，已回滚', inventory: snapshot };
  }

  return { success: true, result: 'ultimate_laser', inventory: newInventory };
}
