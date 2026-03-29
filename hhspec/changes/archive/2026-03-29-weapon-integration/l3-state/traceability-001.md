# Traceability Map — Unit 001: INTEGRATION

## L0 需求 → 实现覆盖

| 需求 ID | 需求描述 | 实现位置 | 测试覆盖 |
|---------|---------|---------|---------|
| FR-1 | 波次武器选择 UI | weaponWaveSelect.js: show(), selectWeapon() | UT-001, UT-002, IT-001 |
| FR-2 | 武器掉落箱集成 | weaponDropIntegration.js: createDrop(), checkCollection() | UT-003..006, IT-002 |
| FR-3 | 合成动画和音效 | weaponMergeAnimation.js: playMergeEffect(), update(), render() | UT-007, UT-008 |
| FR-4 | E2E 测试覆盖 | tests/weaponIntegration.test.js: IT-001, IT-002 | IT-001, IT-002 |

## Bug 修复

| Bug | 位置 | 修复 |
|-----|------|------|
| `weaponDropIntegration.createDrop(e.x, e.y)` 传入 undefined | game.js:741 | 改为 `e.getScreenPosition().x` 获取屏幕 x + 传入 `e.z` |
| `weaponDropIntegration` 写入 `game.weaponDrops` 导致 TypeError | weaponDropIntegration.js | 改用独立的 `this.drops` 数组，避免与 WeaponDrop 实例冲突 |
| 双重拾取冲突（WeaponDrop.update + weaponDropIntegration.checkCollection 均操作 game.weaponDrops） | weaponDropIntegration.js | 分离数组后两个系统独立运行 |
| 40px 拾取半径在运行时不可达（player.y≈580，掉落 y≈200-450） | weaponDropIntegration.js | 改为 z 轴推进机制，drop.z >= 0.85 且 dx < 80px 时拾取 |
| 进化武器类型（rifle+等）导致 `weaponTypes[type]` 为 undefined 崩溃 | game.js:227,532,770-775 | 使用 `player.weapon.color`/`player.weapon.name` 作为主要来源，`weaponTypes[type]?.color` 作为后备 |
| selectWeapon() 未在 player.weapon 上存储 color/name | weaponWaveSelect.js | 从 weaponConfig 读取 color、name 并写入 player.weapon |

## 新增文件

| 文件 | 说明 |
|------|------|
| `tests/weaponIntegration.test.js` | 10 个测试（8 单元 + 2 集成），全部通过 |

## 测试结果

- weaponManager.test.js: 13/13 通过
- weaponIntegration.test.js: 10/10 通过
- 总计: 23/23 通过
