# 实现单元任务描述：UNIT-002-WEAPON

## 1. 单元信息

- **单元编号**: UNIT-002
- **包含上下文**: WEAPON（武器系统）
- **依赖**: UNIT-001 (CORE)
- **优先级**: 高（与 CORE 并行，第 1 批执行）

## 2. 实现目标

将现有武器系统（weaponManager.js / weaponUI.js / weaponWaveSelect.js）迁移至 Phaser 3 架构，保持武器进化、合并、掉落逻辑不变。

## 3. 需求追溯

### 3.1 L0 需求覆盖

- REQ-WEAPON-001: 武器系统保持现有功能（进化/合并/掉落）
- REQ-WEAPON-002: 武器 UI 使用 Phaser DOM Element 或 HTML Overlay
- REQ-WEAPON-003: 武器掉落物使用 Phaser Sprite
- REQ-WEAPON-004: 波次武器选择界面保持不变

### 3.2 L1 架构约束

- 限界上下文：WEAPON（武器管理、进化、合并、掉落）
- 核心概念：Weapon、WeaponDrop、WeaponEvolution、WeaponMerge

### 3.3 L2 设计参考

- `INTEGRATION-api-design.md`: weaponWaveSelect / weaponDropIntegration / weaponMergeAnimation 模块

## 4. 实现范围

### 4.1 文件清单

**新建文件**：
- `src/systems/WeaponManager.js` — 武器管理系统（迁移自 weaponManager.js）
- `src/systems/WeaponEvolution.js` — 武器进化逻辑
- `src/systems/WeaponMerge.js` — 武器合并逻辑
- `src/ui/WeaponUI.js` — 武器 UI 组件（迁移自 weaponUI.js）
- `src/ui/WeaponWaveSelect.js` — 波次武器选择（迁移自 weaponWaveSelect.js）
- `src/gameobjects/WeaponDrop.js` — 武器掉落物 Sprite

**修改文件**：
- `src/scenes/GameScene.js` — 集成武器系统

**删除文件**：
- 无（保留原文件作为参考）

### 4.2 核心逻辑迁移

**武器管理器**：
```javascript
// 原 weaponManager.js
// 迁移至 src/systems/WeaponManager.js
export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.weapons = [];
    this.activeWeapon = null;
  }

  evolveWeapon(weaponId) { /* 保持逻辑不变 */ }
  mergeWeapons(weapon1, weapon2) { /* 保持逻辑不变 */ }
}
```

**武器掉落物**：
```javascript
// 原 game.js 中的 WeaponDrop 类
// 迁移至 src/gameobjects/WeaponDrop.js
export class WeaponDrop extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, weaponType) {
    super(scene, x, y, 'weapon-drop');
    this.weaponType = weaponType;
  }
}
```

## 5. 技术约束

### 5.1 Phaser 集成

- 武器系统作为 Scene 的系统组件（`this.weaponManager`）
- 武器 UI 使用 Phaser DOM Element 或保持 HTML Overlay
- 武器掉落物使用 Phaser Sprite + Arcade Physics

### 5.2 状态管理

- 武器状态存储在 GameState 中
- 武器进化/合并事件通过 Phaser EventEmitter 通知

## 6. 验收标准

### 6.1 功能验收

- [ ] 武器进化逻辑正常（等级提升、属性增强）
- [ ] 武器合并逻辑正常（两个同级武器合并为高级武器）
- [ ] 武器掉落物正确渲染和碰撞检测
- [ ] 波次武器选择界面正常显示和交互
- [ ] 武器 UI 正确显示当前武器信息

### 6.2 代码质量

- [ ] ESLint 无错误
- [ ] 所有文件使用 ES 模块
- [ ] 武器系统与 CORE 解耦（通过接口通信）

## 7. 测试要求

### 7.1 单元测试

- WeaponManager 的进化/合并逻辑
- WeaponEvolution 的等级计算
- WeaponMerge 的合并规则

### 7.2 集成测试

- 武器掉落物与玩家碰撞检测
- 武器 UI 与游戏状态同步
- 波次武器选择与游戏流程集成

## 8. 参考资料

- 现有代码: `weaponManager.js`, `weaponUI.js`, `weaponWaveSelect.js`
- 设计文档: `hhspec/changes/game-engine-upgrade/specs/design/INTEGRATION-api-design.md`
- Phaser 3 Sprite 文档: https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Sprite.html
