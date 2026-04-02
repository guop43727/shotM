# L3 Cross-Module Review Report

**Reviewer**: Cross-Module Reuse Reviewer
**Date**: 2026-03-27
**Scope**: weaponManager.js, weaponUI.js, game.js

---

## VERDICT: FAIL

**Blocking Issues**: 3
**Warnings**: 4

---

## A类发现（当次修复）

### FND-REUSE-001 [BLOCKING]
**Category**: REUSE-01 跨单元重复函数
**Title**: weaponConfig重复定义

**Evidence**:
- `weaponManager.js:4-21` - 完整weaponConfig定义（9种武器，含tier/damage/fireRate/bulletCount）
- `game.js:66-99` - weaponTypes定义（4种武器，含damage/fireRate/bulletCount/duration）

**Description**: 两处定义武器属性，数据结构不一致且部分重复。weaponManager使用tier制进化系统，game.js使用临时武器+duration系统。

**Impact**:
- 数据不同步风险（rifle在weaponManager伤害50，game.js也是50但可能独立修改）
- 维护成本高（修改武器属性需改两处）
- 逻辑冲突（weaponManager的rifle+/rifle++在game.js中不存在）

**Recommendation**:
```javascript
// 提取到 weaponConfig.js
export const weaponConfig = {
  // 合并两套配置，添加duration字段到weaponManager配置
  rifle: {
    id: 'rifle', name: '步枪', tier: 1,
    damage: 50, fireRate: 50, bulletCount: 1,
    color: '#ff7948', nextTier: 'rifle+', duration: 0
  },
  // ... 其他武器
};

// weaponManager.js 和 game.js 都引用
import { weaponConfig } from './weaponConfig.js';
```

**Shared Function Spec**:
- Name: `weaponConfig`
- Signature: `const weaponConfig = { [weaponId]: WeaponStats }`
- Location: 新建 `weaponConfig.js`
- Callers:
  - weaponManager.js: 替换第4-21行，import weaponConfig
  - game.js: 替换第66-99行，import weaponConfig

---

### FND-REUSE-002 [BLOCKING]
**Category**: REUSE-04 跨单元重复数据转换
**Title**: 武器装备逻辑重复

**Evidence**:
- `weaponManager.js:142-152` - equipWeapon()函数，设置player.weapon的6个属性
- `game.js:394-398` - WeaponDrop收集时，设置player.weapon的4个属性

**Description**: 两处都执行"装备武器"操作，逻辑相同但实现分散。

**Impact**:
- 装备逻辑不一致（weaponManager设置6个字段，game.js只设置4个）
- 未来添加武器属性时需改两处

**Recommendation**:
```javascript
// 提取到 weaponManager.js
equipWeapon(weaponId) {
  const config = weaponConfig[weaponId];
  if (!config) return false;

  player.weapon.id = config.id;
  player.weapon.type = config.id;
  player.weapon.damage = config.damage;
  player.weapon.fireRate = config.fireRate;
  player.weapon.bulletCount = config.bulletCount;
  player.weapon.color = config.color;
  return true;
}

// game.js:394 调用
if (weaponManager.equipWeapon(this.weaponType)) {
  updateDamageDisplay();
  adjustDifficulty();
}
```

**Shared Function Spec**:
- Name: `equipWeapon`
- Signature: `equipWeapon(weaponId: string): boolean`
- Location: `weaponManager.js` (已存在，需game.js复用)
- Callers:
  - game.js:394: 替换直接赋值为 `weaponManager.equipWeapon(this.weaponType)`

---

### FND-REUSE-003 [BLOCKING]
**Category**: REUSE-01 跨单元重复函数
**Title**: localStorage存取模式重复

**Evidence**:
- `weaponManager.js:27-40` - loadInventory()使用try-catch + JSON.parse + 默认值
- `weaponManager.js:130-139` - saveInventory()使用try-catch + JSON.stringify + payload包装

**Description**: localStorage存取是通用模式，应提取为工具函数。虽然当前只有weaponManager使用，但game.js的gold/lives/score也应持久化（当前未实现）。

**Impact**:
- 未来添加其他持久化数据时会重复此模式
- 错误处理逻辑分散

**Recommendation**:
```javascript
// 新建 storageUtils.js
export function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const payload = JSON.parse(stored);
      return payload.data || payload;
    }
  } catch (e) {
    console.warn(`Load ${key} failed:`, e);
  }
  return defaultValue;
}

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data }));
    return true;
  } catch (e) {
    console.warn(`Save ${key} failed:`, e);
    return false;
  }
}

// weaponManager.js 使用
loadInventory() {
  this.inventory = loadFromStorage('monsterTide_weaponInventory', { rifle: 1 });
  return this.inventory;
}
```

**Shared Function Spec**:
- Name: `loadFromStorage`, `saveToStorage`
- Signature: `loadFromStorage(key: string, defaultValue: any): any`, `saveToStorage(key: string, data: any): boolean`
- Location: 新建 `storageUtils.js`
- Callers:
  - weaponManager.js:27-40: 替换为loadFromStorage
  - weaponManager.js:130-139: 替换为saveToStorage

---

### FND-REUSE-004 [WARNING]
**Category**: REUSE-02 跨单元重复验证逻辑
**Title**: 战斗状态检查重复

**Evidence**:
- `weaponUI.js:9-12` - openWeaponModal()检查game.waveActive并alert
- 未来可能在其他UI操作中重复此检查

**Description**: "战斗中禁止操作"是通用验证逻辑，应提取。

**Recommendation**:
```javascript
// game.js 添加
function checkCanOpenUI(actionName) {
  if (game.waveActive) {
    alert(`战斗中无法${actionName}!`);
    return false;
  }
  return true;
}

// weaponUI.js:8
openWeaponModal() {
  if (!checkCanOpenUI('打开武器管理')) return;
  // ...
}
```

**Shared Function Spec**:
- Name: `checkCanOpenUI`
- Signature: `checkCanOpenUI(actionName: string): boolean`
- Location: `game.js`
- Callers:
  - weaponUI.js:9: 替换为checkCanOpenUI调用

---

## B类发现（反哺specs/）

### FND-REUSE-005 [INFO]
**Category**: REUSE-07 反复出现的编码模式
**Title**: 模态框状态管理模式

**Evidence**:
- `weaponUI.js:5` - modalState对象管理isOpen和currentTab
- `weaponUI.js:8-25` - open/close/switchTab三个方法操作DOM和状态

**Pattern Spec**:
- **CP-001**: 模态框状态管理模式
- **Type**: REUSABLE
- **Scope**: 全局UI组件
- **Description**: 使用状态对象 + DOM操作方法管理模态框生命周期
- **Problem Scenario**: 需要创建新的模态框UI组件
- **Usage Example**:
```javascript
const xxxUI = {
  modalState: { isOpen: false, currentTab: 'default' },
  openModal() {
    document.getElementById('xxx-modal').style.display = 'block';
    this.modalState.isOpen = true;
  },
  closeModal() {
    document.getElementById('xxx-modal').style.display = 'none';
    this.modalState.isOpen = false;
  }
};
```
- **Notes**: 考虑提取为ModalManager基类

---

### FND-REUSE-006 [INFO]
**Category**: REUSE-07 反复出现的编码模式
**Title**: 游戏对象透视投影计算模式

**Evidence**:
- `game.js:268-278` - Enemy.getScreenPosition()
- `game.js:336-342` - WeaponDrop.getScreenPosition()
- `game.js:436-443` - NumberGate.getScreenPosition()

**Pattern Spec**:
- **CP-002**: 3D透视投影计算模式
- **Type**: REUSABLE
- **Scope**: 游戏渲染模块
- **Description**: 基于z深度(0-1)计算屏幕坐标和缩放比例
- **Problem Scenario**: 需要在透视道路上渲染新的游戏对象
- **Usage Example**:
```javascript
getScreenPosition() {
  const vanishingY = 50;
  const roadWidth = 300;
  const y = vanishingY + (canvas.height - vanishingY - 100) * this.z;
  const scale = 0.3 + this.z * 0.7;
  const x = canvas.width / 2 + this.laneOffset * scale;
  return { x, y, scale };
}
```
- **Notes**: 考虑提取为PerspectiveObject基类

---

## 集成点分析

### game.js → weaponManager.js
- `weaponManager.js:146` - 直接访问全局player对象（game.js定义）
- **问题**: 紧耦合，weaponManager依赖game.js的全局变量

### weaponUI.js → weaponManager.js
- `weaponUI.js:50,73,143,165,180,194` - 调用weaponManager的6个方法
- **问题**: 正常依赖，但weaponUI直接访问weaponManager.inventory（第73行）破坏封装

### weaponUI.js → game.js
- `weaponUI.js:9` - 检查game.waveActive
- **问题**: 紧耦合，weaponUI依赖game.js的全局状态

### 建议
1. weaponManager.equipWeapon()应接收player对象作为参数，而非访问全局变量
2. weaponUI不应直接访问weaponManager.inventory，应通过getInventory()

---

## 命名和风格一致性

### FND-REUSE-007 [WARNING]
**Title**: 注释风格不一致

**Evidence**:
- `weaponManager.js:1-2` - 使用L0-AC-XXX追溯标记
- `weaponManager.js:26,43-48` - 使用V-001, STEP-XX标记
- `weaponUI.js:1-2` - 使用COMP-XXX标记
- `weaponUI.js:7,20,27,47,78,140` - 使用EH-XXX, RL-XXX标记
- `game.js` - 无追溯标记，仅普通注释

**Recommendation**: 统一使用L0/L1/L2追溯标记，或移除所有标记保持简洁。

---

### FND-REUSE-008 [WARNING]
**Title**: 函数命名风格不一致

**Evidence**:
- `weaponManager.js` - 使用camelCase: loadInventory, getInventory, addWeapon
- `weaponUI.js` - 使用camelCase: openWeaponModal, renderInventory
- `game.js` - 混合使用: drawRoad, drawPlayer (函数), autoFire (函数), 但类方法也用camelCase

**Recommendation**: 全部统一为camelCase（当前已基本一致，无需修改）。

---

### FND-REUSE-009 [WARNING]
**Title**: 错误处理风格不一致

**Evidence**:
- `weaponManager.js:59,64,117` - 返回`{ success: false, error: '...' }`对象
- `weaponUI.js:75,188,201` - 使用alert()直接提示
- `game.js:747` - 使用alert()

**Recommendation**: 统一错误处理策略：
- 数据层(weaponManager)返回结果对象
- UI层(weaponUI)负责展示
- 避免数据层直接alert

---

## 总结

**关键问题**:
1. weaponConfig重复定义导致数据不同步风险
2. 装备武器逻辑分散在两处
3. 全局变量耦合严重（player, game）

**修复优先级**:
1. 提取统一weaponConfig（REUSE-001）
2. 统一装备武器逻辑（REUSE-002）
3. 解耦全局依赖（传参而非访问全局）

**代码复用机会**: 3个共享函数 + 2个编码模式
