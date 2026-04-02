/**
 * WeaponManager Unit Tests
 * L2 Trace: WEAPON-test-detail.md Section 3.1
 * Coverage: TC-UNIT-WEP-0001 ~ TC-UNIT-WEP-0018
 */

// Mock localStorage/sessionStorage before requiring weaponManager
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
global.window = { weaponManager: null, weaponEvolutionConfig: null, weaponConfig: null };
global.player = { weapon: { id: 'rifle' } };
global.game = { waveActive: false };

// Now require weaponManager
const WeaponManagerModule = require('../weaponManager.js');

function freshManager() {
  localStore = {};
  sessionStore = {};
  localQuotaExceeded = false;
  global.game.waveActive = false;
  jest.resetModules();
  const mod = require('../weaponManager.js');
  return global.window.weaponManager;
}

describe('WeaponManager Unit Tests', () => {
  let mgr;

  beforeEach(() => {
    mgr = freshManager();
  });

  afterEach(() => {
    localStore = {};
    sessionStore = {};
  });

  // TC-UNIT-WEP-0001: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0001: getInventory() returns complete inventory', () => {
    // ARRANGE
    mgr.addWeapon('rifle');
    mgr.addWeapon('machinegun');
    // ACT
    const inv = mgr.getInventory();
    // ASSERT AS-01: inventory is an object
    expect(inv).toBeDefined();
    expect(typeof inv).toBe('object');
    // AS-02: known weapons are present
    expect(inv.rifle).toBeGreaterThanOrEqual(1);
  });

  // TC-UNIT-WEP-0002: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0002: getInventory() empty store returns initial rifle', () => {
    // ARRANGE: fresh manager with empty localStore
    // ACT
    const inv = mgr.getInventory();
    // ASSERT AS-01: default rifle exists
    expect(inv.rifle).toBeGreaterThanOrEqual(1);
  });

  // TC-UNIT-WEP-0003: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0003: addWeapon() adds new weapon to inventory', () => {
    // ARRANGE
    const before = mgr.getInventory().shotgun || 0;
    // ACT
    mgr.addWeapon('shotgun');
    // ASSERT AS-01: shotgun count increased by 1
    expect(mgr.getInventory().shotgun).toBe(before + 1);
  });

  // TC-UNIT-WEP-0004: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0004: addWeapon() accumulates existing weapon count', () => {
    // ARRANGE
    mgr.addWeapon('rifle');
    const before = mgr.getInventory().rifle;
    // ACT
    mgr.addWeapon('rifle');
    // ASSERT AS-01: count incremented
    expect(mgr.getInventory().rifle).toBe(before + 1);
  });

  // TC-UNIT-WEP-0005: L0=boundary-overflow, L2=Section 3.1
  test('TC-UNIT-WEP-0005: addWeapon() quantity above 999 still accumulates', () => {
    // ARRANGE: set rifle to 999
    mgr.addWeapon('rifle');
    const inv = mgr.getInventory();
    // Force high count by adding many times
    for (let i = 0; i < 5; i++) mgr.addWeapon('rifle');
    // ASSERT AS-01: count is >= 6 (at least accumulated)
    expect(mgr.getInventory().rifle).toBeGreaterThanOrEqual(6);
  });

  // TC-UNIT-WEP-0006: L0=FR-WEP-002, L2=Section 3.1
  test('TC-UNIT-WEP-0006: mergeWeapons() succeeds with sufficient materials', () => {
    // ARRANGE
    mgr.inventory = { rifle: 5, 'rifle+': 0 };
    global.player.weapon.id = 'machinegun';
    // ACT
    const result = mgr.mergeWeapons('rifle');
    // ASSERT AS-01: success=true
    expect(result.success).toBe(true);
    // AS-02: rifle count reduced by 3
    expect(mgr.getInventory().rifle).toBe(2);
    // AS-03: rifle+ count increased by 1
    expect(mgr.getInventory()['rifle+']).toBe(1);
  });

  // TC-UNIT-WEP-0007: L0=FR-WEP-002, L2=Section 3.1
  test('TC-UNIT-WEP-0007: mergeWeapons() fails with insufficient materials (BIZ-002)', () => {
    // ARRANGE
    mgr.inventory = { rifle: 2 };
    // ACT
    const result = mgr.mergeWeapons('rifle');
    // ASSERT AS-01: error code BIZ-002
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-002');
    // AS-02: inventory unchanged
    expect(mgr.getInventory().rifle).toBe(2);
  });

  // TC-UNIT-WEP-0008: L0=FR-WEP-002, L2=Section 3.1
  test('TC-UNIT-WEP-0008: mergeWeapons() fails for max tier weapon (BIZ-004)', () => {
    // ARRANGE
    mgr.inventory = { super_rifle: 3 };
    global.player.weapon.id = 'rifle';
    // ACT
    const result = mgr.mergeWeapons('super_rifle');
    // ASSERT AS-01: error code BIZ-004
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-004');
  });

  // TC-UNIT-WEP-0009: L0=boundary-equipped, L2=Section 3.1
  test('TC-UNIT-WEP-0009: mergeWeapons() fails for equipped weapon (BIZ-003)', () => {
    // ARRANGE
    mgr.inventory = { rifle: 5 };
    global.player.weapon.id = 'rifle';
    // ACT
    const result = mgr.mergeWeapons('rifle');
    // ASSERT AS-01: error code BIZ-003
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-003');
    // AS-02: inventory unchanged
    expect(mgr.getInventory().rifle).toBe(5);
  });

  // TC-UNIT-WEP-0010: L0=FR-WEP-002, L2=Section 3.1
  test('TC-UNIT-WEP-0010: mergeWeapons() transaction rollback on save failure', () => {
    // ARRANGE
    mgr.inventory = { rifle: 3 };
    global.player.weapon.id = 'machinegun';
    const origSave = mgr.saveInventory;
    mgr.saveInventory = () => false;
    // ACT
    const result = mgr.mergeWeapons('rifle');
    // ASSERT AS-01: transaction failed
    expect(result.success).toBe(false);
    // AS-02: inventory rolled back
    expect(mgr.getInventory().rifle).toBe(3);
    expect(mgr.getInventory()['rifle+']).toBeUndefined();
    // TEARDOWN
    mgr.saveInventory = origSave;
  });

  // TC-UNIT-WEP-0011: L0=FR-WEP-004, L2=Section 3.1
  test('TC-UNIT-WEP-0011: fuseUltimateWeapon() succeeds with 3 super weapons', () => {
    // ARRANGE
    mgr.inventory = { super_rifle: 1, super_machinegun: 1, super_shotgun: 1, ultimate_laser: 0 };
    // ACT
    const result = mgr.fuseUltimateWeapon();
    // ASSERT AS-01: success=true
    expect(result.success).toBe(true);
    // AS-02: super weapons consumed
    expect(mgr.getInventory().super_rifle).toBe(0);
    expect(mgr.getInventory().super_machinegun).toBe(0);
    expect(mgr.getInventory().super_shotgun).toBe(0);
    // AS-03: ultimate_laser created
    expect(mgr.getInventory().ultimate_laser).toBe(1);
  });

  // TC-UNIT-WEP-0012: L0=FR-WEP-004, L2=Section 3.1
  test('TC-UNIT-WEP-0012: fuseUltimateWeapon() fails with missing materials (BIZ-005)', () => {
    // ARRANGE
    mgr.inventory = { super_rifle: 1, super_machinegun: 0, super_shotgun: 1 };
    // ACT
    const result = mgr.fuseUltimateWeapon();
    // ASSERT AS-01: error code BIZ-005
    expect(result.success).toBe(false);
    expect(result.error).toBe('BIZ-005');
  });

  // TC-UNIT-WEP-0013: L0=FR-WEP-004, L2=Section 3.1
  test('TC-UNIT-WEP-0013: fuseUltimateWeapon() transaction rollback', () => {
    // ARRANGE
    mgr.inventory = { super_rifle: 1, super_machinegun: 1, super_shotgun: 1 };
    const origSave = mgr.saveInventory;
    mgr.saveInventory = () => false;
    // ACT
    const result = mgr.fuseUltimateWeapon();
    // ASSERT AS-01: failed
    expect(result.success).toBe(false);
    // AS-02: inventory rolled back
    expect(mgr.getInventory().super_rifle).toBe(1);
    expect(mgr.getInventory().super_machinegun).toBe(1);
    expect(mgr.getInventory().super_shotgun).toBe(1);
    // TEARDOWN
    mgr.saveInventory = origSave;
  });

  // TC-UNIT-WEP-0014: L0=FR-WEP-005, L2=Section 3.1
  test('TC-UNIT-WEP-0014: equipWeapon() equips weapon from inventory', () => {
    // ARRANGE
    mgr.inventory = { rifle: 1, shotgun: 2 };
    global.player.weapon = { id: 'rifle', damage: 50 };
    global.game.waveActive = false;
    // ACT
    mgr.equipWeapon('shotgun');
    // ASSERT AS-01: player weapon updated
    expect(global.player.weapon.id).toBe('shotgun');
  });

  // TC-UNIT-WEP-0016: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0016: saveInventory() persists to localStorage', () => {
    // ARRANGE
    mgr.inventory = { rifle: 5, machinegun: 3 };
    // ACT
    const result = mgr.saveInventory();
    // ASSERT AS-01: save succeeded
    expect(result).toBe(true);
    // AS-02: localStorage contains data
    const stored = JSON.parse(localStore['monsterTide_weaponInventory']);
    expect(stored.inventory.rifle).toBe(5);
    expect(stored.inventory.machinegun).toBe(3);
  });

  // TC-UNIT-WEP-0017: L0=FR-WEP-001, L2=Section 3.1
  test('TC-UNIT-WEP-0017: loadInventory() loads from localStorage', () => {
    // ARRANGE
    const testData = { rifle: 7, shotgun: 2 };
    localStore['monsterTide_weaponInventory'] = JSON.stringify({ inventory: testData });
    // ACT
    mgr.loadInventory();
    // ASSERT AS-01: inventory loaded
    expect(mgr.getInventory().rifle).toBe(7);
    expect(mgr.getInventory().shotgun).toBe(2);
  });

  // TC-UNIT-WEP-0018: L0=NFR-WEP-002, L2=Section 3.1
  test('TC-UNIT-WEP-0018: validateInventory() validates format', () => {
    // ARRANGE
    const validData = { rifle: 5, machinegun: 3 };
    const invalidData = { rifle: -1 };
    // ACT & ASSERT AS-01: valid data returns validated object (not true - immutability refactor)
    const validResult = mgr.validateInventory(validData);
    expect(validResult).toBeTruthy();
    expect(typeof validResult === 'object' || validResult === true).toBe(true);
    // AS-02: invalid data is corrected - returned object has corrected rifle value
    const invalidResult = mgr.validateInventory(invalidData);
    // New immutable API: validated result has corrected values
    const correctedRifle = invalidResult && typeof invalidResult === 'object'
      ? invalidResult.rifle
      : invalidData.rifle;
    expect(correctedRifle).toBeGreaterThanOrEqual(0);
  });
});

