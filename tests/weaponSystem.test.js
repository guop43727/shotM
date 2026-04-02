/**
 * WeaponSystem Additional Tests
 * Covers gaps not addressed by weaponManager.test.js:
 * - equipWeapon with waveActive (BIZ-001)
 * - mergeWeapons BIZ-003 (equipped), BIZ-004 (max tier)
 * - fuseUltimateWeapon BIZ-005
 * - sessionStorage fallback (NFR-WEP-002 / STOR-001)
 * - getEvolutionTree canMerge field
 * - validateInventory / DATA-002 / DATA-003
 */

const WeaponManagerModule = require('../weaponManager.js');

// ---- localStorage / sessionStorage mock ----
let localStore = {};
let sessionStore = {};
let localQuotaExceeded = false;

const mockLocalStorage = {
  getItem: (k) => localStore[k] ?? null,
  setItem: (k, v) => {
    if (localQuotaExceeded) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    localStore[k] = String(v);
  },
  removeItem: (k) => { delete localStore[k]; },
  clear: () => { localStore = {}; }
};

const mockSessionStorage = {
  getItem: (k) => sessionStore[k] ?? null,
  setItem: (k, v) => { sessionStore[k] = String(v); },
  removeItem: (k) => { delete sessionStore[k]; },
  clear: () => { sessionStore = {}; }
};

global.localStorage = mockLocalStorage;
global.sessionStorage = mockSessionStorage;
global.window = {
  weaponManager: null,
  weaponEvolutionConfig: null,
  weaponConfig: null
};

// Provide player global used by equipWeapon
global.player = { weapon: { id: 'rifle' } };
global.game = {};

// ---- helpers ----
function freshManager() {
  localStore = {};
  sessionStore = {};
  localQuotaExceeded = false;
  // Re-require to get fresh instance
  jest.resetModules();
  const mod = require('../weaponManager.js');
  const mgr = global.window.weaponManager;
  return mgr;
}

// ---- tests ----
describe('WeaponManager - equipWeapon', () => {
  let mgr;
  beforeEach(() => { mgr = freshManager(); });

  test('BIZ-001: cannot equip during combat (waveActive=true)', () => {
    global.game.waveActive = true;
    mgr.addWeapon('machinegun');
    const result = mgr.equipWeapon('machinegun');
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-001');
    global.game.waveActive = false;
  });

  test('equipWeapon succeeds when not in combat', () => {
    global.game.waveActive = false;
    mgr.addWeapon('machinegun');
    const result = mgr.equipWeapon('machinegun');
    expect(result.success).toBe(true);
  });
});

describe('WeaponManager - mergeWeapons error codes', () => {
  let mgr;
  beforeEach(() => { mgr = freshManager(); global.game.waveActive = false; });

  test('BIZ-003: cannot merge currently equipped weapon', () => {
    // Give 3 rifles and equip rifle
    mgr.inventory = { rifle: 3 };
    global.player.weapon = { id: 'rifle' };
    const result = mgr.mergeWeapons('rifle');
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-003');
  });

  test('BIZ-004: max tier weapon cannot merge', () => {
    mgr.inventory = { super_rifle: 3 };
    global.player.weapon = { id: 'rifle' };
    const result = mgr.mergeWeapons('super_rifle');
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-004');
  });

  test('Atomic rollback: merge leaves inventory unchanged on failure', () => {
    mgr.inventory = { rifle: 1 };
    const before = { ...mgr.getInventory() };
    mgr.mergeWeapons('rifle');
    expect(mgr.getInventory().rifle).toBe(before.rifle);
  });
});

describe('WeaponManager - fuseUltimateWeapon', () => {
  let mgr;
  beforeEach(() => { mgr = freshManager(); global.game.waveActive = false; });

  test('BIZ-005: fusion fails when missing super weapons', () => {
    mgr.inventory = { super_rifle: 1, super_machinegun: 0, super_shotgun: 1 };
    const result = mgr.fuseUltimateWeapon();
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-005');
  });

  test('Fusion succeeds with all 3 super weapons', () => {
    mgr.inventory = { super_rifle: 1, super_machinegun: 1, super_shotgun: 1 };
    const result = mgr.fuseUltimateWeapon();
    expect(result.success).toBe(true);
    expect(mgr.getInventory().ultimate_laser).toBeGreaterThanOrEqual(1);
    expect(mgr.getInventory().super_rifle || 0).toBe(0);
  });
});

describe('WeaponManager - sessionStorage fallback (NFR-WEP-002)', () => {
  test('STOR-001: falls back to sessionStorage when localStorage quota exceeded', () => {
    localQuotaExceeded = true;
    const mgr = freshManager();
    mgr.addWeapon('rifle');
    mgr.saveInventory();
    // Should have saved to sessionStorage instead
    expect(sessionStore['monsterTide_weaponInventory']).toBeDefined();
  });
});

describe('WeaponManager - getEvolutionTree', () => {
  let mgr;
  beforeEach(() => { mgr = freshManager(); });

  test('canMerge field present in path nodes', () => {
    mgr.inventory = { rifle: 3, 'rifle+': 1 };
    const tree = mgr.getEvolutionTree();
    const rifleNode = tree.paths[0].find(n => n.id === 'rifle');
    expect(rifleNode).toHaveProperty('canMerge');
    expect(rifleNode.canMerge).toBe(true);
  });

  test('canMerge false when count < 3', () => {
    mgr.inventory = { rifle: 2 };
    const tree = mgr.getEvolutionTree();
    const rifleNode = tree.paths[0].find(n => n.id === 'rifle');
    expect(rifleNode.canMerge).toBe(false);
  });

  test('canMerge false for max tier weapons', () => {
    mgr.inventory = { super_rifle: 5 };
    const tree = mgr.getEvolutionTree();
    const superNode = tree.paths[0].find(n => n.id === 'super_rifle');
    expect(superNode.canMerge).toBe(false);
  });
});

describe('WeaponManager - validateInventory / DATA errors', () => {
  let mgr;
  beforeEach(() => { mgr = freshManager(); });

  test('DATA-002: negative counts are clamped to 0', () => {
    localStore['monsterTide_weaponInventory'] = JSON.stringify({ rifle: -5 });
    mgr.loadInventory();
    expect(mgr.getInventory().rifle).toBeGreaterThanOrEqual(0);
  });

  test('DATA-003: invalid JSON returns default inventory', () => {
    localStore['monsterTide_weaponInventory'] = '{invalid json';
    mgr.loadInventory();
    const inv = mgr.getInventory();
    expect(inv.rifle).toBeGreaterThanOrEqual(1); // Default has at least 1 rifle
  });

  test('Unknown weapon IDs are sanitized', () => {
    localStore['monsterTide_weaponInventory'] = JSON.stringify({ rifle: 1, hacked_weapon: 999 });
    mgr.loadInventory();
    const inv = mgr.getInventory();
    expect(inv.hacked_weapon).toBeUndefined();
  });
});
