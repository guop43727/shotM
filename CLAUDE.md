# MONSTER TIDE

基于 HTML5 Canvas 的 3D 跑酷射击游戏，赛博朋克霓虹风格。原生 JS + CSS，无构建工具。

## 目录结构

```
shotM/
├── index.html           # 游戏主页面，UI 结构入口
├── game.js              # 游戏核心：Canvas 渲染循环、透视投影、碰撞检测、难度系统
├── style.css            # 赛博朋克样式（霓虹特效、发光动画）
├── weaponManager.js     # 武器管理系统（进化、合并、掉落逻辑）
├── weaponUI.js          # 武器 UI 展示组件
├── weaponWaveSelect.js  # 波次武器选择界面
├── weaponDropIntegration.js  # 武器掉落集成
├── weaponMergeAnimation.js   # 武器合并动画
├── tests/               # 单元测试（Jest）
├── scripts/             # 工程脚本（start/stop/restart/status）
└── hhspec/              # PD 流程工作目录
    ├── domains.yml          # 领域定义
    ├── specs/               # 全局规范库（architecture/）
    └── changes/             # 需求变更（每个变更一个子目录，含 specs/design/reviews/l3-state/）
```

## 开发说明

- 静态页面项目，直接在浏览器打开 `index.html` 即可运行
- 使用本地服务器可避免跨域问题：`bash scripts/start.sh [端口]`（默认 8000，依赖 Python 3）
- 测试：`npx jest`（tests/ 目录）
- 武器系统相关逻辑分布在 `weaponManager.js`、`weaponUI.js` 等 weapon*.js 模块中
- PD 变更记录在 `hhspec/changes/<变更名>/`，每个变更包含 L0→L4 完整制品
