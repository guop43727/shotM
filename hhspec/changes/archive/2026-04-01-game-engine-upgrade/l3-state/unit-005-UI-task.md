# 实现单元任务描述：UNIT-005-UI

## 1. 单元信息

- **单元编号**: UNIT-005
- **包含上下文**: UI（用户界面）
- **依赖**: UNIT-001 (CORE)
- **优先级**: 中（第 2 批执行，与 PLAYER+ENEMY 并行）

## 2. 实现目标

将赛博朋克风格 UI（金币/生命/波次/分数/暂停菜单）从 HTML/CSS 迁移至 Phaser DOM Element 或保持 HTML Overlay，确保霓虹特效和发光动画正常。

## 3. 需求追溯

### 3.1 L0 需求覆盖

- REQ-UI-001: 游戏 HUD 显示金币/生命/波次/分数
- REQ-UI-002: 赛博朋克霓虹风格保持不变
- REQ-UI-003: 暂停菜单（ESC 键）正常显示
- REQ-UI-004: 波次结束后显示武器选择界面
- REQ-UI-005: UI 响应式布局（适配不同屏幕）

### 3.2 L1 架构约束

- 限界上下文：UI（HUD、菜单、提示信息）
- 核心概念：HUD、PauseMenu、WaveCompleteUI

### 3.3 L2 设计参考

- 无（本变更为引擎迁移，保持现有样式）

## 4. 实现范围

### 4.1 文件清单

**新建文件**：
- `src/ui/HUD.js` — 游戏 HUD（金币/生命/波次/分数）
- `src/ui/PauseMenu.js` — 暂停菜单
- `src/ui/WaveCompleteUI.js` — 波次完成界面

**修改文件**：
- `src/scenes/GameScene.js` — 集成 UI 系统
- `style.css` — 保留赛博朋克样式，适配 Phaser

**删除文件**：
- 无（保留原文件作为参考）

### 4.2 核心逻辑迁移

**游戏 HUD**：
```javascript
// 原 index.html 中的 HUD 元素
// 迁移至 src/ui/HUD.js
export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.createHUD();
  }

  createHUD() {
    // 使用 Phaser DOM Element 或 HTML Overlay
    this.goldText = this.scene.add.dom(50, 30).createFromHTML(`
      <div class="hud-item">
        <span class="neon-text">💰 ${this.scene.gameState.gold}</span>
      </div>
    `);
  }

  update() {
    // 更新 HUD 显示
  }
}
```

**暂停菜单**：
```javascript
// 原 game.js 中的暂停逻辑
// 迁移至 src/ui/PauseMenu.js
export class PauseMenu {
  constructor(scene) {
    this.scene = scene;
    this.isPaused = false;
  }

  show() {
    this.scene.scene.pause();
    // 显示暂停菜单
  }

  hide() {
    this.scene.scene.resume();
    // 隐藏暂停菜单
  }
}
```

## 5. 技术约束

### 5.1 Phaser DOM Element

- 使用 `this.add.dom()` 创建 HTML 元素
- 保持原有 CSS 样式（霓虹特效、发光动画）
- 或使用 HTML Overlay（Phaser 外部 HTML）

### 5.2 赛博朋克样式

- 保留 `style.css` 中的霓虹特效
- 保留发光动画（`@keyframes glow`）
- 保留赛博朋克配色（#00ffff, #ff00ff, #ffff00）

## 6. 验收标准

### 6.1 功能验收

- [ ] HUD 正确显示金币/生命/波次/分数
- [ ] HUD 实时更新（游戏状态变化时）
- [ ] 暂停菜单正常显示和隐藏（ESC 键）
- [ ] 波次完成界面正常显示
- [ ] 武器选择界面正常显示和交互

### 6.2 视觉验收

- [ ] 赛博朋克霓虹风格保持不变
- [ ] 发光动画正常播放
- [ ] UI 元素对齐和间距正确
- [ ] 响应式布局正常（不同屏幕尺寸）

### 6.3 代码质量

- [ ] ESLint 无错误
- [ ] UI 组件与游戏逻辑解耦
- [ ] CSS 样式模块化

## 7. 测试要求

### 7.1 单元测试

- HUD 的数据更新逻辑
- PauseMenu 的显示/隐藏逻辑

### 7.2 集成测试

- HUD 与 GameState 同步
- 暂停菜单与游戏循环集成
- 波次完成界面与波次管理集成

## 8. 参考资料

- 现有代码: `index.html`, `style.css`
- Phaser DOM Element 文档: https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.DOMElement.html
- 赛博朋克 UI 设计参考: 保持现有风格
