---
change: weapon-evolution-system
phase: L2-coordination
created_at: "2026-03-27"
status: draft
---

# L2 详细设计任务分配

## 1. 复杂度分析

### 1.1 接口/方法统计

**从 api-contracts/README.md 分析**：

| 模块 | 方法数 | 复杂度 |
|------|--------|--------|
| WeaponManager | 8 | 中等（包含事务逻辑） |
| WeaponUI | 6 | 中等（Canvas渲染） |
| StorageAdapter | 4 | 低（标准接口） |
| EventBus | 5 events | 低（事件驱动） |

**总计**：23个接口/方法需要详细设计

---

### 1.2 UI复杂度评估

**has_ui**: true

**UI组件清单**（从 requirements 和 domain-model 提取）：

1. **武器管理弹窗**（Modal）
   - 3个标签页：库存/进化树/合成
   - 弹窗控制逻辑（打开/关闭/暂停游戏）

2. **库存界面**（InventoryTab）
   - 网格布局显示所有武器
   - 武器卡片（图标+名称+数量）
   - 点击显示详情

3. **进化树界面**（EvolutionTreeTab）
   - Canvas树状图渲染
   - 3条进化路径可视化
   - 节点状态（已拥有/可合成/锁定）
   - 融合路径高亮

4. **合成界面**（SynthesisTab）
   - 武器选择下拉框
   - 材料数量显示
   - 合成按钮（动态启用/禁用）
   - 合成动画

5. **波次间武器选择弹窗**（WeaponSelectModal）
   - 武器列表（过滤数量>0）
   - 武器详情预览
   - 确认装备按钮

**UI复杂度**: 中等（5个主要组件，Canvas渲染需要优化）

---

### 1.3 数据层操作统计

**从 data-flow.md 分析**：

| 操作类型 | 数量 | 说明 |
|---------|------|------|
| localStorage CRUD | 4 | save/load/remove/fallback |
| 数据迁移逻辑 | 1 | 老存档兼容（v1.x → v2.0） |
| 事务操作 | 2 | 合成事务、融合事务（含回滚） |
| 数据校验 | 3 | 格式校验、完整性校验、哈希校验 |

**总计**：10个数据层操作需要详细设计

---

### 1.4 前端模块估算

**纯前端项目**（Backend modules: 0）

**Frontend modules 估算**：

| 模块 | 职责 | 文件 |
|------|------|------|
| WeaponManager | 库存管理、合成逻辑、进化树配置 | weaponManager.js |
| WeaponUI | 弹窗UI、进化树渲染、库存界面 | weaponUI.js |
| StorageAdapter | localStorage抽象层、降级处理 | weaponManager.js（内部类） |
| EvolutionTreeRenderer | Canvas进化树绘制 | weaponUI.js（内部类） |
| SynthesisTransaction | 合成事务封装 | weaponManager.js（内部类） |

**Shared/utility modules 估算**：

| 模块 | 职责 | 文件 |
|------|------|------|
| ErrorHandler | 错误分类、分层处理、用户反馈 | errorHandler.js（可选） |
| EventBus | 模块间事件通信 | game.js（已有） |
| DataMigration | 存档版本迁移 | weaponManager.js（内部） |

**总计**：5个前端模块 + 3个共享模块 = **8个模块**

---

## 2. 实现单元统计

### 2.1 按设计师分类

| 设计师 | 单元数 | 单元类型 |
|--------|--------|----------|
| API Designer | 8 | WeaponManager接口方法 |
| Data Designer | 10 | 存储操作+迁移+事务 |
| Error Designer | 26 | 错误码（9分类×26个） |
| Test Designer | 7 | Gherkin场景 + 边界场景 |
| Frontend Designer | 5 | UI组件 |

**总计**：56个实现单元

---

## 3. 任务分配表

### 3.1 Designer-API（API详设专家）

**分配单元**：WeaponManager 8个接口方法

| 方法 | 职责 | 优先级 |
|------|------|--------|
| `getInventory()` | 获取武器库存 | P0 |
| `addToInventory(weaponId)` | 添加武器到库存 | P0 |
| `synthesizeWeapon(weaponId)` | 3:1合成 | P0 |
| `fuseUltimateWeapon()` | 终极融合 | P1 |
| `equipWeapon(weaponId)` | 装备武器 | P0 |
| `saveInventory()` | 持久化库存 | P0 |
| `loadInventory()` | 加载库存 | P0 |
| `validateInventory(inventory)` | 校验库存数据 | P0 |

**设计输出**：
- 每个方法的入参验证逻辑（V-NNN）
- 业务逻辑流程（STEP-NN）
- 出参构造逻辑
- 错误码映射表

**估算工时**：8小时

---

### 3.2 Designer-Data（数据详设专家）

**分配单元**：10个数据层操作

| 操作 | 职责 | 优先级 |
|------|------|--------|
| StorageAdapter.setItem() | 写入localStorage | P0 |
| StorageAdapter.getItem() | 读取localStorage | P0 |
| StorageAdapter.removeItem() | 删除数据 | P1 |
| StorageAdapter.fallbackToSession() | 降级到sessionStorage | P1 |
| DataMigration.detectVersion() | 检测存档版本 | P0 |
| DataMigration.migrateV1toV2() | v1.x → v2.0迁移 | P0 |
| SynthesisTransaction.begin() | 开始合成事务 | P0 |
| SynthesisTransaction.commit() | 提交事务 | P0 |
| SynthesisTransaction.rollback() | 回滚事务 | P0 |
| DataValidator.validateFormat() | 数据格式校验 | P0 |

**设计输出**：
- Repository层方法（RM-NNN）
- DTO/Entity转换（MAP-NNN）
- 查询优化（IDX-/NP-/QP-NNN）
- 事务边界（TX-/EC-NNN）
- 数据校验（CV-/RI-NNN）

**估算工时**：10小时

---

### 3.3 Designer-Error（错误处理详设专家）

**分配单元**：26个错误码（9个分类）

| 错误分类 | 错误码数量 | 示例 |
|---------|-----------|------|
| UI错误 | 3 | UI-001（Canvas未找到）、UI-002（不支持2D）、UI-003（帧率过低） |
| 业务错误 | 5 | BIZ-001（战斗中打开）、BIZ-002（材料不足）、BIZ-003（装备被合成）、BIZ-004（最高级）、BIZ-005（融合材料不足） |
| 存储错误 | 4 | STOR-001（容量超限）、STOR-002（不可用）、STOR-003（写入失败）、STOR-004（读取失败） |
| 数据错误 | 4 | DATA-001（未初始化）、DATA-002（格式错误）、DATA-003（损坏）、DATA-004（校验失败） |
| 事务错误 | 4 | TXN-001（锁冲突）、TXN-002（回滚失败）、TXN-003（并发冲突）、TXN-004（保存失败） |
| 迁移错误 | 3 | MIG-001（版本不兼容）、MIG-002（迁移失败）、MIG-003（数据丢失） |
| 并发错误 | 3 | CONC-001（多标签冲突）、CONC-002（重复提交）、CONC-003（状态不一致） |
| 安全错误 | 1 | SEC-001（数据篡改） |
| 兼容性错误 | 2 | COMPAT-001（浏览器不支持）、COMPAT-002（隐私模式限制） |

**设计输出**：
- 异常分类与传播路径（EX-/PATH-NNN）
- 接口错误映射表（含MUST_TEST）
- 降级与重试（RT-/CB-/DG-NNN）
- 日志规范
- 错误响应国际化

**估算工时**：6小时

---

### 3.4 Designer-Test（测试设计专家）

**分配单元**：7个Gherkin场景 + 12个边界场景

**Gherkin场景**（从 requirements 提取）：
1. 场景1：首次收集武器
2. 场景2：武器合成成功
3. 场景3：材料不足无法合成
4. 场景4：终极武器融合
5. 场景5：波次间武器切换
6. 场景6：战斗中无法切换武器
7. 场景7：进化树可视化

**边界场景**（从 requirements 5.1-5.3 提取）：
- 数据边界：库存为空、数量爆表、localStorage满、数据损坏
- 操作边界：连续点击、并发合成、切换未确认、战斗中库存变化
- 特殊情况：再次融合、装备被合成、循环依赖、未知武器

**设计输出**：
- 测试点清单
- 多层测试骨架（AAA伪代码）：
  - 单元测试（WeaponManager方法）
  - 集成测试（模块内：合成流程；模块间：UI+Manager）
  - 端到端测试（完整用户流程）
  - 契约测试（接口契约验证）
  - 组件测试（UI组件）
  - 快照测试（进化树渲染）
  - 异步集成测试（localStorage操作）
- 测试数据设计
- 测试优先级排序（P0-P3）

**估算工时**：12小时

---

### 3.5 Designer-Frontend（前端详设专家）

**分配单元**：5个UI组件

| 组件 | 职责 | 优先级 |
|------|------|--------|
| WeaponModal | 弹窗容器、标签页切换、暂停游戏 | P0 |
| InventoryTab | 库存网格、武器卡片、详情面板 | P0 |
| EvolutionTreeTab | Canvas树状图、节点渲染、路径连接 | P1 |
| SynthesisTab | 武器选择、材料显示、合成按钮 | P0 |
| WeaponSelectModal | 波次间选择、武器列表、确认装备 | P0 |

**设计输出**：
- 组件树（COMP-NNN）
- 状态管理设计（STATE-NNN）
- 页面组合方案（PAGE-NNN）
- 表单交互（FORM-NNN）

**估算工时**：10小时

---

## 4. 并行执行策略

### 4.1 依赖关系分析

```
Designer-API (WeaponManager接口)
    ↓ (依赖：接口定义完成)
Designer-Data (存储+事务实现)
    ↓ (依赖：数据层完成)
Designer-Error (错误处理策略)
    ↓ (依赖：错误码定义完成)
Designer-Frontend (UI组件设计)
    ↓ (依赖：API+数据层完成)
Designer-Test (测试设计)
    ↓ (依赖：所有设计完成)
```

---

### 4.2 并行执行计划（max_concurrency=2）

**Phase 1**（并行）：
- Designer-API（8小时）
- Designer-Data（10小时）

**Phase 2**（并行）：
- Designer-Error（6小时）
- Designer-Frontend（10小时）

**Phase 3**（串行）：
- Designer-Test（12小时）

**总耗时**：10h + 10h + 12h = **32小时**（约4个工作日）

---

### 4.3 优化建议

**如果允许 max_concurrency=3**，可优化为：

**Phase 1**（并行3个）：
- Designer-API（8小时）
- Designer-Data（10小时）
- Designer-Error（6小时）

**Phase 2**（并行2个）：
- Designer-Frontend（10小时）
- Designer-Test（12小时，可提前开始单元测试设计）

**总耗时**：10h + 12h = **22小时**（约3个工作日）

---

## 5. 成功标准

### 5.1 Designer-API 成功标准

- [ ] 8个接口方法的四部分设计完整（入参验证/业务流程/出参构造/错误映射）
- [ ] 每个方法有完整的伪代码级设计
- [ ] 错误码映射表覆盖所有异常分支
- [ ] 事务逻辑（synthesizeWeapon/fuseUltimateWeapon）包含回滚机制

---

### 5.2 Designer-Data 成功标准

- [ ] 10个数据层操作的五部分设计完整（Repository方法/DTO转换/查询优化/事务边界/数据校验）
- [ ] localStorage操作包含降级策略（fallback to sessionStorage）
- [ ] 数据迁移逻辑包含版本检测和转换规则
- [ ] 事务边界明确（begin/commit/rollback）

---

### 5.3 Designer-Error 成功标准

- [ ] 26个错误码的五部分设计完整（异常分类/传播路径/错误映射/降级重试/日志规范）
- [ ] 每个错误码有明确的用户反馈策略（弹窗/Toast/控制台）
- [ ] 分层错误处理策略清晰（UI层/应用层/数据层）
- [ ] 降级策略完整（Canvas渲染失败→文本版、localStorage失败→sessionStorage）

---

### 5.4 Designer-Test 成功标准

- [ ] 7个Gherkin场景的测试骨架完整（AAA格式伪代码）
- [ ] 12个边界场景的测试点清单完整
- [ ] 多层测试覆盖（单元/集成/E2E/契约/组件/快照/异步）
- [ ] 测试优先级排序合理（P0覆盖核心流程）
- [ ] 测试数据设计完整（正常数据/边界数据/异常数据）

---

### 5.5 Designer-Frontend 成功标准

- [ ] 5个UI组件的伪代码级设计完整（组件树/状态管理/页面组合/表单交互）
- [ ] Canvas进化树渲染逻辑清晰（节点布局/连接线/状态高亮）
- [ ] 状态管理设计合理（弹窗状态/标签页状态/合成状态）
- [ ] 交互逻辑完整（点击/悬停/禁用/动画）

---

## 6. 阻塞因素与依赖

### 6.1 关键依赖

| 依赖项 | 提供方 | 影响设计师 | 风险 |
|--------|--------|-----------|------|
| WeaponManager接口定义 | Designer-API | Data/Frontend/Test | 🟢 低（接口已在L1定义） |
| 错误码体系 | Designer-Error | API/Data/Frontend | 🟢 低（错误码已在L1定义） |
| 数据Schema | Designer-Data | API/Frontend | 🟢 低（Schema已在L1定义） |
| UI组件结构 | Designer-Frontend | Test | ⚠️ 中（需等待Frontend完成） |

---

### 6.2 潜在阻塞点

1. **Canvas渲染性能**（Frontend Designer）
   - 风险：进化树节点过多导致渲染卡顿
   - 缓解：限制节点数<50，使用离屏Canvas优化

2. **localStorage容量限制**（Data Designer）
   - 风险：库存数据过大导致存储失败
   - 缓解：限制每种武器最大999个，降级到sessionStorage

3. **事务并发冲突**（Data Designer）
   - 风险：多标签页同时合成导致数据不一致
   - 缓解：使用事务锁，检测并发冲突

4. **测试数据准备**（Test Designer）
   - 风险：需要大量测试数据（各种库存组合）
   - 缓解：使用数据工厂模式生成测试数据

---

## 7. 总结

### 7.1 设计师调用顺序

```
Phase 1 (并行2个，10小时):
  ├─ Designer-API (8小时)
  └─ Designer-Data (10小时)

Phase 2 (并行2个，10小时):
  ├─ Designer-Error (6小时)
  └─ Designer-Frontend (10小时)

Phase 3 (串行1个，12小时):
  └─ Designer-Test (12小时)
```

---

### 7.2 关键指标

| 指标 | 数值 |
|------|------|
| 设计师数量 | 5个 |
| 实现单元总数 | 56个 |
| 接口/方法数 | 23个 |
| UI组件数 | 5个 |
| 错误码数 | 26个 |
| 测试场景数 | 19个（7 Gherkin + 12 边界） |
| 总估算工时 | 32小时（约4个工作日） |
| 并行度 | max_concurrency=2 |

---

### 7.3 风险提示

⚠️ **中等风险**：
- Canvas进化树渲染性能（需优化）
- localStorage容量限制（需降级策略）
- 事务并发冲突（需锁机制）

🟢 **低风险**：
- 接口定义清晰（L1已完成）
- 错误码体系完整（L1已完成）
- 数据Schema明确（L1已完成）

---

**文档状态**: 草案（Draft）
**下一步**: 按Phase 1顺序启动 Designer-API 和 Designer-Data
