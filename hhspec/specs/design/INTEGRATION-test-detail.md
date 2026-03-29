---
title: "Weapon Integration - Test Design"
module: "INTEGRATION"
version: "1.0"
date: "2026-03-29"
author: "l2_test_designer (逆向生成)"
---

> **逆向生成** — 基于已有代码逆向补充测试骨架，需人工确认。

# INTEGRATION-test-detail.md

## 1. 测试范围

覆盖 FR-1 / FR-2 / FR-3 四项需求的核心路径验证。

---

## 2. 单元测试骨架

### UT-001: weaponWaveSelect.selectWeapon — 正常装备武器

```
ARRANGE:
  player.weapon = null
  weaponConfig['rifle'] = {fireRate: 300, damage: 1, bulletCount: 1}
  game.wave = 1
  DOM: 插入 #wave-select-modal

ACT:
  weaponWaveSelect.selectWeapon('rifle')

ASSERT:
  player.weapon.type === 'rifle'
  player.weapon.fireRate === 300
  document.getElementById('wave-select-modal') === null (modal 已移除)

L0 TRACE: FR-1 选择后自动装备
```

---

### UT-002: weaponWaveSelect.show — 库存为空时降级

```
ARRANGE:
  weaponManager.getInventory() 返回 {}
  player.weapon = null
  selectWeapon spy 已附加

ACT:
  weaponWaveSelect.show()

ASSERT:
  selectWeapon 被调用，参数为 'rifle'
  DOM 中无 #wave-select-modal

L0 TRACE: FR-1 库存为空时的 fallback 行为
```

---

### UT-003: weaponDropIntegration.createDrop — 15%概率生成掉落

```
ARRANGE:
  Math.random mock: 让一次返回 0.1（< 0.15，生成）
  game.weaponDrops = []

ACT:
  weaponDropIntegration.createDrop(100, 200)

ASSERT:
  game.weaponDrops.length === 1
  game.weaponDrops[0].x === 100
  game.weaponDrops[0].y === 200
  game.weaponDrops[0].collected === false
  game.weaponDrops[0].type IN ['rifle', 'machinegun', 'shotgun']

L0 TRACE: FR-2 敌人死亡时有概率掉落武器箱
```

---

### UT-004: weaponDropIntegration.createDrop — 概率未触发

```
ARRANGE:
  Math.random mock: 返回 0.5（> 0.15，不生成）
  game.weaponDrops = []

ACT:
  weaponDropIntegration.createDrop(100, 200)

ASSERT:
  game.weaponDrops.length === 0

L0 TRACE: FR-2 掉落概率控制
```

---

### UT-005: weaponDropIntegration.checkCollection — 玩家在范围内拾取

```
ARRANGE:
  player = {x: 100, y: 100}
  game.weaponDrops = [{x: 110, y: 110, type: 'machinegun', collected: false}]
  weaponManager.addWeapon spy

ACT:
  weaponDropIntegration.checkCollection()

ASSERT:
  weaponManager.addWeapon 被调用，参数 'machinegun'
  game.weaponDrops.length === 0 (已清理)

L0 TRACE: FR-2 玩家碰触武器箱时自动拾取
```

---

### UT-006: weaponDropIntegration.checkCollection — 玩家超出范围不拾取

```
ARRANGE:
  player = {x: 0, y: 0}
  game.weaponDrops = [{x: 200, y: 200, type: 'rifle', collected: false}]
  weaponManager.addWeapon spy

ACT:
  weaponDropIntegration.checkCollection()

ASSERT:
  weaponManager.addWeapon 未被调用
  game.weaponDrops.length === 1

L0 TRACE: FR-2 碰撞检测距离
```

---

### UT-007: weaponMergeAnimation.playMergeEffect — 生成20个粒子

```
ARRANGE:
  weaponConfig['rifle+'] = {color: '#ff7948'}
  weaponMergeAnimation.particles = []
  playSound mock（避免 AudioContext）

ACT:
  weaponMergeAnimation.playMergeEffect('rifle+')

ASSERT:
  weaponMergeAnimation.particles.length === 20
  每个粒子 .color === '#ff7948'
  每个粒子 .life === 1
  playSound 被调用

L0 TRACE: FR-3 合成时显示粒子动画
```

---

### UT-008: weaponMergeAnimation.update — 粒子生命值递减和清理

```
ARRANGE:
  weaponMergeAnimation.particles = [
    {x: 100, y: 100, vx: 2, vy: 1, life: 0.02, color: '#fff'},
    {x: 200, y: 200, vx: -1, vy: 3, life: 0.5, color: '#fff'}
  ]

ACT:
  weaponMergeAnimation.update()

ASSERT:
  particles.length === 1 (life <= 0 的已被过滤)
  剩余粒子的 x 已更新 (x = 200 + (-1) = 199)

L0 TRACE: FR-3 粒子动画更新逻辑
```

---

## 3. 集成测试骨架

### IT-001: 完整武器获取→合成→装备流程

```
ARRANGE:
  真实 weaponManager 实例（localStorage 清空）
  weaponDropIntegration 和 weaponWaveSelect 真实实例

STEP-1: 模拟玩家拾取3个 rifle
  FOR i IN range(3):
    game.weaponDrops = [{x: player.x, y: player.y, type: 'rifle', collected: false}]
    weaponDropIntegration.checkCollection()

STEP-2: 验证库存
  inventory = weaponManager.getInventory()
  ASSERT inventory['rifle'] === 3

STEP-3: 合成（调用 mergeWeapons）
  result = weaponManager.mergeWeapons('rifle')
  ASSERT result.success === true
  ASSERT result.result === 'rifle+'

STEP-4: 验证库存更新
  inventory = weaponManager.getInventory()
  ASSERT inventory['rifle'] === 0
  ASSERT inventory['rifle+'] === 1

STEP-5: 波次开始时选择武器
  weaponWaveSelect.selectWeapon('rifle+')
  ASSERT player.weapon.type === 'rifle+'

L0 TRACE: FR-4 测试完整的武器获取→合成→装备流程
```

---

### IT-002: 波次选择流程

```
ARRANGE:
  weaponManager 库存 = {rifle: 2, machinegun: 1}
  DOM: document.body 可用

ACT:
  weaponWaveSelect.show()

ASSERT:
  document.getElementById('wave-select-modal') 存在
  modal 中有 3 张武器卡片（每种 count > 0 的武器各一张）
  包含 rifle 和 machinegun 卡片

ACT2: 点击 rifle 卡片
  weaponWaveSelect.selectWeapon('rifle')

ASSERT:
  modal 已从 DOM 移除
  player.weapon.type === 'rifle'

L0 TRACE: FR-4 测试波次选择流程
```

---

### IT-003: 掉落拾取流程

```
ARRANGE:
  weaponManager 库存清空
  player = {x: 300, y: 300}
  game.weaponDrops = []

STEP-1: 模拟敌人死亡（强制触发掉落）
  Math.random mock → 始终返回 0.05
  weaponDropIntegration.createDrop(305, 305)

STEP-2: 验证掉落已创建
  ASSERT game.weaponDrops.length === 1

STEP-3: 玩家拾取
  weaponDropIntegration.checkCollection()

STEP-4: 验证库存增加
  inventory = weaponManager.getInventory()
  ASSERT 有一个武器的 count === 1

L0 TRACE: FR-4 测试掉落拾取流程
```

---

## 4. 测试工具和配置

```
测试框架: Jest + jsdom（已有 tests/ 目录）
Mock 策略:
  - WeaponManager: 使用真实实例（localStorage mock by jest）
  - AudioContext: mock（避免浏览器 API 依赖）
  - Math.random: 按需 mock 控制概率
  - startWave(): mock（避免启动游戏主循环）

运行命令: npx jest tests/
```
