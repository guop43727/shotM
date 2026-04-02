---
title: "玩家战士左右移动控制 影响分析报告"
change_id: "mobile-warrior-system"
requirement_source: "hhspec/changes/mobile-warrior-system/specs/requirements/PLAYER/player-movement.md"
date: "2026-04-02"
author: "impact_analyzer-agent"
status: "draft"
risk_level: "低"
affected_specs_count: 3
bootstrap_mode: false
---

# 玩家战士左右移动控制 影响分析报告

## 1. 分析输入

### 1.1 需求摘要

**变更名称**: mobile-warrior-system
**需求 ID**: REQ-PLAYER-001 ~ REQ-PLAYER-008, REQ-PLAYER-010, REQ-PLAYER-011
**核心实体**: `player` 对象（`game.js:93-107`）

**核心操作**:
- 新增 `keys` 状态对象（`{ ArrowLeft: boolean, ArrowRight: boolean }`）
- 新增 `player.speed` 字段（推荐值 5 px/帧）
- 新增 `updatePlayerPosition()` 函数，在每帧 `drawPlayer()` 之前执行
- 注册 `keydown` / `keyup` 事件监听 `ArrowLeft`、`ArrowRight`
- `player.x` 由固定值 `canvas.width / 2 = 450` 变为动态值，范围钳制在 `[150, 750]`

**数据流变更**（单帧 gameLoop 顺序）:

```
[当前]:  drawRoad → 更新敌人/门/武器掉落 → drawPlayer() → autoFire(time) → ...
[变更后]: drawRoad → 更新敌人/门/武器掉落 → updatePlayerPosition() → drawPlayer() → autoFire(time) → ...
```

**约束**:
- 游戏暂停（`gamePaused = true`）时跳过位置更新
- 游戏结束（`gameOverFlag = true`）时跳过位置更新（`gameLoop` 已退出）
- 武器系统模块（`weaponManager.js`、`weaponUI.js`、`weaponWaveSelect.js`）不受影响

### 1.2 分析范围（specs 全集概况）

扫描 `hhspec/specs/` 目录，共发现以下 specs 文档（15 个文件，覆盖 8 个领域）：

| 领域 | Spec 路径 | 说明 |
|------|-----------|------|
| CORE | `specs/requirements/CORE/REQ-CORE-001-phaser3-migration.md` | Phaser3 迁移需求，当前 draft |
| WEAPON | `specs/requirements/WEAPON/weapon-evolution-requirements.md` | 武器进化系统需求 |
| ARCH | `specs/architecture/domain-model.md` | 领域模型（含 PLAYER 领域定义） |
| ARCH | `specs/architecture/data-flow.md` | 数据流设计（武器系统数据流） |
| ARCH | `specs/architecture/error-strategy.md` | 错误处理策略 |
| ARCH | `specs/architecture/api-contracts/README.md` | API 契约 |
| DESIGN | `specs/design/api-design.md` | API 设计 |
| DESIGN | `specs/design/api-design-SUMMARY.md` | API 设计摘要 |
| DESIGN | `specs/design/data-design.md` | 数据设计 |
| DESIGN | `specs/design/frontend-design.md` | 前端详细设计（武器系统 UI） |
| DESIGN | `specs/design/error-design.md` | 错误处理设计 |
| DESIGN | `specs/design/test-design.md` | 测试设计 |
| DESIGN | `specs/design/WEAPON-test-detail.md` | 武器系统测试详细 |
| DESIGN | `specs/design/INTEGRATION-test-detail.md` | 集成测试详细 |
| DESIGN | `specs/design/INTEGRATION-api-design.md` | 集成 API 设计 |

**关键发现**: `specs/architecture/domain-model.md` 中 PLAYER 领域定义（第 22-28 行）当前记录"玩家固定在底部中央"，与本需求变更直接相关。

---

## 2. 上游追溯

### 2.1 直接依赖

新需求直接依赖以下已有系统要素：

| 依赖项 | 位置 | 依赖方式 | 置信度 |
|--------|------|----------|--------|
| `player` 对象（`player.x`, `player.y`, `player.speed`） | `game.js:93-107` | 读写 `player.x`，新增 `player.speed` 字段 | 高 |
| `gamePaused` 变量 | `game.js:1001` | 读取，移动时检查是否暂停 | 高 |
| `gameOverFlag` 变量 | `game.js:1000` | 读取，游戏结束时跳过移动 | 高 |
| `gameLoop` 主循环 | `game.js:1037` | 在循环体内插入 `updatePlayerPosition()` 调用 | 高 |
| `drawPlayer()` 函数 | `game.js:229` | `updatePlayerPosition()` 必须在其之前执行（位置同步） | 高 |
| `autoFire()` 函数 | `game.js:844` | `updatePlayerPosition()` 必须在 `autoFire()` 之前执行，确保子弹起点使用最新 `player.x` | 高 |
| `document.addEventListener('keydown', ...)` | `game.js:1017` | 已有 Escape 键监听，新需求需在同一 `keydown` 事件或新增独立监听中处理 ArrowLeft/ArrowRight | 高 |
| `GAME_CONSTANTS` 对象 | `game.js:7-23` | 可选：将 `player.speed` 或边界值 `150`/`750` 注册为常量 | 中 |

**证据来源**:
- `game.js:1037-1162`：`gameLoop` 完整循环体，`drawPlayer()` 在第 1104 行，`autoFire()` 在第 1105 行
- `game.js:1017-1023`：当前唯一的 `keydown` 监听，仅处理 Escape 键
- `game.js:93-107`：`player` 对象定义，当前无 `speed` 字段

### 2.2 间接依赖

| 依赖项 | 位置 | 依赖层级 | 置信度 |
|--------|------|----------|--------|
| `GAME_CONSTANTS.ROAD_WIDTH`（值 300，推导出边界 150/750） | `game.js:9` | 间接（边界值来源） | 高 |
| `canvas.width`（值 900，`canvas.width / 2 = 450` 为初始 `player.x`） | `game.js:3` | 间接（初始 x 计算来源） | 高 |
| `requestAnimationFrame` 驱动的帧节奏 | 浏览器 API | 间接（移动每帧触发一次，需控制频率） | 高 |

---

## 3. 下游扩散

### 3.1 直接影响

变更后 `player.x` 从静态值变为动态值，以下已有代码片段在每帧中读取 `player.x`，全部自动受益或需要评估：

| 消费方 | 位置 | 当前行为 | 变更后行为 | 影响类型 |
|--------|------|----------|------------|----------|
| `drawPlayer()` | `game.js:229-250` | 以固定 x=450 为中心绘制战士集群 | 以动态 `player.x` 为中心绘制，战士跟随移动 | additive（纯新增行为，代码无需修改） |
| `Bullet` 构造函数 `this.x = player.x` | `game.js:769` | 子弹起点固定为 450 | 子弹起点跟随当前帧 `player.x` | additive（自动跟随，代码无需修改，满足 REQ-PLAYER-008） |
| `Bullet.draw()` 中 `startPos = { x: player.x, y: player.y - 20 }` | `game.js:781` | 子弹轨迹起点固定为 x=450 | 子弹轨迹起点跟随当前帧 `player.x` | additive（注意：子弹已发射后每帧仍重新读取 `player.x`，移动时会导致已飞行子弹的轨迹起点漂移，详见 Q-005） |
| `Bullet.update()` 中 `bulletX = player.x + ...` | `game.js:817` | 子弹与数字门碰撞检测使用固定 x=450 | 使用动态 `player.x` | additive（碰撞检测自动跟随，无需修改） |
| `weaponDropIntegration.checkCollection()` 中 `dx = Math.abs(drop.x - player.x)` | `weaponDropIntegration.js:33` | 武器掉落拾取判断使用固定 x=450 | 使用动态 `player.x`，玩家需主动走到掉落物所在 lane | compatible（行为有变化：掉落物拾取由"门卫等候"变为"玩家主动对位"，增加了游戏策略性，但代码无需修改） |
| 武器掉落碰撞检测 `Math.hypot(pos.x - player.x, pos.y - player.y)` | `game.js:628` | 旧版 WeaponDrop 类（已被 weaponDropIntegration 部分替代），使用固定 x=450 | 使用动态 `player.x` | additive（自动跟随） |

**证据来源**:
- 通过全项目 `grep "player\.x"` 验证，所有 `player.x` 引用均已枚举（共 7 处：`game.js` 5 处，`weaponDropIntegration.js` 1 处，`tests/` 文件未计入运行时影响）

### 3.2 级联影响

**级联项 1：子弹轨迹漂移（确认受影响）**

`Bullet.draw()` 在 `game.js:781` 中每帧重新读取 `player.x` 作为 `startPos`，而非记录子弹创建时的起点。当玩家移动时，已在飞行中的子弹每帧绘制的起始端会随 `player.x` 漂移，导致视觉上轨迹起点"跟着走"。这是渲染层的视觉现象，不影响碰撞检测逻辑（`Bullet.update()` 在创建时就锁定了 `this.x = player.x`，`this.progress` 推进是确定的）。

置信度：高。证据：`game.js:769`（构造时固定 `this.x`）与 `game.js:781`（绘制时动态读取 `player.x`）行为不一致。

**级联项 2：武器掉落拾取难度上升（确认受影响）**

`weaponDropIntegration.js:33` 的拾取逻辑使用 `laneWidth = 80` 作为容差（x 轴），容差从"所有掉落物对中心玩家都可拾取"变为"玩家必须主动向掉落物所在 lane 移动才能拾取"。掉落物初始 x 来自敌人死亡时的屏幕 x 坐标，分布在道路中央附近，容差 80px 意味着玩家需接近到 80px 以内才能拾取。

置信度：高。证据：`weaponDropIntegration.js:9-47`。

**级联项 3：Phaser3 迁移需求（REQ-CORE-001）存在规划冲突**

`hhspec/specs/requirements/CORE/REQ-CORE-001-phaser3-migration.md` 计划将 `game.js` 中的手写碰撞检测和渲染循环迁移至 Phaser3 引擎。本需求在原生 Canvas/JS 中新增键盘移动控制逻辑。若两个变更并行推进，后续 Phaser3 迁移需同步迁移 `keys` 状态对象和 `updatePlayerPosition()` 函数（或改用 Phaser 的 Keyboard 插件重新实现）。

置信度：中（取决于变更优先级排序）。

### 3.3 影响类型分布

| 类型 | 数量 | 受影响模块 |
|------|------|----------|
| `additive`（纯新增，不影响已有消费方） | 5 | drawPlayer, Bullet构造函数, Bullet碰撞检测, 旧WeaponDrop碰撞, Bullet.draw（功能新增） |
| `compatible`（行为有变化，代码无需修改） | 1 | weaponDropIntegration.checkCollection |
| `breaking`（破坏性变更，必须同步修改） | 0 | - |

---

## 4. 流程链分析

### 4.1 受影响的业务流程清单

| 流程 | 是否受影响 | 触点 | 触点类型 |
|------|----------|------|---------|
| gameLoop 主帧循环 | 是 | 在 `drawPlayer()` 前插入 `updatePlayerPosition()` | 新增步骤 |
| 键盘事件处理流程 | 是 | 现有 `keydown` 监听需扩展，或新增独立监听 | 扩展分支 |
| 子弹发射流程（autoFire） | 否（代码不修改） | 子弹起点自动跟随，满足 REQ-PLAYER-008 | - |
| 武器掉落拾取流程 | 否（代码不修改） | 行为自动变化（玩家需主动对位） | - |
| 游戏暂停流程 | 否（已有逻辑覆盖） | `gamePaused` 检查已存在，`updatePlayerPosition()` 需尊重该标志 | - |
| 数字门碰撞流程 | 否 | 数字门 `getScreenPosition()` 使用 `canvas.width / 2` 为中心，不读取 `player.x` | - |
| 武器进化/合成流程 | 否 | weaponManager.js 不涉及 `player.x` | - |
| 游戏结束流程 | 否 | `gameOverFlag` 检查已在 `gameLoop` 入口处理 | - |

### 4.2 流程触点详情

**触点 1：gameLoop 帧循环插入点**

```
当前 gameLoop 相关片段（game.js:1037-1160）：
  ...
  1104: drawPlayer();
  1105: autoFire(time);
  ...

变更后：
  ...
  NEW:  updatePlayerPosition();   // 新增，在 drawPlayer 之前
  1104: drawPlayer();
  1105: autoFire(time);
  ...
```

证据：`game.js:1104-1105` 确认当前顺序，`REQ-PLAYER-007` 要求 `updatePlayerPosition` 在 `drawPlayer` 前调用。

**触点 2：keydown 事件处理扩展**

```
当前（game.js:1017-1023）：
  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gameOverFlag) {
          gamePaused = !gamePaused;
          ...
      }
  });

变更后选项 A（扩展已有监听）：
  document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gameOverFlag) { ... }
      if (e.key === 'ArrowLeft') { keys.ArrowLeft = true; }
      if (e.key === 'ArrowRight') { keys.ArrowRight = true; }
  });
  document.addEventListener('keyup', (e) => { ... });

变更后选项 B（新增独立监听）：独立注册 keydown/keyup，与 Escape 监听并列。
```

两种选项均可行，无破坏性差异。建议实现阶段选择选项 B（职责单一，便于单独测试）。

**触点 3：`gamePaused` 检查路径**

`gameLoop:1041-1044` 在 `gamePaused = true` 时提前 return，整个循环体（包括 `updatePlayerPosition()`）均不执行。满足 REQ-PLAYER-005，**无需在 `updatePlayerPosition()` 内部额外判断**（现有保护已覆盖）。

证据：`game.js:1041-1044`。

---

## 5. 变更范围界定

### 5.1 受影响 Spec 索引（YAML 结构化）

```yaml
affected_specs:
  - spec_id: "domain-model"
    spec_path: "hhspec/specs/architecture/domain-model.md"
    sections:
      - section: "2. 玩家系统 (PLAYER) - 当前实现"
        description: >
          第 33-36 行描述"玩家固定在底部中央"，需更新为"玩家可通过方向键在 x:[150,750]
          范围内移动"。同时，PLAYER 领域"对外接口"和"职责范围"需新增 updatePlayerPosition()
          和 keys 状态对象。
      - section: "PLAYER 领域职责 - 对外接口"
        description: >
          新增接口条目：updatePlayerPosition() - 每帧位置更新；
          新增依赖说明：CORE 领域负责 keys 状态对象管理。
    change_type: "modify"
    impact_type: "compatible"
    confidence: 高
    risk_level: 低
    rationale: >
      domain-model.md:34 明确写明"玩家固定在底部中央"，与本需求的核心变更（玩家可动）
      直接矛盾，必须更新以保持文档与代码一致性。
      证据：hhspec/specs/architecture/domain-model.md:33-36, 413-428。

  - spec_id: "player-movement"
    spec_path: "hhspec/changes/mobile-warrior-system/specs/requirements/PLAYER/player-movement.md"
    sections:
      - section: "全文（首次创建）"
        description: "已由 analyst-agent 产出，本次变更的源需求文档，无需修改。"
    change_type: "new"
    impact_type: "additive"
    confidence: 高
    risk_level: 低
    rationale: "本文件即本次变更的需求输入，已完整产出。"

  - spec_id: "domain-model-player-area"
    spec_path: "hhspec/specs/architecture/domain-model.md"
    sections:
      - section: "依赖矩阵"
        description: >
          CORE 行新增 PLAYER 键盘状态管理职责（keys 对象由 CORE 领域的 gameLoop
          文件 game.js 持有）。
    change_type: "extend"
    impact_type: "compatible"
    confidence: 中
    risk_level: 低
    rationale: >
      domain-model.md:377-388 依赖矩阵记录了各领域依赖关系，keys 状态对象属于 CORE
      领域协调范畴（与 gamePaused、gameOverFlag 同级），需在矩阵注释中体现。
      证据：hhspec/specs/architecture/domain-model.md:377-388。

    affected_interfaces:
      - endpoint: "updatePlayerPosition() [新增函数]"
        change_type: "新增"
        request_fields:
          - field: "无入参（直接读取 keys 状态和 player 对象）"
            change: "新增"
        response_fields:
          - field: "无返回值（直接修改 player.x）"
            change: "新增"

      - endpoint: "player 对象"
        change_type: "新增字段"
        request_fields:
          - field: "player.speed"
            change: "新增，Number 类型，建议值 5 px/帧，原对象无此字段"
        response_fields:
          - field: "player.x"
            change: >
              语义变更：由只读静态值（固定 450）变为每帧可变值（范围 [150, 750]）。
              接口签名（number 类型）不变，但读取时机和值含义发生变化。

      - endpoint: "keys 状态对象 [新增模块变量]"
        change_type: "新增"
        request_fields:
          - field: "keys.ArrowLeft"
            change: "新增，Boolean，false=未按，true=按住，由 keydown/keyup 事件维护"
          - field: "keys.ArrowRight"
            change: "新增，Boolean，false=未按，true=按住，由 keydown/keyup 事件维护"
        response_fields:
          - field: "无出参（状态对象）"
            change: "新增"

    affected_consumers:
      - consumer: "drawPlayer() - 战士集群绘制"
        impact: >
          使用 player.x 计算 startX（game.js:232）。player.x 动态化后战士绘制位置随之
          移动，这是预期行为。代码无需修改。
        verify_fields: ["player.x 用于 startX 计算（game.js:232）", "player.count 文字悬浮（game.js:247）"]

      - consumer: "Bullet 构造函数 - 子弹发射起点"
        impact: >
          this.x = player.x（game.js:769）在子弹创建时快照当前 player.x。
          updatePlayerPosition() 在 autoFire() 之前执行，确保子弹起点为更新后的坐标。
          代码无需修改。
        verify_fields: ["game.js:769 this.x = player.x", "gameLoop 调用顺序：updatePlayerPosition → drawPlayer → autoFire"]

      - consumer: "Bullet.draw() - 子弹轨迹渲染"
        impact: >
          startPos.x 每帧动态读取 player.x（game.js:781）。玩家移动时已飞行子弹的
          轨迹起点端会随 player.x 漂移（视觉瑕疵）。不影响碰撞判定，不属于 breaking 变更，
          但需在测试阶段验证视觉效果是否可接受（详见不确定性 Q-005）。
        verify_fields: ["game.js:781 startPos.x = player.x", "移动时子弹轨迹起点是否漂移（目视验证）"]

      - consumer: "weaponDropIntegration.checkCollection() - 武器掉落拾取"
        impact: >
          dx = Math.abs(drop.x - player.x)（weaponDropIntegration.js:33）。
          玩家移动后拾取需主动对位，laneWidth=80px 容差。行为变化为预期策略设计，
          代码无需修改，但需在验收测试中验证拾取体验。
        verify_fields: ["weaponDropIntegration.js:33 dx = Math.abs(drop.x - player.x)", "laneWidth=80px 对位容差是否合理"]

    downstream_consumers:
      - "autoFire (读取 player.x 通过 Bullet 构造函数)"
      - "weaponDropIntegration (直接读取 player.x)"
      - "旧版 WeaponDrop 碰撞检测 (game.js:628)"
```

### 5.2 变更执行顺序

基于依赖关系确定以下执行顺序：

1. **Step 1 - game.js 代码变更（必须先行）**：
   - 声明 `keys` 状态对象
   - 在 `player` 对象中新增 `speed` 字段（或作为模块常量）
   - 实现 `updatePlayerPosition()` 函数
   - 注册 `keydown` / `keyup` 事件监听
   - 在 `gameLoop` 的 `drawPlayer()` 之前调用 `updatePlayerPosition()`

2. **Step 2 - 文档更新（代码完成后更新）**：
   - 更新 `hhspec/specs/architecture/domain-model.md`：PLAYER 系统描述、对外接口、依赖矩阵

3. **Step 3 - 测试新增**：
   - 新增 `player.x` 移动相关单元测试（`tests/` 目录）
   - 验证 12 个 Gherkin 场景

### 5.3 新增 Spec 清单

| 文档 | 路径 | 状态 |
|------|------|------|
| 玩家移动需求 | `hhspec/changes/mobile-warrior-system/specs/requirements/PLAYER/player-movement.md` | 已完成（analyst-agent 产出） |
| 本影响分析报告 | `hhspec/changes/mobile-warrior-system/impact.md` | 本文档 |

---

## 6. 风险评估

### 6.1 回归风险矩阵

对本次变更涉及的 3 个核心区域进行五维评分：

#### 区域 A：player.x 动态化（game.js 核心修改）

| 维度 | 权重 | 得分 | 说明 |
|------|------|------|------|
| 影响范围 | 30% | 1 | player.x 有 5 个读取点（2-3 个消费方模块），属于中等范围 |
| 变更深度 | 25% | 1 | 行为逻辑变更（player.x 变为动态），不是接口签名或数据模型结构变更 |
| 耦合程度 | 20% | 2 | 共享数据（所有消费方直接引用 player.x 全局对象字段） |
| 测试覆盖 | 15% | 2 | 有部分测试（`tests/game.e2e.js:87` 断言 player.x=450），但测试覆盖移动场景不足 |
| 可逆性 | 10% | 1 | 纯代码变更，可逆 |
| **加权得分** | - | **1.35** | **低风险**（< 1.5） |

#### 区域 B：键盘事件注册（新增 keydown/keyup）

| 维度 | 权重 | 得分 | 说明 |
|------|------|------|------|
| 影响范围 | 30% | 0 | 新增事件监听，不影响已有消费方 |
| 变更深度 | 25% | 0 | 纯新增，不修改已有逻辑 |
| 耦合程度 | 20% | 1 | 弱耦合（事件监听独立） |
| 测试覆盖 | 15% | 2 | 无对应键盘事件测试 |
| 可逆性 | 10% | 1 | 可逆（移除事件监听即可） |
| **加权得分** | - | **0.65** | **低风险**（< 1.5） |

#### 区域 C：gameLoop 调用顺序变更（插入 updatePlayerPosition）

| 维度 | 权重 | 得分 | 说明 |
|------|------|------|------|
| 影响范围 | 30% | 1 | 影响帧内 player.x 的所有下游读取 |
| 变更深度 | 25% | 1 | 行为逻辑变更（调用顺序） |
| 耦合程度 | 20% | 2 | 中耦合（共享帧状态，顺序敏感） |
| 测试覆盖 | 15% | 2 | 无 gameLoop 顺序相关测试 |
| 可逆性 | 10% | 1 | 可逆 |
| **加权得分** | - | **1.30** | **低风险**（< 1.5） |

**整体风险等级：低**（三个区域最高加权分 1.35，均低于 1.5 阈值）

### 6.2 向后兼容性清单

| 接口/数据结构 | 兼容性结论 | 说明 |
|--------------|----------|------|
| `player.x`（Number 类型） | 协议兼容 | 类型不变，但语义从静态值变为动态范围值。读取方（drawPlayer、Bullet、weaponDropIntegration）无需修改，但行为自动变化（符合预期）。 |
| `player` 对象结构 | 完全兼容 | 仅新增 `speed` 字段，不修改已有字段。所有消费方不需修改。 |
| `keys` 状态对象 | 完全兼容 | 全新模块级变量，不影响任何已有消费方。 |
| `gameLoop` 调用签名 | 完全兼容 | `gameLoop(time)` 签名不变，调用方式（`requestAnimationFrame(gameLoop)`）不变。 |
| `document.keydown` 事件处理 | 完全兼容 | 已有 Escape 键处理逻辑不修改。新增方向键处理为独立逻辑分支。 |
| `weaponDropIntegration.checkCollection()` | 协议兼容 | 函数签名不变，但行为因 `player.x` 动态化而自动变化（拾取需主动对位）。 |
| `Bullet` 类构造函数 | 完全兼容 | 签名不变，`this.x = player.x` 行为自动跟随，无需修改。 |

**结论：本次变更不存在破坏性（breaking）变更，所有已有消费方无需强制同步修改。**

### 6.3 高风险项专项分析

本次变更无高风险项（所有区域得分均 < 1.5）。

**中等关注项（得分 1.30-1.35）**：

1. **gameLoop 顺序敏感性**：`updatePlayerPosition()` 必须在 `drawPlayer()` 之前且在 `autoFire()` 之前插入。若顺序错误（如插入到 `autoFire()` 之后），会导致子弹起点落后一帧（当帧渲染位置与子弹起点不一致）。缓解措施：代码审查确认调用顺序，并在 REQ-PLAYER-007 对应测试用例中验证。

2. **已有 `game.e2e.js:87` 测试断言 `player.x === 450`**：该断言在玩家可移动后可能失效（初始值仍为 450，但若测试触发了移动则会失败）。需检查测试上下文，可能需要更新该断言。

---

## 7. 不确定性与待确认项

| 编号 | 问题 | 影响范围 | 置信度 | 建议 |
|------|------|----------|--------|------|
| Q-001 | `player.speed` 具体像素值未确认（用户原文未指定） | REQ-PLAYER-001/002，移动手感 | 低 | 建议默认 5 px/帧（60fps 约 300px/s），实现后通过手感调整 |
| Q-002 | `player.speed` 放置位置：`player` 对象属性 vs 模块常量 | 代码结构，是否支持动态修改（如难度系统调整移速） | 中 | 若无动态修改需求，建议 `GAME_CONSTANTS` 中注册或 `player` 对象属性 |
| Q-003 | 同时按住 ArrowLeft 和 ArrowRight 时行为未定义（BS-007） | 操控体验 | 中 | 建议双键同时按住时速度抵消（`player.x` 不变），实现简单且符合格斗游戏惯例 |
| Q-004 | 波次结算弹窗（`waveclear-modal`）显示期间是否允许移动（BS-011）。`game.waveActive=false` 但 `gamePaused=false`，`gameLoop` 仍在运行 | 移动控制逻辑完整性 | 中 | 建议弹窗期间禁止移动（通过检测弹窗可见性或新增 `gameBlocked` 标志）；需用户确认 |
| Q-005 | `Bullet.draw()` 中 `startPos.x = player.x`（`game.js:781`）每帧动态读取，导致已飞行子弹轨迹起点随玩家移动漂移。是否视为可接受的视觉现象或需修复 | 子弹渲染视觉质量 | 中 | 若需修复：在 Bullet 构造函数中同时记录 `this.startX = player.x`，`draw()` 中改用 `this.startX`。若视觉可接受则无需修改。需目视验证后决策 |
| Q-006 | `tests/game.e2e.js:87` 断言 `player.x === 450` 在移动功能上线后是否仍有效 | 测试套件完整性 | 高 | 检查该测试的上下文：若测试开始时未触发移动，初始值仍为 450，断言可保留；若触发了移动，需更新断言 |
| Q-007 | 未提供代码路径的测试文件（`tests/weaponSystem.test.js`、`tests/weaponManager.unit.test.js`）是否包含 player.x 相关断言 | 测试回归 | 中 | 在实现前运行 `npx jest` 确认基线；实现后再次运行确认无回归 |

---

## 8. 建议与下一步

### 8.1 变更实施建议（优先级排序）

1. **P0 - 确认 Q-004（波次结算弹窗期间移动策略）**：这是唯一需要用户决策的功能边界问题，影响 `updatePlayerPosition()` 的条件判断逻辑。建议在实现前明确。

2. **P0 - game.js 核心修改**（仅需修改 1 个文件，约 25 行代码）：
   - 在模块顶部声明 `const keys = { ArrowLeft: false, ArrowRight: false };`
   - 在 `player` 对象中新增 `speed: 5`（第 107 行后）
   - 实现 `updatePlayerPosition()` 函数（约 10 行）
   - 在 `game.js:1017` 附近新增 `keydown` / `keyup` 监听（约 10 行）
   - 在 `gameLoop:1104` 行的 `drawPlayer()` 之前调用 `updatePlayerPosition()`（1 行）

3. **P1 - 确认并处理 Q-005（子弹轨迹漂移）**：目视验证后决策是否需要修复 `Bullet.draw()`。如需修复，同在 P0 阶段完成（同为 `game.js` 修改）。

4. **P1 - 更新 domain-model.md**：将 PLAYER 领域描述由"固定"改为"可移动"，新增 `updatePlayerPosition()` 对外接口，同步 `keys` 状态对象说明。

5. **P2 - 新增/更新测试**：
   - 在 `tests/` 新增 `player-movement.test.js` 覆盖 12 个 Gherkin 场景
   - 检查并更新 `tests/game.e2e.js:87` 的断言

### 8.2 测试策略建议（重点回归范围）

| 测试类型 | 覆盖范围 | 优先级 |
|---------|---------|--------|
| 单元测试（新增） | 12 个 Gherkin 场景全部通过：左移、右移、边界钳制、暂停不移动、gameOver 不移动、松键停止、子弹起点跟随 | P0 |
| 回归测试（已有） | 运行 `npx jest` 确认 `tests/weaponSystem.test.js`、`tests/weaponManager.unit.test.js` 无回归 | P1 |
| 集成测试（目视） | 验证：子弹起点跟随移动（Q-005）、武器掉落拾取需主动对位、波次结算弹窗期间移动行为（Q-004） | P1 |
| 性能测试 | `performance.now()` 在 `updatePlayerPosition()` 前后计时，抽样 100 帧，确认平均增量 <= 1ms（REQ-PLAYER-010） | P2 |
| 边界场景 | BS-001 至 BS-010 全部验证，尤其关注 BS-003/004（单帧越界钳制）、BS-007（双键同时按）、BS-010（键盘重复触发） | P1 |

**重点回归区域**：
- `weaponDropIntegration.checkCollection()`：拾取逻辑因 `player.x` 动态化而行为改变
- `Bullet` 发射和轨迹：确认子弹起点正确跟随移动后的 `player.x`
- `game.e2e.js` 中 `player.x === 450` 断言（Q-006）

### 8.3 风险缓解措施

| 风险 | 缓解措施 |
|------|---------|
| `updatePlayerPosition()` 插入位置错误导致子弹起点落后一帧 | 代码审查：确认调用在 `drawPlayer()` 之前、`autoFire()` 之前；验证场景：REQ-PLAYER-008 对应的 Gherkin 场景要求子弹 x = 更新后的 player.x |
| `player.x` 变为 `NaN`（BS-009，防御性需求） | 在 `updatePlayerPosition()` 中实现 `isNaN` 检查，重置为 450：`if (isNaN(player.x)) player.x = 450;` |
| `player.speed` 未定义导致 `player.x` 变为 `NaN`（BS-008） | 在函数内使用 `const speed = player.speed || 5;` 提供默认值 |
| Phaser3 迁移（REQ-CORE-001）与本需求并行时代码冲突 | 两个变更应串行排队：若 Phaser3 迁移在前，则在 Phaser 架构下实现键盘控制（使用 Phaser Keyboard 插件）；若本需求在前，则在迁移时将 `keys` 和 `updatePlayerPosition()` 迁移为 Phaser 实现 |
| 测试断言 `player.x === 450` 失效（Q-006） | 实现后运行 `npx jest` 检查，若失败则更新断言或在测试中重置 `player.x = 450` 作为前置条件 |

---

## 9. 自检清单执行结果

### 完整性检查
- [x] 四维分析（上游/下游/流程链/变更范围）全部执行，无遗漏维度
- [x] 每个受影响的 spec 都有完整的索引条目（spec_id + sections + change_type）
- [x] 所有 `breaking` 类型的变更：本次无 breaking 变更，已确认并记录
- [x] 所有高风险项：本次无高风险项（最高分 1.35 < 1.5 阈值）
- [x] 技术优化类需求（本需求为功能需求，不适用 affected_interfaces 强制要求，但已补充 affected_interfaces 以覆盖接口变化）
- [x] affected_consumers 穷举了所有下游消费方（7 处 player.x 引用全部覆盖）

### 证据充分性检查
- [x] 每条影响判断都附有 spec 文件路径和具体行号引用
- [x] 「确定受影响」与「可能受影响」已明确标注置信度
- [x] 不确定性章节已记录 7 个证据缺口（Q-001 至 Q-007）

### 一致性检查
- [x] 上游依赖和下游扩散的方向正确，无逻辑矛盾（上游依赖 player/gameLoop/gamePaused，下游扩散到 drawPlayer/Bullet/weaponDropIntegration）
- [x] 风险评分（低，1.30-1.35）与影响类型判断（additive/compatible，无 breaking）一致
- [x] 变更执行顺序（game.js 先行 → 文档更新 → 测试新增）尊重依赖关系，无循环依赖

### 可操作性检查
- [x] 变更清单可直接指导实现（单文件 game.js，约 25 行代码，位置明确）
- [x] 测试策略建议可直接指导回归测试范围划定（12 个 Gherkin 场景 + 已有 Jest 套件）
- [x] 风险缓解措施具体可执行（`isNaN` 检查代码示例、默认值处理、Phaser 迁移排序建议）
