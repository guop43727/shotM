// WeaponManager Core Tests
// TC-UNIT-WEP-0001 ~ TC-UNIT-WEP-0018

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = val; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Load weaponManager
const weaponConfig = {
  rifle: { id: 'rifle', name: '步枪', tier: 1, nextTier: 'rifle+' },
  'rifle+': { id: 'rifle+', name: '步枪+', tier: 2, nextTier: 'rifle++' },
  'rifle++': { id: 'rifle++', name: '步枪++', tier: 3, nextTier: 'super_rifle' },
  super_rifle: { id: 'super_rifle', name: '超级步枪', tier: 4, nextTier: null },
  machinegun: { id: 'machinegun', name: '机枪', tier: 1, nextTier: 'machinegun+' },
  super_machinegun: { id: 'super_machinegun', name: '超级机枪', tier: 4, nextTier: null },
  shotgun: { id: 'shotgun', name: '霰弹枪', tier: 1, nextTier: 'shotgun+' },
  super_shotgun: { id: 'super_shotgun', name: '超级霰弹枪', tier: 4, nextTier: null },
  ultimate_laser: { id: 'ultimate_laser', name: '终极激光炮', tier: 5, nextTier: null }
};

const weaponManager = {
  inventory: null,
  loadInventory() {
    try {
      const stored = localStorage.getItem('monsterTide_weaponInventory');
      if (stored) {
        const payload = JSON.parse(stored);
        this.inventory = payload.data || payload;
      } else {
        this.inventory = { rifle: 1 };
      }
    } catch (e) {
      this.inventory = { rifle: 1 };
    }
    return this.inventory;
  },
  getInventory() {
    return this.inventory || { rifle: 1 };
  },
  addWeapon(weaponId) {
    if (!weaponConfig[weaponId]) return;
    this.inventory[weaponId] = (this.inventory[weaponId] || 0) + 1;
    this.saveInventory();
  },
  mergeWeapons(weaponId) {
    const config = weaponConfig[weaponId];
    if (!config || !config.nextTier) {
      return { success: false, error: '无法合成' };
    }
    const count = this.inventory[weaponId] || 0;
    if (count < 3) {
      return { success: false, error: `材料不足: 需要3个,当前${count}个` };
    }
    this.inventory[weaponId] -= 3;
    this.inventory[config.nextTier] = (this.inventory[config.nextTier] || 0) + 1;
    this.saveInventory();
    return { success: true, result: config.nextTier };
  },
  canMerge(weaponId) {
    const config = weaponConfig[weaponId];
    if (!config) return { canMerge: false, reason: '未知武器' };
    if (!config.nextTier) return { canMerge: false, reason: '已是最高级' };
    const count = this.inventory[weaponId] || 0;
    if (count < 3) return { canMerge: false, reason: `需要3个,当前${count}个` };
    return { canMerge: true, nextWeapon: config.nextTier };
  },
  fuseUltimate() {
    const inv = this.inventory;
    if ((inv.super_rifle || 0) === 0 || (inv.super_machinegun || 0) === 0 || (inv.super_shotgun || 0) === 0) {
      return { success: false, error: '需要3种超级武器各1个' };
    }
    inv.super_rifle -= 1;
    inv.super_machinegun -= 1;
    inv.super_shotgun -= 1;
    inv.ultimate_laser = (inv.ultimate_laser || 0) + 1;
    this.saveInventory();
    return { success: true, result: 'ultimate_laser' };
  },
  saveInventory() {
    try {
      const payload = { data: this.inventory };
      localStorage.setItem('monsterTide_weaponInventory', JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Test runner
const tests = [];
const assert = (condition, msg) => { if (!condition) throw new Error(msg); };

// TC-UNIT-WEP-0001: getInventory returns full inventory
tests.push({
  id: 'TC-UNIT-WEP-0001',
  name: 'getInventory()返回完整库存',
  run: () => {
    localStorage.clear();
    const testData = { rifle: 5, 'rifle+': 2, machinegun: 3 };
    localStorage.setItem('monsterTide_weaponInventory', JSON.stringify({ data: testData }));
    weaponManager.inventory = null;
    weaponManager.loadInventory();

    const inv = weaponManager.getInventory();
    assert(inv.rifle === 5, 'rifle count mismatch');
    assert(inv['rifle+'] === 2, 'rifle+ count mismatch');
    assert(inv.machinegun === 3, 'machinegun count mismatch');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0002: getInventory empty returns default rifle
tests.push({
  id: 'TC-UNIT-WEP-0002',
  name: 'getInventory()空库存返回初始Rifle',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = null;
    weaponManager.loadInventory();

    const inv = weaponManager.getInventory();
    assert(inv.rifle === 1, 'default rifle not set');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0003: addWeapon adds new weapon
tests.push({
  id: 'TC-UNIT-WEP-0003',
  name: 'addWeapon()添加新武器',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 1 };
    weaponManager.addWeapon('machinegun');

    assert(weaponManager.inventory.machinegun === 1, 'machinegun not added');
    assert(weaponManager.inventory.rifle === 1, 'rifle changed');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0004: addWeapon increments existing
tests.push({
  id: 'TC-UNIT-WEP-0004',
  name: 'addWeapon()累加已有武器',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 3 };
    weaponManager.addWeapon('rifle');

    assert(weaponManager.inventory.rifle === 4, 'rifle not incremented');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0006: mergeWeapons success
tests.push({
  id: 'TC-UNIT-WEP-0006',
  name: 'mergeWeapons()材料充足合成成功',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 5, 'rifle+': 0 };

    const result = weaponManager.mergeWeapons('rifle');
    assert(result.success === true, 'merge failed');
    assert(result.result === 'rifle+', 'wrong result');
    assert(weaponManager.inventory.rifle === 2, 'rifle not consumed');
    assert(weaponManager.inventory['rifle+'] === 1, 'rifle+ not created');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0007: mergeWeapons insufficient materials
tests.push({
  id: 'TC-UNIT-WEP-0007',
  name: 'mergeWeapons()材料不足失败',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 2 };

    const result = weaponManager.mergeWeapons('rifle');
    assert(result.success === false, 'should fail');
    assert(weaponManager.inventory.rifle === 2, 'inventory changed');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0008: mergeWeapons max tier
tests.push({
  id: 'TC-UNIT-WEP-0008',
  name: 'mergeWeapons()最高级武器无法合成',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { ultimate_laser: 3 };

    const result = weaponManager.mergeWeapons('ultimate_laser');
    assert(result.success === false, 'should fail');
    assert(weaponManager.inventory.ultimate_laser === 3, 'inventory changed');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0011: fuseUltimate success
tests.push({
  id: 'TC-UNIT-WEP-0011',
  name: 'fuseUltimate()三Super融合成功',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = {
      super_rifle: 1,
      super_machinegun: 1,
      super_shotgun: 1,
      ultimate_laser: 0
    };

    const result = weaponManager.fuseUltimate();
    assert(result.success === true, 'fuse failed');
    assert(result.result === 'ultimate_laser', 'wrong result');
    assert(weaponManager.inventory.super_rifle === 0, 'super_rifle not consumed');
    assert(weaponManager.inventory.super_machinegun === 0, 'super_machinegun not consumed');
    assert(weaponManager.inventory.super_shotgun === 0, 'super_shotgun not consumed');
    assert(weaponManager.inventory.ultimate_laser === 1, 'ultimate not created');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0012: fuseUltimate insufficient
tests.push({
  id: 'TC-UNIT-WEP-0012',
  name: 'fuseUltimate()材料不足失败',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = {
      super_rifle: 1,
      super_machinegun: 0,
      super_shotgun: 1
    };

    const result = weaponManager.fuseUltimate();
    assert(result.success === false, 'should fail');
    assert(weaponManager.inventory.super_rifle === 1, 'inventory changed');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0016: saveInventory persists
tests.push({
  id: 'TC-UNIT-WEP-0016',
  name: 'saveInventory()成功持久化',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 5, machinegun: 3 };
    weaponManager.saveInventory();

    const stored = JSON.parse(localStorage.getItem('monsterTide_weaponInventory'));
    assert(stored.data.rifle === 5, 'rifle not saved');
    assert(stored.data.machinegun === 3, 'machinegun not saved');

    localStorage.clear();
  }
});

// TC-UNIT-WEP-0017: loadInventory loads
tests.push({
  id: 'TC-UNIT-WEP-0017',
  name: 'loadInventory()成功加载',
  run: () => {
    localStorage.clear();
    const testData = { rifle: 7, shotgun: 2 };
    localStorage.setItem('monsterTide_weaponInventory', JSON.stringify({ data: testData }));
    weaponManager.inventory = null;

    weaponManager.loadInventory();
    assert(weaponManager.inventory.rifle === 7, 'rifle not loaded');
    assert(weaponManager.inventory.shotgun === 2, 'shotgun not loaded');

    localStorage.clear();
  }
});

// TC-INT-INTRA-0001: Merge flow integration
tests.push({
  id: 'TC-INT-INTRA-0001',
  name: '合成流程完整链路',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = { rifle: 5, 'rifle+': 0 };

    const result = weaponManager.mergeWeapons('rifle');
    assert(result.success === true, 'merge failed');
    assert(weaponManager.inventory.rifle === 2, 'rifle not consumed');
    assert(weaponManager.inventory['rifle+'] === 1, 'rifle+ not created');

    const stored = JSON.parse(localStorage.getItem('monsterTide_weaponInventory'));
    assert(stored.data.rifle === 2, 'rifle not persisted');
    assert(stored.data['rifle+'] === 1, 'rifle+ not persisted');

    localStorage.clear();
  }
});

// TC-INT-INTRA-0002: Fuse flow integration
tests.push({
  id: 'TC-INT-INTRA-0002',
  name: '融合流程完整链路',
  run: () => {
    localStorage.clear();
    weaponManager.inventory = {
      super_rifle: 1,
      super_machinegun: 1,
      super_shotgun: 1
    };

    const result = weaponManager.fuseUltimate();
    assert(result.success === true, 'fuse failed');

    const stored = JSON.parse(localStorage.getItem('monsterTide_weaponInventory'));
    assert(stored.data.ultimate_laser === 1, 'ultimate not persisted');
    assert(stored.data.super_rifle === 0, 'super_rifle not persisted');

    localStorage.clear();
  }
});

// Run all tests
console.log('Running WeaponManager Tests...\n');
let passed = 0, failed = 0;

tests.forEach(test => {
  try {
    test.run();
    console.log(`✓ ${test.id}: ${test.name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${test.id}: ${test.name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total`);
process.exit(failed > 0 ? 1 : 0);
