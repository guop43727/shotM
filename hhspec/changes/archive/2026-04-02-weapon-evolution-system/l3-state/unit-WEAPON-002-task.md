---
unit_id: WEAPON-002
domain: WEAPON
title: WeaponUI 界面组件实现
implementer: l3_implementer
specs_dir: hhspec/changes/weapon-evolution-system/specs
baseline_specs_dir: hhspec/specs
---

# 实现单元 WEAPON-002: WeaponUI 界面组件

## 实现范围

修改 `weaponUI.js`、`index.html`、`style.css`，实现武器管理界面：

### 需要实现的功能（Units 9-14 + 43-47）
1. **WeaponModal 弹窗容器**（Unit 9/10）：打开/关闭，暂停/恢复游戏
2. **InventoryTab 库存标签**（Unit 11）：渲染武器卡片，显示数量
3. **EvolutionTreeTab 进化树标签**（Unit 12）：Canvas 树状图，owned/synthesizable/locked 状态
4. **SynthesisTab 合成标签**（Unit 13）：选择武器，显示材料，合成按钮（不足时禁用）
5. **handleMergeClick(weaponType)**（Unit 14）：调用 weaponManager.mergeWeapons()，播放动画
6. **WeaponSelectModal 波次间选择**（Unit 43-47 前端设计）：波次结束后弹出，选择装备武器
7. **HTML 结构**：在 index.html 中添加武器弹窗 DOM 结构
8. **CSS 样式**：赛博朋克霓虹风格，与现有样式一致

## 关键约束（来自 L0 需求）
- US-WEP-007: 库存显示所有已拥有武器图标和数量，实时更新
- US-WEP-008: 进化树显示完整路径，已拥有高亮，可合成突出
- US-WEP-009: 选择武器后显示所需材料；合成按钮灰显（不足时 disabled）
- US-WEP-006: 波次间弹出武器选择，战斗中无法更换
- 合成成功后播放动画效果（weaponMergeAnimation.js 中的现有函数）

## 集成点
- 调用 `window.weaponManager.mergeWeapons(type)` 执行合成
- 调用 `window.weaponManager.equipWeapon(type)` 切换装备
- 调用 `window.weaponManager.getEvolutionTree()` 渲染进化树
- 调用 `window.weaponManager.getInventory()` 获取库存

## 参考文件
- `hhspec/changes/weapon-evolution-system/specs/design/frontend-design.md` - 前端设计
- `hhspec/changes/weapon-evolution-system/specs/design/api-design.md` - WeaponUI 方法设计（Units 9-14）
- `weaponUI.js` - 现有实现（需扩展）
- `weaponWaveSelect.js` - 波次选择现有实现
- `weaponMergeAnimation.js` - 合成动画现有实现
- `index.html` - 需添加 DOM 结构
- `style.css` - 需添加样式
