# 实现单元任务描述：UNIT-001-CORE

## 1. 单元信息

- **单元编号**: UNIT-001
- **包含上下文**: CORE（核心游戏系统）
- **依赖**: 无
- **优先级**: 最高（其他单元依赖本单元）

## 2. 实现目标

将现有 Canvas 2D 游戏循环迁移至 Phaser 3 Scene 架构，建立 Vite 构建环境。

## 3. 需求追溯

### 3.1 L0 需求覆盖

- REQ-CORE-001: Phaser 3 WebGL 渲染器创建 900×700 画布
- REQ-CORE-002: WebGL 不可用时降级为 Canvas 渲染器
- REQ-CORE-003: 通过 Phaser Scene `update()` 驱动游戏循环
- REQ-CORE-004: 渲染透视道路背景（消失点 y=50，底部宽 600px）
- REQ-CORE-016: Vite 开发服务器，HMR，启动 ≤3s
- REQ-CORE-017: `npm run build` 产出静态文件到 `dist/`
- REQ-CORE-018: 打包为 ≤3 个 chunk，单个 gzip 后 ≤500KB
- REQ-CORE-019: 波次管理逻辑保持不变（20 波）
- REQ-CORE-020: 难度系统逻辑保持不变

### 3.2 L1 架构约束

- 限界上下文：CORE（游戏循环、状态管理、Canvas 渲染）
- 核心概念：Game State (gold/lives/wave/score/waveActive)、Canvas Context、游戏循环

### 3.3 L2 设计参考

- 无（本变更为引擎迁移，L2 设计文档为旧武器系统集成）

## 4. 实现范围

### 4.1 文件清单

**���建文件**：
- `package.json` — npm 依赖配置（phaser@3.80.1, vite@5.x）
- `vite.config.js` — Vite 构建配置
- `src/main.js` — 入口文件，初始化 Phaser Game
- `src/scenes/GameScene.js` — 主游戏场景（替代 game.js 的 gameLoop）
- `src/scenes/PreloadScene.js` — 资源预加载场景
- `src/config/gameConfig.js` — Phaser 游戏配置
- `src/core/GameState.js` — 游戏状态管理（gold/lives/wave/score）

**修改文件**：
- `index.html` — 移除 `<script>` 标签，改为 `<script type="module" src="/src/main.js">`
- `style.css` — 保留赛博朋克样式，移除 Canvas 相关样式

**删除文件**：
- 无（保留 game.js 作为参考，迁移完成后再删除）

### 4.2 核心逻辑迁移

**游戏循环**：
```javascript
// 原 game.js:1089-1135
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  // ... 各系统更新
  requestAnimationFrame(gameLoop);
}

// 迁移至 src/scenes/GameScene.js
class GameScene extends Phaser.Scene {
  update(time, delta) {
    // 道路背景由 Phaser Graphics 绘制
    // 各系统更新逻辑保持不变
  }
}
```

**透视道路背景**：
```javascript
// 原 game.js:drawRoad()
// 迁移至 GameScene.create() 中使用 Phaser.GameObjects.Graphics
this.roadGraphics = this.add.graphics();
// 每�� update() 中重绘透视梯形
```

**状态管理**：
```javascript
// 原 game.js:55-62 全局 game 对象
const game = { gold: 100, lives: 10, wave: 1, score: 0, ... };

// 迁移至 src/core/GameState.js
export class GameState {
  constructor() {
    this.gold = 100;
    this.lives = 10;
    this.wave = 1;
    this.score = 0;
    this.waveActive = false;
  }
}
```

## 5. 技术约束

### 5.1 Phaser 配置

```javascript
// src/config/gameConfig.js
export default {
  type: Phaser.AUTO, // 自动选择 WebGL 或 Canvas
  width: 900,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#0a0a0a',
  scene: [PreloadScene, GameScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  }
};
```

### 5.2 Vite 配置

```javascript
// vite.config.js
export default {
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['phaser'],
          game: [/src\/scenes/, /src\/core/],
          ui: [/src\/ui/]
        }
      }
    }
  }
};
```

### 5.3 镜像源

- npm registry: `https://registry.npmmirror.com`（已配置）

## 6. 验收标准

### 6.1 功能验收

- [ ] `npm run dev` 启动开发服务器，≤3 秒
- [ ] 浏览器打开 `http://localhost:5173`，显示 900×700 游戏画��
- [ ] 透视道路背景正确渲染（消失点 y=50，底部宽 600px）
- [ ] 游戏状态（金币/生命/波次/分数）正确显示
- [ ] 波次管理逻辑正常（20 波）
- [ ] WebGL 渲染器正常工作（检查 `renderer.type === Phaser.WEBGL`）

### 6.2 构建验收

- [ ] `npm run build` 成功产出 `dist/` 目录
- [ ] `dist/` 包含 ≤3 个 JS chunk 文件
- [ ] 单个 chunk gzip 后 ≤500KB
- [ ] `dist/index.html` 可直接在浏览器打开运行

### 6.3 代码质量

- [ ] ESLint 无错误
- [ ] 所有文件使用 ES 模块（`import`/`export`）
- [ ] 无全局变量污染（除 Phaser 自身）

## 7. 测试要求

### 7.1 单元测试

- `GameState` 类的状态管理方法
- `gameConfig` 配置对象的有效性

### 7.2 集成测试

- Phaser Game 实例创建成功
- Scene 切换正常（PreloadScene → GameScene）
- 游戏循环正常运行（60 FPS）

## 8. 参考资料

- Phaser 3 官方文档: https://photonstorm.github.io/phaser3-docs/
- Vite 官方文档: https://vitejs.dev/
- 现有代码: `game.js` (1135 行)
- 决策文档: `hhspec/changes/game-engine-upgrade/decision.md`
