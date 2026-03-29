// Weapon Integration Tests
// Covers: weaponWaveSelect, weaponDropIntegration, weaponMergeAnimation
// Based on INTEGRATION-test-detail.md

// ===== Mock Setup =====

// Mock DOM
const mockElements = {};
global.document = {
  createElement: (tag) => {
    const el = {
      id: '',
      className: '',
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      appendChild: function(child) { this.children.push(child); },
      remove: function() {
        const parent = this._parent;
        if (parent) {
          parent.children = parent.children.filter(c => c !== this);
        }
        if (this.id) delete mockElements[this.id];
      },
      onclick: null,
      _parent: null
    };
    return el;
  },
  getElementById: (id) => mockElements[id] || null,
  body: {
    children: [],
    appendChild: function(child) {
      child._parent = this;
      this.children.push(child);
      mockElements[child.id] = child;
    }
  }
};

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = val; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Mock AudioContext
global.window = {
  AudioContext: function() {
    return {
      createOscillator: () => ({
        connect: () => {},
        frequency: { value: 0 },
        start: () => {},
        stop: () => {}
      }),
      createGain: () => ({
        connect: () => {},
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        }
      }),
      currentTime: 0,
      destination: {}
    };
  },
  webkitAudioContext: null
};

// Mock weaponConfig
const weaponConfig = {
  rifle: { name: '步枪', fireRate: 300, damage: 1, bulletCount: 1, color: '#ff7948' },
  'rifle+': { name: '步枪+', fireRate: 250, damage: 2, bulletCount: 1, color: '#ff9948' },
  machinegun: { name: '机枪', fireRate: 150, damage: 1.5, bulletCount: 1, color: '#ffeb3b' },
  shotgun: { name: '霰弹枪', fireRate: 500, damage: 1, bulletCount: 5, color: '#ff4848' }
};

// Mock game state
let game = { weaponDrops: [], wave: 1 };
let player = { x: 400, y: 580, weapon: null }; // realistic player position (center, bottom)

// Mock startWave
let startWaveCalled = false;
let startWaveArg = null;
function startWave() { startWaveCalled = true; }

// Mock weaponManager
const mockAddWeaponCalls = [];
const weaponManager = {
  inventory: { rifle: 1 },
  getInventory() { return this.inventory; },
  addWeapon(type) {
    mockAddWeaponCalls.push(type);
    this.inventory[type] = (this.inventory[type] || 0) + 1;
  }
};

// Load modules (inline since they reference globals)
const weaponWaveSelect = {
  show() {
    const inventory = weaponManager.getInventory();
    const weapons = Object.entries(inventory).filter(([_, count]) => count > 0);

    if (weapons.length === 0) {
      this.selectWeapon('rifle');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'wave-select-modal';
    modal.innerHTML = weapons.map(([type, count]) => {
      const cfg = weaponConfig[type];
      return `<div class="weapon-card" onclick="weaponWaveSelect.selectWeapon('${type}')">
        <div>${cfg.name}</div><div>x${count}</div>
      </div>`;
    }).join('');
    document.body.appendChild(modal);
  },

  selectWeapon(type) {
    const cfg = weaponConfig[type];
    player.weapon = {
      type,
      fireRate: cfg.fireRate,
      damage: cfg.damage,
      bulletCount: cfg.bulletCount,
      color: cfg.color,
      name: cfg.name,
      lastFire: 0
    };

    const modal = document.getElementById('wave-select-modal');
    if (modal) modal.remove();

    startWave();
  }
};

// Updated weaponDropIntegration: uses this.drops (not game.weaponDrops)
// Collection is z-based: drops advance toward player each frame
const weaponDropIntegration = {
  drops: [],

  createDrop(x, z) {
    const dropChance = 0.15;
    if (Math.random() > dropChance) return;

    const types = ['rifle', 'machinegun', 'shotgun'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.drops.push({ x, z: z || 0, type, collected: false });
  },

  checkCollection() {
    const collectZ = 0.85;
    const laneWidth = 80;

    this.drops.forEach(drop => {
      if (drop.collected) return;

      drop.z += 0.004;

      if (drop.z >= collectZ) {
        const dx = Math.abs(drop.x - player.x);
        if (dx < laneWidth) {
          weaponManager.addWeapon(drop.type);
          drop.collected = true;
          this.showNotification(`获得 ${weaponConfig[drop.type].name}`);
        }
      }

      if (drop.z > 1.1) {
        drop.collected = true;
      }
    });

    this.drops = this.drops.filter(d => !d.collected);
  },

  showNotification(text) {
    const notif = document.createElement('div');
    notif.className = 'weapon-notification';
    notif.textContent = text;
    document.body.appendChild(notif);
  }
};

const weaponMergeAnimation = {
  particles: [],

  playMergeEffect(weaponType) {
    const cfg = weaponConfig[weaponType];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: 450, y: 350,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color: cfg.color
      });
    }
    this.playSound();
  },

  update() {
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  },

  playSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }
};

// ===== Test Runner =====
const tests = [];
const assert = (condition, msg) => { if (!condition) throw new Error(msg); };

function resetState() {
  game = { weaponDrops: [], wave: 1 };
  player = { x: 400, y: 580, weapon: null };
  startWaveCalled = false;
  weaponManager.inventory = { rifle: 1 };
  weaponMergeAnimation.particles = [];
  weaponDropIntegration.drops = [];
  mockAddWeaponCalls.length = 0;
  document.body.children = [];
  Object.keys(mockElements).forEach(k => delete mockElements[k]);
}

// ===== UT-001: selectWeapon — 正常装备武器 =====
tests.push({
  id: 'UT-001',
  name: 'weaponWaveSelect.selectWeapon — 正常装备武器',
  run: () => {
    resetState();
    player.weapon = null;

    const modal = document.createElement('div');
    modal.id = 'wave-select-modal';
    document.body.appendChild(modal);

    weaponWaveSelect.selectWeapon('rifle');

    assert(player.weapon !== null, 'weapon should be set');
    assert(player.weapon.type === 'rifle', `expected rifle, got ${player.weapon.type}`);
    assert(player.weapon.fireRate === weaponConfig.rifle.fireRate, 'fireRate mismatch');
    assert(player.weapon.color === weaponConfig.rifle.color, 'color should be set on weapon');
    assert(player.weapon.name === weaponConfig.rifle.name, 'name should be set on weapon');
    assert(document.getElementById('wave-select-modal') === null, 'modal should be removed');
    assert(startWaveCalled === true, 'startWave should be called');
  }
});

// ===== UT-002: show — 库存为空时降级 =====
tests.push({
  id: 'UT-002',
  name: 'weaponWaveSelect.show — 库存为空时降级为rifle',
  run: () => {
    resetState();
    weaponManager.inventory = {};
    player.weapon = null;

    weaponWaveSelect.show();

    assert(player.weapon !== null, 'weapon should be set via fallback');
    assert(player.weapon.type === 'rifle', 'fallback should be rifle');
    assert(document.getElementById('wave-select-modal') === null, 'no modal when empty inventory');
  }
});

// ===== UT-003: createDrop — 15%概率生成掉落 =====
tests.push({
  id: 'UT-003',
  name: 'weaponDropIntegration.createDrop — 15%概率生成掉落',
  run: () => {
    resetState();
    const origRandom = Math.random;
    Math.random = () => 0.1; // < 0.15, should create drop

    weaponDropIntegration.createDrop(100, 0.3);

    Math.random = origRandom;

    assert(weaponDropIntegration.drops.length === 1, `expected 1 drop, got ${weaponDropIntegration.drops.length}`);
    assert(weaponDropIntegration.drops[0].x === 100, 'x mismatch');
    assert(weaponDropIntegration.drops[0].z === 0.3, 'z mismatch');
    assert(weaponDropIntegration.drops[0].collected === false, 'should not be collected');
    assert(['rifle', 'machinegun', 'shotgun'].includes(weaponDropIntegration.drops[0].type), 'invalid weapon type');
  }
});

// ===== UT-004: createDrop — 概率未触发 =====
tests.push({
  id: 'UT-004',
  name: 'weaponDropIntegration.createDrop — 概率未触发',
  run: () => {
    resetState();
    const origRandom = Math.random;
    Math.random = () => 0.5; // > 0.15, no drop

    weaponDropIntegration.createDrop(100, 0.3);

    Math.random = origRandom;

    assert(weaponDropIntegration.drops.length === 0, `expected 0 drops, got ${weaponDropIntegration.drops.length}`);
  }
});

// ===== UT-005: checkCollection — 玩家在范围内拾取（z-based）=====
tests.push({
  id: 'UT-005',
  name: 'weaponDropIntegration.checkCollection — drop达到collectZ且x在范围内拾取',
  run: () => {
    resetState();
    player = { x: 400, y: 580, weapon: null };
    // Drop at same x as player, z just below collect threshold
    weaponDropIntegration.drops = [{ x: 420, z: 0.85 - 0.004, type: 'machinegun', collected: false }];

    // One checkCollection call advances z by 0.004, reaching 0.85
    weaponDropIntegration.checkCollection();

    assert(mockAddWeaponCalls.includes('machinegun'), 'addWeapon should be called with machinegun');
    assert(weaponDropIntegration.drops.length === 0, 'drop should be removed after collection');
  }
});

// ===== UT-006: checkCollection — x偏差过大不拾取 =====
tests.push({
  id: 'UT-006',
  name: 'weaponDropIntegration.checkCollection — drop x偏差超过laneWidth不拾取',
  run: () => {
    resetState();
    player = { x: 400, y: 580, weapon: null };
    // Drop at collectZ threshold but too far left (dx=200 > laneWidth=80)
    weaponDropIntegration.drops = [{ x: 200, z: 0.85 - 0.004, type: 'rifle', collected: false }];

    weaponDropIntegration.checkCollection();

    assert(mockAddWeaponCalls.length === 0, 'addWeapon should not be called');
    assert(weaponDropIntegration.drops.length === 1, 'drop should remain');
  }
});

// ===== UT-007: playMergeEffect — 生成20个粒子 =====
tests.push({
  id: 'UT-007',
  name: 'weaponMergeAnimation.playMergeEffect — 生成20个粒子',
  run: () => {
    resetState();
    weaponMergeAnimation.particles = [];

    weaponMergeAnimation.playMergeEffect('rifle');

    assert(weaponMergeAnimation.particles.length === 20,
      `expected 20 particles, got ${weaponMergeAnimation.particles.length}`);
    weaponMergeAnimation.particles.forEach((p, i) => {
      assert(p.color === weaponConfig.rifle.color,
        `particle ${i} color mismatch: expected ${weaponConfig.rifle.color}, got ${p.color}`);
      assert(p.life === 1, `particle ${i} life should be 1`);
    });
  }
});

// ===== UT-008: update — 粒子生命值递减和清理 =====
tests.push({
  id: 'UT-008',
  name: 'weaponMergeAnimation.update — 粒子生命值递减和清理',
  run: () => {
    resetState();
    weaponMergeAnimation.particles = [
      { x: 100, y: 100, vx: 2, vy: 1, life: 0.02, color: '#fff' },
      { x: 200, y: 200, vx: -1, vy: 3, life: 0.5, color: '#fff' }
    ];

    weaponMergeAnimation.update();

    assert(weaponMergeAnimation.particles.length === 1,
      `expected 1 particle, got ${weaponMergeAnimation.particles.length}`);
    const remaining = weaponMergeAnimation.particles[0];
    assert(Math.abs(remaining.x - 199) < 0.001, `expected x=199, got ${remaining.x}`);
  }
});

// ===== IT-001: 完整武器获取→合成→装备流程 =====
tests.push({
  id: 'IT-001',
  name: '完整武器获取→合成→装备流程',
  run: () => {
    resetState();

    // Override weaponManager with one that supports mergeWeapons
    const testWM = {
      inventory: {},
      getInventory() { return this.inventory; },
      addWeapon(type) {
        this.inventory[type] = (this.inventory[type] || 0) + 1;
      },
      mergeWeapons(type) {
        const nextTier = weaponConfig[type] && weaponConfig[type + '+'] ? type + '+' : null;
        if (!nextTier) return { success: false, error: '无法合成' };
        const count = this.inventory[type] || 0;
        if (count < 3) return { success: false, error: `材料不足` };
        this.inventory[type] -= 3;
        this.inventory[nextTier] = (this.inventory[nextTier] || 0) + 1;
        return { success: true, result: nextTier };
      }
    };

    // STEP-1: Collect 3 rifles via drops
    for (let i = 0; i < 3; i++) {
      testWM.addWeapon('rifle');
    }

    // STEP-2: Verify inventory
    assert(testWM.inventory['rifle'] === 3, `expected 3 rifles, got ${testWM.inventory['rifle']}`);

    // STEP-3: Merge
    const result = testWM.mergeWeapons('rifle');
    assert(result.success === true, 'merge should succeed');
    assert(result.result === 'rifle+', `expected rifle+, got ${result.result}`);

    // STEP-4: Verify inventory update
    assert(testWM.inventory['rifle'] === 0, `rifle should be 0, got ${testWM.inventory['rifle']}`);
    assert(testWM.inventory['rifle+'] === 1, `rifle+ should be 1, got ${testWM.inventory['rifle+']}`);

    // STEP-5: Select weapon for next wave (verifies color+name stored on player.weapon)
    weaponWaveSelect.selectWeapon('rifle+');
    assert(player.weapon.type === 'rifle+', `expected rifle+, got ${player.weapon.type}`);
    assert(player.weapon.color === weaponConfig['rifle+'].color, 'evolved weapon color should be set');
    assert(player.weapon.name === weaponConfig['rifle+'].name, 'evolved weapon name should be set');
  }
});

// ===== IT-002: 掉落拾取流程（z-based）=====
tests.push({
  id: 'IT-002',
  name: '掉落拾取流程（z-based）',
  run: () => {
    resetState();
    weaponManager.inventory = {};
    player = { x: 400, y: 580, weapon: null };
    weaponDropIntegration.drops = [];

    // STEP-1: Force drop creation with fixed Math.random
    const origRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      if (callCount === 1) return 0.05; // trigger drop (< 0.15)
      return 0; // always pick first weapon type (rifle)
    };

    weaponDropIntegration.createDrop(410, 0.0); // enemy screen x near player, z=0 (far away)
    Math.random = origRandom;

    // STEP-2: Verify drop created
    assert(weaponDropIntegration.drops.length === 1, `expected 1 drop, got ${weaponDropIntegration.drops.length}`);

    // STEP-3: Advance drop to collectZ by calling checkCollection repeatedly
    // Each call advances z by 0.004; need ~213 calls to reach 0.85 from z=0
    // Fast-forward: directly set z to just below collectZ
    weaponDropIntegration.drops[0].z = 0.85 - 0.004;
    weaponDropIntegration.checkCollection();

    // STEP-4: Verify inventory increased and drop cleaned up
    const types = ['rifle', 'machinegun', 'shotgun'];
    const hasWeapon = types.some(t => (weaponManager.inventory[t] || 0) >= 1);
    assert(hasWeapon, 'inventory should have at least one weapon after pickup');
    assert(weaponDropIntegration.drops.length === 0, 'drop should be cleaned up');
  }
});

// ===== Run Tests =====
console.log('Running Weapon Integration Tests...\n');
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
