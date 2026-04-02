# PLAYER 模块测试设计详细文档

> 变更：mobile-warrior-system
> 模块：PLAYER
> 日期：2026-04-02
> 覆盖需求：REQ-PLAYER-001 ~ 011（12 个 Gherkin 场景 + 边界场景 BS-001~010）

---

## 1. 测试点清单

| 测试点 ID | 描述 | 关联需求 | 优先级 | 测试层 |
|---------|------|---------|--------|--------|
| TC-001 | 正常左移（中间位置按 ArrowLeft 1 帧） | REQ-001 | P0 | 单元 |
| TC-002 | 左移越界钳制（接近左边界时按 ArrowLeft 1 帧） | REQ-001, REQ-004 | P0 | 单元 |
| TC-003 | 正常右移（中间位置按 ArrowRight 1 帧） | REQ-002 | P0 | 单元 |
| TC-004 | 右移越界钳制（接近右边界时按 ArrowRight 1 帧） | REQ-002, REQ-004 | P0 | 单元 |
| TC-005 | 精确左边界持续按左键不越界（3 帧） | REQ-004, BS-001 | P0 | 单元 |
| TC-006 | 精确右边界持续按右键不越界（3 帧） | REQ-004, BS-002 | P0 | 单元 |
| TC-007 | 游戏暂停时按方向键 player.x 不变 | REQ-005, BS-005 | P0 | 单元 |
| TC-008 | 松开左方向键后 player.x 不继续变化 | REQ-003 | P0 | 单元 |
| TC-009 | 松开右方向键后 player.x 不继续变化 | REQ-003 | P0 | 单元 |
| TC-010 | 游戏结束后按方向键 player.x 不变 | REQ-006, BS-006 | P0 | 单元 |
| TC-011 | gameLoop 调用顺序验证（子弹起点跟随移动） | REQ-007, REQ-008 | P1 | 集成 |
| TC-012 | 双键同时按住时 player.x 不移动 | BS-007 | P1 | 单元 |
| TC-EDGE-001 | player.x 接近左边界，单帧越过（速度大于剩余距离） | REQ-004, BS-003 | P1 | 单元 |
| TC-EDGE-002 | player.x 接近右边界，单帧越过（速度大于剩余距离） | REQ-004, BS-004 | P1 | 单元 |
| TC-EDGE-003 | player.speed 未定义（undefined）时按方向键不产生 NaN | BS-008 | P1 | 单元 |
| TC-EDGE-004 | player.x 为 NaN 时调用 updatePlayerPosition()，重置为 450 | BS-009 | P1 | 单元 |
| TC-EDGE-005 | keydown 事件多次触发（模拟 OS 重复），一帧只移动一次 speed | BS-010 | P2 | 单元 |
| TC-EDGE-006 | 暂停->取消暂停->继续移动（状态流转） | BS-005 | P2 | 集成 |
| TC-PERF-001 | updatePlayerPosition() 单帧耗时 <= 1ms（抽样 100 帧） | REQ-010 | P2 | 性能 |
| TC-CONSTRAINT-001 | weaponManager.js / weaponUI.js / weaponWaveSelect.js 未被修改 | REQ-011 | P1 | 静态验证 |

---

## 2. 测试骨架（AAA 伪代码）

> **说明**：以下使用 AAA（Arrange-Act-Assert）格式的伪代码。L3 实现时使用 Jest + JSDOM 模拟 DOM 环境，不依赖真实浏览器渲染循环。

---

### TC-001：按住左方向键，游戏进行中，战士向左移动

**关联 Gherkin**：`Scenario: 按住左方向键_游戏进行中_战士向左移动`
**关联需求**：REQ-PLAYER-001

```
TEST "TC-001: 按住ArrowLeft键1帧，player.x从450变为445"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()

    // ── Assert ──
    ASSERT player.x === 445
END TEST
```

---

### TC-002：按住左方向键，接近左边界，战士停在边界

**关联 Gherkin**：`Scenario: 按住左方向键_到达左边界_战士停在边界`
**关联需求**：REQ-PLAYER-001, REQ-PLAYER-004

```
TEST "TC-002: player.x=152，按ArrowLeft，钳制后为150"
    // ── Arrange ──
    SET player.x = 152
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()
    // newX = 152 - 5 = 147，低于边界 150

    // ── Assert ──
    ASSERT player.x === 150      // 钳制后不低于左边界
END TEST
```

---

### TC-003：按住右方向键，游戏进行中，战士向右移动

**关联 Gherkin**：`Scenario: 按住右方向键_游戏进行中_战士向右移动`
**关联需求**：REQ-PLAYER-002

```
TEST "TC-003: 按住ArrowRight键1帧，player.x从450变为455"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()

    // ── Assert ──
    ASSERT player.x === 455
END TEST
```

---

### TC-004：按住右方向键，接近右边界，战士停在边界

**关联 Gherkin**：`Scenario: 按住右方向键_到达右边界_战士停在边界`
**关联需求**：REQ-PLAYER-002, REQ-PLAYER-004

```
TEST "TC-004: player.x=748，按ArrowRight，钳制后为750"
    // ── Arrange ──
    SET player.x = 748
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()
    // newX = 748 + 5 = 753，超过边界 750

    // ── Assert ──
    ASSERT player.x === 750      // 钳制后不超过右边界
END TEST
```

---

### TC-005：精确在左边界，继续按左键，x 不变

**关联 Gherkin**：`Scenario: 精确在左边界_继续按左键_x不变`
**关联需求**：REQ-PLAYER-004, BS-001

```
TEST "TC-005: player.x=150，按ArrowLeft连续3帧，player.x保持150"
    // ── Arrange ──
    SET player.x = 150
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()   // 帧 1：newX=145，钳制=150
    CALL updatePlayerPosition()   // 帧 2：newX=145，钳制=150
    CALL updatePlayerPosition()   // 帧 3：newX=145，钳制=150

    // ── Assert ──
    ASSERT player.x === 150      // 3 帧后仍在左边界
END TEST
```

---

### TC-006：精确在右边界，继续按右键，x 不变

**关联 Gherkin**：`Scenario: 精确在右边界_继续按右键_x不变`
**关联需求**：REQ-PLAYER-004, BS-002

```
TEST "TC-006: player.x=750，按ArrowRight连续3帧，player.x保持750"
    // ── Arrange ──
    SET player.x = 750
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()   // 帧 1：newX=755，钳制=750
    CALL updatePlayerPosition()   // 帧 2：newX=755，钳制=750
    CALL updatePlayerPosition()   // 帧 3：newX=755，钳制=750

    // ── Assert ──
    ASSERT player.x === 750      // 3 帧后仍在右边界
END TEST
```

---

### TC-007：游戏暂停时按方向键，战士不移动

**关联 Gherkin**：`Scenario: 游戏暂停时按方向键_战士不移动`
**关联需求**：REQ-PLAYER-005

```
TEST "TC-007: gamePaused=true，按ArrowLeft 5帧，player.x保持450"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = true          // 关键：游戏暂停
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()    // 应在 gamePaused 守卫处提前 RETURN
    CALL updatePlayerPosition()
    CALL updatePlayerPosition()
    CALL updatePlayerPosition()
    CALL updatePlayerPosition()

    // ── Assert ──
    ASSERT player.x === 450       // 暂停期间位置不变
END TEST
```

---

### TC-008：松开左方向键，战士立即停止

**关联 Gherkin**：`Scenario: 松开左方向键_战士立即停止`
**关联需求**：REQ-PLAYER-003

```
TEST "TC-008: ArrowLeft松开后，连续3帧 player.x不继续左移"
    // ── Arrange ──
    SET player.x = 430
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false     // 已松开
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()    // 帧 1：无键按住，不移动
    CALL updatePlayerPosition()    // 帧 2
    CALL updatePlayerPosition()    // 帧 3

    // ── Assert ──
    ASSERT player.x === 430       // 松键后位置不变
END TEST
```

---

### TC-009：松开右方向键，战士立即停止

**关联 Gherkin**：`Scenario: 松开右方向键_战士立即停止`
**关联需求**：REQ-PLAYER-003

```
TEST "TC-009: ArrowRight松开后，连续3帧 player.x不继续右移"
    // ── Arrange ──
    SET player.x = 470
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = false    // 已松开

    // ── Act ──
    CALL updatePlayerPosition()    // 帧 1：无键按住，不移动
    CALL updatePlayerPosition()    // 帧 2
    CALL updatePlayerPosition()    // 帧 3

    // ── Assert ──
    ASSERT player.x === 470       // 松键后位置不变
END TEST
```

---

### TC-010：游戏结束后按方向键，战士不移动

**关联 Gherkin**：`Scenario: 游戏结束后按方向键_战士不移动`
**关联需求**：REQ-PLAYER-006

```
TEST "TC-010: gameOverFlag=true，按ArrowRight，player.x保持450"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = true        // 关键：游戏结束
    SET game.waveActive = false
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()    // 应在 gameOverFlag 守卫处提前 RETURN

    // ── Assert ──
    ASSERT player.x === 450       // 游戏结束后位置不变
END TEST
```

---

### TC-011：gameLoop 调用顺序验证（子弹起点跟随移动后的 player.x）

**关联 Gherkin**：`Scenario: 移动中有敌人_自动射击不中断_子弹起点跟随战士`
**关联需求**：REQ-PLAYER-007, REQ-PLAYER-008

```
TEST "TC-011: 调用顺序 updatePlayerPosition→drawPlayer→autoFire，子弹.x等于移动后player.x"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // 模拟存在一个有效敌人（autoFire 的触发条件）
    SET mockEnemy = { hp: 10, z: 0.5, getScreenPosition: () => { x: 450, y: 300 } }
    SET game.enemies = [mockEnemy]

    // 模拟武器 fireRate 已到期（允许射击）
    SET player.weapon.lastFire = 0
    SET player.weapon.fireRate = 50
    SET currentTime = 1000         // 足够长确保 lastFire 超期

    // ── Act ──
    // 模拟 gameLoop 中的调用顺序
    CALL updatePlayerPosition()    // player.x 更新为 455
    // drawPlayer() 使用 player.x = 455 渲染（验证 REQ-007）
    CALL autoFire(currentTime)    // Bullet 构造时 this.x = player.x = 455

    // ── Assert ──
    ASSERT player.x === 455                           // updatePlayerPosition 已更新
    ASSERT game.bullets.length >= 1                   // autoFire 产生了子弹
    ASSERT game.bullets[0].x === 455                  // 子弹起点等于更新后的 player.x（REQ-008）
END TEST
```

---

### TC-012：双键同时按住，player.x 不移动

**关联场景**：BS-007
**关联需求**：REQ-PLAYER-001, REQ-PLAYER-002

```
TEST "TC-012: ArrowLeft和ArrowRight同时按住，player.x保持不变"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true      // 双键同时
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()    // 应在双键检测处提前 RETURN

    // ── Assert ──
    ASSERT player.x === 450       // 速度抵消，不移动
END TEST
```

---

### TC-EDGE-001：单帧越过左边界（速度大于剩余距离）

**关联场景**：BS-003
**关联需求**：REQ-PLAYER-004

```
TEST "TC-EDGE-001: player.x=152，speed=5，按ArrowLeft，newX=147被钳制为150"
    // ── Arrange ──
    SET player.x = 152
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()
    // newX = 152 - 5 = 147 < 150（边界），钳制

    // ── Assert ──
    ASSERT player.x === 150      // 不允许出现 147
    ASSERT player.x !== 147
END TEST
```

---

### TC-EDGE-002：单帧越过右边界（速度大于剩余距离）

**关联场景**：BS-004
**关联需求**：REQ-PLAYER-004

```
TEST "TC-EDGE-002: player.x=748，speed=5，按ArrowRight，newX=753被钳制为750"
    // ── Arrange ──
    SET player.x = 748
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = true

    // ── Act ──
    CALL updatePlayerPosition()
    // newX = 748 + 5 = 753 > 750（边界），钳制

    // ── Assert ──
    ASSERT player.x === 750      // 不允许出现 753
    ASSERT player.x !== 753
END TEST
```

---

### TC-EDGE-003：player.speed 未定义时不产生 NaN

**关联场景**：BS-008

```
TEST "TC-EDGE-003: player.speed=undefined，按ArrowLeft，player.x使用默认speed=5，不为NaN"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = undefined   // 故意未定义
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()
    // 函数内部：speed = player.speed || 5 = 5

    // ── Assert ──
    ASSERT isNaN(player.x) === false   // 不允许产生 NaN
    ASSERT player.x === 445            // 使用默认 speed=5 正常移动
END TEST
```

---

### TC-EDGE-004：player.x 为 NaN 时重置为 450

**关联场景**：BS-009

```
TEST "TC-EDGE-004: player.x=NaN，调用updatePlayerPosition()后重置为450"
    // ── Arrange ──
    SET player.x = NaN             // 模拟异常状态
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act ──
    CALL updatePlayerPosition()
    // 函数内部：isNaN(player.x) === true → player.x = canvas.width/2 → RETURN

    // ── Assert ──
    ASSERT player.x === 450        // 重置为初始值
    ASSERT isNaN(player.x) === false
END TEST
```

---

### TC-EDGE-005：keydown 事件多次触发，一帧只移动一次 speed

**关联场景**：BS-010

```
TEST "TC-EDGE-005: keydown事件在1帧内触发5次，player.x只移动1次speed"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = false
    SET keys.ArrowRight = false

    // 模拟 OS 键盘重复触发 keydown 事件 5 次（e.key = 'ArrowLeft'）
    // 每次触发：keys.ArrowLeft = true（已是 true，无副作用）
    DISPATCH keydown('ArrowLeft') × 5 times
    // 此时 keys.ArrowLeft = true

    // ── Act ── （模拟 gameLoop 的单帧执行）
    CALL updatePlayerPosition()    // 只调用一次（1帧）

    // ── Assert ──
    ASSERT player.x === 445       // 只移动了 1 次 speed = 5，而不是 25（5次×5）
END TEST
```

---

### TC-EDGE-006：暂停->取消暂停->继续移动（状态流转）

**关联场景**：BS-005

```
TEST "TC-EDGE-006: 暂停期间不移动，取消暂停后恢复移动"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = true
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false

    // ── Act（阶段 1：暂停中）──
    CALL updatePlayerPosition()    // 应 RETURN 不移动
    CALL updatePlayerPosition()

    // ── Assert（阶段 1）──
    ASSERT player.x === 450       // 暂停期间不变

    // ── Act（阶段 2：取消暂停）──
    SET gamePaused = false         // 取消暂停
    CALL updatePlayerPosition()    // 恢复移动

    // ── Assert（阶段 2）──
    ASSERT player.x === 445       // 取消暂停后正常移动
END TEST
```

---

### TC-PERF-001：updatePlayerPosition() 单帧耗时 <= 1ms

**关联需求**：REQ-PLAYER-010

```
TEST "TC-PERF-001: updatePlayerPosition()连续执行100帧，平均耗时<=1ms"
    // ── Arrange ──
    SET player.x = 450
    SET player.speed = 5
    SET gamePaused = false
    SET gameOverFlag = false
    SET game.waveActive = true
    SET keys.ArrowLeft = true
    SET keys.ArrowRight = false
    DECLARE totalTime = 0
    DECLARE sampleCount = 100

    // ── Act ──
    FOR i FROM 1 TO sampleCount:
        DECLARE t0 = performance.now()
        CALL updatePlayerPosition()
        // 重置位置避免一直触底（确保每次都执行移动逻辑）
        IF player.x <= 150 THEN SET player.x = 450 END IF
        DECLARE t1 = performance.now()
        SET totalTime += (t1 - t0)
    END FOR

    DECLARE avgTime = totalTime / sampleCount

    // ── Assert ──
    ASSERT avgTime <= 1.0         // 平均增量不超过 1ms（REQ-010）
END TEST
```

---

### TC-CONSTRAINT-001：武器系统文件未被修改

**关联需求**：REQ-PLAYER-011

```
TEST "TC-CONSTRAINT-001: 实现mobile-warrior-system后，weapon*.js文件无变更"
    // ── Arrange ──
    // 获取文件内容的哈希（在实现 mobile-warrior-system 前记录基线）
    DECLARE baselineHash_weaponManager   = SHA256(readFile('weaponManager.js'))
    DECLARE baselineHash_weaponUI        = SHA256(readFile('weaponUI.js'))
    DECLARE baselineHash_weaponWaveSelect = SHA256(readFile('weaponWaveSelect.js'))

    // ── Act ── （假设 mobile-warrior-system 已实现）
    // 重新读取文件内容
    DECLARE currentHash_weaponManager    = SHA256(readFile('weaponManager.js'))
    DECLARE currentHash_weaponUI         = SHA256(readFile('weaponUI.js'))
    DECLARE currentHash_weaponWaveSelect  = SHA256(readFile('weaponWaveSelect.js'))

    // ── Assert ──
    ASSERT currentHash_weaponManager   === baselineHash_weaponManager
    ASSERT currentHash_weaponUI        === baselineHash_weaponUI
    ASSERT currentHash_weaponWaveSelect === baselineHash_weaponWaveSelect
END TEST

// 注：此测试在 CI/静态检查层执行，可用 git diff 替代：
// ASSERT (git diff HEAD -- weaponManager.js weaponUI.js weaponWaveSelect.js) === ""
```

---

## 3. 测试数据设计

### 3.1 player 对象测试值集合

| 字段 | 测试值集合 | 说明 |
|------|---------|------|
| `player.x` | 450（初始）, 150（左边界）, 750（右边界）, 149（低于边界）, 751（超过边界）, NaN（异常） | 覆盖正常/边界/越界/异常 |
| `player.speed` | 5（正常）, undefined（异常）, 0（异常，不应用于实现） | 覆盖正常/未定义 |
| `player.count` | 1（默认）| 本需求不修改，固定值 |

### 3.2 keys 状态测试值集合

| keys.ArrowLeft | keys.ArrowRight | 预期行为 |
|---------------|----------------|---------|
| false | false | 不移动 |
| true | false | 向左移动（REQ-001） |
| false | true | 向右移动（REQ-002） |
| true | true | 不移动（双键抵消，BS-007） |

### 3.3 游戏状态测试值集合

| gamePaused | gameOverFlag | game.waveActive | 允许移动 | 相关需求 |
|-----------|-------------|----------------|---------|---------|
| false | false | true | 是 | 正常游戏 |
| true | false | true | 否 | REQ-005 |
| false | true | false | 否 | REQ-006 |
| false | false | false | 否 | decision.md 决策 4 |

---

## 4. 测试优先级矩阵

| 优先级 | 测试点 | 原因 |
|--------|--------|------|
| **P0**（阻断发布） | TC-001 ~ TC-010 | 覆盖 12 个 Gherkin 验收场景，直接对应 L0 验收标准 |
| **P1**（应修复） | TC-011, TC-012, TC-EDGE-001~004, TC-CONSTRAINT-001 | 关键边界场景和集成验证 |
| **P2**（建议修复） | TC-EDGE-005~006, TC-PERF-001 | 低频边界场景和性能验证 |

---

## 5. 测试层分布

| 测试层 | 测试点数 | 工具 | 说明 |
|--------|---------|------|------|
| 单元测试 | 14 | Jest + JSDOM | 隔离测试 `updatePlayerPosition()`，mock game/player/keys 状态 |
| 集成测试 | 2 | Jest + JSDOM | 验证 gameLoop 调用顺序和状态流转 |
| 性能测试 | 1 | `performance.now()` | 单帧计时抽样 |
| 静态验证 | 1 | git diff / 文件哈希 | 验证文件未被修改 |
| **合计** | **18** | - | - |

---

## 6. 测试文件组织建议

```
tests/
└── player-movement.test.js    // 本设计对应的测试文件
    ├── describe: "updatePlayerPosition() — 正常路径"
    │   ├── TC-001: 正常左移
    │   ├── TC-002: 左移越界钳制
    │   ├── TC-003: 正常右移
    │   └── TC-004: 右移越界钳制
    ├── describe: "updatePlayerPosition() — 边界钳制"
    │   ├── TC-005: 精确左边界持续不越
    │   ├── TC-006: 精确右边界持续不越
    │   ├── TC-EDGE-001: 单帧越过左边界
    │   └── TC-EDGE-002: 单帧越过右边界
    ├── describe: "updatePlayerPosition() — 守卫条件"
    │   ├── TC-007: gamePaused 守卫
    │   ├── TC-010: gameOverFlag 守卫
    │   └── TC-012: 双键同时按住
    ├── describe: "keys 状态 — 松键停止"
    │   ├── TC-008: 松开左键
    │   └── TC-009: 松开右键
    ├── describe: "updatePlayerPosition() — 防御性处理"
    │   ├── TC-EDGE-003: speed 未定义
    │   ├── TC-EDGE-004: player.x 为 NaN
    │   └── TC-EDGE-005: keydown 重复触发
    ├── describe: "集成 — gameLoop 调用顺序"
    │   ├── TC-011: 子弹起点跟随移动后 player.x
    │   └── TC-EDGE-006: 暂停->取消暂停->继续移动
    ├── describe: "性能"
    │   └── TC-PERF-001: 单帧耗时 <= 1ms
    └── describe: "约束"
        └── TC-CONSTRAINT-001: weapon*.js 文件未修改（用 git diff 或文件读取验证）
```

---

## 7. 需求追溯验证

| 需求 ID | 对应测试点 | 优先级 | 状态 |
|---------|----------|--------|------|
| REQ-PLAYER-001 | TC-001, TC-002, TC-EDGE-001 | P0 | covered |
| REQ-PLAYER-002 | TC-003, TC-004, TC-EDGE-002 | P0 | covered |
| REQ-PLAYER-003 | TC-008, TC-009 | P0 | covered |
| REQ-PLAYER-004 | TC-002, TC-004, TC-005, TC-006, TC-EDGE-001, TC-EDGE-002 | P0 | covered |
| REQ-PLAYER-005 | TC-007, TC-EDGE-006 | P0 | covered |
| REQ-PLAYER-006 | TC-010 | P0 | covered |
| REQ-PLAYER-007 | TC-011 | P1 | covered |
| REQ-PLAYER-008 | TC-011 | P1 | covered |
| REQ-PLAYER-010 | TC-PERF-001 | P2 | covered |
| REQ-PLAYER-011 | TC-CONSTRAINT-001 | P1 | covered |

**需求覆盖率：10/10 = 100%**
