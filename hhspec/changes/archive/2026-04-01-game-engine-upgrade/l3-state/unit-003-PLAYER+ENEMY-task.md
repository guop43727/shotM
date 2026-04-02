# 实现单元任务描述：UNIT-003-PLAYER+ENEMY

## 1. 单元信息

- **单元编号**: UNIT-003
- **包含上下文**: PLAYER（玩家）+ ENEMY（敌人）
- **依赖**: UNIT-001 (CORE), UNIT-002 (WEAPON)
- **优先级**: 中（第 2 批执行，与 UI 并行）

## 2. 实现目标

将玩家和敌人的 2.5D 伪 3D 渲染（3 面盒子）从 Canvas 2D 迁移至 Phaser Graphics，保持透视投影和碰撞检测逻辑。

## 3. 需求追溯

### 3.1 L0 需求覆盖

- REQ-PLAYER-001: 玩家使用 Phaser Graphics 绘制 3 面盒子（前/左/右）
- REQ-PLAYER-002: 玩家左右移动使用键盘（A/D 或方向键）
- REQ-PLAYER-003: 玩家射击使用空格键，子弹使用 Phaser Sprite
- REQ-ENEMY-001: 敌人使用 Phaser Graphics 绘制 3 面盒子
- REQ-ENEMY-002: 敌人透视投影保持不变（基于 z 坐标缩放）
- REQ-ENEMY-003: 敌人碰撞检测使用 Arcade Physics

### 3.2 L1 架构约束

- 限界上下文：PLAYER（玩家控制、射击）、ENEMY（敌人生成、移动、AI）
- 核心概念：Player、Enemy、Bullet、透视投影、碰撞检测

### 3.3 L2 设计参考

- 无（本变更为引擎迁移，保持现有逻辑）

## 4. 实现范围

### 4.1 文件清单

**新建文件**：
- `src/gameobjects/Player.js` — 玩家类（Phaser Graphics 绘制）
- `src/gameobjects/Enemy.js` — 敌人类（Phaser Graphics 绘制）
- `src/gameobjects/Bullet.js` — 子弹类（Phaser Sprite）
- `src/systems/EnemySpawner.js` — 敌人生成系统
- `src/utils/PerspectiveProjection.js` — 透视投影工具函数

**修改文件**：
- `src/scenes/GameScene.js` — 集成玩家和敌人系统

**删除文件**：
- 无（保留原文件作为参考）

### 4.2 核心逻辑迁移

**玩家 3 面盒子绘制**：
```javascript
// 原 game.js 中的 drawPlayer()
// 迁移至 src/gameobjects/Player.js
export class Player extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, z) {
    super(scene);
    this.x = x;
    this.y = y;
    this.z = z;
  }

  draw() {
    this.clear();
    const scale = this.calculatePerspectiveScale(this.z);
    // 绘制前面、左面、右面（保持原逻辑）
  }
}
```

**敌人透视投影**：
```javascript
// 原 game.js 中的 Enemy 类
// 迁移至 src/gameobjects/Enemy.js
export class Enemy extends Phaser.GameObjects.Graphics {
  constructor(scene, x, y, z, hp) {
    super(scene);
    this.z = z;
    this.hp = hp;
  }

  update(delta) {
    this.z -= this.speed * delta;
    this.draw();
  }
}
```

## 5. 技术约束

### 5.1 Phaser Graphics

- 使用 `Phaser.GameObjects.Graphics` 动态绘制 3 面盒子
- 每帧调用 `clear()` 后重新绘制
- 透视缩放公式保持不变：`scale = 1 / (1 + z / 1000)`

### 5.2 Arcade Physics

- 玩家和敌人启用 Arcade Physics Body
- 碰撞检测使用 `this.physics.overlap()`
- 子弹使用 Phaser Sprite + Physics Body

## 6. 验收标准

### 6.1 功能验收

- [ ] 玩家 3 面盒子正确渲染（前/左/右面）
- [ ] 玩家左右移动流畅（A/D 或方向键）
- [ ] 玩家射击正常（空格键，子弹飞行）
- [ ] 敌人 3 面盒子正确渲染
- [ ] 敌人透视投影正确（远小近大）
- [ ] 敌人与玩家碰撞检测正常
- [ ] 子弹与敌人碰撞检测正常

### 6.2 性能验收

- [ ] 100 个敌人同时存在时保持 60 FPS
- [ ] Graphics 绘制开销 < 5ms/frame

### 6.3 代码质量

- [ ] ESLint 无错误
- [ ] 透视投影逻辑提取为独立工具函数
- [ ] 玩家和敌人类职责单一

## 7. 测试要求

### 7.1 单元测试

- PerspectiveProjection 工具函数的缩放计算
- Player 的移动边界检测
- Enemy 的 HP 计算和死亡判定

### 7.2 集成测试

- 玩家与敌人碰撞检测
- 子弹与敌人碰撞检测
- 敌人生成系统与波次管理集成

## 8. 参考资料

- 现有代码: `game.js` 中的 Player / Enemy / Bullet 类
- Phaser Graphics 文档: https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html
- Phaser Arcade Physics 文档: https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.html
