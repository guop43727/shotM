---
task_id: "REQ-PLAYER-001"
title: "玩家战士左右移动控制"
type: "功能需求"
version: "1.0"
date: "2026-04-02"
author: "analyst-agent"
status: "draft"
priority: "high"
module: "PLAYER"
related_changes:
  - "weapon-evolution-system"
tags:
  - "player"
  - "movement"
  - "keyboard-control"
  - "canvas"
---

# 玩家战士左右移动控制

> **首次 PLAYER 模块需求。** `hhspec/specs/requirements/` 目录下无已有 PLAYER 模块规范，本文档为该模块首批需求。

## 1. 概述

### 1.1 背景与动机

**用户原文引用：**
> "玩家按 ← 左方向键时战士向左移动，玩家按 → 右方向键时战士向右移动，移动边界：x: 150~750（道路宽度内），移动中持续射击（不中断自动射击逻辑），松开按键时停止移动"

**代码证据（`game.js:93-107`）：**
```
const player = {
    x: canvas.width / 2,   // 固定在 450
    y: canvas.height - 120, // 固定在 580
    ...
}
```

当前 `player.x` 硬编码为 `canvas.width / 2 = 450`，没有任何按键监听响应移动。`game.js:1017-1023` 仅注册了 `Escape` 键用于暂停/恢复，不存在方向键处理逻辑。

**动机：** 战士固定位置使玩家无法主动操控，缺少基本的游戏互动性。添加左右移动能力可让玩家主动规避、对位敌人，提升游戏操控感。

### 1.2 目标用户

- 正在游戏波次中的玩家（`game.waveActive = true` 时可移动；波次间隔期 waveActive=false 时移动被暂时禁止，见 §6.3 和 Q-004 决策）

### 1.3 范围

**In Scope：**
- 注册 `keydown` / `keyup` 事件监听 `ArrowLeft`、`ArrowRight` 键
- 每帧根据按键状态更新 `player.x`，实现平滑移动
- 移动边界钳制：`player.x` 限制在 `[150, 750]` 范围内
- 游戏暂停（`gamePaused = true`）时跳过位置更新
- 游戏结束（`gameOverFlag = true`）时跳过位置更新
- 子弹发射起点自动跟随更新后的 `player.x`（`Bullet` 构造函数已使用 `player.x`，无需额外修改）

**Out of Scope：**
- 纵向移动（上下）
- 触屏/鼠标控制
- 武器系统逻辑修改（`weaponManager.js`、`weaponUI.js`、`weaponWaveSelect.js` 不受影响）
- 移动动画（战士绘制逻辑 `drawCyberSoldier` 不修改）
- 网络/多人同步

---

## 2. 用户故事

- **US-001**：作为玩家，我希望按住 ← 键时战士向左平滑移动，以便主动规避右侧敌人或对位左侧目标。
- **US-002**：作为玩家，我希望按住 → 键时战士向右平滑移动，以便主动规避左侧敌人或对位右侧目标。
- **US-003**：作为玩家，我希望战士在移动过程中持续自动射击，以便移动与输出同时进行，不损失战斗效率。
- **US-004**：作为玩家，我希望战士在移动到道路边界时自动停止越界，以便不产生视觉错位或穿墙问题。
- **US-005**：作为玩家，我希望游戏暂停时战士停止移动，以便暂停状态下的游戏世界保持静止。
- **US-006**：作为玩家，我希望松开方向键后战士立即停止移动，以便精确控制站位。

---

## 3. 系统需求（EARS 格式）

### 3.1 功能需求

**REQ-PLAYER-001**：当玩家按下 `ArrowLeft` 键时，系统应将 `player.x` 以 `player.speed` 像素每帧的速率向左减少，直至 `player.x` 到达左边界 `150`。

**REQ-PLAYER-002**：当玩家按下 `ArrowRight` 键时，系统应将 `player.x` 以 `player.speed` 像素每帧的速率向右增加，直至 `player.x` 到达右边界 `750`。

**REQ-PLAYER-003**：当玩家松开 `ArrowLeft` 或 `ArrowRight` 键时，系统应立即停止对应方向的位置更新。

**REQ-PLAYER-004**：在持续状态下 `player.x` 超出范围 `[150, 750]` 时，系统应将 `player.x` 钳制到最近的边界值（`150` 或 `750`）。

**REQ-PLAYER-005**：当 `gamePaused` 为 `true` 时，系统应跳过 `player.x` 的移动更新，不改变战士位置。

**REQ-PLAYER-006**：当 `gameOverFlag` 为 `true` 时，系统应跳过 `player.x` 的移动更新，不改变战士位置。

**REQ-PLAYER-007**：在 `gameLoop` 的每一帧，系统应在调用 `drawPlayer()` 之前根据当前按键状态更新 `player.x`，保证渲染与位置同步。

**REQ-PLAYER-008**：当 `Bullet` 对象创建时，系统应使用当前帧的 `player.x` 作为子弹初始 x 坐标，保证子弹起点跟随战士位置。

> **注：REQ-PLAYER-008 为推断需求。** 代码 `game.js:769` `this.x = player.x` 已在构造函数中读取当前 `player.x`，只要 `player.x` 在 `autoFire` 调用前已更新（`gameLoop` 顺序：更新位置 -> `drawPlayer` -> `autoFire`），该行为自动满足，无需额外修改。此条需求用于追溯验证，不要求新增代码。

### 3.2 非功能需求

**REQ-PLAYER-010**：系统应保证移动逻辑在 `gameLoop` 的单帧处理时间内完成，不引入超过 `1ms` 的额外帧耗时（Canvas 60fps 渲染预算约 16.7ms/帧）。

**REQ-PLAYER-011**：系统应保证移动控制代码不修改 `weaponManager.js`、`weaponUI.js`、`weaponWaveSelect.js` 中的任何函数签名或对象结构。

---

## 4. 验收标准（Gherkin 格式）

```gherkin
Feature: 玩家战士左右移动控制
  作为玩家
  我希望通过方向键控制战士左右移动
  以便在游戏中主动操控战士位置

  # ----- US-001 / REQ-PLAYER-001 -----

  Scenario: 按住左方向键_游戏进行中_战士向左移动
    # REQ-PLAYER-001
    Given 游戏处于进行中状态（gamePaused = false, gameOverFlag = false）
    And player.x 为 450
    And player.speed 为 5
    When 玩家按住 ArrowLeft 键，游戏循环执行 1 帧
    Then player.x 变为 445

  Scenario: 按住左方向键_到达左边界_战士停在边界
    # REQ-PLAYER-001, REQ-PLAYER-004
    Given 游戏处于进行中状态
    And player.x 为 152
    And player.speed 为 5
    When 玩家按住 ArrowLeft 键，游戏循环执行 1 帧
    Then player.x 为 150（被钳制，不低于左边界）

  # ----- US-002 / REQ-PLAYER-002 -----

  Scenario: 按住右方向键_游戏进行中_战士向右移动
    # REQ-PLAYER-002
    Given 游戏处于进行中状态
    And player.x 为 450
    And player.speed 为 5
    When 玩家按住 ArrowRight 键，游戏循环执行 1 帧
    Then player.x 变为 455

  Scenario: 按住右方向键_到达右边界_战士停在边界
    # REQ-PLAYER-002, REQ-PLAYER-004
    Given 游戏处于进行中状态
    And player.x 为 748
    And player.speed 为 5
    When 玩家按住 ArrowRight 键，游戏循环执行 1 帧
    Then player.x 为 750（被钳制，不超过右边界）

  # ----- US-003 / REQ-PLAYER-007 + REQ-PLAYER-008 -----

  Scenario: 移动中有敌人_自动射击不中断_子弹起点跟随战士
    # REQ-PLAYER-007, REQ-PLAYER-008
    Given 游戏进行中，player.x 为 450
    And game.enemies 中有至少 1 个 hp > 0 且 z > 0.2 的敌人
    And player.weapon.lastFire 距当前帧超过 player.weapon.fireRate 毫秒
    When 玩家按住 ArrowRight 键，游戏循环执行 1 帧（player.x 更新为 455）
    Then game.bullets 中新增至少 1 颗子弹
    And 新子弹的 x 初始坐标为 455（等于更新后的 player.x）

  # ----- US-004 / REQ-PLAYER-004 -----

  Scenario: 精确在左边界_继续按左键_x不变
    # REQ-PLAYER-004
    Given 游戏进行中，player.x 为 150
    When 玩家按住 ArrowLeft 键，游戏循环执行 3 帧
    Then player.x 保持为 150

  Scenario: 精确在右边界_继续按右键_x不变
    # REQ-PLAYER-004
    Given 游戏进行中，player.x 为 750
    When 玩家按住 ArrowRight 键，游戏循环执行 3 帧
    Then player.x 保持为 750

  # ----- US-005 / REQ-PLAYER-005 -----

  Scenario: 游戏暂停时按方向键_战士不移动
    # REQ-PLAYER-005
    Given gamePaused = true
    And player.x 为 450
    When 玩家按住 ArrowLeft 键，gamePaused 状态持续 5 帧
    Then player.x 保持为 450

  # ----- US-006 / REQ-PLAYER-003 -----

  Scenario: 松开左方向键_战士立即停止
    # REQ-PLAYER-003
    Given 游戏进行中，player.x 为 430，左键已按住
    When 玩家松开 ArrowLeft 键，游戏循环执行 3 帧
    Then player.x 保持为 430（不继续左移）

  Scenario: 松开右方向键_战士立即停止
    # REQ-PLAYER-003
    Given 游戏进行中，player.x 为 470，右键已按住
    When 玩家松开 ArrowRight 键，游戏循环执行 3 帧
    Then player.x 保持为 470（不继续右移）

  # ----- REQ-PLAYER-006 -----

  Scenario: 游戏结束后按方向键_战士不移动
    # REQ-PLAYER-006
    Given gameOverFlag = true
    And player.x 为 450
    When 玩家按住 ArrowRight 键
    Then player.x 保持为 450
```

---

## 5. 边界场景清单

| 编号 | 类别 | 场景描述 | 关联需求 | 预期行为 |
|------|------|----------|----------|----------|
| BS-001 | 极值 | `player.x` 在左边界精确值 `150`，继续按左键 | REQ-PLAYER-001, REQ-PLAYER-004 | `player.x` 被钳制保持 `150`，不变为 `145` |
| BS-002 | 极值 | `player.x` 在右边界精确值 `750`，继续按右键 | REQ-PLAYER-002, REQ-PLAYER-004 | `player.x` 被钳制保持 `750`，不变为 `755` |
| BS-003 | 极值 | `player.x` 初始在 `152`，`player.speed = 5`，按左键 1 帧，结果为 `147`，低于边界 | REQ-PLAYER-004 | 钳制后 `player.x = 150`，不允许出现 `147` |
| BS-004 | 极值 | `player.x` 初始在 `748`，`player.speed = 5`，按右键 1 帧，结果为 `753`，超过边界 | REQ-PLAYER-004 | 钳制后 `player.x = 750`，不允许出现 `753` |
| BS-005 | 状态流转 | 游戏运行 -> 按 Escape 暂停 -> 继续按住方向键 -> 取消暂停 | REQ-PLAYER-005, REQ-PLAYER-001 | 暂停期间 `player.x` 不变；取消暂停后，若 `waveActive=true`（波次进行中）则恢复移动；若 `waveActive=false`（波次间隔）则仍被 `!waveActive` 守卫阻止，不移动 |
| BS-006 | 状态流转 | 游戏运行 -> 触发 GameOver -> 在 GameOver 界面按方向键 | REQ-PLAYER-006 | `player.x` 不变；`gameLoop` 已返回，移动逻辑不执行 |
| BS-007 | 状态流转 | 同时按住 ArrowLeft 和 ArrowRight | REQ-PLAYER-001, REQ-PLAYER-002 | 两个方向键同时激活时，左右抵消或以最后按下的键为准（由实现定义，需在实现阶段确认优先级规则，详见 Q-003） |
| BS-008 | 空值 | `player.speed` 未定义（undefined）时按下方向键 | REQ-PLAYER-001 | 系统应有默认速度值（建议 `5` px/帧），不产生 `NaN`，不导致 `player.x` 变为 `NaN` |
| BS-009 | 数据完整性 | 移动后 `player.x = NaN`（因某错误） | REQ-PLAYER-004 | 子弹 `Bullet` 构造函数读取 `player.x`，若为 `NaN` 则子弹起点为 `NaN`，需在钳制逻辑中防御性检查 |
| BS-010 | 并发 | `keydown` 事件在 `gameLoop` 帧内触发多次（键盘重复触发） | REQ-PLAYER-001, REQ-PLAYER-002 | 移动量以帧为单位计算（每帧移动一次 `player.speed`），`keydown` 重复触发不导致一帧内多次累加 |
| BS-011 | 权限 | 弹窗（wave-clear modal）显示时按方向键 | REQ-PLAYER-005 | 波次结算弹窗期间 `game.waveActive = false`，`!waveActive` 守卫（DD-004，Q-004 已决策）阻止移动。`player.x` 不变。 |
| BS-012 | 网络 | 不涉及网络 | - | 本功能纯前端，无网络边界 |

---

## 6. UI 交互流程

### 6.1 成功路径

```
[游戏进行中，战士在 x=450] --玩家按住 ArrowLeft--> [每帧 player.x -= speed，战士向左渲染] --player.x 到达 150--> [战士停在 x=150，继续自动射击]
```

1. 玩家在游戏画面中按住 `ArrowLeft` 键（`keydown` 事件触发，`keys.ArrowLeft = true`）
2. 系统在当前帧 `gameLoop` 调用 `drawPlayer()` 之前执行 `updatePlayerPosition()`
3. `player.x` 减少 `player.speed` 像素，渲染时战士绘制在新坐标
4. 上述循环每帧重复，战士平滑左移
5. 当 `player.x - speed < 150` 时，`player.x` 被钳制为 `150`
6. 玩家松开 `ArrowLeft` 键（`keyup` 事件触发，`keys.ArrowLeft = false`），战士立即停止

同样路径适用于 `ArrowRight` / 右移，边界为 `750`。

### 6.2 错误路径

| 触发条件 | 系统反馈 | 用户恢复操作 |
|----------|----------|--------------|
| `player.x` 因数值计算异常变为 `NaN` | 边界钳制逻辑应检测 `isNaN(player.x)`，重置为初始值 `450` | 无需用户操作，系统自动修复 |
| 游戏暂停时误按方向键 | 位置不变，无视觉反馈（符合预期：暂停状态） | 玩家按 Escape 取消暂停后再移动 |
| GameOver 状态按方向键 | 位置不变，`gameLoop` 已停止，事件监听虽存在但移动逻辑不执行 | 无，GameOver 为终态 |

### 6.3 状态矩阵

| 状态 | `player.x` 可变 | ArrowLeft 有效 | ArrowRight 有效 | autoFire 执行 |
|------|-----------------|----------------|-----------------|---------------|
| 游戏进行中（waveActive=true） | 是 | 是 | 是 | 是 |
| 波次间隔（waveActive=false，未暂停） | 否 | 否 | 否 | 否（无敌人） |
| 游戏暂停（gamePaused=true） | 否 | 否 | 否 | 否 |
| 游戏结束（gameOverFlag=true） | 否 | 否 | 否 | 否 |
| 波次结算弹窗显示中 | 否（`!waveActive` 守卫，Q-004 已决策） | 否 | 否 | 否 |

---

## 7. 验收策略

### 7.1 验收方法

```yaml
acceptance_strategy:
  type: functional
  method: gherkin_execution
  verification_steps:
    - "L2 产出测试骨架 -> L3 填充实现 -> L4 自动执行"
    - "所有 Gherkin 场景（12 个 Scenario）PASS -> 通过"
    - "边界场景覆盖率 >= BS-001 至 BS-011 中适用项全部验证"
```

### 7.2 覆盖度清单（字段级穷举）

```yaml
coverage_checklist:
  requirement_coverage:
    - req: "REQ-PLAYER-001"
      scenarios: ["按住左方向键_游戏进行中_战士向左移动", "按住左方向键_到达左边界_战士停在边界"]
    - req: "REQ-PLAYER-002"
      scenarios: ["按住右方向键_游戏进行中_战士向右移动", "按住右方向键_到达右边界_战士停在边界"]
    - req: "REQ-PLAYER-003"
      scenarios: ["松开左方向键_战士立即停止", "松开右方向键_战士立即停止"]
    - req: "REQ-PLAYER-004"
      scenarios: ["按住左方向键_到达左边界_战士停在边界", "精确在左边界_继续按左键_x不变",
                  "按住右方向键_到达右边界_战士停在边界", "精确在右边界_继续按右键_x不变",
                  "BS-003（越界钳制）", "BS-004（越界钳制）"]
    - req: "REQ-PLAYER-005"
      scenarios: ["游戏暂停时按方向键_战士不移动"]
    - req: "REQ-PLAYER-006"
      scenarios: ["游戏结束后按方向键_战士不移动"]
    - req: "REQ-PLAYER-007"
      scenarios: ["移动中有敌人_自动射击不中断_子弹起点跟随战士"]
    - req: "REQ-PLAYER-008"
      scenarios: ["移动中有敌人_自动射击不中断_子弹起点跟随战士"]

  path_coverage:
    - path: "左移正常路径（x > 150）"
      covered_by: "REQ-PLAYER-001 Scenario 1"
    - path: "左移到达边界路径（x 钳制到 150）"
      covered_by: "REQ-PLAYER-001 Scenario 2, BS-001, BS-003"
    - path: "右移正常路径（x < 750）"
      covered_by: "REQ-PLAYER-002 Scenario 1"
    - path: "右移到达边界路径（x 钳制到 750）"
      covered_by: "REQ-PLAYER-002 Scenario 2, BS-002, BS-004"
    - path: "松开键停止路径"
      covered_by: "REQ-PLAYER-003 Scenario 1+2"
    - path: "暂停状态不移动路径"
      covered_by: "REQ-PLAYER-005 Scenario"
    - path: "GameOver 状态不移动路径"
      covered_by: "REQ-PLAYER-006 Scenario"
    - path: "移动时子弹起点更新路径"
      covered_by: "REQ-PLAYER-007+008 Scenario"

  field_coverage:
    entity: "player 对象（game.js:93-107）"
    fields:
      - field: "player.x"
        type: "Number"
        range: "[150, 750]"
        initial_value: "450 (canvas.width/2)"
        update_rule: "每帧 += speed（右）或 -= speed（左），钳制到 [150, 750]"
        validation: "isNaN 检查；边界钳制 Math.max(150, Math.min(750, newX))"
        display_format: "不直接显示，通过 drawPlayer() 中 startX 计算影响绘制坐标"
        test_values:
          - "初始值 450"
          - "左边界精确值 150"
          - "右边界精确值 750"
          - "左边界减 1 即 149（应被钳制为 150）"
          - "右边界加 1 即 751（应被钳制为 750）"
          - "NaN（应被重置为 450）"
      - field: "player.y"
        type: "Number"
        range: "固定值 580"
        update_rule: "本需求不修改"
        validation: "不涉及"
      - field: "player.speed"
        type: "Number（新增字段）"
        range: "正整数，建议 5 px/帧"
        initial_value: "待实现阶段定义（见 Q-001）"
        validation: "undefined 时使用默认值 5，不允许为 0 或负数"
      - field: "player.count"
        type: "Number"
        range: ">= 1"
        update_rule: "本需求不修改"
      - field: "player.weapon.lastFire"
        type: "Number（DOMHighResTimeStamp）"
        update_rule: "autoFire 更新，本需求不修改"
      - field: "player.weapon.fireRate"
        type: "Number（ms）"
        update_rule: "本需求不修改"
      - field: "player.weapon.damage"
        type: "Number"
        update_rule: "本需求不修改"
      - field: "player.weapon.bulletCount"
        type: "Number"
        update_rule: "本需求不修改"

    entity: "keys 状态对象（新增）"
    fields:
      - field: "keys.ArrowLeft"
        type: "Boolean"
        initial_value: "false"
        set_to_true: "keydown 事件 e.key === 'ArrowLeft'"
        set_to_false: "keyup 事件 e.key === 'ArrowLeft'"
        scope: "模块级变量，在 game.js 中声明"
      - field: "keys.ArrowRight"
        type: "Boolean"
        initial_value: "false"
        set_to_true: "keydown 事件 e.key === 'ArrowRight'"
        set_to_false: "keyup 事件 e.key === 'ArrowRight'"
        scope: "模块级变量，在 game.js 中声明"

    entity: "Bullet 对象（game.js:767-841）"
    fields:
      - field: "Bullet.x（构造时 this.x = player.x）"
        type: "Number"
        dependency: "在 autoFire 调用时（gameLoop 中 drawPlayer 之后）读取 player.x"
        verification: "需确认 updatePlayerPosition 在 autoFire 之前执行（gameLoop 调用顺序）"
        expected: "Bullet.x === 移动后的 player.x"

  boundary_scenario_coverage:
    - category: "空值"
      item: "player.speed 未定义"
      covered_by: "BS-008"
      status: "需实现防御性默认值"
    - category: "极值"
      item: "左边界精确值 150"
      covered_by: "BS-001, Scenario 精确在左边界"
    - category: "极值"
      item: "右边界精确值 750"
      covered_by: "BS-002, Scenario 精确在右边界"
    - category: "极值"
      item: "单帧越过边界（speed > 剩余距离）"
      covered_by: "BS-003, BS-004, Scenario 左边界/右边界"
    - category: "并发"
      item: "keydown 重复触发（OS 键盘重复率）"
      covered_by: "BS-010"
      status: "通过逐帧更新而非事件累加规避"
    - category: "权限"
      item: "暂停状态移动无效"
      covered_by: "BS-005, Scenario 游戏暂停时按方向键"
    - category: "权限"
      item: "GameOver 状态移动无效"
      covered_by: "BS-006, Scenario 游戏结束后按方向键"
    - category: "网络"
      item: "不适用（纯前端）"
      covered_by: "BS-012"
      status: "跳过"
    - category: "数据完整性"
      item: "player.x 变为 NaN 防御"
      covered_by: "BS-009"
      status: "需实现 isNaN 检查"
    - category: "状态流转"
      item: "暂停->取消暂停->继续移动"
      covered_by: "BS-005"
    - category: "状态流转"
      item: "运行->GameOver->移动无效"
      covered_by: "BS-006"
    - category: "状态流转"
      item: "左右键同时按住"
      covered_by: "BS-007"
      status: "待确认优先级规则（见 Q-003）"
```

### 7.3 基线数据

本需求为纯新增功能，无性能基线测量需求。`REQ-PLAYER-010` 要求每帧增量 <= 1ms，验收时通过 `performance.now()` 在 `updatePlayerPosition` 前后计时，在 60fps 场景下抽样 100 帧，确认平均增量 <= 1ms。

### 7.4 原型引用

无视觉设计稿。战士绘制逻辑（`drawCyberSoldier`）不修改，移动效果为战士整体 x 坐标平移，无动画设计要求。

---

## 8. 不确定性与待确认项

| 编号 | 问题 | 影响范围 | 建议 |
|------|------|----------|------|
| Q-001 | `player.speed` 的具体像素值未指定（用户未给出） | REQ-PLAYER-001, REQ-PLAYER-002；直接影响移动手感 | 建议默认值为 `5` px/帧（60fps 下约 300px/s，从中心点到边界约 1 秒），由实现阶段开发者验证手感后可调整 |
| Q-002 | `player.speed` 是否应作为 `player` 对象的属性还是模块常量 | 代码结构；影响是否可被外部（如武器系统、数字门）动态修改 | 建议加入 `GAME_CONSTANTS` 或 `player` 对象；若无动态修改需求则用模块常量 |
| Q-003 | 同时按住 ArrowLeft 和 ArrowRight 时的行为未定义 | BS-007；影响操控体验 | 建议：两键同时按住时战士不移动（速度抵消为 0）；实现简单且符合格斗游戏惯例 |
| Q-004 | 波次结算弹窗（`waveclear-modal`）显示期间是否允许移动 | BS-011；`gamePaused` 此时为 `false`，但游戏逻辑实质上暂停 | 建议：弹窗显示期间禁止移动，通过检测 `waveclear-modal` 可见性或新增 `gameBlocked` 标志实现；需用户确认 |
| Q-005 | `player.speed` 是否随 `player.count` 缩放（战士数量越多移动越慢） | REQ-PLAYER-001, REQ-PLAYER-002；影响游戏平衡性 | 用户需求原文未提及，建议初版不缩放；后续可作为独立平衡性需求迭代 |

---

## 9. 术语表

| 术语 | 定义 |
|------|------|
| `player.x` | 战士集群中心点的 Canvas x 坐标，范围 `[150, 750]` |
| `player.y` | 战士集群的 Canvas y 坐标，固定为 `canvas.height - 120 = 580`，本需求不修改 |
| `player.speed` | 每帧移动的像素数，新增字段，建议值 5 |
| `keys` | 模块级键盘状态对象 `{ ArrowLeft: boolean, ArrowRight: boolean }`，由 `keydown`/`keyup` 事件维护 |
| `gameLoop` | `requestAnimationFrame` 驱动的主循环函数（`game.js:1037`），每帧约 16.7ms |
| `gamePaused` | 布尔型全局变量，`true` 时 `gameLoop` 跳过逻辑更新（`game.js:1001`） |
| `gameOverFlag` | 布尔型全局变量，`true` 时 `gameLoop` 完全退出（`game.js:1000`） |
| `autoFire` | 自动射击函数（`game.js:844`），每帧在 `drawPlayer()` 之后调用，根据 `player.weapon.fireRate` 限速 |
| `Bullet` | 子弹类（`game.js:767`），构造时以当前 `player.x` 为起点 |
| `drawCyberSoldier` | 战士单体绘制函数（`game.js:252`），以 `(cx, cy)` 为中心绘制，不含移动逻辑 |
| `drawPlayer` | 战士集群绘制函数（`game.js:229`），根据 `player.x`、`player.count`、`PLAYER_SPACING` 排列绘制 |
| `updatePlayerPosition` | 待实现的位置更新函数，在 `gameLoop` 中 `drawPlayer` 之前调用 |
| 道路边界 | 玩家可活动的 x 坐标范围：左边界 `canvas.width/2 - ROAD_WIDTH = 150`，右边界 `canvas.width/2 + ROAD_WIDTH = 750` |
| 边界钳制 | 将数值限制在 `[min, max]` 范围内的操作：`Math.max(min, Math.min(max, value))` |

---

## 10. 自检清单执行结果

### 完整性检查
- [x] 每条用户故事都有至少一条 EARS 格式需求对应（US-001~006 -> REQ-PLAYER-001~007）
- [x] 每条功能需求都有至少一组 Gherkin 验收标准对应（12 个 Scenario 覆盖全部 REQ）
- [x] 边界场景覆盖了全部 7 个类别：空值(BS-008)/极值(BS-001~004)/并发(BS-010)/权限(BS-005,BS-006)/网络(BS-012，标注不适用)/数据完整性(BS-009)/状态流转(BS-005~007,BS-011)
- [x] UI 需求包含完整的成功路径（第 6.1 节）和错误路径（第 6.2 节）
- [x] 无混合需求拆分需求（本文档为单一功能需求）
- [x] 每条需求都有对应的验收策略（第 7 节，功能需求标准模板）
- [x] 技术优化需求不适用
- [x] UI 需求无原型，已在第 7.4 节标注
- [x] coverage_checklist 穷举到字段级别：player 对象全部字段、keys 对象全部字段、Bullet.x 字段
- [x] 状态矩阵已在第 6.3 节列出
- [x] 无导出/报表/产出物功能
- [x] 无技术优化 affected_interfaces（不适用）
- [x] field_coverage 逐字段标注了校验规则和取值范围

### 无歧义检查
- [x] 不存在模糊词："快速"、"友好"、"高效"等均未出现
- [x] 所有度量指标有具体数值：边界 150/750、帧耗时 <= 1ms
- [x] 所有状态转换有明确触发条件：`gamePaused`、`gameOverFlag` 布尔值驱动
- [x] 所有错误处理有明确类型：NaN 检测、边界钳制

### 可判定性检查
- [x] 每条验收标准只有"通过"或"不通过"（`player.x === 445` 可精确判断）
- [x] 每条验收标准可由第三方独立验证（无需主观判断，均为坐标数值比较）
- [x] Gherkin Then 步骤只描述可观察结果（`player.x 变为 445`，非"调用了某函数"）

### 一致性检查
- [x] 需求编号无重复：REQ-PLAYER-001~011（中间 009 跳过，非功能需求从 010 开始）
- [x] 同一概念统一使用术语表定义术语
- [x] 用户故事、EARS 需求、Gherkin 场景三者语义一致
- [x] 边界场景预期行为与对应 EARS 排除模式一致（BS-001 对应 REQ-PLAYER-004 钳制行为）

### 追溯性检查
- [x] 每条 Gherkin Scenario 已在注释中标注关联需求编号
- [x] 每条边界场景已在表格中标注关联需求编号
- [x] REQ-PLAYER-008 已标注为"推断需求"并附说明
