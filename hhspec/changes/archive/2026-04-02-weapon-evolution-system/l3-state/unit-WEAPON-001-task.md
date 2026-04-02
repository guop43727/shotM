---
unit_id: WEAPON-001
domain: WEAPON
title: WeaponManager 核心业务逻辑实现
implementer: l3_implementer
specs_dir: hhspec/changes/weapon-evolution-system/specs
baseline_specs_dir: hhspec/specs
---

# 实现单元 WEAPON-001: WeaponManager 核心业务逻辑

## 实现范围

修改 `weaponManager.js`，实现武器进化系统的核心业务逻辑：

### 需要实现的功能
1. **武器配置 (weaponEvolutionConfig)**：完整的进化树配置（rifle/machinegun/shotgun各4级 + Ultimate）
2. **WeaponManager 类**：
   - `getInventory()` - Unit 1
   - `addWeapon(weaponType)` - Unit 2（原 addToInventory）
   - `mergeWeapons(weaponType)` - Unit 3（3合1合成）
   - `equipWeapon(weaponType)` - Unit 4
   - `canMerge(weaponType)` - Unit 5
   - `getEvolutionTree()` - Unit 6
   - `saveInventory()` - Unit 7
   - `loadInventory()` - Unit 8
   - `fuseUltimateWeapon()` - 终极融合
   - `validateInventory(data)` - 数据校验
3. **StorageAdapter**：localStorage + sessionStorage 降级
4. **game.js 集成**：
   - 修改 weaponDrop 碰撞逻辑，将击中掉落箱改为 `weaponManager.addWeapon(type)` 持久化
   - 修改波次结束逻辑，集成武器选择弹窗
   - 修改 `getPlayerPowerLevel()` 以纳入武器等级

## 关键约束（来自 L0 需求）
- FR-WEP-001: 武器通过 localStorage 永久存储（key: monsterTide_weaponInventory）
- FR-WEP-002: 3合1线性合成，消耗原子化（全部成功或全部回滚）
- FR-WEP-004: Super Rifle + Super Machinegun + Super Shotgun → Ultimate Laser
- FR-WEP-005: 战斗中（waveActive=true）禁止切换装备（抛出 BIZ-001）
- NFR-WEP-002: localStorage 满时降级到 sessionStorage

## 错误码映射
- BIZ-001: 战斗中禁止装备切换
- BIZ-002: 合成材料不足（<3个）
- BIZ-003: 禁止合成当前装备武器
- BIZ-004: 最高级武器无法继续合成
- BIZ-005: 终极融合材料不足
- STOR-001: localStorage 容量超限
- DATA-002: 数据格式错误（负数/非法值）
- DATA-003: JSON 解析失败

## 进化树定义
```
rifle (tier:1) → rifle+ (tier:2) → rifle++ (tier:3) → super_rifle (tier:4)
machinegun (tier:1) → machinegun+ (tier:2) → machinegun++ (tier:3) → super_machinegun (tier:4)
shotgun (tier:1) → shotgun+ (tier:2) → shotgun++ (tier:3) → super_shotgun (tier:4)
super_rifle + super_machinegun + super_shotgun → ultimate_laser (tier:5)
```

## 参考文件
- `hhspec/changes/weapon-evolution-system/specs/design/api-design.md` - 方法伪代码设计
- `hhspec/changes/weapon-evolution-system/specs/design/data-design.md` - 数据层设计
- `hhspec/changes/weapon-evolution-system/specs/design/error-design.md` - 错误处理设计
- `hhspec/changes/weapon-evolution-system/specs/architecture/data-flow.md` - 数据流
- `weaponManager.js` - 现有实现（需重构/扩展）
- `game.js` - 需要集成的游戏主文件
