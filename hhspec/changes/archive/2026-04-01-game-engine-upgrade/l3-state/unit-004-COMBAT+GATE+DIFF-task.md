# 实现单元任务描述：UNIT-004-COMBAT+GATE+DIFF

## 1. 单元信息

- **单元编号**: UNIT-004
- **包含上下文**: COMBAT（战斗）+ GATE（数字门）+ DIFFICULTY（难度）
- **依赖**: UNIT-001 (CORE), UNIT-002 (WEAPON), UNIT-003 (PLAYER+ENEMY)
- **优先级**: 低（第 3 批执行，依赖前三单元）

## 2. 实现目标

将战斗系统、数字门系统、难度系统迁移至 Phaser 3，保持游戏平衡性和难度曲线不变。

## 3. 需求追溯

### 3.1 L0 需求覆盖

- REQ-COMBAT-001: 子弹与敌人碰撞检测使用 Arcade Physics
- REQ-COMBAT-002: 伤害计算逻辑保持不变
- REQ-COMBAT-003: 敌人死亡特效使用 Phaser Particles
- REQ-GATE-001: 数字门使用 Phaser Graphics 绘制
- REQ-GATE-002: 玩家通过数字门时触发增益/减益效果
- REQ-DIFF-001: 难度系统保持 20 波渐进式难度
- REQ-DIFF-002: 敌人 HP/速度/数量随波次增加

### 3.2 L1 架构约束

- 限界上下文：COMBAT（碰撞检测、伤害计算）、GATE（数字门逻辑）、DIFFICULTY（难度曲线）
- 核心概念：Collision、Damage、NumberGate、DifficultyConfig

### 3.3 L2 设计参考

- 无（本变更为引擎迁移，保持现有逻辑）

## 4. 实现范围

### 4.1 文件清单

**新建文件**：
- `src/systems/CombatSystem.js` — 战斗系统（碰撞检测、伤害计算）
- `src/gameobjects/NumberGate.js` — 数字门类
- `src/systems/DifficultyManager.js` — 难度管理系统
- `src/config/difficultyConfig.js` — 难度配置（20 波数据）

**修改文件**：
- `src/scenes/GameScene.js` — 集成战斗、数字门、难度系统

**删除文件**：
- 无（保留原文件作为参考）

### 4.2 核心逻辑迁移

**战斗系统**：
```javascript
// 原 game.js 中的碰撞检测逻辑
// 迁移至 src/systems/CombatSystem.js
export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  setupCollisions() {
    this.scene.physics.add.overlap(
      this.scene.bullets,
      this.scene.enemies,
      this.onBulletHitEnemy,
      null,
      this
    );
  }

  onBulletHitEnemy(bullet, enemy) {
    // 伤害计算逻辑保持不变
  }
}
```

**数字门**：
```javascript
// 原 game.js 中的 NumberGate 类
// 迁移至 src/gameobjects/NumberGate.js
export class NumberGate extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, z, value) {
    super(scene);
    this.value = value;
  }

  applyEffect(player) {
    // 增益/减益逻辑保持不变
  }
}
```

**难度系统**：
```javascript
// 原 game.js 中的难度配置
// 迁移至 src/systems/DifficultyManager.js
export class DifficultyManager {
  constructor() {
    this.waveConfigs = [/* 20 波配置 */];
  }

  getWaveConfig(wave) {
    return this.waveConfigs[wave - 1];
  }
}
```

## 5. 技术约束

### 5.1 Arcade Physics

- 使用 `this.physics.add.overlap()` 进行碰撞检测
- 碰撞回调函数保持原逻辑

### 5.2 难度配置

- 难度配置提取为独立配置文件
- 20 波数据保持不变（敌人 HP、速度、数量）

## 6. 验收标准

### 6.1 功能验收

- [ ] 子弹与敌人碰撞检测正常
- [ ] 伤害计算正确（考虑武器等级）
- [ ] 敌人死亡后正确移除
- [ ] 数字门正确渲染和碰撞检测
- [ ] 数字门增益/减益效果正常
- [ ] 难度系统 20 波配置正确
- [ ] 敌人属性随波次正确增长

### 6.2 游戏平衡性

- [ ] 第 1 波难度适中（新手友好）
- [ ] 第 10 波难度明显提升
- [ ] 第 20 波难度达到峰值

### 6.3 代码质量

- [ ] ESLint 无错误
- [ ] 战斗系统与其他系统解耦
- [ ] 难度配置易于调整

## 7. 测试要求

### 7.1 单元测试

- CombatSystem 的伤害计算逻辑
- NumberGate 的增益/减益计算
- DifficultyManager 的波次配置获取

### 7.2 集成测试

- 子弹与敌人碰撞检测
- 玩家与数字门碰撞检测
- 难度系统与敌人生成集成

## 8. 参考资料

- 现有代码: `game.js` 中的战斗、数字门、难度逻辑
- Phaser Arcade Physics 文档: https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.html
