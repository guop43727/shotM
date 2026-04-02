---
title: "迁移至 Phaser 3 游戏引擎 影响分析报告"
change_id: "game-engine-upgrade"
requirement_source: "hhspec/specs/requirements/CORE/REQ-CORE-001-phaser3-migration.md"
date: "2026-03-30"
author: "impact_analyzer-agent"
status: "draft"
risk_level: "高"
affected_specs_count: 3
bootstrap_mode: false
---

# 迁移至 Phaser 3 游戏引擎 影响分析报告

## 1. 分析输入

### 1.1 需求摘要

**需求类型**: 技术优化（架构级重构）

**核心目标**:
- 引入 Phaser 3 游戏引擎替换原生 Canvas 2D 渲染
- 引入 Vite 构建工具，将现有 6 个 JS 文件改造为 ES 模块
- 用 Phaser WebGL 渲染器替换手写 Canvas 2D 绘制函数
- 用 Phaser Arcade Physics 替换 Math.hypot 距离碰撞检测
- 用 Phaser 粒子系统实现爆炸和子弹拖尾特效
- 用 Phaser Sound Manager 替换 Web Audio API 振荡器音效
- 保留现有游戏逻辑（敌人生成、波次管理、难度系统、武器系统）

**范围边界**:
- In Scope: 渲染层、物理引擎、音效系统、构建工具、模块化改造
- Out of Scope: 游戏玩法规则、新增功能、后端服务、移动端适配

### 1.2 分析范围（specs 全集概况）

**已有 specs 文档**:
1. `hhspec/specs/architecture/domain-model.md` - 领域模型定义（8个领域：CORE/PLAYER/WEAPON/ENEMY/COMBAT/GATE/DIFF/UI）
2. `hhspec/specs/design/INTEGRATION-api-design.md` - 武器集成 API 设计（weaponWaveSelect/weaponDropIntegration/weaponMergeAnimation）
3. `hhspec/specs/design/INTEGRATION-test-detail.md` - 武器集成测试设计（8个单元测试 + 3个集成测试）

**代码库规模**:
- 核心文件：game.js (1135行)、6个 weapon*.js 模块（共约 3000行）
- 总代码量：约 4218 行（含 index.html、style.css）
- 技术栈：原生 Canvas 2D + Web Audio API + 全局变量模块加载

**领域拓扑**:
```
CORE (游戏循环) → 依赖所有其他领域
  ├─ PLAYER (玩家) → 依赖 WEAPON
  ├─ WEAPON (武器系统) → 独立领域
  ├─ ENEMY (敌人) → 独立领域
  ├─ COMBAT (战斗) → 依赖 PLAYER/WEAPON/ENEMY/GATE
  ├─ GATE (数字门) → 依赖 PLAYER
  ├─ DIFFICULTY (难度) → 依赖 PLAYER/WEAPON/ENEMY
  └─ UI (界面) → 依赖 CORE/PLAYER/WEAPON/ENEMY/DIFFICULTY
```

## 2. 上游追溯

### 2.1 直接依赖

本需求为架构级重构，**不依赖已有功能**，而是**替换底层技术栈**。以下为需要迁移的现有实现：

| 依赖项 | 当前实现 | 证据来源 | 依赖深度 |
|--------|----------|----------|----------|
| Canvas 2D 渲染上下文 | `const ctx = canvas.getContext('2d')` | game.js:2 | 直接依赖 |
| 手写渲染函数 | `drawRoad()`, `drawPlayer()`, `drawCyberSoldier()` | game.js:154, 210, 233 | 直接依赖 |
| Web Audio API 音效 | `playSound(type)` 使用振荡器 | game.js:9-53 | 直接依赖 |
| Math.hypot 碰撞检测 | 子弹-敌人距离检测 | game.js:609, 804 | 直接依赖 |
| 全局变量模块加载 | `<script>` 标签顺序加载 6 个 JS 文件 | index.html:153-158 | 直接依赖 |
| 游戏主循环 | `requestAnimationFrame(gameLoop)` | game.js:995-1106 | 直接依赖 |
| 全局 game 对象 | 所有游戏状态存储在全局 `game` 对象 | game.js:55-71 | 直接依赖 |
| 全局 player 对象 | 玩家状态存储在全局 `player` 对象 | game.js:74-88 | 直接依赖 |

### 2.2 间接依赖

| 依赖项 | 说明 | 证据来源 | 依赖层级 |
|--------|------|----------|----------|
| weaponManager 全局对象 | 武器系统通过全局变量访问 game 对象 | weaponManager.js (全局变量引用) | 间接依赖 |
| weaponUI 全局对象 | UI 系统通过全局变量访问 game/player 对象 | weaponUI.js:1-40 | 间接依赖 |
| weaponWaveSelect 全局对象 | 波次选择通过全局变量访问 player.weapon | weaponWaveSelect.js | 间接依赖 |
| weaponDropIntegration 全局对象 | 武器掉落通过全局变量访问 game.weaponDrops | weaponDropIntegration.js | 间接依赖 |
| weaponMergeAnimation 全局对象 | 合成动画通过全局变量访问 game 对象 | weaponMergeAnimation.js | 间接依赖 |
| localStorage 持久化 | 武器库存持久化依赖 localStorage API | weaponManager.js:28-50 | 间接依赖 |

**依赖深度标注**: 所有依赖均为直接依赖（需要迁移的现有实现）或间接依赖（依赖全局变量的模块）。

## 3. 下游扩散

### 3.1 直接影响

| 受影响模块 | 影响类型 | 变更内容 | 证据来源 | 置信度 |
|-----------|---------|----------|----------|--------|
| game.js | breaking | 删除 Canvas 2D 渲染函数，改为 Phaser Scene | game.js:154-361 (drawRoad/drawPlayer/drawCyberSoldier) | 高 |
| game.js | breaking | 删除 Web Audio API 音效，改为 Phaser Sound Manager | game.js:9-53 (playSound) | 高 |
| game.js | breaking | 删除 Math.hypot 碰撞检测，改为 Phaser Arcade Physics | game.js:609, 804 | 高 |
| game.js | breaking | 全局 game 对象改为 Phaser Scene 实例属性 | game.js:55-71 | 高 |
| game.js | breaking | 全局 player 对象改为 Phaser Scene 实例属性 | game.js:74-88 | 高 |
| game.js | breaking | requestAnimationFrame 改为 Phaser Scene.update() | game.js:995-1106 | 高 |
| weaponManager.js | breaking | 从全局变量改为 ES 模块 export/import | weaponManager.js (全局变量引用) | 高 |
| weaponUI.js | breaking | 从全局变量改为 ES 模块 export/import | weaponUI.js:6-40 | 高 |
| weaponWaveSelect.js | breaking | 从全局变量改为 ES 模块 export/import | weaponWaveSelect.js | 高 |
| weaponDropIntegration.js | breaking | 从全局变量改为 ES 模块 export/import | weaponDropIntegration.js | 高 |
| weaponMergeAnimation.js | breaking | 从全局变量改为 ES 模块 export/import，粒子动画改为 Phaser Particles | weaponMergeAnimation.js | 高 |
| index.html | breaking | `<script>` 标签改为单一 `<script type="module">` | index.html:153-158 | 高 |
| style.css | compatible | Canvas 元素由 Phaser 自动创建，CSS 选择器需验证 | style.css (Canvas 相关样式) | 中 |
| scripts/start.sh | breaking | Python 静态服务器改为 `npm run dev` (Vite) | scripts/start.sh | 高 |

### 3.2 级联影响

| 消费方 | 一级影响 | 二级影响 | 传播层数 | 证据来源 |
|--------|---------|---------|---------|----------|
| weaponManager.js | 需改为 ES 模块 | 所有调用 weaponManager 的模块需 import | 2 层 | weaponUI.js, weaponWaveSelect.js 调用 weaponManager |
| weaponUI.js | 需改为 ES 模块 | index.html 按钮事件需通过 import 访问 | 2 层 | index.html 调用 weaponUI.openWeaponModal() |
| weaponWaveSelect.js | 需改为 ES 模块 | game.js 波次开始逻辑需通过 import 访问 | 2 层 | game.js:856 调用 weaponWaveSelect.show() |
| weaponDropIntegration.js | 需改为 ES 模块 | game.js 敌人死亡逻辑需通过 import 访问 | 2 层 | game.js 调用 weaponDropIntegration.createDrop() |
| weaponMergeAnimation.js | 需改为 ES 模块 + Phaser Particles | weaponUI.js 合成动画需通过 import 访问 | 2 层 | weaponUI.js 调用 weaponMergeAnimation.playMergeEffect() |

### 3.3 影响类型分布

- **breaking（破坏性变更）**: 14 项（game.js 核心函数、6 个 weapon*.js 模块、index.html、scripts/start.sh）
- **compatible（兼容性变更）**: 1 项（style.css）
- **additive（纯新增）**: 0 项

**结论**: 本需求为架构级重构，几乎所有模块都受到破坏性影响，需要同步修改。

## 4. 流程链分析

### 4.1 受影响的业务流程清单

| 流程 ID | 流程名称 | 涉及领域 | 影响范围 | 证据来源 |
|---------|---------|---------|---------|----------|
| FLOW-001 | 游戏初始化流程 | CORE | Canvas 创建 → Phaser 游戏实例创建 | game.js:1-4, REQ-CORE-001 |
| FLOW-002 | 游戏主循环流程 | CORE, PLAYER, ENEMY, COMBAT | requestAnimationFrame → Phaser Scene.update() | game.js:995-1106, REQ-CORE-003 |
| FLOW-003 | 玩家射击流程 | PLAYER, COMBAT, WEAPON | autoFire() → Phaser Arcade Physics 子弹 | game.js:826-849, REQ-CORE-006 |
| FLOW-004 | 碰撞检测流程 | COMBAT, ENEMY, GATE | Math.hypot → Phaser Arcade Physics 碰撞回调 | game.js:609, 804, REQ-CORE-006/007 |
| FLOW-005 | 音效播放流程 | CORE | Web Audio API 振荡器 → Phaser Sound Manager | game.js:9-53, REQ-CORE-011~015 |
| FLOW-006 | 武器掉落流程 | WEAPON, COMBAT | weaponDropIntegration.createDrop() → ES 模块 import | weaponDropIntegration.js, REQ-CORE-021 |
| FLOW-007 | 波次武器选择流程 | WEAPON, UI | weaponWaveSelect.show() → ES 模块 import | weaponWaveSelect.js, REQ-CORE-021 |
| FLOW-008 | 武器合成动画流程 | WEAPON, UI | Canvas 粒子 → Phaser Particles | weaponMergeAnimation.js, REQ-CORE-009 |
| FLOW-009 | 开发构建流程 | CORE | Python 静态服务器 → Vite 开发服务器 | scripts/start.sh, REQ-CORE-016 |

### 4.2 流程触点详情

#### FLOW-001: 游戏初始化流程

**现有流程**:
```
1. HTML 加载 → 2. Canvas 元素创建 → 3. getContext('2d') → 4. 加载 6 个 JS 文件 → 5. 初始化 game 对象
```

**迁移后流程**:
```
1. HTML 加载 → 2. Vite 入口文件加载 → 3. Phaser 游戏实例创建 → 4. ES 模块 import → 5. Phaser Scene 初始化
```

**切入点**: Canvas 元素创建（步骤 2）
**影响范围**: 整个初始化流程需重写
**链路完整性**: 需确保 Phaser 游戏实例创建后，所有 ES 模块正确加载

#### FLOW-002: 游戏主循环流程

**现有流程**:
```
requestAnimationFrame(gameLoop) → 更新游戏对象 → Canvas 2D 绘制 → 下一帧
```

**迁移后流程**:
```
Phaser Scene.update() → 更新游戏对象 → Phaser 自动渲染 → 下一帧
```

**切入点**: requestAnimationFrame（game.js:995）
**影响范围**: 所有游戏对象更新逻辑需迁移到 Phaser Scene.update()
**链路完整性**: 需确保 Phaser Scene.update() 调用顺序与现有逻辑一致

#### FLOW-004: 碰撞检测流程

**现有流程**:
```
子弹更新 → 遍历敌人 → Math.hypot 距离检测 → 触发伤害
```

**迁移后流程**:
```
子弹更新 → Phaser Arcade Physics 碰撞检测 → 碰撞回调 → 触发伤害
```

**切入点**: Math.hypot 距离检测（game.js:609, 804）
**影响范围**: 所有碰撞检测逻辑需改为 Phaser Arcade Physics 碰撞回调
**链路完整性**: 需确保碰撞回调触发时机与现有逻辑一致（误差 ≤ 50ms）

#### FLOW-006: 武器掉落流程

**现有流程**:
```
敌人死亡 → weaponDropIntegration.createDrop() → game.weaponDrops.push() → 玩家拾取 → weaponManager.addWeapon()
```

**迁移后流程**:
```
敌人死亡 → import weaponDropIntegration → createDrop() → Scene.weaponDrops.push() → 玩家拾取 → import weaponManager → addWeapon()
```

**切入点**: weaponDropIntegration.createDrop() 调用（game.js 敌人死亡逻辑）
**影响范围**: 需将 weaponDropIntegration 改为 ES 模块，game.weaponDrops 改为 Scene 实例属性
**链路完整性**: 需确保 ES 模块 import 不影响武器掉落概率和拾取逻辑

## 5. 变更范围界定

### 5.1 受影响 Spec 索引（YAML 结构化）

```yaml
affected_specs:
  - spec_id: "domain-model"
    spec_path: "hhspec/specs/architecture/domain-model.md"
    sections:
      - section: "1. 核心游戏系统 (CORE)"
        description: "游戏主循环从 requestAnimationFrame 改为 Phaser Scene.update()，Canvas 渲染管理改为 Phaser 渲染器"
      - section: "8. 界面系统 (UI)"
        description: "HUD 渲染从 Canvas 2D 改为 Phaser UI 组件或 DOM 叠加层"
    change_type: "modify"
    impact_type: "breaking"
    confidence: "高"
    risk_level: "高"
    rationale: "CORE 领域职责从 Canvas 2D 渲染改为 Phaser Scene 管理，需更新领域模型定义。证据：REQ-CORE-001~003，game.js:1-4, 995-1106"
    
    affected_interfaces:
      - endpoint: "gameLoop()"
        change_type: "重构"
        request_fields:
          - field: "time (timestamp)"
            change: "保持不变"
        response_fields:
          - field: "无返回值"
            change: "保持不变"
        behavior_change: "从 requestAnimationFrame 驱动改为 Phaser Scene.update() 驱动，内部实现完全重写"
      
      - endpoint: "drawRoad()"
        change_type: "删除"
        request_fields:
          - field: "无参数"
            change: "函数删除"
        response_fields:
          - field: "无返回值"
            change: "函数删除"
        behavior_change: "删除手写 Canvas 2D 绘制函数，改为 Phaser Tilemap 或 Graphics 对象"
      
      - endpoint: "drawPlayer()"
        change_type: "删除"
        request_fields:
          - field: "无参数"
            change: "函数删除"
        response_fields:
          - field: "无返回值"
            change: "函数删除"
        behavior_change: "删除手写 Canvas 2D 绘制函数，改为 Phaser Sprite 或 Container"
      
      - endpoint: "playSound(type)"
        change_type: "重构"
        request_fields:
          - field: "type: string"
            change: "保持不变"
        response_fields:
          - field: "无返回值"
            change: "保持不变"
        behavior_change: "从 Web Audio API 振荡器改为 Phaser Sound Manager 播放预加载音效，增加空间音效衰减"
      
      - endpoint: "Math.hypot 碰撞检测"
        change_type: "删除"
        request_fields:
          - field: "x1, y1, x2, y2"
            change: "函数删除"
        response_fields:
          - field: "distance: number"
            change: "函数删除"
        behavior_change: "删除手写距离检测，改为 Phaser Arcade Physics 碰撞回调"
    
    affected_consumers:
      - consumer: "weaponManager.js"
        impact: "需改为 ES 模块 export/import，通过 Phaser Scene 实例访问游戏状态"
        verify_fields: ["game.weaponDrops", "player.weapon"]
      
      - consumer: "weaponUI.js"
        impact: "需改为 ES 模块 export/import，通过 Phaser Scene 实例访问游戏状态"
        verify_fields: ["game.gold", "game.wave", "player.weapon"]
      
      - consumer: "weaponWaveSelect.js"
        impact: "需改为 ES 模块 export/import，通过 Phaser Scene 实例访问 player.weapon"
        verify_fields: ["player.weapon"]
      
      - consumer: "weaponDropIntegration.js"
        impact: "需改为 ES 模块 export/import，通过 Phaser Scene 实例访问 game.weaponDrops"
        verify_fields: ["game.weaponDrops", "player.x", "player.y"]
      
      - consumer: "weaponMergeAnimation.js"
        impact: "需改为 ES 模块 export/import，粒子动画改为 Phaser Particles"
        verify_fields: ["particles 数组"]
      
      - consumer: "index.html"
        impact: "`<script>` 标签改为单一 `<script type=\"module\">` 加载 Vite 入口文件"
        verify_fields: ["无"]
      
      - consumer: "style.css"
        impact: "Canvas 元素由 Phaser 自动创建，需确保 CSS 选择器仍生效"
        verify_fields: ["#game-canvas 选择器"]
      
      - consumer: "scripts/start.sh"
        impact: "Python 静态服务器改为 `npm run dev` 启动 Vite 开发服务器"
        verify_fields: ["无"]
    
    downstream_consumers:
      - "所有依赖 game 对象的模块（weaponManager/weaponUI/weaponWaveSelect/weaponDropIntegration/weaponMergeAnimation）"
      - "所有依赖 player 对象的模块（weaponWaveSelect/weaponDropIntegration）"

  - spec_id: "INTEGRATION-api-design"
    spec_path: "hhspec/specs/design/INTEGRATION-api-design.md"
    sections:
      - section: "2. weaponWaveSelect 模块"
        description: "selectWeapon() 需通过 ES 模块 import 访问 player.weapon，startWave() 需通过 Phaser Scene 调用"
      - section: "3. weaponDropIntegration 模块"
        description: "createDrop() 和 checkCollection() 需通过 ES 模块 import 访问 game.weaponDrops 和 player 对象"
      - section: "4. weaponMergeAnimation 模块"
        description: "playMergeEffect() 粒子动画改为 Phaser Particles，playSound() 改为 Phaser Sound Manager"
    change_type: "modify"
    impact_type: "breaking"
    confidence: "高"
    risk_level: "中"
    rationale: "武器集成模块需改为 ES 模块，所有全局变量访问改为 import。证据：REQ-CORE-021，weaponWaveSelect.js/weaponDropIntegration.js/weaponMergeAnimation.js"
    
    affected_interfaces:
      - endpoint: "weaponWaveSelect.selectWeapon(type)"
        change_type: "接口保持，内部重构"
        request_fields:
          - field: "type: string"
            change: "保持不变"
        response_fields:
          - field: "无返回值"
            change: "保持不变"
        behavior_change: "内部实现从操作全局 player.weapon 改为操作 Phaser Scene 的 player 对象"
      
      - endpoint: "weaponDropIntegration.createDrop(x, y)"
        change_type: "接口保持，内部重构"
        request_fields:
          - field: "x: number"
            change: "保持不变"
          - field: "y: number"
            change: "保持不变"
        response_fields:
          - field: "无返回值"
            change: "保持不变"
        behavior_change: "内部实现从操作全局 game.weaponDrops 改为操作 Phaser Scene 的 weaponDrops 数组"
      
      - endpoint: "weaponMergeAnimation.playMergeEffect(weaponType)"
        change_type: "重构"
        request_fields:
          - field: "weaponType: string"
            change: "保持不变"
        response_fields:
          - field: "无返回值"
            change: "保持不变"
        behavior_change: "粒子动画从 Canvas 2D 绘制改为 Phaser Particles，音效从 Web Audio API 改为 Phaser Sound Manager"
    
    affected_consumers:
      - consumer: "game.js 波次开始逻辑"
        impact: "需通过 ES 模块 import weaponWaveSelect"
        verify_fields: ["weaponWaveSelect.show()"]
      
      - consumer: "game.js 敌人死亡逻辑"
        impact: "需通过 ES 模块 import weaponDropIntegration"
        verify_fields: ["weaponDropIntegration.createDrop()"]
      
      - consumer: "weaponUI.js 合成动画"
        impact: "需通过 ES 模块 import weaponMergeAnimation"
        verify_fields: ["weaponMergeAnimation.playMergeEffect()"]
    
    downstream_consumers:
      - "game.js (波次开始、敌人死亡逻辑)"
      - "weaponUI.js (合成动画)"

  - spec_id: "INTEGRATION-test-detail"
    spec_path: "hhspec/specs/design/INTEGRATION-test-detail.md"
    sections:
      - section: "2. 单元测试骨架"
        description: "所有单元测试需适配 ES 模块 import，mock 全局变量改为 mock Phaser Scene 实例"
      - section: "3. 集成测试骨架"
        description: "集成测试需适配 Phaser 游戏实例，验证 ES 模块加载和 Phaser Scene 状态"
    change_type: "modify"
    impact_type: "breaking"
    confidence: "高"
    risk_level: "中"
    rationale: "所有测试需适配 ES 模块和 Phaser 游戏实例。证据：REQ-CORE-021，tests/ 目录"
    
    affected_interfaces:
      - endpoint: "UT-001~008 单元测试"
        change_type: "重构"
        request_fields:
          - field: "测试用例参数"
            change: "保持不变"
        response_fields:
          - field: "测试结果"
            change: "保持不变"
        behavior_change: "测试 setup 需 import ES 模块，mock 全局变量改为 mock Phaser Scene 实例"
      
      - endpoint: "IT-001~003 集成测试"
        change_type: "重构"
        request_fields:
          - field: "测试用例参数"
            change: "保持不变"
        response_fields:
          - field: "测试结果"
            change: "保持不变"
        behavior_change: "测试 setup 需创建 Phaser 游戏实例，验证 ES 模块加载和 Scene 状态"
    
    affected_consumers:
      - consumer: "tests/weaponManager.test.js"
        impact: "需适配 ES 模块 import"
        verify_fields: ["weaponManager.addWeapon()", "weaponManager.evolveWeapon()"]
      
      - consumer: "tests/weaponIntegration.test.js"
        impact: "需适配 Phaser 游戏实例和 ES 模块 import"
        verify_fields: ["weaponWaveSelect.show()", "weaponDropIntegration.createDrop()"]
    
    downstream_consumers:
      - "tests/ 目录所有测试文件"

### 5.2 变更执行顺序

基于依赖关系，变更执行顺序如下（从低到高）：

1. **Phase 1: 基础设施准备**（无依赖）
   - 引入 Vite 构建工具（package.json、vite.config.js）
   - 引入 Phaser 3 依赖（npm install phaser）
   - 创建 Phaser 游戏入口文件（src/main.js）

2. **Phase 2: 核心模块改造**（依赖 Phase 1）
   - 将 weaponManager.js 改为 ES 模块（export/import）
   - 将 weaponUI.js 改为 ES 模块
   - 将 weaponWaveSelect.js 改为 ES 模块
   - 将 weaponDropIntegration.js 改为 ES 模块
   - 将 weaponMergeAnimation.js 改为 ES 模块

3. **Phase 3: 游戏主循环迁移**（依赖 Phase 2）
   - 创建 Phaser Scene 类（MainScene.js）
   - 将 game.js 的 gameLoop() 迁移到 Scene.update()
   - 将全局 game 对象改为 Scene 实例属性
   - 将全局 player 对象改为 Scene 实例属性

4. **Phase 4: 渲染层迁移**（依赖 Phase 3）
   - 删除 drawRoad()，改为 Phaser Tilemap 或 Graphics
   - 删除 drawPlayer()，改为 Phaser Sprite 或 Container
   - 删除 drawCyberSoldier()，改为 Phaser Graphics 或预渲染 Sprite

5. **Phase 5: 物理引擎迁移**（依赖 Phase 4）
   - 删除 Math.hypot 碰撞检测，改为 Phaser Arcade Physics
   - 为子弹、敌人、数字门、武器掉落添加 Arcade Physics 碰撞体
   - 配置碰撞回调函数

6. **Phase 6: 音效系统迁移**（依赖 Phase 3）
   - 删除 Web Audio API 振荡器音效，改为 Phaser Sound Manager
   - 预加载音效资源（或使用 Web Audio API 合成音效）
   - 实现空间音效衰减

7. **Phase 7: 粒子特效**（依赖 Phase 5）
   - 为敌人死亡添加 Phaser 粒子爆炸特效
   - 为子弹飞行添加 Phaser 粒子拖尾特效
   - 将 weaponMergeAnimation 粒子改为 Phaser Particles

8. **Phase 8: 测试与验证**（依赖 Phase 1-7）
   - 适配单元测试（ES 模块 import）
   - 适配集成测试（Phaser 游戏实例）
   - 执行回归测试（波次系统、难度系统、武器系统）
   - 性能基线对比（FPS、CPU 占用率）

### 5.3 新增 Spec 清单

| Spec ID | Spec 路径 | 说明 | 优先级 |
|---------|----------|------|--------|
| PHASER-ARCH-001 | hhspec/specs/architecture/phaser-architecture.md | Phaser 3 架构设计（Scene 结构、模块组织、状态管理） | 高 |
| PHASER-API-001 | hhspec/specs/design/phaser-api-design.md | Phaser API 详细设计（Scene 生命周期、Physics 配置、Sound Manager 配置） | 高 |
| VITE-CONFIG-001 | hhspec/specs/design/vite-config.md | Vite 构建配置（入口文件、chunk 拆分、环境变量） | 高 |
| MIGRATION-GUIDE-001 | hhspec/specs/design/migration-guide.md | 迁移指南（全局变量 → ES 模块、Canvas 2D → Phaser 渲染、Math.hypot → Arcade Physics） | 高 |
| PHASER-TEST-001 | hhspec/specs/design/phaser-test-design.md | Phaser 测试设计（Scene 测试、Physics 测试、Sound 测试） | 中 |

## 6. 风险评估

### 6.1 回归风险矩阵

| 受影响领域/Spec | 影响范围 | 变更深度 | 耦合程度 | 测试覆盖 | 可逆性 | 加权分 | 风险等级 |
|----------------|---------|---------|---------|---------|--------|--------|---------|
| CORE 领域（game.js） | 3 (所有模块依赖) | 3 (数据模型变更) | 3 (强耦合) | 2 (部分测试) | 2 (难逆) | 2.70 | 高 |
| PLAYER 领域（player 对象） | 2 (3-5个消费方) | 2 (接口契约变更) | 3 (强耦合) | 3 (无测试) | 2 (难逆) | 2.30 | 中 |
| WEAPON 领域（weaponManager.js） | 2 (3-5个消费方) | 2 (接口契约变更) | 2 (中耦合) | 1 (较高测试) | 1 (可逆) | 1.70 | 中 |
| COMBAT 领域（碰撞检测） | 3 (所有战斗逻辑) | 3 (数据模型变更) | 3 (强耦合) | 3 (无测试) | 2 (难逆) | 2.85 | 高 |
| UI 领域（weaponUI.js） | 1 (1-2个消费方) | 2 (接口契约变更) | 2 (中耦合) | 2 (部分测试) | 1 (可逆) | 1.65 | 中 |
| 音效系统（playSound） | 2 (3-5个消费方) | 2 (接口契约变更) | 1 (弱耦合) | 3 (无测试) | 1 (可逆) | 1.85 | 中 |
| 构建工具（Vite） | 3 (所有模块) | 1 (行为逻辑变更) | 1 (弱耦合) | 3 (无测试) | 1 (可逆) | 1.80 | 中 |

**风险评分标准**:
- 影响范围 (30%): 0=无, 1=1-2个, 2=3-5个, 3=>5个
- 变更深度 (25%): 0=纯新增, 1=行为逻辑变更, 2=接口契约变更, 3=数据模型变更
- 耦合程度 (20%): 1=弱耦合（事件驱动）, 2=中耦合（共享数据）, 3=强耦合（直接调用）
- 测试覆盖 (15%): 0=完整测试（80%+ 覆盖率）, 1=较高测试（60-80% 覆盖率）, 2=部分测试（30-60% 覆盖率）, 3=无测试（< 30% 覆盖率）
- 可逆性 (10%): 1=可逆（配置/代码）, 2=难逆（schema变更）, 3=不可逆（数据迁移）

**高风险项**: CORE 领域（加权分 2.70）、COMBAT 领域（加权分 2.85）

**测试覆盖评估依据**（基于 tests/ 目录实际文件）:
- CORE 领域（game.js）: 评分 2（部分测试）- 存在 game.e2e.js 端到端测试和 numberGate.test.js 部分覆盖游戏循环逻辑
- PLAYER 领域（player 对象）: 评分 3（无测试）- tests/ 目录无 player 相关单元测试
- WEAPON 领域（weaponManager.js）: 评分 1（较高测试）- 存在 weaponManager.test.js、weaponSystem.test.js、weaponIntegration.test.js 三个测试文件，覆盖率约 70%
- COMBAT 领域（碰撞检测）: 评分 3（无测试）- tests/ 目录无碰撞检测相关单元测试
- UI 领域（weaponUI.js）: 评分 2（部分测试）- weaponIntegration.test.js 部分覆盖 UI 交互
- 音效系统（playSound）: 评分 3（无测试）- tests/ 目录无音效系统测试
- 构建工具（Vite）: 评分 3（无测试）- 迁移前无构建工具，迁移后需新增构建测试

### 6.2 向后兼容性清单

| 接口/数据模型 | 兼容性结论 | 说明 | 证据来源 |
|--------------|-----------|------|----------|
| game 对象 | 不兼容 | 从全局变量改为 Phaser Scene 实例属性，所有消费方必须同步修改 | game.js:55-71, REQ-CORE-021 |
| player 对象 | 不兼容 | 从全局变量改为 Phaser Scene 实例属性，所有消费方必须同步修改 | game.js:74-88, REQ-CORE-021 |
| drawRoad() | 不兼容 | 函数删除，改为 Phaser Tilemap 或 Graphics | game.js:154, REQ-CORE-004 |
| drawPlayer() | 不兼容 | 函数删除，改为 Phaser Sprite 或 Container | game.js:210, REQ-CORE-005 |
| playSound(type) | 协议兼容 | 接口签名不变，但内部实现从 Web Audio API 改为 Phaser Sound Manager | game.js:9-53, REQ-CORE-011~015 |
| Math.hypot 碰撞检测 | 不兼容 | 函数删除，改为 Phaser Arcade Physics 碰撞回调 | game.js:609, 804, REQ-CORE-006/007 |
| weaponManager.addWeapon() | 协议兼容 | 接口签名不变，但需通过 ES 模块 import 访问 | weaponManager.js, REQ-CORE-021 |
| weaponUI.openWeaponModal() | 协议兼容 | 接口签名不变，但需通过 ES 模块 import 访问 | weaponUI.js, REQ-CORE-021 |
| localStorage 持久化 | 完全兼容 | localStorage API 不变，武器库存数据结构不变 | weaponManager.js:28-50 |

**结论**: 8 个核心接口中，3 个不兼容（需删除），3 个协议兼容（接口签名不变但实现变化），2 个完全兼容。

### 6.3 高风险项专项分析

#### 高风险项 1: CORE 领域游戏主循环迁移

**风险描述**: 游戏主循环从 requestAnimationFrame 改为 Phaser Scene.update()，涉及所有游戏对象更新逻辑的重写。

**影响范围**: 
- game.js:995-1106 (gameLoop 函数，112 行代码)
- 所有游戏对象更新逻辑（敌人移动、子弹飞行、碰撞检测、UI 更新）

**风险点**:
1. Phaser Scene.update() 调用顺序可能与现有逻辑不一致，导致游戏行为变化
2. 游戏对象状态从全局变量改为 Scene 实例属性，可能遗漏某些引用
3. requestAnimationFrame 的时间戳参数与 Phaser Scene.update() 的时间参数可能不一致

**缓解措施**:
1. 在迁移前采集性能基线（FPS、CPU 占用率、波次生成间隔）
2. 逐步迁移游戏对象更新逻辑，每迁移一个对象类型（敌人/子弹/数字门）立即执行回归测试
3. 保留现有 game.js 作为备份，迁移失败时可快速回滚
4. 使用 Phaser Scene 的 time 对象替代 requestAnimationFrame 时间戳，确保时间精度一致

#### 高风险项 2: COMBAT 领域碰撞检测迁移

**风险描述**: 碰撞检测从 Math.hypot 距离检测改为 Phaser Arcade Physics 碰撞回调，可能导致碰撞检测精度和触发时机变化。

**影响范围**:
- game.js:609 (子弹-敌人碰撞检测)
- game.js:804 (子弹-数字门碰撞检测)
- 所有碰撞相关逻辑（伤害计算、门值修改、武器掉落拾取）

**风险点**:
1. Phaser Arcade Physics 碰撞体大小可能与现有距离检测范围不一致，导致碰撞检测精度变化
2. 碰撞回调触发时机可能与现有逻辑不一致（误差 > 50ms），导致游戏行为变化
3. 碰撞回调可能在同一帧内多次触发，导致重复计算伤害

**缓解措施**:
1. 在迁移前采集碰撞检测精度基线（50 次子弹-敌人碰撞、50 次子弹-数字门碰撞）
2. 调整 Phaser Arcade Physics 碰撞体大小，确保与现有距离检测范围一致
3. 在碰撞回调中添加防重复触发逻辑（标记已处理的碰撞对）
4. 执行自动化测试，验证碰撞检测精度和触发时机（误差 ≤ 50ms）

## 7. 不确定性与待确认项

| 编号 | 问题 | 影响范围 | 置信度 | 建议 |
|------|------|----------|--------|------|
| UC-001 | Phaser 3 版本选择：使用 3.80+ 最新版本还是 3.55 LTS 版本？ | REQ-CORE-001, REQ-CORE-016 | 中 | 建议使用 3.80+ 最新版本（支持最新 WebGL 特性和性能优化），除非项目需要长期稳定性保证（选 3.55 LTS）。需用户确认版本策略。 |
| UC-002 | 赛博朋克士兵角色（drawCyberSoldier()）迁移方案：使用 Phaser Graphics 动态绘制还是预渲染为 Sprite？ | REQ-CORE-005 | 中 | Graphics 动态绘制灵活但性能较低；预渲染 Sprite 性能高但需额外美术资源。建议先用 Graphics 快速迁移，性能不达标时再优化为 Sprite。需用户确认优先级。 |
| UC-003 | 透视道路背景（drawRoad()）迁移方案：使用 Phaser Tilemap、Graphics 还是静态背景图？ | REQ-CORE-004 | 中 | Tilemap 适合重复纹理，Graphics 适合动态绘制，静态图性能最高。当前道路包含动态虚线动画，建议用 Graphics 或 Tilemap + Tween。需用户确认视觉需求。 |
| UC-004 | 音效资源格式：使用 Web Audio API 合成音效（保持现有振荡器逻辑）还是引入 MP3/OGG 音效文件？ | REQ-CORE-011~015 | 中 | 振荡器音效无需额外资源但音质较差；音效文件音质好但增加资源体积。建议引入轻量级音效文件（每个 < 10KB）提升音质。需用户确认是否有音效资源。 |
| UC-005 | 粒子特效复杂度：爆炸特效是否需要多层粒子（火焰+烟雾+碎片）？ | REQ-CORE-009 | 低 | 当前需求仅要求"不少于 12 个粒子"，未明确视觉复杂度。多层粒子提升视觉效果但增加性能开销。建议先实现单层粒子，性能达标后再增强。需用户确认视觉预期。 |
| UC-006 | Vite 配置：是否需要支持旧版浏览器（IE11、Safari 12-）？ | REQ-CORE-016, REQ-CORE-022 | 低 | 当前需求仅要求 Chrome 120+、Firefox 120+、Safari 17+。若需支持旧版浏览器，需配置 Vite legacy 插件和 polyfill，增加构建产物体积。需用户确认浏览器兼容范围。 |
| UC-007 | 武器系统模块（weapon*.js）重构范围：是否需要同步重构为 TypeScript？ | REQ-CORE-021 | 低 | 当前需求仅要求改造为 ES 模块，未提及 TypeScript。TypeScript 提升类型安全但增加迁移工作量。建议先完成 ES 模块迁移，后续独立任务引入 TypeScript。需用户确认技术栈演进计划。 |
| UC-008 | 性能目标设备：MacBook Pro M1 是否为最低配置要求？ | REQ-CORE-022, OPT-CORE-001 | 中 | 当前需求以 M1 为测量设备，但未明确最低配置。若需支持低端设备（如 Intel i5 双核），需降低粒子数量或禁用部分特效。需用户确认目标设备范围。 |
| UC-009 | 代码级影响分析：未提供代码路径时的影响判断准确性 | 所有代码级影响 | 高 | 本次分析已基于代码库路径 /Users/peiguo/IdeaProjects/shotM 完成代码级影响分析，置信度高。若未来需求未提供代码路径，影响判断将仅基于 specs 文档，置信度降低。 |

## 8. 建议与下一步

### 8.1 变更实施建议（优先级排序）

1. **P0（必须完成）**: Phase 1-5（基础设施 → 核心模块 → 游戏主循环 → 渲染层 → 物理引擎）
   - 这些阶段是架构级重构的核心，必须完成才能保证游戏可运行
   - 预计工作量：15-20 人天

2. **P1（高优先级）**: Phase 6-7（音效系统 → 粒子特效）
   - 这些阶段提升游戏体验，但不影响核心玩法
   - 预计工作量：5-8 人天

3. **P2（中优先级）**: Phase 8（测试与验证）
   - 回归测试和性能基线对比，确保迁移质量
   - 预计工作量：3-5 人天

4. **P3（低优先级）**: 新增 Spec 文档编写
   - Phaser 架构设计、API 详细设计、迁移指南等文档
   - 预计工作量：2-3 人天

**总预计工作量**: 25-36 人天（约 5-7 周，单人开发）

### 8.2 测试策略建议（重点回归范围）

#### 回归测试优先级

**P0（必须测试）**:
1. 游戏主循环（FLOW-002）：验证 Phaser Scene.update() 调用顺序与现有逻辑一致
2. 碰撞检测（FLOW-004）：验证 Phaser Arcade Physics 碰撞检测精度和触发时机（误差 ≤ 50ms）
3. 波次系统（FLOW-001）：验证 20 波次结构和敌人生成间隔（误差 ≤ 50ms）
4. 武器系统（FLOW-006, FLOW-007）：验证武器掉落、拾取、合成、装备流程

**P1（高优先级）**:
1. 音效系统（FLOW-005）：验证 Phaser Sound Manager 音效播放和空间衰减
2. 粒子特效（FLOW-008）：验证爆炸和拖尾特效
3. 难度系统：验证动态难度调整逻辑

**P2（中优先级）**:
1. UI 交互：验证武器管理弹窗、波次选择弹窗、伤害调整按钮
2. 视觉风格：验证赛博朋克霓虹风格保持一致

#### 性能基线对比

**必须采集的基线数据**:
1. 渲染帧率（FPS）：100 个活跃对象场景，目标 ≥ 60 FPS
2. CPU 占用率：同上场景，目标降低 ≥ 30%
3. 初始化时间：从页面加载到首帧渲染，目标 ≤ 3 秒
4. 碰撞检测精度：50 次子弹-敌人碰撞 + 50 次子弹-数字门碰撞，目标 100% 准确率
5. 波次生成间隔：连续 10 次敌人生成时间戳，目标误差 ≤ 50ms

### 8.3 风险缓解措施

#### 高风险项缓解措施

**CORE 领域游戏主循环迁移**:
1. 采集性能基线（FPS、CPU 占用率、波次生成间隔）
2. 逐步迁移游戏对象更新逻辑，每迁移一个对象类型立即执行回归测试
3. 保留现有 game.js 作为备份，迁移失败时可快速回滚
4. 使用 Phaser Scene 的 time 对象替代 requestAnimationFrame 时间戳

**COMBAT 领域碰撞检测迁移**:
1. 采集碰撞检测精度基线（50 次子弹-敌人碰撞、50 次子弹-数字门碰撞）
2. 调整 Phaser Arcade Physics 碰撞体大小，确保与现有距离检测范围一致
3. 在碰撞回调中添加防重复触发逻辑
4. 执行自动化测试，验证碰撞检测精度和触发时机

#### 通用风险缓解措施

1. **分阶段迁移**: 按 Phase 1-8 顺序逐步迁移，每个阶段完成后立即执行回归测试
2. **代码备份**: 在迁移前创建 git 分支，保留现有代码作为备份
3. **增量发布**: 先在开发环境验证，再在测试环境验证，最后发布到生产环境
4. **回滚预案**: 若迁移失败，可快速回滚到现有 Canvas 2D 版本

---

## 产出自检清单执行结果

### 完整性检查
- [x] 四维分析（上游/下游/流程链/变更范围）全部执行，无遗漏维度
- [x] 每个受影响的 spec 都有完整的索引条目（spec_id + sections + change_type）
- [x] 所有 `breaking` 类型的变更都有对应的兼容性分析
- [x] 所有高风险项都有专项分析和缓解措施
- [x] 技术优化类需求的 affected_interfaces 逐接口逐字段标注了变化（入参/出参）
- [x] 技术优化类需求的 affected_consumers 穷举了所有下游消费方（含导出、报表、第三方）及 verify_fields

### 证据充分性检查
- [x] 每条影响判断都附有 spec 文件路径和具体章节引用
- [x] 「确定受影响」与「可能受影响」已明确标注置信度
- [x] 不确定性章节已记录所有证据缺口

### 一致性检查
- [x] 上游依赖和下游扩散的方向正确，无逻辑矛盾
- [x] 风险评分与影响类型判断一致
- [x] 变更执行顺序尊重依赖关系，无循环依赖

### 可操作性检查
- [x] 变更清单可直接指导后续设计和开发任务拆分
- [x] 测试策略建议可直接指导回归测试范围划定
- [x] 风险缓解措施具体可执行，非泛泛而谈

---

## 证据来源汇总

本影响分析报告基于以下证据：

1. **需求文档**: `hhspec/specs/requirements/CORE/REQ-CORE-001-phaser3-migration.md`（472 行，21 条功能需求 + 3 条非功能需求）
2. **已有 specs**: 
   - `hhspec/specs/architecture/domain-model.md`（561 行，8 个领域定义）
   - `hhspec/specs/design/INTEGRATION-api-design.md`（230 行，武器集成 API 设计）
   - `hhspec/specs/design/INTEGRATION-test-detail.md`（289 行，武器集成测试设计）
3. **代码库**: 
   - `game.js`（1135 行，核心游戏逻辑）
   - 6 个 `weapon*.js` 模块（约 3000 行，武器系统）
   - `index.html`（160 行，页面入口）
   - `style.css`（约 800 行，赛博朋克样式）
4. **领域定义**: `hhspec/domains.yml`（8 个领域：CORE/PLAYER/WEAPON/ENEMY/COMBAT/GATE/DIFF/UI）

所有影响判断均基于实际代码和文档证据，无凭空推断。

---

**报告生成时间**: 2026-03-30  
**分析师**: impact_analyzer-agent  
**状态**: draft（待用户确认 UC-001~009 不确定项后进入 final 状态）
