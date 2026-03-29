---
title: "Weapon Integration - API Detailed Design"
module: "INTEGRATION"
version: "1.0"
date: "2026-03-29"
author: "l2_api_designer (逆向生成)"
status: "draft"
change: "weapon-integration"
---

> **逆向生成** — 基于已有代码（weaponWaveSelect.js / weaponDropIntegration.js / weaponMergeAnimation.js）逆向提炼，需人工确认和补充。

# Weapon Integration - API Detailed Design

## 1. Design Overview

本集成变更将武器进化系统（weapon-evolution-system）接入游戏主循环，涉及三个模块：

| 模块 | 文件 | 职责 |
|------|------|------|
| 波次武器选择 | weaponWaveSelect.js | 波次开始前展示武器选择UI |
| 武器掉落集成 | weaponDropIntegration.js | 敌人死亡时掉落武器箱，玩家拾取 |
| 合成动画 | weaponMergeAnimation.js | 武器合成时的粒子动画和音效 |

## 2. weaponWaveSelect 模块

### 2.1 show()

**Method Signature**:
```
METHOD show()
  RETURNS: void
  SIDE_EFFECTS: 创建并插入 wave-select-modal DOM 节点
```

**Business Logic**:
```
STEP-01: 获取库存
  inventory = weaponManager.getInventory()
  weapons = 筛选 count > 0 的武器项

STEP-02: 边界处理
  IF weapons.length === 0:
    CALL this.selectWeapon('rifle')
    RETURN early

STEP-03: 创建弹窗
  创建 div#wave-select-modal
  渲染武器网格（每张卡显示颜色/名称/伤害/射速/数量）
  将 modal 附加到 document.body

SOURCE: FR-1 波次选择武器UI
```

**Error Cases**:
```
| weaponManager 未初始化 | 库存为空，降级为 selectWeapon('rifle') |
| weaponConfig 中无对应配置 | 显示异常，不崩溃（cfg 为 undefined） |
```

---

### 2.2 selectWeapon(type)

**Method Signature**:
```
METHOD selectWeapon(type: string)
  RETURNS: void
  SIDE_EFFECTS: 更新 player.weapon + 移除 modal + 调用 startWave()
```

**Business Logic**:
```
STEP-01: 读取武器配置
  cfg = weaponConfig[type]

STEP-02: 更新 player.weapon
  player.weapon = {type, fireRate, damage, bulletCount, lastFire: 0}

STEP-03: 关闭弹窗
  移除 #wave-select-modal（若存在）

STEP-04: 开始波次
  CALL startWave()

SOURCE: FR-1 选择后自动装备并开始新波次
```

---

## 3. weaponDropIntegration 模块

### 3.1 createDrop(x, y)

**Method Signature**:
```
METHOD createDrop(x: number, y: number)
  RETURNS: void
  SIDE_EFFECTS: 向 game.weaponDrops 数组 push 新掉落项
```

**Business Logic**:
```
STEP-01: 概率判断
  dropChance = 0.15 (15%)
  IF Math.random() > dropChance: RETURN early

STEP-02: 随机武器类型
  types = ['rifle', 'machinegun', 'shotgun']
  type = 随机选取

STEP-03: 创建掉落项
  game.weaponDrops.push({x, y, type, collected: false, pulseTime: 0})

SOURCE: FR-2 敌人死亡时有概率掉落武器箱
```

---

### 3.2 checkCollection()

**Method Signature**:
```
METHOD checkCollection()
  RETURNS: void
  SIDE_EFFECTS: 修改 game.weaponDrops + 调用 weaponManager.addWeapon()
```

**Business Logic**:
```
STEP-01: 遍历掉落物
  FOR EACH drop IN game.weaponDrops:
    IF drop.collected: SKIP

STEP-02: 碰撞检测
  dist = sqrt((drop.x - player.x)^2 + (drop.y - player.y)^2)
  IF dist < 40:
    weaponManager.addWeapon(drop.type)
    drop.collected = true
    CALL this.showNotification(...)

STEP-03: 清理已收集
  game.weaponDrops = filter(collected === false)

SOURCE: FR-2 玩家碰触武器箱时自动拾取，武器添加到库存
```

---

### 3.3 showNotification(text)

**Method Signature**:
```
METHOD showNotification(text: string)
  RETURNS: void
  SIDE_EFFECTS: 创建临时通知 DOM，2秒后自动移除
```

---

## 4. weaponMergeAnimation 模块

### 4.1 playMergeEffect(weaponType)

**Method Signature**:
```
METHOD playMergeEffect(weaponType: string)
  RETURNS: void
  SIDE_EFFECTS: 向 particles 数组推入20个粒子 + 调用 playSound()
```

**Business Logic**:
```
STEP-01: 读取武器颜色
  cfg = weaponConfig[weaponType]

STEP-02: 生成20个粒子
  每个粒子: {x: 450, y: 350, vx: ±4, vy: ±4, life: 1, color: cfg.color}

STEP-03: 播放音效
  CALL this.playSound()

SOURCE: FR-3 合成时显示粒子动画效果
```

---

### 4.2 update()

```
每帧更新粒子位置（vx/vy）和生命值（-0.02/帧）
过滤 life <= 0 的粒子
```

### 4.3 render(ctx)

```
绘制所有粒子：4x4 的彩色方块，globalAlpha = p.life
```

### 4.4 playSound()

```
使用 Web Audio API 创建振荡器（800Hz），0.3秒衰减音效
SOURCE: FR-3 播放合成音效
```

---

## 5. L0 需求覆盖矩阵

| 需求 | 覆盖模块 | 覆盖状态 |
|------|----------|---------|
| FR-1: 波次武器选择UI | weaponWaveSelect.show() / selectWeapon() | ✅ 已实现 |
| FR-2: 武器掉落箱集成 | weaponDropIntegration.createDrop() / checkCollection() | ✅ 已实现 |
| FR-3: 合成动画和音效 | weaponMergeAnimation.playMergeEffect() + playSound() | ✅ 已实现（无音量控制，音效简单） |
| FR-4: E2E 测试 | 见 test-design.md | 待补充 |

---

## 6. 边界场景和风险

| ID | 场景 | 当前处理 | 风险 |
|----|------|---------|------|
| EDGE-001 | 库存为空时波次开始 | 降级为 rifle | 低 |
| EDGE-002 | weaponConfig 无该类型 | cfg 为 undefined，可能 crash | 中 |
| EDGE-003 | 游戏主循环未暴露 game.weaponDrops | 运行时错误 | 需验证 |
| EDGE-004 | AudioContext 不支持 | new AudioContext 可能抛错 | 中（浏览器兼容性） |
| EDGE-005 | 合成时 weaponType 无效 | cfg 为 undefined，粒子颜色 undefined | 低 |
