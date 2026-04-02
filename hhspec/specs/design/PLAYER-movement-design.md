# PLAYER 模块 L2 详细设计文档

> 变更：mobile-warrior-system
> 模块：PLAYER
> 日期：2026-04-02
> 模式：简单模式（纯前端 Canvas 游戏，0 HTTP 接口，coordinator 独立完成）
> Bootstrap 模式：false

---

## 1. 设计概述

### 1.1 范围说明

本文档覆盖 `player` 对象左右移动能力的 L2 详细设计，仅修改 `game.js` 一个文件。不涉及任何 HTTP 接口、数据库、服务端逻辑。

**变更边界**（来源：L0 需求 §1.3、impact.md §5.1）：
- 修改文件：`game.js`（新增约 25 行代码）
- 新增函数：`updatePlayerPosition()`
- 新增变量：`const keys`（模块级）
- 修改对象：`player`（新增 `speed` 字段）
- 扩展事件：`keydown` / 新增 `keyup` 监听
- 不修改：`weaponManager.js`、`weaponUI.js`、`weaponWaveSelect.js`

### 1.2 复杂度度量

| 指标 | 值 | 依据 |
|------|----|------|
| 功能需求数 | 8 | REQ-PLAYER-001~008 |
| 非功能需求数 | 2 | REQ-PLAYER-010, REQ-PLAYER-011 |
| Gherkin 场景数 | 12 | L0 需求 §4 |
| 边界场景数 | 11 | BS-001~011（BS-012 不适用） |
| 新增函数数 | 1 | updatePlayerPosition() |
| 新增状态字段数 | 3 | keys.ArrowLeft, keys.ArrowRight, player.speed |
| 新增事件监听数 | 2 | keydown（方向键）、keyup |
| 修改文件数 | 1 | game.js |
| 风险等级 | 低 | impact.md §6.1 最高加权分 1.35 < 1.5 |

### 1.3 关键设计决策（来源：decision.md）

| 决策 | 结论 | 理由 |
|------|------|------|
| 实现模式 | keys 状态对象 + gameLoop 每帧轮询 | 避免 OS 按键重复延迟，保证丝滑移动体验 |
| 边界值来源 | 从 GAME_CONSTANTS 推导（150, 750） | 单一事实来源，ROAD_WIDTH 改变时边界自动同步 |
| 双键冲突策略 | 同时按住时不移动（速度抵消为 0） | 语义明确，实现简单 |
| 弹窗期间控制 | wave 结算弹窗期间禁止移动（检测 `!game.waveActive`） | 弹窗期间无敌人，移动无意义且产生预期外偏移 |
| player.speed 位置 | 加入 player 对象属性（`player.speed = 5`） | 语义上属于 player 状态，便于未来被难度系统动态修改 |

### 1.4 领域依赖（来源：domain-model.md 依赖矩阵）

本变更属于 **PLAYER 领域**，在 CORE 领域的 `gameLoop` 中集成：

```
CORE（gameLoop 主循环）
 └─> PLAYER（updatePlayerPosition + drawPlayer + autoFire）
      └─> COMBAT（Bullet 创建时读取 player.x — 无需修改）
```

---

## 2. 状态对象设计

### 2.1 keys 状态对象

**声明位置**：`game.js` 模块顶层，紧随 `player` 对象定义之后

**伪代码**：

```
// 键盘状态对象 — 模块级变量
DECLARE keys = {
    ArrowLeft:  false,   // Boolean — true 表示按住中
    ArrowRight: false    // Boolean — true 表示按住中
}
```

**字段规范**：

| 字段 | 类型 | 初始值 | 设为 true 时机 | 设为 false 时机 |
|------|------|--------|--------------|----------------|
| `keys.ArrowLeft` | Boolean | `false` | `keydown` 事件且 `e.key === 'ArrowLeft'` | `keyup` 事件且 `e.key === 'ArrowLeft'` |
| `keys.ArrowRight` | Boolean | `false` | `keydown` 事件且 `e.key === 'ArrowRight'` | `keyup` 事件且 `e.key === 'ArrowRight'` |

**设计约束**：
- 逐帧轮询模式：`keydown` 重复触发（OS 键盘重复率）只设为 `true` 而不累加，因此一帧内只移动一次 `player.speed`（BS-010 自动满足）
- 事件作用域：`document` 级别监听，与现有 Escape 监听并列（选项 B：独立注册，职责单一）

### 2.2 player.speed 字段

**声明位置**：`game.js` 中 `player` 对象内部，紧随已有字段之后

**伪代码**：

```
DECLARE player = {
    x:      canvas.width / 2,    // 初始 450
    y:      canvas.height - 120, // 固定 580
    width:  50,
    height: 60,
    count:  1,
    speed:  5,                   // [新增] px/帧，60fps 下约 300px/s
    weapon: { ... }
}
```

**字段规范**：

| 字段 | 类型 | 值 | 含义 |
|------|------|----|------|
| `player.speed` | Number（正整数） | `5` | 每帧移动像素数；60fps 下从中心 450 到边界 150/750 约需 1 秒 |

**防御性约束（BS-008）**：`updatePlayerPosition()` 内部使用 `player.speed || 5` 作为 fallback，防止 `undefined` 导致 NaN。

---

## 3. 核心函数设计：updatePlayerPosition()

### 3.1 函数签名

```
FUNCTION updatePlayerPosition() -> void
    // 无入参：直接读取模块级 keys 对象和 player 对象
    // 无返回值：直接修改 player.x
```

### 3.2 执行前置条件

| 条件 | 检查方式 | 不满足时行为 |
|------|---------|------------|
| 游戏未暂停 | `gamePaused !== true` | 提前 return，player.x 不变 |
| 游戏未结束 | `gameOverFlag !== true` | 提前 return（gameLoop 已在入口处 return，此处为双重保护） |
| 波次活跃或间隔中 | `game.waveActive === true` OR（弹窗未显示） | 弹窗期间：仅当 `game.waveActive === false` 时禁止移动（见决策 4） |

> **弹窗期间控制说明（decision.md 决策 4）**：波次结算弹窗显示期间 `game.waveActive = false` 且 `gamePaused = false`，通过在守卫条件中检查 `!game.waveActive` 实现禁止移动。

### 3.3 完整伪代码

```
FUNCTION updatePlayerPosition():
    // ── 守卫条件（提前返回） ──────────────────────────────────
    IF gamePaused IS true THEN
        RETURN                          // REQ-PLAYER-005
    END IF

    IF gameOverFlag IS true THEN
        RETURN                          // REQ-PLAYER-006（双重保护）
    END IF

    IF game.waveActive IS false THEN
        RETURN                          // decision.md 决策 4：弹窗期间禁止移动
    END IF

    // ── 双键同时按住检测（决策 3） ───────────────────────────
    IF keys.ArrowLeft IS true AND keys.ArrowRight IS true THEN
        RETURN                          // BS-007：速度抵消，不移动
    END IF

    // ── 速度值（带防御性默认值） ─────────────────────────────
    DECLARE speed = player.speed OR 5   // BS-008：防御 undefined

    // ── NaN 防御（BS-009） ───────────────────────────────────
    IF isNaN(player.x) IS true THEN
        SET player.x = canvas.width / 2  // 重置为初始值 450
        RETURN
    END IF

    // ── 位置计算 ─────────────────────────────────────────────
    DECLARE newX = player.x

    IF keys.ArrowLeft IS true THEN
        SET newX = player.x - speed     // REQ-PLAYER-001：向左移动
    ELSE IF keys.ArrowRight IS true THEN
        SET newX = player.x + speed     // REQ-PLAYER-002：向右移动
    END IF

    // ── 边界钳制（REQ-PLAYER-004） ───────────────────────────
    // 边界来源：canvas.width/2 ± GAME_CONSTANTS.ROAD_WIDTH = 150 / 750
    DECLARE leftBound  = canvas.width / 2 - GAME_CONSTANTS.ROAD_WIDTH  // = 150
    DECLARE rightBound = canvas.width / 2 + GAME_CONSTANTS.ROAD_WIDTH  // = 750

    SET player.x = Math.max(leftBound, Math.min(rightBound, newX))

END FUNCTION
```

### 3.4 逻辑流程图

```
updatePlayerPosition()
        |
        v
    gamePaused? ──yes──> RETURN
        |no
        v
  gameOverFlag? ──yes──> RETURN
        |no
        v
  !game.waveActive? ──yes──> RETURN
        |no
        v
  Left AND Right? ──yes──> RETURN（速度抵消）
        |no
        v
  isNaN(player.x)? ──yes──> player.x = 450, RETURN
        |no
        v
  speed = player.speed || 5
        |
        v
  Left only? ──yes──> newX = player.x - speed
        |no
        v
  Right only? ──yes──> newX = player.x + speed
        |no (无键按住)
        v
  newX = player.x（不变）
        |
        v
  player.x = clamp(newX, 150, 750)
        |
        v
      END
```

### 3.5 边界钳制行为验证表

| 场景 | 初始 player.x | 按键 | speed | newX（计算后） | 钳制后 player.x | 关联需求 |
|------|-------------|------|-------|-------------|----------------|---------|
| 正常左移 | 450 | Left | 5 | 445 | 445 | REQ-001 |
| 正常右移 | 450 | Right | 5 | 455 | 455 | REQ-002 |
| 左越界钳制 | 152 | Left | 5 | 147 | 150 | REQ-004, BS-003 |
| 右越界钳制 | 748 | Right | 5 | 753 | 750 | REQ-004, BS-004 |
| 精确左边界不变 | 150 | Left | 5 | 145 | 150 | REQ-004, BS-001 |
| 精确右边界不变 | 750 | Right | 5 | 755 | 750 | REQ-004, BS-002 |
| 双键同时 | 450 | Left+Right | 5 | (跳过) | 450 | BS-007 |
| 暂停 | 450 | Left | 5 | (跳过) | 450 | REQ-005 |

---

## 4. 事件监听设计

### 4.1 keydown 监听（新增方向键处理）

**实现方案**：选项 B（独立监听，职责单一，便于单独测试）

```
// 方向键状态监听 — 独立注册（与 Escape 监听并列）
document.addEventListener('keydown', FUNCTION(e):
    IF e.key === 'ArrowLeft' THEN
        SET keys.ArrowLeft = true
    END IF
    IF e.key === 'ArrowRight' THEN
        SET keys.ArrowRight = true
    END IF
END FUNCTION)
```

### 4.2 keyup 监听（新增）

```
document.addEventListener('keyup', FUNCTION(e):
    IF e.key === 'ArrowLeft' THEN
        SET keys.ArrowLeft = false    // REQ-PLAYER-003：松键立即停止
    END IF
    IF e.key === 'ArrowRight' THEN
        SET keys.ArrowRight = false   // REQ-PLAYER-003：松键立即停止
    END IF
END FUNCTION)
```

**注意**：`keydown` 事件在 OS 按键重复模式下会多次触发，但因 `keys.ArrowLeft` 已经是 `true`，重复设 `true` 无副作用（BS-010 自动满足）。

---

## 5. gameLoop 插入点说明

### 5.1 调用位置（来源：impact.md §4.1 触点 1）

当前 `game.js:1104-1105`：
```
drawPlayer();
autoFire(time);
```

变更后：
```
updatePlayerPosition();   // [新增] — 在 drawPlayer() 之前
drawPlayer();
autoFire(time);
```

### 5.2 调用顺序保证（REQ-PLAYER-007 + REQ-PLAYER-008）

| 步骤 | 函数 | 说明 |
|------|------|------|
| 1 | `updatePlayerPosition()` | 更新 `player.x` 到当前帧最终值 |
| 2 | `drawPlayer()` | 以更新后的 `player.x` 为中心绘制战士，位置同步 |
| 3 | `autoFire(time)` | 创建 `Bullet` 对象时 `this.x = player.x`，子弹起点 = 更新后坐标（REQ-008 自动满足） |

**关键约束**：`updatePlayerPosition()` 不能插入到 `autoFire()` 之后，否则子弹起点将落后一帧（位置与渲染不一致）。

### 5.3 gamePaused 状态保护（REQ-PLAYER-005）

`game.js:1041-1044` 中 `gamePaused = true` 时 `gameLoop` 提前 return，整个函数体（含 `updatePlayerPosition()`）不执行。`updatePlayerPosition()` 内部的 `gamePaused` 守卫为双重保护（防御性设计，应对未来 gameLoop 结构调整）。

---

## 6. 错误处理设计

### 6.1 适用错误场景（纯前端游戏，无存储/网络错误）

| 错误场景 | 处理策略 | 实现位置 |
|---------|---------|---------|
| `player.speed` 未定义（undefined） | `player.speed || 5` 提供默认值 | `updatePlayerPosition()` 内部，BS-008 |
| `player.x` 变为 NaN（BS-009） | `isNaN` 检查，重置为 450 | `updatePlayerPosition()` 内部 |
| 游戏暂停时按方向键 | `gamePaused` 守卫，无视觉反馈，符合预期 | `updatePlayerPosition()` 守卫条件 |
| 游戏结束时按方向键 | `gameOverFlag` 守卫 + gameLoop 已 return | `updatePlayerPosition()` 守卫条件 |
| 同时按住双方向键 | 速度抵消，不移动 | `updatePlayerPosition()` 双键检测 |

### 6.2 错误码适配（来源：error-strategy.md）

本模块为纯游戏逻辑，无需使用 error-strategy.md 中的 UI/BIZ/STOR 等错误码体系（该体系针对武器系统的存储和合成逻辑）。移动控制错误均为静默处理（守卫条件 + 防御性重置），不展示 Toast 或弹窗。

---

## 7. 非功能性设计约束

### 7.1 性能约束（REQ-PLAYER-010）

`updatePlayerPosition()` 的计算复杂度为 O(1)，包含：
- 4 次条件判断（守卫条件）
- 1 次 `isNaN` 检查
- 最多 2 次算术运算（减法或加法、`Math.max/Math.min`）
- 零次 DOM 操作、零次 localStorage 访问

理论单帧增量 << 0.1ms，远低于 1ms 预算（REQ-PLAYER-010）。

验收方法：`performance.now()` 在 `updatePlayerPosition()` 前后计时，抽样 100 帧取平均值。

### 7.2 模块隔离约束（REQ-PLAYER-011）

变更仅发生在 `game.js`：
- 新增：`keys` 变量声明、`player.speed` 字段、`updatePlayerPosition()` 函数、两个事件监听
- 修改：`gameLoop` 中新增一行调用
- 不修改：`weaponManager.js`、`weaponUI.js`、`weaponWaveSelect.js` 的任何内容

---

## 8. 设计决策记录

| 编号 | 决策 | 选择 | 依据 |
|------|------|------|------|
| DD-001 | 按键状态存储方式 | `keys` 状态对象 + 逐帧轮询 | 消除 OS 按键重复延迟，实现连续平滑移动（decision.md 决策 1） |
| DD-002 | 边界常量来源 | `GAME_CONSTANTS.ROAD_WIDTH` 推导（150/750） | 单一事实来源，避免魔法数字（decision.md 决策 2） |
| DD-003 | 双键冲突 | 同时按住时不移动 | 语义明确，实现简单（decision.md 决策 3，BS-007） |
| DD-004 | 弹窗期间控制 | `!game.waveActive` 守卫 | 弹窗期间允许移动无意义（decision.md 决策 4，BS-011） |
| DD-005 | speed 位置 | `player` 对象属性 | 语义归属正确，便于未来动态修改（decision.md 决策 5） |
| DD-006 | 事件监听方案 | 选项 B（独立 keydown/keyup 监听） | 职责单一，便于独立测试（impact.md §4.2 触点 2） |
| DD-007 | NaN 防御 | `isNaN` 检查 + 重置为 450 | 防御性编程，保护子弹起点不为 NaN（L0 需求 §6.2） |

---

## 9. 风险与待确认项

| 编号 | 问题 | 决策状态 | 影响 |
|------|------|---------|------|
| Q-001 | player.speed 具体值 | 已定：5 px/帧（decision.md 决策 5） | 无 |
| Q-002 | player.speed 放置位置 | 已定：player 对象属性（decision.md 决策 5） | 无 |
| Q-003 | 双键同时按住行为 | 已定：不移动（decision.md 决策 3） | 无 |
| Q-004 | 弹窗期间移动控制 | 已定：禁止移动，`!game.waveActive` 守卫（decision.md 决策 4） | 无 |
| Q-005 | 子弹轨迹漂移（Bullet.draw() game.js:781） | 待 L3 目视验证，若视觉可接受则不修改；否则 Bullet 构造函数记录 `this.startX = player.x`，draw() 改用 `this.startX` | 视觉瑕疵，不影响碰撞判定 |
| Q-006 | tests/game.e2e.js:87 断言 player.x === 450 | 待 L3 实现后运行 `npx jest` 验证；若测试未触发移动则初始值仍为 450，断言可保留 | 测试断言可能失效 |

---

## 10. 跨领域一致性验证（简化版）

> 本变更为纯前端 Canvas 游戏，无 HTTP 接口、无数据库，不适用完整的 CFL-01~18 冲突检测规则（该规则针对多专家协作场景）。以下执行适用的检测维度：

| 维度 | 结论 | 说明 |
|------|------|------|
| 命名一致性（CFL-01） | PASS | `keys`、`player.speed`、`updatePlayerPosition` 命名与 L0/L1 文档一致 |
| 类型一致性（CFL-02） | PASS | `player.x`、`player.speed` 均为 Number，`keys.ArrowLeft/Right` 为 Boolean |
| 状态机一致性（CFL-03） | PASS | gamePaused/gameOverFlag/waveActive 状态矩阵与 L0 §6.3 完全一致 |
| 边界值一致性（CFL-04） | PASS | 150/750 由 GAME_CONSTANTS.ROAD_WIDTH=300 推导，与 L0 §1.3 一致 |
| 调用顺序一致性（CFL-07） | PASS | updatePlayerPosition → drawPlayer → autoFire，满足 REQ-007 和 REQ-008 |
| 模块隔离（CFL-11） | PASS | 不修改 weapon*.js 文件，满足 REQ-011 |
| 错误处理（CFL-08） | PASS | NaN 防御 + gamePaused/gameOverFlag 守卫覆盖所有边界场景 |

**结论**：无跨专家冲突（简单模式，单一协调者设计）。

---

## 11. 实现指引摘要（L3 参考）

### 实现步骤（game.js 变更清单）

1. 在 `player` 对象中新增 `speed: 5` 字段（`player` 对象内，约第 106 行之前插入）
2. 在 `player` 对象定义之后声明 `const keys = { ArrowLeft: false, ArrowRight: false };`
3. 在 `game.js:1017` 附近（现有 keydown 监听之后）新增独立的 `keydown` 和 `keyup` 监听
4. 在 `const defenderTypes` 之前或 `gameLoop` 之前实现 `updatePlayerPosition()` 函数体
5. 在 `game.js` 的 `gameLoop` 函数体中，找到 `drawPlayer();` 这一行，在其正上方插入 `updatePlayerPosition();`

### 关键代码位置（以 game.js 当前行号为准）

| 位置 | 行号（近似） | 操作 |
|------|------------|------|
| player 对象 | 93-107 | 新增 `speed: 5` |
| player 对象之后 | ~108 | 新增 `const keys` 声明 |
| keydown 监听之后 | ~1024 | 新增方向键 keydown/keyup 监听 |
| drawPlayer() 之前 | ~1104 | 插入 `updatePlayerPosition()` 调用 |
