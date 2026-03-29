# 实现单元 001：INTEGRATION

## 单元描述

武器系统集成模块 — 覆盖三个子模块的完整实现验证。

## 实现范围

| 文件 | 状态 | 职责 |
|------|------|------|
| `weaponWaveSelect.js` | 已存在 | 波次武器选择 UI |
| `weaponDropIntegration.js` | 已存在 | 武器掉落集成 |
| `weaponMergeAnimation.js` | 已存在 | 合成粒子动画 |

## L0 需求对应

| 需求 | 实现文件 | 覆盖状态 |
|------|----------|---------|
| FR-1: 波次武器选择 UI | weaponWaveSelect.js | ✅ show() + selectWeapon() |
| FR-2: 武器掉落箱集成 | weaponDropIntegration.js | ✅ createDrop() + checkCollection() |
| FR-3: 合成动画和音效 | weaponMergeAnimation.js | ✅ playMergeEffect() + playSound() |
| FR-4: E2E 测试 | tests/ | 需补充测试文件 |

## 任务

1. 验证三个模块代码与 L2 设计完全匹配
2. 检查是否有与 game.js 的集成点缺失
3. 补充/完善测试文件（参考 INTEGRATION-test-detail.md）

## 参考文件

- `hhspec/changes/weapon-integration/specs/design/INTEGRATION-api-design.md`
- `hhspec/changes/weapon-integration/specs/design/INTEGRATION-test-detail.md`
- `hhspec/changes/weapon-integration/l0-requirement.md`
