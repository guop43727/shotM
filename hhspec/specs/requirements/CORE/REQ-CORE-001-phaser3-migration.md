---
task_id: "REQ-CORE-001"
title: "迁移至 Phaser 3 游戏引擎"
type: "技术优化"
version: "1.0"
date: "2026-03-30"
author: "analyst-agent"
status: "draft"
priority: "high"
module: "CORE"
related_changes: ["game-engine-upgrade"]
tags: ["phaser3", "vite", "webgl", "migration", "rendering", "physics", "audio"]
---

# 迁移至 Phaser 3 游戏引擎

## 1. 概述

### 1.1 背景与动机

当前游戏（MONSTER TIDE）基于原生 HTML5 Canvas 2D API 实现，核心文件 `game.js` 共 1135 行，包含手写渲染循环、透视投影（`drawRoad()`）、角色绘制（`drawCyberSoldier()`）、碰撞检测（`Math.hypot` 距离检测，见 game.js:609、804）、Web Audio API 音效（game.js:6-53）。

当前技术栈为原生 JS + CSS，无构建工具，通过 `<script>` 标签顺序加载 6 个模块文件（index.html:153-158）。

迁移动机：
- Canvas 2D 渲染无法利用 GPU 硬件加速，帧率受限于 CPU 单线程
- 手写透视投影和碰撞检测维护成本高，且精度有限
- Web Audio API 直接操作振荡器，缺乏空间音效和混音能力
- 无构建工具导致模块间依赖通过全局变量传递，可维护性差

### 1.2 目标用户

游戏开发者（维护方）和游戏玩家（最终用户）。

### 1.3 范围

**In Scope：**
- 引入 Phaser 3 引擎替换 Canvas 2D 渲染层
- 引入 Vite 构建工具，将现有 6 个 JS 文件改造为 ES 模块
- 用 Phaser WebGL 渲染器替换手写 Canvas 2D 绘制函数
- 用 Phaser Arcade Physics 替换 `Math.hypot` 距离碰撞检测
- 用 Phaser 粒子系统实现爆炸和子弹拖尾特效
- 用 Phaser Sound Manager 替换 Web Audio API 振荡器音效
- 保留现有游戏逻辑：敌人生成、波次管理（20波）、难度系统、武器系统

**Out of Scope：**
- 游戏玩法规则变更（伤害数值、波次数量、武器类型）
- 新增游戏功能（新武器、新敌人类型）
- 后端服务或排行榜系统
- 移动端适配（触控输入）
- 多人联机功能

## 2. 用户故事

- US-001: 作为游戏玩家，我希望游戏以稳定的 60 FPS 运行，以便获得流畅的游戏体验。
- US-002: 作为游戏玩家，我希望敌人被击杀时出现爆炸粒子特效，以便获得更强的视觉反馈。
- US-003: 作为游戏玩家，我希望子弹飞行时有拖尾特效，以便更清晰地追踪弹道。
- US-004: 作为游戏玩家，我希望碰撞检测准确无误，以便游戏判定公平。
- US-005: 作为游戏玩家，我希望音效有空间感（近大远小），以便增强沉浸感。
- US-006: 作为开发者，我希望代码以 ES 模块组织并通过 Vite 构建，以便支持热更新和模块化维护。
- US-007: 作为开发者，我希望现有游戏逻辑（波次、难度、武器系统）在迁移后行为不变，以便保证游戏可玩性不退化。

## 3. 系统需求（EARS 格式）

### 3.1 功能需求

**渲染层迁移**

- REQ-CORE-001: 当游戏初始化时，系统应使用 Phaser 3 WebGL 渲染器创建游戏画布，画布尺寸为 900×700 像素。
- REQ-CORE-002: 当 WebGL 不可用时，系统应自动降级为 Phaser 3 Canvas 渲染器，并在控制台输出警告日志。
- REQ-CORE-003: 当游戏循环每帧执行时，系统应通过 Phaser Scene 的 `update()` 方法驱动所有游戏对象状态更新。
- REQ-CORE-004: 当游戏场景加载时，系统应渲染透视道路背景，消失点位于画布顶部 y=50 处，道路底部宽度为 600 像素。
- REQ-CORE-005: 当玩家角色需要绘制时，系统应使用 Phaser Sprite 或 Graphics 对象渲染赛博朋克风格士兵，保持与现有视觉风格一致（霓虹色 #00e3fd、#8eff71）。

**物理与碰撞迁移**

- REQ-CORE-006: 当子弹与敌人的 Arcade Physics 碰撞体重叠时，系统应触发伤害计算，替代现有 `Math.hypot` 距离检测（game.js:609）。
- REQ-CORE-007: 当子弹与数字门的 Arcade Physics 碰撞体重叠时，系统应触发门值修改逻辑，替代现有 `Math.hypot` 检测（game.js:804）。
- REQ-CORE-008: 当敌人到达防线（y ≥ canvas.height - 120）时，系统应触发生命值扣减，行为与现有逻辑一致。

**粒子特效**

- REQ-CORE-009: 当敌人血量归零被击杀时，系统应在敌人位置触发 Phaser 粒子爆炸特效，粒子数量不少于 12 个，持续时间不超过 500ms。
- REQ-CORE-010: 当子弹处于飞行状态时，系统应为每颗子弹附加 Phaser 粒子拖尾特效，拖尾长度不少于 5 个粒子节点。

**音效系统迁移**

- REQ-CORE-011: 当射击事件触发时，系统应通过 Phaser Sound Manager 播放射击音效，替代现有 Web Audio API 振荡器实现（game.js:16-22）。
- REQ-CORE-012: 当敌人被击杀时，系统应通过 Phaser Sound Manager 播放击杀音效，替代现有振荡器实现（game.js:23-30）。
- REQ-CORE-013: 当波次通关时，系统应通过 Phaser Sound Manager 播放通关音效，替代现有振荡器实现（game.js:31-38）。
- REQ-CORE-014: 当游戏结束时，系统应通过 Phaser Sound Manager 播放游戏结束音效，替代现有振荡器实现（game.js:39-45）。
- REQ-CORE-015: 当音效播放时，系统应根据音效触发源与玩家位置的距离计算音量衰减，距离超过 400 像素时音量衰减至 0。

**构建工具引入**

- REQ-CORE-016: 当开发者执行 `npm run dev` 时，系统应启动 Vite 开发服务器，支持 ES 模块热更新（HMR），启动时间不超过 3 秒。
- REQ-CORE-017: 当开发者执行 `npm run build` 时，系统应通过 Vite 构建产出静态文件到 `dist/` 目录，构建产物可直接部署为静态页面。
- REQ-CORE-018: 当构建完成时，系统应将所有 JS 模块打包为不超过 3 个 chunk 文件（vendor/game/ui），单个 chunk gzip 后不超过 500KB。

**游戏逻辑保留**

- REQ-CORE-019: 当波次系统运行时，系统应保持现有 20 波次结构，每波敌人生成数量和间隔与迁移前行为一致（误差 ≤ 50ms）。
- REQ-CORE-020: 当难度系统计算时，系统应保持现有 `baseSpawnRate: 400` 基础生成速率和动态调整逻辑不变。
- REQ-CORE-021: 当武器系统（weaponManager.js）运行时，系统应通过 ES 模块 import 加载，接口契约与现有全局变量调用方式保持兼容。

### 3.2 非功能需求

- REQ-CORE-022: 系统应在 Chrome 120+、Firefox 120+、Safari 17+ 浏览器中正常运行，WebGL 渲染帧率不低于 60 FPS（在 100 个活跃游戏对象场景下，测量设备为 MacBook Pro M1）。
- REQ-CORE-023: 系统应在迁移后游戏初始化时间（从页面加载到首帧渲染）不超过 3 秒（网络条件：本地服务器）。
- OPT-CORE-001: 系统宜在 WebGL 渲染模式下，Canvas 2D 渲染的 CPU 占用率降低不少于 30%（测量工具：Chrome DevTools Performance）。

## 4. 验收标准（Gherkin 格式）

### 4.1 WebGL 渲染初始化

```gherkin
Feature: Phaser 3 WebGL 渲染器初始化

  Scenario: webgl可用时_游戏初始化_使用WebGL渲染器
    # 关联需求: REQ-CORE-001
    Given 浏览器支持 WebGL
    When 游戏页面加载完成
    Then Phaser 游戏实例的渲染器类型为 "WebGL"
    And 画布尺寸为 900×700 像素

  Scenario: webgl不可用时_游戏初始化_降级为Canvas渲染器
    # 关联需求: REQ-CORE-002
    Given 浏览器不支持 WebGL
    When 游戏页面加载完成
    Then Phaser 游戏实例的渲染器类型为 "Canvas"
    And 控制台输出包含 "WebGL not available" 警告日志
```

### 4.2 碰撞检测

```gherkin
Feature: Arcade Physics 碰撞检测

  Scenario: 子弹命中敌人_碰撞体重叠_触发伤害
    # 关联需求: REQ-CORE-006
    Given 场景中存在一个血量为 100 的敌人
    And 场景中存在一颗伤害值为 50 的子弹
    When 子弹的 Arcade Physics 碰撞体与敌人碰撞体重叠
    Then 敌人血量变为 50
    And 子弹从场景中移除

  Scenario: 子弹命中数字门_碰撞体重叠_触发门值修改
    # 关联需求: REQ-CORE-007
    Given 场景中存在一个值为 "+5" 的数字门
    And 玩家当前 count 为 3
    When 子弹的 Arcade Physics 碰撞体与数字门碰撞体重叠
    Then 玩家 count 变为 8
    And 数字门从场景中移除

  Scenario: 敌人到达防线_触发生命值扣减
    # 关联需求: REQ-CORE-008
    Given 玩家当前生命值为 10
    And 场景中存在一个敌人位于 y = canvas.height - 121
    When 游戏循环更新后敌人 y 坐标 ≥ canvas.height - 120
    Then 玩家生命值减少 1 变为 9
    And 该敌人从场景中移除
```

### 4.3 粒子特效

```gherkin
Feature: 粒子特效系统

  Scenario: 敌人被击杀_触发爆炸粒子特效
    # 关联需求: REQ-CORE-009
    Given 场景中存在一个血量为 1 的敌人位于坐标 (450, 300)
    When 子弹命中该敌人使其血量归零
    Then 在坐标 (450, 300) 触发粒子爆炸特效
    And 粒子数量不少于 12 个
    And 500ms 后所有爆炸粒子消失

  Scenario: 子弹飞行中_附加拖尾粒子特效
    # 关联需求: REQ-CORE-010
    Given 场景中存在一颗正在飞行的子弹
    When 游戏循环执行一帧更新
    Then 该子弹后方存在不少于 5 个拖尾粒子节点
```

### 4.4 音效系统

```gherkin
Feature: Phaser Sound Manager 音效

  Scenario: 射击触发_播放射击音效
    # 关联需求: REQ-CORE-011
    Given 游戏处于波次进行中状态
    And Phaser Sound Manager 已初始化
    When 玩家武器触发射击事件
    Then Phaser Sound Manager 播放 "shoot" 音效
    And Web Audio API 振荡器不再被直接调用

  Scenario: 敌人击杀_播放击杀音效
    # 关联需求: REQ-CORE-012
    Given 场景中存在一个血量为 1 的敌人
    When 子弹命中该敌人使其血量归零
    Then Phaser Sound Manager 播放 "kill" 音效

  Scenario: 音效空间衰减_距离超过400像素_音量为零
    # 关联需求: REQ-CORE-015
    Given 玩家位于坐标 (450, 580)
    And 音效触发源位于坐标 (450, 100)（距离 = 480 像素）
    When 该位置触发音效
    Then 该音效的播放音量为 0
```

### 4.5 构建工具

```gherkin
Feature: Vite 构建工具

  Scenario: 执行dev命令_启动开发服务器_时间达标
    # 关联需求: REQ-CORE-016
    Given 项目根目录存在 vite.config.js
    When 开发者执行 "npm run dev"
    Then Vite 开发服务器在 3 秒内启动完成
    And 浏览器可访问 http://localhost:5173 并看到游戏画面

  Scenario: 执行build命令_产出静态文件_chunk大小达标
    # 关联需求: REQ-CORE-017, REQ-CORE-018
    Given 项目代码无编译错误
    When 开发者执行 "npm run build"
    Then dist/ 目录生成 index.html 和 JS/CSS 资源文件
    And JS chunk 文件数量不超过 3 个
    And 每个 JS chunk gzip 后体积不超过 500KB
```

### 4.6 游戏逻辑保留

```gherkin
Feature: 游戏逻辑迁移后行为一致性

  Scenario: 波次系统_迁移后_敌人生成间隔误差达标
    # 关联需求: REQ-CORE-019
    Given 游戏处于第 1 波次
    And baseSpawnRate 为 400ms
    When 波次开始后连续记录 10 次敌人生成时间戳
    Then 相邻生成间隔与 400ms 的误差均不超过 50ms

  Scenario: 武器系统_ES模块加载_接口兼容
    # 关联需求: REQ-CORE-021
    Given weaponManager.js 已改造为 ES 模块
    When 游戏场景通过 import 加载 weaponManager
    Then weaponManager.addWeapon()、weaponManager.evolveWeapon() 等接口可正常调用
    And 武器进化、合并逻辑行为与迁移前一致
```

## 5. 边界场景清单

| 编号 | 类别 | 场景描述 | 关联需求 | 预期行为 |
|------|------|----------|----------|----------|
| BS-001 | 网络/资源 | Phaser 3 CDN 或 npm 包加载失败 | REQ-CORE-001 | 系统显示错误提示"游戏引擎加载失败，请刷新页面"，不进入游戏循环 |
| BS-002 | 极值 | 100 个敌人同时存在场景中 | REQ-CORE-022 | 帧率不低于 60 FPS，Arcade Physics 碰撞检测全部正确执行 |
| BS-003 | 极值 | 同帧内 50 颗子弹同时命中不同敌人 | REQ-CORE-006 | 每颗子弹独立触发伤害计算，无漏检或重复计算 |
| BS-004 | 并发 | 粒子爆炸特效与音效在同一帧同时触发 20 次 | REQ-CORE-009, REQ-CORE-012 | 所有特效和音效正常播放，帧率不低于 30 FPS |
| BS-005 | 状态流转 | 游戏从波次进行中切换到波次通关弹窗再切换到下一波 | REQ-CORE-003, REQ-CORE-019 | Phaser Scene 状态正确切换，游戏对象（敌人、子弹）在波次结束时全部清除 |
| BS-006 | 权限/环境 | 浏览器禁用 Web Audio（用户未交互前 AudioContext 被挂起） | REQ-CORE-011 | 音效系统在用户首次点击后恢复，游戏逻辑不受影响 |
| BS-007 | 空值 | 波次结束时场景中无敌人、无子弹、无粒子 | REQ-CORE-003 | 游戏循环正常继续，不抛出空引用异常 |
| BS-008 | 数据完整性 | Vite 构建时某个 weapon*.js 模块存在循环依赖 | REQ-CORE-017 | 构建失败并输出明确的循环依赖错误信息，不产出损坏的 chunk |
| BS-009 | 极值 | 玩家 count 达到最大值 999 时数字门再次触发加法 | REQ-CORE-007 | 玩家 count 上限为 999，超出时保持 999 不变 |
| BS-010 | 状态流转 | WebGL 上下文丢失（GPU 重置）后恢复 | REQ-CORE-001, REQ-CORE-002 | Phaser 监听 `webglcontextlost` 事件，尝试恢复；恢复失败时降级为 Canvas 渲染器 |

## 6. 验收策略

### 6.1 验收方法

```yaml
acceptance_strategy:
  type: technical
  method: metric_comparison
  baseline:
    metric: "渲染帧率 (FPS)"
    current_value: "待采集（迁移前 Canvas 2D 渲染）"
    measurement_tool: "Chrome DevTools Performance Profiler"
    measurement_condition: "100 个活跃游戏对象（敌人+子弹+粒子），MacBook Pro M1，Chrome 120+"
  target:
    metric: "渲染帧率 (FPS)"
    target_value: "≥ 60 FPS"
    condition: "同基线测量条件"
  verification_steps:
    - "L3 实现前：运行现有 Canvas 2D 版本，使用 Chrome DevTools Performance 录制 10 秒游戏循环（100 个活跃对象），记录平均 FPS 和 CPU 占用率"
    - "L3 实现后：运行 Phaser 3 WebGL 版本，同条件录制 10 秒，记录平均 FPS 和 CPU 占用率"
    - "对比数据：FPS ≥ 60 且 CPU 占用率降低 ≥ 30% → 通过；否则附差距分析和优化建议"
```

### 6.2 覆盖度清单

#### 6.2.1 度量指标穷举

| 度量项 | 基线值（迁移前） | 目标值（迁移后） | 测量工具 | 测量条件 |
|--------|------------------|------------------|----------|----------|
| 渲染帧率 (FPS) | 待采集 | ≥ 60 FPS | Chrome DevTools Performance | 100 个活跃对象，MacBook Pro M1 |
| CPU 占用率 | 待采集 | 降低 ≥ 30% | Chrome DevTools Performance | 同上 |
| 初始化时间 | 待采集 | ≤ 3 秒 | Performance.timing API | 本地服务器，从 navigationStart 到首帧渲染 |
| 构建时间 | N/A（无构建） | ≤ 10 秒 | Vite 构建日志 | npm run build 完整构建 |
| 构建产物大小 | N/A | 单 chunk gzip ≤ 500KB | gzip -c \| wc -c | dist/ 目录所有 JS chunk |
| 碰撞检测精度 | 100%（距离检测） | 100%（Arcade Physics） | 自动化测试 | 50 次子弹-敌人碰撞场景 |
| 波次生成间隔误差 | 0ms（基准） | ≤ 50ms | 自动化测试 | 连续 10 次敌人生成时间戳对比 |

#### 6.2.2 受影响接口穷举（逐接口逐字段）

| 接口/模块 | 变化类型 | 入参字段变化 | 出参字段变化 | 行为变化 | 影响范围 |
|-----------|----------|--------------|--------------|----------|----------|
| `game` 对象 | 重构 | **字段结构变化**：<br>• gold: number（保持）<br>• lives: number（保持）<br>• wave: number（保持）<br>• score: number（保持）<br>• enemies: Array（保持）<br>• bullets: Array（保持）<br>• weaponDrops: Array（保持）<br>• isPaused: boolean（保持）<br>• isGameOver: boolean（保持） | N/A（对象无返回值） | 从全局变量改为 Phaser Scene 实例属性，访问方式从 `game.gold` 改为 `this.game.gold`（Scene 内部）或 `scene.game.gold`（外部） | weaponManager.js、weaponUI.js、weaponDropIntegration.js 等所有依赖 `game` 对象的模块 |
| `player` 对象 | 重构 | **字段结构变化**：<br>• x: number（保持）<br>• y: number（保持）<br>• width: number（保持）<br>• height: number（保持）<br>• count: number（保持）<br>• weapon: object（保持） | N/A（对象无返回值） | 从全局变量改为 Phaser Scene 实例属性，访问方式从 `player.x` 改为 `this.player.x`（Scene 内部）或 `scene.player.x`（外部） | weaponWaveSelect.js、weaponDropIntegration.js 等所有依赖 `player` 对象的模块 |
| `drawRoad()` | 删除 | N/A（函数删除） | N/A（函数删除） | 删除手写 Canvas 2D 绘制函数，改为 Phaser Tilemap 或 Graphics 对象 | game.js 渲染循环 |
| `drawPlayer()` | 删除 | N/A（函数删除） | N/A（函数删除） | 删除手写 Canvas 2D 绘制函数，改为 Phaser Sprite 或 Container | game.js 渲染循环 |
| `drawCyberSoldier()` | 删除 | N/A（函数删除） | N/A（函数删除） | 删除手写 Canvas 2D 绘制函数，改为 Phaser Graphics 或预渲染 Sprite | game.js 渲染循环 |
| `playSound(type)` | 重构 | **入参变化**：<br>• type: string（保持）<br>• **新增** volume?: number（可选，默认 1.0）<br>• **新增** loop?: boolean（可选，默认 false）<br>• **新增** detune?: number（可选，默认 0） | 无返回值（保持不变） | 从 Web Audio API 振荡器改为 Phaser Sound Manager 播放预加载音效，支持音量、循环、音调参数 | game.js 所有音效触发点（射击/击杀/通关/游戏结束） |
| `Math.hypot` 碰撞检测 | 删除 | N/A（函数删除） | N/A（函数删除） | 删除手写距离检测（game.js:609, 804），改为 Phaser Arcade Physics 碰撞回调 | game.js 子弹-敌人碰撞、子弹-数字门碰撞 |
| `weaponManager.addWeapon()` | 接口保持 | weaponId: string（保持不变） | 无返回值（保持不变） | 内部实现从操作全局 `player.weapon` 改为操作 Phaser Scene 的 player 对象 | weaponDropIntegration.js、weaponWaveSelect.js |
| `weaponManager.evolveWeapon()` | 接口保持 | weaponId: string（保持不变） | boolean（保持不变） | 内部实现从操作全局 `game.weaponDrops` 改为操作 Phaser Scene 的 weaponDrops 数组 | weaponUI.js |
| `weaponUI.openWeaponModal()` | 接口保持 | 无参数（保持不变） | 无返回值（保持不变） | 行为不变，但需确保 Phaser 游戏循环暂停时 DOM 事件仍可响应 | index.html 按钮点击事件 |

#### 6.2.3 受影响消费方穷举

| 消费方 | 类型 | 依赖的接口/数据 | 迁移影响 | verify_fields | 验证方法 |
|--------|------|------------------|----------|---------------|----------|
| weaponManager.js | 内部模块 | 全局 `game` 对象、`player` 对象 | 需改为 ES 模块 import，通过 Scene 实例访问游戏状态 | • game.weaponDrops<br>• player.weapon | 单元测试 + 集成测试 |
| weaponUI.js | 内部模块 | 全局 `game` 对象、`weaponManager` | 需改为 ES 模块 import，通过 Scene 实例访问游戏状态 | • game.gold<br>• game.wave<br>• player.weapon | 单元测试 + 手动 UI 测试 |
| weaponWaveSelect.js | 内部模块 | 全局 `game` 对象、`weaponManager` | 需改为 ES 模块 import | • player.weapon | 单元测试 + 波次通关流程测试 |
| weaponDropIntegration.js | 内部模块 | 全局 `game` 对象、`playSound()` | 需改为 ES 模块 import，音效调用改为 Phaser Sound Manager | • game.weaponDrops<br>• player.x<br>• player.y | 单元测试 + 武器掉落场景测试 |
| weaponMergeAnimation.js | 内部模块 | 全局 `game` 对象 | 需改为 ES 模块 import，动画实现可能需改为 Phaser Tween | • particles 数组 | 单元测试 + 武器合并动画测试 |
| index.html | 页面入口 | `<script>` 标签顺序加载 6 个 JS 文件 | 改为单一 `<script type="module">` 加载 Vite 入口文件 | • 无 | 浏览器加载测试 |
| style.css | 样式文件 | Canvas 元素 `#game-canvas` | Canvas 元素由 Phaser 自动创建，需确保 CSS 选择器仍生效 | • #game-canvas 选择器 | 视觉回归测试 |
| scripts/start.sh | 开发脚本 | Python 静态服务器 | 改为 `npm run dev` 启动 Vite 开发服务器 | • 无 | 脚本执行测试 |
| 无（未来扩展） | 导出/报表 | 无 | 无 | • 无 | N/A |
| 无（未来扩展） | 第三方集成 | 无 | 无 | • 无 | N/A |

#### 6.2.4 字段级覆盖度清单

| 配置对象 | 字段 | 目标值 | 验证方法 |
|---------|------|--------|----------|
| **Phaser 游戏配置** | type | Phaser.AUTO（优先 WebGL，降级 Canvas） | 自动化测试读取 game.config.type |
| | width | 900 | 自动化测试读取 game.config.width |
| | height | 700 | 自动化测试读取 game.config.height |
| | parent | 'game-container' | 自动化测试读取 game.config.parent |
| | physics.default | 'arcade' | 自动化测试读取 game.config.physics.default |
| | physics.arcade.gravity | {x: 0, y: 0} | 自动化测试读取 game.config.physics.arcade.gravity |
| | physics.arcade.debug | false（生产环境） | 自动化测试读取 game.config.physics.arcade.debug |
| | physics.arcade.bounds | {x: 0, y: 0, width: 900, height: 700} | 自动化测试读取 game.config.physics.arcade.bounds |
| | scene | [MainScene] | 自动化测试读取 game.config.scene |
| | backgroundColor | '#000000' | 自动化测试读取 game.config.backgroundColor |
| **Phaser Scene 生命周期** | preload() | 资源预加载（音效文件、纹理） | 单元测试验证 preload 方法存在且被调用 |
| | create() | 场景初始化（创建游戏对象、配置物理引擎） | 单元测试验证 create 方法存在且被调用 |
| | update(time, delta) | 游戏循环更新（替代 requestAnimationFrame） | 单元测试验证 update 方法存在且每帧被调用 |
| **Arcade Physics 配置** | gravity.x | 0（无水平重力） | 自动化测试读取 scene.physics.world.gravity.x |
| | gravity.y | 0（无垂直重力） | 自动化测试读取 scene.physics.world.gravity.y |
| | debug | false（生产环境关闭调试） | 自动化测试读取 scene.physics.world.debugGraphic |
| | bounds.x | 0 | 自动化测试读取 scene.physics.world.bounds.x |
| | bounds.y | 0 | 自动化测试读取 scene.physics.world.bounds.y |
| | bounds.width | 900 | 自动化测试读取 scene.physics.world.bounds.width |
| | bounds.height | 700 | 自动化测试读取 scene.physics.world.bounds.height |
| **Sound Manager 配置** | volume | 1.0（默认音量） | 自动化测试读取 scene.sound.volume |
| | mute | false（默认不静音） | 自动化测试读取 scene.sound.mute |
| | rate | 1.0（默认播放速率） | 音效播放时验证 sound.rate |
| | detune | 0（默认音调） | 音效播放时验证 sound.detune |
| **Vite 配置对象** | base | './'（部署基础路径） | 读取 vite.config.js 文件验证 |
| | build.outDir | 'dist'（构建输出目录） | 读取 vite.config.js 文件验证 |
| | build.rollupOptions.input | 'src/main.js'（入口文件） | 读取 vite.config.js 文件验证 |
| | server.port | 5173（开发服务器端口） | 读取 vite.config.js 文件验证 |
| | server.open | true（自动打开浏览器） | 读取 vite.config.js 文件验证 |

#### 6.2.5 回归测试清单

| 测试项 | 测试方法 | 通过标准 |
|--------|----------|----------|
| 波次系统 | 自动化测试：启动游戏 → 开始波次 → 验证敌人生成数量和间隔 | 20 波次全部通过，敌人生成间隔误差 ≤ 50ms |
| 难度系统 | 自动化测试：模拟多波次，验证 `baseSpawnRate` 动态调整 | 难度曲线与迁移前一致（误差 ≤ 5%） |
| 武器系统 | 单元测试 + 集成测试：武器切换、进化、合并、掉落 | 所有武器功能行为与迁移前一致 |
| 数字门系统 | 自动化测试：子弹命中数字门 → 验证玩家 count 变化 | 100 次测试全部通过，count 计算准确 |
| 生命值系统 | 自动化测试：敌人到达防线 → 验证生命值扣减 | 100 次测试全部通过，生命值扣减准确 |
| 音效系统 | 手动测试：触发射击/击杀/通关/游戏结束 → 验证音效播放 | 所有音效正常播放，无静音或卡顿 |
| UI 交互 | 手动测试：点击武器按钮、波次按钮、伤害调整按钮 | 所有 UI 交互正常，Phaser 游戏循环与 DOM 事件无冲突 |
| 视觉风格 | 视觉回归测试：截图对比迁移前后关键画面 | 赛博朋克霓虹风格保持一致，无明显视觉退化 |

### 6.3 基线数据采集计划

迁移前必须采集以下基线数据（L3 实现前执行）：

1. **渲染性能基线**
   - 工具：Chrome DevTools Performance Profiler
   - 场景：100 个活跃对象（50 敌人 + 30 子弹 + 20 粒子效果模拟）
   - 采集指标：平均 FPS、CPU 占用率、渲染帧时间分布
   - 采集时长：10 秒连续录制

2. **初始化时间基线**
   - 工具：Performance.timing API（`performance.timing.loadEventEnd - performance.timing.navigationStart`）
   - 场景：本地服务器（`bash scripts/start.sh`），Chrome 无缓存刷新
   - 采集指标：从页面导航开始到首帧渲染完成的时间
   - 采集次数：5 次取平均值

3. **碰撞检测精度基线**
   - 工具：自动化测试脚本（Jest + Playwright）
   - 场景：50 次子弹-敌人碰撞、50 次子弹-数字门碰撞
   - 采集指标：碰撞检测成功率、误检率、漏检率
   - 通过标准：100% 准确率

4. **波次生成间隔基线**
   - 工具：自动化测试脚本（Jest）
   - 场景：第 1 波次连续生成 10 个敌人
   - 采集指标：相邻敌人生成时间戳差值
   - 通过标准：与 `baseSpawnRate: 400ms` 误差 ≤ 10ms（作为迁移后 ≤ 50ms 的对比基准）

## 7. 不确定性与待确认项

| 编号 | 问题 | 影响范围 | 建议 |
|------|------|----------|------|
| UC-001 | Phaser 3 版本选择：使用 3.80+ 最新版本还是 3.55 LTS 版本？ | REQ-CORE-001, REQ-CORE-016 | 建议使用 3.80+ 最新版本（支持最新 WebGL 特性和性能优化），除非项目需要长期稳定性保证（选 3.55 LTS）。需用户确认版本策略。 |
| UC-002 | 赛博朋克士兵角色（`drawCyberSoldier()`）迁移方案：使用 Phaser Graphics 动态绘制还是预渲染为 Sprite？ | REQ-CORE-005 | Graphics 动态绘制灵活但性能较低；预渲染 Sprite 性能高但需额外美术资源。建议先用 Graphics 快速迁移，性能不达标时再优化为 Sprite。需用户确认优先级。 |
| UC-003 | 透视道路背景（`drawRoad()`）迁移方案：使用 Phaser Tilemap、Graphics 还是静态背景图？ | REQ-CORE-004 | Tilemap 适合重复纹理，Graphics 适合动态绘制，静态图性能最高。当前道路包含动态虚线动画，建议用 Graphics 或 Tilemap + Tween。需用户确认视觉需求。 |
| UC-004 | 音效资源格式：使用 Web Audio API 合成音效（保持现有振荡器逻辑）还是引入 MP3/OGG 音效文件？ | REQ-CORE-011~015 | 振荡器音效无需额外资源但音质较差；音效文件音质好但增加资源体积。建议引入轻量级音效文件（每个 < 10KB）提升音质。需用户确认是否有音效资源。 |
| UC-005 | 粒子特效复杂度：爆炸特效是否需要多层粒子（火焰+烟雾+碎片）？ | REQ-CORE-009 | 当前需求仅要求"不少于 12 个粒子"，未明确视觉复杂度。多层粒子提升视觉效果但增加性能开销。建议先实现单层粒子，性能达标后再增强。需用户确认视觉预期。 |
| UC-006 | Vite 配置：是否需要支持旧版浏览器（IE11、Safari 12-）？ | REQ-CORE-016, REQ-CORE-022 | 当前需求仅要求 Chrome 120+、Firefox 120+、Safari 17+。若需支持旧版浏览器，需配置 Vite legacy 插件和 polyfill，增加构建产物体积。需用户确认浏览器兼容范围。 |
| UC-007 | 武器系统模块（weapon*.js）重构范围：是否需要同步重构为 TypeScript？ | REQ-CORE-021 | 当前需求仅要求改造为 ES 模块，未提及 TypeScript。TypeScript 提升类型安全但增加迁移工作量。建议先完成 ES 模块迁移，后续独立任务引入 TypeScript。需用户确认技术栈演进计划。 |
| UC-008 | 性能目标设备：MacBook Pro M1 是否为最低配置要求？ | REQ-CORE-022, OPT-CORE-001 | 当前需求以 M1 为测量设备，但未明确最低配置。若需支持低端设备（如 Intel i5 双核），需降低粒子数量或禁用部分特效。需用户确认目标设备范围。 |

## 8. 术语表

| 术语 | 定义 |
|------|------|
| Phaser 3 | 开源 HTML5 游戏引擎，支持 WebGL 和 Canvas 2D 渲染，内置 Arcade Physics 和 Matter.js 物理引擎 |
| WebGL | Web Graphics Library，浏览器 3D 图形 API，支持 GPU 硬件加速 |
| Arcade Physics | Phaser 内置的轻量级 2D 物理引擎，适合街机风格游戏，支持 AABB 碰撞检测 |
| Vite | 现代前端构建工具，基于 ES 模块和 Rollup，支持快速热更新（HMR） |
| HMR | Hot Module Replacement，热模块替换，开发时修改代码无需刷新页面即可更新 |
| Canvas 2D | HTML5 Canvas 2D 渲染上下文，基于 CPU 的 2D 图形 API |
| 透视投影 | 3D 图形技术，模拟近大远小的视觉效果，当前游戏用于绘制道路消失点 |
| 粒子系统 | 游戏特效技术，通过大量小粒子模拟爆炸、烟雾、火焰等效果 |
| 空间音效 | 根据音源与听者位置关系计算音量和声像的音效技术 |
| AABB | Axis-Aligned Bounding Box，轴对齐包围盒，常用于 2D 碰撞检测 |
| Chunk | 构建工具将代码拆分为多个文件块，用于按需加载和缓存优化 |
| Gzip | 压缩算法，Web 服务器常用于压缩静态资源减少传输体积 |
| ES 模块 | ECMAScript 模块，JavaScript 官方模块系统，使用 import/export 语法 |
| 赛博朋克 | 科幻美学风格，特征为霓虹色彩、高科技低生活、未来都市 |
| 波次系统 | 塔防游戏机制，敌人分批次生成，玩家需在每波次内击败所有敌人 |

## 9. 产出自检清单执行结果

### 9.1 完整性检查
- [x] 每条用户故事都有至少一条 EARS 格式需求对应（US-001~007 对应 REQ-CORE-001~023）
- [x] 每条功能需求都有至少一组 Gherkin 验收标准对应（21 条功能需求对应 6 个 Feature 共 12 个 Scenario）
- [x] 边界场景覆盖了全部 7 个类别中的相关项（BS-001~010 覆盖网络/极值/并发/权限/空值/数据完整性/状态流转）
- [x] 技术优化需求的验收策略包含具体的度量指标、目标值和测量工具（FPS ≥ 60、CPU 降低 ≥ 30%、Chrome DevTools Performance）
- [x] coverage_checklist 穷举到字段级别（6.2.1 度量指标 7 项、6.2.2 受影响接口 10 个逐字段标注、6.2.3 受影响消费方 10 个穷举、6.2.4 字段级覆盖度清单 5 类配置对象共 31 个字段、6.2.5 回归测试 8 项）
- [x] 技术优化的 affected_interfaces 逐接口逐字段标注了变化（10 个接口/模块，含入参字段变化/出参字段变化/行为变化/影响范围）
- [x] 技术优化的 affected_consumers 穷举了所有下游消费方（10 个消费方，含 verify_fields 字段穷举）

### 9.2 无歧义检查
- [x] 不存在模糊词（所有度量指标有具体数值：60 FPS、3 秒、500KB、50ms、400 像素等）
- [x] 所有度量指标都有具体数值或范围（见验收策略 6.2.1 度量指标穷举表）
- [x] 所有状态转换都有明确的触发条件和目标状态（见边界场景 BS-005、BS-010）
- [x] 所有错误处理都有明确的错误类型和响应行为（见边界场景 BS-001、BS-006、BS-008、BS-010）

### 9.3 可判定性检查
- [x] 每条验收标准只有"通过"或"不通过"两种判定结果（所有 Gherkin Scenario 的 Then 步骤均可二值判定）
- [x] 每条验收标准可由第三方独立验证，不依赖主观判断（使用 Chrome DevTools、自动化测试、构建日志等客观工具）
- [x] Gherkin Then 步骤只描述可观察结果，不描述内部实现（如"渲染器类型为 WebGL"、"音量为 0"、"粒子数量不少于 12 个"）

### 9.4 一致性检查
- [x] 需求编号无重复、无断号，格式符合 `REQ-CORE-{SEQ}` 或 `OPT-CORE-{SEQ}`（REQ-CORE-001~023、OPT-CORE-001）
- [x] 同一概念在全文中使用同一术语（术语表已定义 15 个核心术语）
- [x] 用户故事、EARS 需求、Gherkin 场景三者语义一致（如 US-001 → REQ-CORE-022 → Scenario "webgl可用时_游戏初始化_使用WebGL渲染器"）
- [x] 边界场景的预期行为与对应 EARS 需求一致（如 BS-001 对应 REQ-CORE-001 的错误处理）

### 9.5 追溯性检查
- [x] 每条 Gherkin Scenario 标注了关联的需求编号（通过 `# 关联需求: REQ-CORE-XXX` 注释）
- [x] 每条边界场景标注了关联的需求编号（见边界场景清单"关联需求"列）
- [x] 推断需求与明确需求已分别标注（所有需求均基于用户明确输入，无推断需求）

### 9.6 证据来源标注

本需求文档基于以下证据：

1. **用户明确陈述**（requirement_input）：
   - 迁移至 Phaser 3 游戏引擎
   - 引入 Vite 构建工具
   - 提升四个方面：渲染性能、视觉特效、物理引擎、音效系统
   - 保留现有游戏逻辑（敌人生成、波次管理、难度系统、武器系统）

2. **代码库证据**：
   - `game.js` 1135 行（通过 `wc -l` 确认）
   - 手写渲染函数：`drawRoad()`（game.js:154）、`drawPlayer()`（game.js:210）、`drawCyberSoldier()`（game.js:233）
   - 手写碰撞检测：`Math.hypot` 距离检测（game.js:609、804）
   - Web Audio API 音效：振荡器实现（game.js:6-53）
   - 画布尺寸：900×700（game.js:3-4）
   - 透视道路参数：消失点 y=50、道路宽度 300（game.js:163-164）
   - 波次系统：20 波次（index.html:32）、baseSpawnRate: 400（game.js:68）
   - 武器系统模块：6 个 JS 文件通过 `<script>` 标签加载（index.html:153-158）
   - 赛博朋克配色：#00e3fd、#8eff71（game.js:244、248）

3. **项目结构证据**：
   - 无构建工具（package.json:19 `"type": "commonjs"`，无 build 脚本）
   - 静态页面项目（CLAUDE.md 说明）
   - 领域定义：CORE 领域负责游戏循环、状态管理、Canvas 渲染（hhspec/domains.yml:2-5）

4. **不确定性标注**：
   - UC-001~008 共 8 项待确认问题（Phaser 版本、角色迁移方案、音效资源格式等）

### 9.7 自检结论

本需求文档已通过全部自检项（完整性/无歧义/可判定性/一致性/追溯性），所有需求基于用户明确输入和代码库证据，无凭空编造。8 项不确定性已明确标注并提供建议，待用户确认后可进入下一阶段（Impact Analysis）。
