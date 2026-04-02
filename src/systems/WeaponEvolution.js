// src/systems/WeaponEvolution.js
// REQ-WEAPON-001: Weapon evolution logic (migrated from weaponManager.js)
// FR-WEP-003: Complete evolution tree configuration
// FR-WEP-004: Ultimate fusion (3 Super → Ultimate Laser)

/**
 * Weapon evolution configuration.
 * Migrated from weaponManager.js:7-24 (weaponEvolutionConfig).
 * REQ-WEAPON-001: preserve all weapon tiers and stats.
 */
export const WEAPON_CONFIG = {
  rifle:           { id: 'rifle',           name: '步枪',       tier: 1, damage: 50,  fireRate: 50,  bulletCount: 1, color: '#ff7948', nextTier: 'rifle+' },
  'rifle+':        { id: 'rifle+',          name: '步枪+',      tier: 2, damage: 65,  fireRate: 45,  bulletCount: 1, color: '#ff8958', nextTier: 'rifle++' },
  'rifle++':       { id: 'rifle++',         name: '步枪++',     tier: 3, damage: 85,  fireRate: 40,  bulletCount: 1, color: '#ff9968', nextTier: 'super_rifle' },
  super_rifle:     { id: 'super_rifle',     name: '超级步枪',   tier: 4, damage: 110, fireRate: 35,  bulletCount: 1, color: '#ffa978', nextTier: null },

  machinegun:      { id: 'machinegun',      name: '机枪',       tier: 1, damage: 60,  fireRate: 30,  bulletCount: 1, color: '#ffeb3b', nextTier: 'machinegun+' },
  'machinegun+':   { id: 'machinegun+',     name: '机枪+',      tier: 2, damage: 75,  fireRate: 25,  bulletCount: 1, color: '#ffee4b', nextTier: 'machinegun++' },
  'machinegun++':  { id: 'machinegun++',    name: '机枪++',     tier: 3, damage: 95,  fireRate: 20,  bulletCount: 1, color: '#fff15b', nextTier: 'super_machinegun' },
  super_machinegun:{ id: 'super_machinegun',name: '超级机枪',   tier: 4, damage: 120, fireRate: 15,  bulletCount: 1, color: '#fff46b', nextTier: null },

  shotgun:         { id: 'shotgun',         name: '霰弹枪',     tier: 1, damage: 30,  fireRate: 150, bulletCount: 5, color: '#ff4848', nextTier: 'shotgun+' },
  'shotgun+':      { id: 'shotgun+',        name: '霰弹枪+',    tier: 2, damage: 40,  fireRate: 140, bulletCount: 5, color: '#ff5858', nextTier: 'shotgun++' },
  'shotgun++':     { id: 'shotgun++',       name: '霰弹枪++',   tier: 3, damage: 55,  fireRate: 130, bulletCount: 5, color: '#ff6868', nextTier: 'super_shotgun' },
  super_shotgun:   { id: 'super_shotgun',   name: '超级霰弹枪', tier: 4, damage: 75,  fireRate: 120, bulletCount: 5, color: '#ff7878', nextTier: null },

  ultimate_laser:  { id: 'ultimate_laser',  name: '终极激光炮', tier: 5, damage: 150, fireRate: 10,  bulletCount: 1, color: '#00e3fd', nextTier: null }
};

/**
 * Evolution path definitions for the three weapon families.
 * REQ-WEAPON-001: three paths (rifle / machinegun / shotgun) each with 4 tiers.
 */
export const EVOLUTION_PATHS = [
  ['rifle', 'rifle+', 'rifle++', 'super_rifle'],
  ['machinegun', 'machinegun+', 'machinegun++', 'super_machinegun'],
  ['shotgun', 'shotgun+', 'shotgun++', 'super_shotgun']
];

/**
 * Build the evolution tree data structure consumed by WeaponUI.
 * REQ-WEAPON-001: getEvolutionTree() logic migrated from weaponManager.js:322-358.
 *
 * @param {Object} inventory - current weapon inventory { weaponId: count }
 * @returns {{ paths: Array, fusion: Object }}
 */
export function buildEvolutionTree(inventory) {
  // REQ-WEAPON-001: map each path to node descriptors (immutable — no mutation)
  const paths = EVOLUTION_PATHS.map(path =>
    path.map(id => ({
      id,
      tier: WEAPON_CONFIG[id].tier,
      owned: (inventory[id] || 0) > 0,
      count: inventory[id] || 0,
      canMerge: (inventory[id] || 0) >= 3 && !!WEAPON_CONFIG[id].nextTier
    }))
  );

  // FR-WEP-004: fusion requires one of each super weapon
  const canFuse =
    (inventory.super_rifle || 0) > 0 &&
    (inventory.super_machinegun || 0) > 0 &&
    (inventory.super_shotgun || 0) > 0;

  const fusion = {
    id: 'ultimate_laser',
    tier: 5,
    owned: (inventory.ultimate_laser || 0) > 0,
    count: inventory.ultimate_laser || 0,
    canFuse,
    requirements: ['super_rifle', 'super_machinegun', 'super_shotgun']
  };

  return { paths, fusion };
}

/**
 * Check whether a single merge step is possible.
 * REQ-WEAPON-001: canMerge() logic migrated from weaponManager.js:297-318.
 *
 * @param {string} weaponId
 * @param {Object} inventory
 * @param {string|null} equippedId - currently equipped weapon id
 * @returns {{ canMerge: boolean, reason?: string, nextWeapon?: string }}
 */
export function canMerge(weaponId, inventory, equippedId) {
  const config = WEAPON_CONFIG[weaponId];
  if (!config) return { canMerge: false, reason: '未知武器类型' };
  if (!config.nextTier) return { canMerge: false, reason: '已是最高级武器' };

  const count = inventory[weaponId] || 0;
  if (count < 3) return { canMerge: false, reason: `需要3个，当前${count}个` };
  if (equippedId === weaponId) return { canMerge: false, reason: '当前装备的武器无法合成' };

  return { canMerge: true, nextWeapon: config.nextTier };
}
