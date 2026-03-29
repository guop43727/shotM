// NumberGate Tests
// 测试门的数字变化、越过玩家时的 player.count 逻辑

// ===== Mock =====

// Mock canvas/ctx (not needed for logic tests)
global.canvas = { width: 900, height: 700 };
global.ctx = {
  save: () => {}, restore: () => {}, strokeRect: () => {},
  fillText: () => {}, beginPath: () => {}, arc: () => {},
  fill: () => {}, stroke: () => {},
  shadowBlur: 0, shadowColor: '', strokeStyle: '', lineWidth: 0,
  fillStyle: '', font: '', textAlign: '', textBaseline: ''
};

// Mock player
let player = { x: 450, y: 580, count: 1 };

// Mock adjustDifficulty
let adjustDifficultyCalled = false;
function adjustDifficulty() { adjustDifficultyCalled = true; }

// Mock game
let game = { numberGates: [], bullets: [], enemies: [] };

// ===== 内联 NumberGate 实现（原版 bug）=====
class NumberGate_Buggy {
  constructor(number) {
    this.z = 0;
    this.laneOffset = 0;
    this.speed = 0.0015;
    this.number = number !== undefined ? number : (-5 - Math.floor(Math.random() * 10));
    this.hit = false;
  }

  getScreenPosition() {
    const vanishingY = 50;
    const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
    const scale = 0.3 + this.z * 0.7;
    const x = canvas.width / 2 + this.laneOffset * scale;
    return { x, y, scale };
  }

  onHit() { this.number++; }

  // ❌ BAD: 替换 player.count（原始 bug）
  update() {
    this.z += this.speed;
    if (this.z > 0.9 && !this.hit) {
      this.hit = true;
      const oldCount = player.count;
      player.count = Math.max(1, this.number); // BUG: 替换而非累加
      if (player.count > oldCount) adjustDifficulty();
      return true;
    }
    return this.z >= 1;
  }
}

// ===== 修复版 NumberGate =====
class NumberGate_Fixed {
  constructor(number) {
    this.z = 0;
    this.laneOffset = 0;
    this.speed = 0.0015;
    this.number = number !== undefined ? number : (-5 - Math.floor(Math.random() * 10));
    this.hit = false;
  }

  getScreenPosition() {
    const vanishingY = 50;
    const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
    const scale = 0.3 + this.z * 0.7;
    const x = canvas.width / 2 + this.laneOffset * scale;
    return { x, y, scale };
  }

  onHit() { this.number++; }

  // ✅ FIXED: 累加 player.count
  update() {
    this.z += this.speed;
    if (this.z > 0.9 && !this.hit) {
      this.hit = true;
      const oldCount = player.count;
      player.count = Math.max(1, player.count + this.number); // FIX: 累加
      if (player.count > oldCount) adjustDifficulty();
      return true;
    }
    return this.z >= 1;
  }
}

// ===== Test Runner =====
const tests = [];
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function reset() {
  player = { x: 450, y: 580, count: 1 };
  adjustDifficultyCalled = false;
}

// ===== BUG 复现测试（验证原 bug 存在）=====
tests.push({
  id: 'BUG-001',
  name: '[BUG 复现] 门被射击变正数后越过，原版实现 player.count 不正确（被替换而非累加）',
  run: () => {
    reset();
    player.count = 3; // 当前有3个防守者

    const gate = new NumberGate_Buggy(-5); // 门初始 -5
    // 射击5次让门变正数
    for (let i = 0; i < 9; i++) gate.onHit(); // -5 + 9 = +4
    assert(gate.number === 4, `门数字应为+4，实际 ${gate.number}`);

    // 门越过玩家
    gate.z = 0.91;
    gate.update();

    // 原版 BUG：player.count = Math.max(1, 4) = 4（替换，非累加3+4=7）
    assert(gate.hit === true, '门应被标记已命中');
    // 验证 BUG：原版得到 4，而不是期望的 3+4=7
    const bugResult = player.count; // 4（被替换）
    assert(bugResult === 4, `BUG 复现：替换结果为 ${bugResult}（正确应为 7）`);
    // 确认原版不等于累加结果
    assert(bugResult !== 7, `BUG 确认：${bugResult} != 7（期望累加结果）`);
  }
});

// ===== 修复版测试 =====
tests.push({
  id: 'FIX-001',
  name: '[修复验证] 正数门越过玩家，player.count 正确累加',
  run: () => {
    reset();
    player.count = 3;

    const gate = new NumberGate_Fixed(-5);
    for (let i = 0; i < 9; i++) gate.onHit(); // -5+9=+4
    assert(gate.number === 4, `门数字应为4，实际 ${gate.number}`);

    gate.z = 0.91;
    gate.update();

    assert(player.count === 7, `期望 3+4=7，实际 ${player.count}`);
  }
});

tests.push({
  id: 'FIX-002',
  name: '[修复验证] 负数门越过玩家，player.count 减少但不低于1',
  run: () => {
    reset();
    player.count = 3;

    const gate = new NumberGate_Fixed(-5); // 没有被射击，保持-5
    gate.z = 0.91;
    gate.update();

    // 3 + (-5) = -2 → Math.max(1, -2) = 1
    assert(player.count === 1, `期望 max(1, 3-5)=1，实际 ${player.count}`);
  }
});

tests.push({
  id: 'FIX-003',
  name: '[修复验证] 负数门被射击恰好到0，玩家数量不变',
  run: () => {
    reset();
    player.count = 5;

    const gate = new NumberGate_Fixed(-5); // 初始 -5
    for (let i = 0; i < 5; i++) gate.onHit(); // -5+5=0
    assert(gate.number === 0, `门数字应为0，实际 ${gate.number}`);

    gate.z = 0.91;
    gate.update();

    // 5 + 0 = 5，不变
    assert(player.count === 5, `期望 5+0=5，实际 ${player.count}`);
  }
});

tests.push({
  id: 'FIX-004',
  name: '[修复验证] adjustDifficulty 仅在 count 增加时调用',
  run: () => {
    reset();
    player.count = 5;
    adjustDifficultyCalled = false;

    // 负数门越过 → count 减少 → 不调用 adjustDifficulty
    const gate1 = new NumberGate_Fixed(-5);
    gate1.z = 0.91;
    gate1.update();
    assert(!adjustDifficultyCalled, '负数门越过不应调用 adjustDifficulty');

    // 正数门越过 → count 增加 → 调用 adjustDifficulty
    reset();
    player.count = 5;
    const gate2 = new NumberGate_Fixed(3); // 直接正数
    gate2.z = 0.91;
    gate2.update();
    assert(adjustDifficultyCalled, '正数门越过应调用 adjustDifficulty');
  }
});

tests.push({
  id: 'FIX-005',
  name: '[修复验证] 门只触发一次（hit 标记生效）',
  run: () => {
    reset();
    player.count = 3;

    const gate = new NumberGate_Fixed(5);
    gate.z = 0.91;
    gate.update(); // 第一次：3+5=8
    assert(player.count === 8, `第一次越过应得8，实际 ${player.count}`);

    gate.update(); // 第二次：hit=true，不应再触发
    assert(player.count === 8, `hit 后不应再修改 player.count，实际 ${player.count}`);
  }
});

tests.push({
  id: 'FIX-006',
  name: '[修复验证] onHit 每次+1，多次射击累计',
  run: () => {
    reset();
    const gate = new NumberGate_Fixed(-10); // 初始 -10
    assert(gate.number === -10, '初始应为-10');

    for (let i = 0; i < 15; i++) gate.onHit();
    assert(gate.number === 5, `15次射击后应为-10+15=5，实际 ${gate.number}`);
  }
});

tests.push({
  id: 'FIX-007',
  name: '[修复验证] player.count 始终 ≥ 1',
  run: () => {
    reset();
    player.count = 1;

    const gate = new NumberGate_Fixed(-100); // 极大负数
    gate.z = 0.91;
    gate.update();

    assert(player.count >= 1, `player.count 不应低于1，实际 ${player.count}`);
    assert(player.count === 1, `极大负数应被钳制为1，实际 ${player.count}`);
  }
});

// ===== Run =====
console.log('Running NumberGate Tests...\n');
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
