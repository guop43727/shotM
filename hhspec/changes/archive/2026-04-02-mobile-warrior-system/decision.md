# 关键决策：mobile-warrior-system

## 决策1：实现模式选择

- **选择**：keys 状态对象 + gameLoop 每帧轮询
- **理由**：方向键需要持续按住产生连续移动效果。keydown 事件驱动会有 OS 按键重复延迟，逐帧轮询 keys 状态可实现丝滑无延迟的移动体验
- **备选**：纯事件驱动（每次 keydown 触发移动）—— 被否决：OS 按键重复延迟导致移动卡顿，不符合游戏手感

## 决策2：边界值计算方式

- **选择**：用 `GAME_CONSTANTS` 推导：`LEFT_BOUNDARY = canvas.width/2 - GAME_CONSTANTS.ROAD_WIDTH = 150`，`RIGHT_BOUNDARY = canvas.width/2 + GAME_CONSTANTS.ROAD_WIDTH = 750`
- **理由**：ROAD_WIDTH 已在 GAME_CONSTANTS 中定义，保持单一事实来源，未来调整道路宽度时边界自动同步
- **备选**：硬编码 150、750 —— 被否决：与 ROAD_WIDTH=300 常量产生隐性耦合，维护风险高

## 决策3：双键冲突策略

- **选择**：ArrowLeft + ArrowRight 同时按住时战士不移动（速度抵消为0）
- **理由**：两个方向同时激活语义上是"不知道往哪走"，停止最符合直觉；实现简单（if left && right → skip）
- **备选**：最后按下的键优先 —— 被否决：实现复杂（需跟踪按键顺序），且增益不明显

## 决策4：弹窗期间移动控制

- **选择**：波次结算弹窗显示期间禁止移动（检测 game.waveActive === false）
- **理由**：弹窗期间游戏实质暂停（无敌人、无射击），允许移动会产生无意义的状态变化，且下一波次开始时战士位置可能出现预期外偏移
- **备选**：弹窗期间允许移动 —— 被否决：与用户认知不符

## 决策5：player.speed 初始值

- **选择**：5 px/帧，加入 player 对象作为属性（`player.speed = 5`）
- **理由**：60fps 下 300px/s，从中心450到边界150/750约需1秒，手感适中；作为 player 属性便于未来被数字门、难度系统等动态修改
- **备选**：加入 GAME_CONSTANTS —— 被否决：speed 是 player 的属性而非全局游戏参数，语义上属于 player 对象
