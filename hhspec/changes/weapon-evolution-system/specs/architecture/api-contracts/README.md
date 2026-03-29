# API Contracts - Not Applicable

**Project Type**: Pure Frontend HTML5 Canvas Game
**Backend**: None
**Data Persistence**: localStorage only

## Rationale

MONSTER TIDE is a pure frontend HTML5 Canvas game with no backend services. All game state is managed client-side using:
- Canvas 2D rendering
- Native JavaScript game loop
- localStorage for weapon inventory persistence
- No HTTP/REST/GraphQL API layer

## L1.2 Compliance Note

This document serves as a placeholder to satisfy the L1.2 checkpoint requirement. Since the project has no API layer, OpenAPI specifications are not applicable.

## Internal Module Interfaces (L1 Definition)

While there are no external REST APIs, the weapon evolution system defines internal contracts between JavaScript modules.

### WeaponManager Public API

**Module**: `weaponManager.js`
**Purpose**: 武器库存管理与合成逻辑

| Method | Parameters | Return Type | Side Effects | Granularity |
|--------|-----------|-------------|--------------|------------|
| `getInventory()` | void | `{[weaponId: string]: number}` | None | ✅ Appropriate (查询操作) |
| `addToInventory(weaponId)` | `weaponId: string` | `void` | 修改库存 + 保存到localStorage | ✅ Appropriate (单一职责) |
| `synthesizeWeapon(weaponId)` | `weaponId: string` | `{success: boolean, result?: string, error?: string}` | 修改库存 + 保存 + 可能回滚 | ✅ Appropriate (事务封装) |
| `fuseUltimateWeapon()` | void | `{success: boolean, error?: string}` | 修改库存 + 保存 + 可能回滚 | ✅ Appropriate (特殊合成) |
| `equipWeapon(weaponId)` | `weaponId: string` | `void` | 修改 `player.weapon` 对象 | ✅ Appropriate (单一操作) |
| `saveInventory()` | void | `Promise<boolean>` | 写入localStorage | ✅ Appropriate (内部使用) |
| `loadInventory()` | void | `{[weaponId: string]: number}` | 读取localStorage | ✅ Appropriate (内部使用) |
| `validateInventory(inventory)` | `inventory: object` | `boolean` | None (纯校验) | ✅ Appropriate (校验逻辑) |

**粒度评估**: 8个公共方法，每个方法单一职责，避免chatty（过度细粒度）和chunky（过度粗粒度）。合成操作封装为事务，符合领域驱动设计原则。

**错误处理**: 所有写操作返回 `{success, error}` 结构，调用方需检查 `success` 字段。

---

### WeaponUI Public API

**Module**: `weaponUI.js`
**Purpose**: 武器管理界面与交互

| Method | Parameters | Return Type | Side Effects | Granularity |
|--------|-----------|-------------|--------------|------------|
| `openWeaponModal()` | void | `void` | 显示弹窗 + 暂停游戏 | ✅ Appropriate (界面入口) |
| `closeWeaponModal()` | void | `void` | 隐藏弹窗 + 恢复游戏 | ✅ Appropriate (界面出口) |
| `renderEvolutionTree(inventory)` | `inventory: object` | `void` | 渲染Canvas进化树 | ✅ Appropriate (独立渲染) |
| `renderInventoryGrid(inventory)` | `inventory: object` | `void` | 渲染库存网格 | ✅ Appropriate (独立渲染) |
| `showWeaponSelectModal(callback)` | `callback: Function(weaponId)` | `void` | 显示选择弹窗 + 调用回调 | ✅ Appropriate (波次间选择) |
| `refreshUI()` | void | `void` | 刷新所有UI组件 | ✅ Appropriate (全局刷新) |

**粒度评估**: 6个公共方法，符合UI组件接口设计原则。每个方法负责一个视图区域的渲染或交互。

**交互模式**: 使用回调函数（`showWeaponSelectModal`）实现异步交互，避免UI层直接依赖业务逻辑。

---

### StorageAdapter Interface

**Module**: `weaponManager.js` (内部类)
**Purpose**: localStorage 抽象层（支持降级到 sessionStorage）

| Method | Parameters | Return Type | Side Effects | Granularity |
|--------|-----------|-------------|--------------|------------|
| `setItem(key, value)` | `key: string, value: string` | `boolean` | 写入storage | ✅ Appropriate (标准接口) |
| `getItem(key)` | `key: string` | `string \| null` | None | ✅ Appropriate (标准接口) |
| `removeItem(key)` | `key: string` | `void` | 删除数据 | ✅ Appropriate (标准接口) |
| `fallbackToSession()` | void | `void` | 切换到sessionStorage | ✅ Appropriate (降级处理) |

**粒度评估**: 标准Storage接口，符合Web Storage API规范。增加 `fallbackToSession()` 支持降级处理。

---

### EventBus Contracts (武器相关事件)

**Module**: `game.js` (全局事件总线)
**Purpose**: 松耦合的模块间通信

| Event Name | Payload | Trigger Point | Listeners |
|-----------|---------|---------------|-----------|
| `weapon:collected` | `{weaponId: string, count: number}` | 击中WeaponDrop后 | WeaponUI (更新库存显示) |
| `weapon:synthesized` | `{sourceId: string, targetId: string}` | 合成成功后 | WeaponUI (播放动画) |
| `weapon:equipped` | `{weaponId: string, tier: number}` | 装备切换后 | HUD (更新武器显示) |
| `weapon:modal:open` | `void` | 打开弹窗时 | Core (暂停游戏) |
| `weapon:modal:close` | `void` | 关闭弹窗时 | Core (恢复游戏) |

**粒度评估**: 事件粒度合理，每个事件代表一个明确的业务动作。避免过度细粒度（如 `weapon:inventory:item:added`）。

---

### Interface Design Principles

1. **单一职责**: 每个接口方法仅负责一个明确的功能
2. **幂等性**: 查询操作无副作用（如 `getInventory`）
3. **事务封装**: 复合操作封装为事务（如 `synthesizeWeapon`）
4. **错误处理**: 所有写操作返回 `{success, error}` 结构
5. **异步回调**: UI交互使用回调避免阻塞（如 `showWeaponSelectModal`）

---

### Cross-Module Data Flow

```
[WeaponDrop] --collide--> [WeaponManager.addToInventory()]
                             |
                             +--> [StorageAdapter.setItem()]
                             |
                             +--> [EventBus.emit('weapon:collected')]
                                    |
                                    +--> [WeaponUI.refreshUI()]
```

---

**Note**: 这些内部接口在 L2 详细设计阶段将补充完整的实现细节（包括参数校验、错误处理、性能优化等）。
