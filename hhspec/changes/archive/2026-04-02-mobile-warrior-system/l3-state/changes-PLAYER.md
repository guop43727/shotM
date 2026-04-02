# 变更清单 — PLAYER 移动系统

**unit_id**: IMPL-UNIT-PLAYER
**implementer**: L3-Implementer
**timestamp**: 2026-04-02T00:00:00Z
**change_name**: mobile-warrior-system

---

## 修改文件

### game.js（唯一修改文件）

| 位置（行号） | 变更类型 | 内容 | 关联约束 |
|-------------|---------|------|---------|
| 第 99 行 | 新增字段 | `speed: 5,` — player 对象新增 speed 属性 | REQ-PLAYER-001, REQ-PLAYER-002, DD-005 |
| 第 110-112 行 | 新增变量 | `const keys = { ArrowLeft: false, ArrowRight: false };` — 模块级键盘状态对象 | REQ-PLAYER-001~003, DD-001, DD-006 |
| 第 1028-1038 行 | 新增事件监听 | 独立 `keydown` 监听：设置 `keys.ArrowLeft/Right = true` | REQ-PLAYER-001, REQ-PLAYER-002, DD-006 |
| 第 1040-1047 行 | 新增事件监听 | `keyup` 监听：设置 `keys.ArrowLeft/Right = false` | REQ-PLAYER-003, DD-006 |
| 第 1061-1106 行 | 新增函数 | `updatePlayerPosition()` — 完整守卫链 + 边界钳制逻辑 | REQ-PLAYER-001~007, BS-007~009, DD-001~007 |
| 第 1175 行 | 新增调用 | `updatePlayerPosition();` — gameLoop 中 drawPlayer() 之前 | REQ-PLAYER-007 |

---

## 变更文件列表

```yaml
change_manifest:
  unit_id: "IMPL-UNIT-PLAYER"
  implementer: "L3-Implementer"
  timestamp: "2026-04-02T00:00:00Z"
  files:
    added: []
    modified:
      - path: "game.js"
        changes: |
          1. player 对象新增 speed: 5 字段（第 99 行）
          2. 模块级 const keys 声明（第 110-112 行）
          3. 独立 keydown 事件监听——方向键处理（第 1028-1038 行）
          4. keyup 事件监听（第 1040-1047 行）
          5. updatePlayerPosition() 函数实现（第 1061-1106 行）
          6. gameLoop 中插入 updatePlayerPosition() 调用（第 1175 行）
        constraints:
          - "REQ-PLAYER-001"
          - "REQ-PLAYER-002"
          - "REQ-PLAYER-003"
          - "REQ-PLAYER-004"
          - "REQ-PLAYER-005"
          - "REQ-PLAYER-006"
          - "REQ-PLAYER-007"
          - "REQ-PLAYER-008"
          - "REQ-PLAYER-010"
          - "REQ-PLAYER-011"
          - "BS-007"
          - "BS-009"
    deleted: []
    blocked: []
  modules_affected:
    - "PLAYER"
    - "CORE（gameLoop）"
```

---

## 未修改文件（验证 REQ-PLAYER-011）

- `weaponManager.js` — 未修改
- `weaponUI.js` — 未修改
- `weaponWaveSelect.js` — 未修改
- `index.html` — 未修改
- `style.css` — 未修改

---

## 自检清单执行结果

- [x] `keys` 对象存在（game.js 第 112 行）
- [x] `updatePlayerPosition` 函数存在（game.js 第 1063 行）
- [x] `keyup` 监听器存在（game.js 第 1040 行）
- [x] gameLoop 中 `drawPlayer()` 之前有 `updatePlayerPosition()` 调用（game.js 第 1175 行）
- [x] 全部 REQ-PLAYER-001~008, 010, 011 及 BS-007, BS-009 在代码中有对应实现
- [x] 边界值用 `GAME_CONSTANTS.ROAD_WIDTH` 推导，不硬编码 150/750（DD-002）
- [x] `drawCyberSoldier` 函数未修改
- [x] 无额外依赖引入
- [x] 无 TODO/FIXME/placeholder
- [x] 覆盖率 12/12 = 100%
