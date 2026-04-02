---
title: "Weapon Evolution System - Frontend Detailed Design"
module: "WEAPON"
version: "1.0"
date: "2026-03-27"
author: "l2_frontend_designer"
status: "draft"
change: "weapon-evolution-system"
units: "43-47"
---

# Weapon Evolution System - Frontend Detailed Design

## 1. Design Overview

### 1.1 Design Scope

This document provides pseudo-code level detailed design for:
- **5 UI Components**: WeaponModal, InventoryTab, EvolutionTreeTab, SynthesisTab, EvolutionTreeCanvas (Units 43-47)
- **State Management**: Modal state, tab state, animation state
- **Event Handlers**: Click, hover, keyboard interactions
- **Rendering Logic**: DOM manipulation and Canvas rendering

### 1.2 Referenced Documents

- Requirements: `weapon-evolution-requirements.md` (Section 6: UI wireframes, US-WEP-007~009)
- API Contracts: `api-contracts/README.md` (WeaponUI interface)
- API Design: `api-design.md` (WeaponUI methods)
- Task Distribution: `l2-task-distribution.md` (Units 43-47 assignment)
- Existing Game Code: `game.js` (Cyberpunk styling patterns, Canvas rendering)

### 1.3 Technology Stack

- **UI Framework**: Pure HTML/CSS/JavaScript (no React/Vue/Angular)
- **Canvas**: HTML5 Canvas 2D API for evolution tree rendering
- **Styling**: Cyberpunk theme (neon glow, dark gradients)
- **Data Persistence**: None at UI layer (handled by WeaponManager)

### 1.4 Design Principles

- **Pseudo-code level**: Not runnable code, but detailed enough for L3 implementation
- **Evidence-based**: All components traced to L0 UI wireframes (Section 6)
- **No framework syntax**: Avoid Vue/React specific APIs
- **No CSS details**: Class naming only, no actual styles
- **Performance notes**: Identify optimization points, not implement

---

## 2. Component Hierarchy

### 2.1 Component Tree

```
WeaponModal (COMP-001)
├── ModalHeader
│   ├── Title: "武器管理"
│   └── CloseButton [X]
├── TabNavigation
│   ├── InventoryTab (COMP-002) [库存]
│   ├── EvolutionTreeTab (COMP-003) [进化树]
│   └── SynthesisTab (COMP-004) [合成]
└── TabContent
    ├── InventoryTabContent
    │   ├── WeaponGrid
    │   │   └── WeaponCard[] (icon, name, count, tier badge)
    │   └── WeaponDetailsPanel (optional)
    ├── EvolutionTreeTabContent
    │   ├── EvolutionTreeCanvas (COMP-005)
    │   └── NodeTooltip (hover overlay)
    └── SynthesisTabContent
        ├── WeaponSelector (dropdown)
        ├── MaterialInfo (count display)
        └── SynthesisButton (enabled/disabled)
```

**L0 Trace**: weapon-evolution-requirements.md Section 6.1 (武器管理弹窗结构)

---

## 3. Part 1: Component Detailed Design

### COMP-001: WeaponModal (Main Container)

**Purpose**: Main modal container for weapon management interface

**L0 Trace**: FR-WEP-006 (武器管理弹窗), Scenario 6 (战斗中无法打开)

#### 3.1.1 Component Structure (HTML Elements)

```
STRUCTURE WeaponModal
  CONTAINER: <div id="weapon-management-modal" class="modal">
    OVERLAY: <div class="modal-overlay">
    CONTENT: <div class="modal-content weapon-modal">
      HEADER: <div class="modal-header">
        TITLE: <h2>武器管理</h2>
        CLOSE_BTN: <button class="close-button" aria-label="关闭">[X]</button>
      TAB_NAV: <div class="tab-navigation">
        TAB_1: <button class="tab-button active" data-tab="inventory">库存</button>
        TAB_2: <button class="tab-button" data-tab="evolution">进化树</button>
        TAB_3: <button class="tab-button" data-tab="synthesis">合成</button>
      TAB_CONTENT: <div class="tab-content-container">
        <!-- Dynamic content based on active tab -->
```

**CSS Class Naming Convention**: BEM (Block__Element--Modifier)
- Block: `.weapon-modal`
- Elements: `.weapon-modal__header`, `.weapon-modal__tab-nav`, `.weapon-modal__content`
- Modifiers: `.weapon-modal--hidden`, `.tab-button--active`

**Accessibility**:
- `role="dialog"` on modal container
- `aria-labelledby="modal-title"` for screen readers
- `aria-hidden="true"` when closed
- Focus trap: Tab key cycles within modal
- ESC key closes modal

---

#### 3.1.2 Props/State

**State** (managed internally):
```
STATE modalState
  isOpen: boolean = false
  currentTab: string = 'inventory' // 'inventory' | 'evolution' | 'synthesis'
  isAnimating: boolean = false // Prevents rapid open/close
  lastOpenedTab: string = 'inventory' // Remember user's last tab
```

**No Props** (standalone component, no parent)

**State Source**: Inferred from api-design.md Unit 9 (openWeaponModal sets modalState.isOpen)

---

#### 3.1.3 Event Handlers

**EH-001: Open Modal**
```
HANDLER openModal()
  INPUT: None (triggered by external button click)

  STEP-01: Validate game state
    IF game.waveActive === true:
      CALL showWarning("战斗中无法打开武器管理!")
      RETURN early

  STEP-02: Show modal with animation
    modalElement.style.display = 'block'
    modalElement.setAttribute('aria-hidden', 'false')
    // Wait for display:block to take effect
    requestAnimationFrame(() => {
      modalElement.classList.add('show') // Triggers CSS transition
    })

  STEP-03: Update state
    modalState.isOpen = true
    modalState.currentTab = modalState.lastOpenedTab || 'inventory'

  STEP-04: Pause game and emit event
    game.pause()
    EventBus.emit('weapon:modal:open')

  STEP-05: Render active tab
    CALL renderActiveTab()

  STEP-06: Set focus trap
    CALL setupFocusTrap(modalElement)

  SOURCE: api-design.md Unit 9, weapon-evolution-requirements.md Scenario 6
```

**EH-002: Close Modal**
```
HANDLER closeModal()
  INPUT: None (triggered by close button or ESC key)

  STEP-01: Check if modal is open
    IF modalState.isOpen === false:
      RETURN early (idempotent)

  STEP-02: Hide modal with animation
    modalElement.classList.remove('show') // Triggers CSS transition
    // Wait for transition to complete (300ms)
    setTimeout(() => {
      modalElement.style.display = 'none'
      modalElement.setAttribute('aria-hidden', 'true')
    }, 300)

  STEP-03: Update state
    modalState.isOpen = false
    modalState.lastOpenedTab = modalState.currentTab

  STEP-04: Resume game and emit event
    game.resume()
    EventBus.emit('weapon:modal:close')

  STEP-05: Remove focus trap
    CALL removeFocusTrap()

  SOURCE: api-design.md Unit 10
```

**EH-003: Switch Tab**
```
HANDLER switchTab(tabName: string)
  INPUT: tabName - 'inventory' | 'evolution' | 'synthesis'

  STEP-01: Validate tab name
    IF tabName NOT IN ['inventory', 'evolution', 'synthesis']:
      console.warn(`Unknown tab: ${tabName}`)
      RETURN early

  STEP-02: Update active tab UI
    previousTab = document.querySelector('.tab-button--active')
    previousTab.classList.remove('tab-button--active')

    newTab = document.querySelector(`[data-tab="${tabName}"]`)
    newTab.classList.add('tab-button--active')

  STEP-03: Update state
    modalState.currentTab = tabName

  STEP-04: Render new tab content
    CALL renderActiveTab()

  SOURCE: Inferred from UI wireframe (Section 6.1)
```

**EH-004: Handle ESC Key**
```
HANDLER handleKeyDown(event: KeyboardEvent)
  INPUT: event from keydown listener

  IF event.key === 'Escape' AND modalState.isOpen === true:
    event.preventDefault()
    CALL closeModal()

  SOURCE: Accessibility requirement (ARIA best practices)
```

---

#### 3.1.4 Rendering Logic (Pseudo-code)

**RL-001: Render Active Tab**
```
METHOD renderActiveTab()
  RETURNS: void

  STEP-01: Get tab content container
    container = document.querySelector('.tab-content-container')

  STEP-02: Render based on current tab
    SWITCH modalState.currentTab:
      CASE 'inventory':
        CALL renderInventoryTab(container)
      CASE 'evolution':
        CALL renderEvolutionTreeTab(container)
      CASE 'synthesis':
        CALL renderSynthesisTab(container)
      DEFAULT:
        console.error(`Invalid tab: ${modalState.currentTab}`)

  SOURCE: Inferred from tab structure
```

---

#### 3.1.5 Performance Optimization Notes

- **Open/Close Animation**: CSS transition (300ms), hardware-accelerated (transform/opacity)
- **Tab Switching**: Clear previous tab content before rendering new tab (prevent memory leak)
- **Focus Trap**: Use delegated event listeners (one listener on modal, not per element)
- **Event Cleanup**: Remove all event listeners when modal closes

**[OPTIMIZATION]**: If tab content is complex (evolution tree), consider caching rendered content instead of re-rendering on every tab switch.

---

### COMP-002: InventoryTab (Weapon List View)

**Purpose**: Display all owned weapons in a grid layout with counts and tier badges

**L0 Trace**: US-WEP-007 (武器库存可视化), Scenario 1 (首次收集武器)

#### 3.2.1 Component Structure (HTML Grid Layout)

```
STRUCTURE InventoryTabContent
  CONTAINER: <div class="inventory-tab">
    FILTERS: <div class="inventory-filters">
      SORT_BY: <select id="sort-by">
        <option value="tier">按等级排序</option>
        <option value="count">按数量排序</option>
        <option value="name">按名称排序</option>
      FILTER_BY: <select id="filter-by">
        <option value="all">全部武器</option>
        <option value="owned">已拥有</option>
        <option value="tier1">Tier 1</option>
        <option value="tier2">Tier 2</option>
        <!-- ... more tiers -->
    GRID: <div class="weapon-grid">
      <!-- Dynamic weapon cards -->
```

**Weapon Card Structure**:
```
CARD WeaponCard
  CONTAINER: <div class="weapon-card" data-weapon-id="${weaponId}">
    ICON_WRAPPER: <div class="weapon-icon-wrapper">
      ICON: <div class="weapon-icon" style="background: ${weaponColor}">
        <!-- SVG icon or emoji -->
      TIER_BADGE: <span class="tier-badge">Tier ${tier}</span>
    INFO: <div class="weapon-info">
      NAME: <div class="weapon-name">${weaponName}</div>
      COUNT: <div class="weapon-count">x${count}</div>
    STATUS: <div class="weapon-status">
      <!-- "已装备" badge if equipped -->
      <!-- "可合成" badge if canMerge -->
      <!-- "锁定" badge if count === 0 -->
```

**Grid Layout** (CSS Grid):
- Columns: 4-6 columns (responsive to modal width)
- Gap: 16px between cards
- Card size: ~120px width, auto height

**L0 Trace**: weapon-evolution-requirements.md Section 6.1 (库存标签页)

---

#### 3.2.2 Props/State

**Props** (passed from parent):
```
PROPS InventoryTabProps
  None (fetches data internally via weaponManager.getInventory())
```

**State** (internal):
```
STATE inventoryTabState
  sortBy: string = 'tier' // 'tier' | 'count' | 'name'
  filterBy: string = 'all' // 'all' | 'owned' | 'tier1' | 'tier2' | ...
  selectedWeaponId: string | null = null // For details panel
```

---

#### 3.2.3 Event Handlers

**EH-005: Render Inventory Grid**
```
HANDLER renderInventoryTab(container: HTMLElement)
  INPUT: container - DOM element to render into

  STEP-01: Fetch inventory data
    inventory = weaponManager.getInventory()
    // Returns: {rifle: 5, "rifle+": 1, machinegun: 2, ...}

  STEP-02: Build weapon array with config
    weaponArray = []
    FOR EACH weaponId IN weaponConfig:
      config = weaponConfig[weaponId]
      count = inventory[weaponId] || 0
      canMerge = weaponManager.canMerge(weaponId).canMerge
      isEquipped = (player.weapon.id === weaponId)

      weaponArray.push({
        id: weaponId,
        name: config.name,
        tier: config.tier,
        count: count,
        color: config.color,
        isOwned: count > 0,
        canMerge: canMerge,
        isEquipped: isEquipped
      })

  STEP-03: Apply sorting
    CALL sortWeaponArray(weaponArray, inventoryTabState.sortBy)

  STEP-04: Apply filtering
    filteredWeapons = CALL filterWeaponArray(weaponArray, inventoryTabState.filterBy)

  STEP-05: Build grid HTML
    gridHTML = '<div class="weapon-grid">'
    FOR EACH weapon IN filteredWeapons:
      cardHTML = CALL buildWeaponCard(weapon)
      gridHTML += cardHTML
    gridHTML += '</div>'

  STEP-06: Render to container
    container.innerHTML = `
      ${buildFilterControls()}
      ${gridHTML}
    `

  STEP-07: Attach click event listeners
    cards = container.querySelectorAll('.weapon-card')
    FOR EACH card IN cards:
      weaponId = card.dataset.weaponId
      card.addEventListener('click', () => {
        CALL showWeaponDetails(weaponId)
      })
      card.addEventListener('mouseenter', () => {
        card.classList.add('weapon-card--hover')
      })
      card.addEventListener('mouseleave', () => {
        card.classList.remove('weapon-card--hover')
      })

  SOURCE: weapon-evolution-requirements.md US-WEP-007, api-design.md Unit 11
```

**EH-006: Build Weapon Card HTML**
```
METHOD buildWeaponCard(weapon: Object)
  RETURNS: string (HTML)

  INPUT: weapon = {id, name, tier, count, color, isOwned, canMerge, isEquipped}

  STEP-01: Determine card state classes
    stateClasses = []
    IF weapon.isOwned:
      stateClasses.push('weapon-card--owned')
    ELSE:
      stateClasses.push('weapon-card--locked')

    IF weapon.isEquipped:
      stateClasses.push('weapon-card--equipped')

    IF weapon.canMerge:
      stateClasses.push('weapon-card--can-merge')

  STEP-02: Build badge HTML
    badgeHTML = ''
    IF weapon.isEquipped:
      badgeHTML += '<span class="badge badge--equipped">已装备</span>'
    IF weapon.canMerge:
      badgeHTML += '<span class="badge badge--can-merge">可合成</span>'
    IF NOT weapon.isOwned:
      badgeHTML += '<span class="badge badge--locked">未拥有</span>'

  STEP-03: Build card HTML
    RETURN `
      <div class="weapon-card ${stateClasses.join(' ')}"
           data-weapon-id="${weapon.id}"
           role="button"
           tabindex="0"
           aria-label="${weapon.name}, 拥有 ${weapon.count} 个">
        <div class="weapon-icon-wrapper">
          <div class="weapon-icon" style="background-color: ${weapon.color}">
            <!-- Placeholder icon, could be emoji or SVG -->
            🔫
          </div>
          <span class="tier-badge tier-${weapon.tier}">T${weapon.tier}</span>
        </div>
        <div class="weapon-info">
          <div class="weapon-name">${weapon.name}</div>
          <div class="weapon-count">x${weapon.count}</div>
        </div>
        ${badgeHTML}
      </div>
    `

  SOURCE: Inferred from weapon card structure in Section 6.1
```

**EH-007: Sort Weapon Array**
```
METHOD sortWeaponArray(weaponArray: Array, sortBy: string)
  RETURNS: void (mutates array in place)

  INPUT: weaponArray, sortBy - 'tier' | 'count' | 'name'

  SWITCH sortBy:
    CASE 'tier':
      weaponArray.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    CASE 'count':
      weaponArray.sort((a, b) => b.count - a.count || a.tier - b.tier)
    CASE 'name':
      weaponArray.sort((a, b) => a.name.localeCompare(b.name))

  SOURCE: Inferred from sort options
```

**EH-008: Filter Weapon Array**
```
METHOD filterWeaponArray(weaponArray: Array, filterBy: string)
  RETURNS: Array (filtered copy)

  INPUT: weaponArray, filterBy - 'all' | 'owned' | 'tier1' | 'tier2' | ...

  SWITCH filterBy:
    CASE 'all':
      RETURN weaponArray
    CASE 'owned':
      RETURN weaponArray.filter(w => w.isOwned)
    CASE 'tier1':
      RETURN weaponArray.filter(w => w.tier === 1)
    CASE 'tier2':
      RETURN weaponArray.filter(w => w.tier === 2)
    // ... more tier filters

  SOURCE: Inferred from filter options
```

**EH-009: Show Weapon Details (Click Handler)**
```
METHOD showWeaponDetails(weaponId: string)
  RETURNS: void

  INPUT: weaponId from clicked card

  STEP-01: Get weapon config and inventory count
    config = weaponConfig[weaponId]
    inventory = weaponManager.getInventory()
    count = inventory[weaponId] || 0

  STEP-02: Build details panel HTML
    detailsHTML = `
      <div class="weapon-details-panel" id="weapon-details">
        <h3>${config.name}</h3>
        <p class="tier-label">等级: Tier ${config.tier}</p>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">伤害:</span>
            <span class="stat-value">${config.damage}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">射速:</span>
            <span class="stat-value">${config.fireRate}ms</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">拥有数量:</span>
            <span class="stat-value">${count}</span>
          </div>
        </div>
        ${count > 0 ? '<button class="equip-button">装备</button>' : ''}
        <button class="close-details-button">关闭</button>
      </div>
    `

  STEP-03: Show details panel (modal overlay)
    container = document.querySelector('.inventory-tab')
    existingPanel = container.querySelector('.weapon-details-panel')
    IF existingPanel:
      existingPanel.remove() // Close previous panel

    container.insertAdjacentHTML('beforeend', detailsHTML)

  STEP-04: Attach event listeners
    panel = document.getElementById('weapon-details')

    equipButton = panel.querySelector('.equip-button')
    IF equipButton:
      equipButton.addEventListener('click', () => {
        weaponManager.equipWeapon(weaponId)
        CALL closeModal() // Close weapon management modal
      })

    closeButton = panel.querySelector('.close-details-button')
    closeButton.addEventListener('click', () => {
      panel.remove()
    })

  SOURCE: weapon-evolution-requirements.md US-WEP-007 (点击武器查看详细属性)
```

---

#### 3.2.4 Performance Optimization Notes

- **Virtual Scrolling**: [OPTIONAL] If weapon count > 50, implement virtual scrolling (only render visible cards)
- **Debounced Filtering**: Debounce filter/sort changes to avoid excessive re-renders
- **Event Delegation**: Use single click listener on grid container instead of per-card listeners
- **Lazy Icon Loading**: [OPTIONAL] If using custom SVG icons, load only visible icons

---

### COMP-003: EvolutionTreeTab (Canvas Evolution Tree)

**Purpose**: Render interactive evolution tree showing all weapon upgrade paths

**L0 Trace**: US-WEP-008 (进化树可视化), Scenario 7 (查看进化路径), FR-WEP-003 (多路径进化树)

#### 3.3.1 Component Structure (Canvas Wrapper)

```
STRUCTURE EvolutionTreeTabContent
  CONTAINER: <div class="evolution-tab">
    CANVAS_WRAPPER: <div class="canvas-wrapper">
      CANVAS: <canvas id="evolution-tree-canvas" width="800" height="600"></canvas>
      TOOLTIP: <div id="tree-tooltip" class="tree-tooltip hidden">
        <!-- Dynamic tooltip content on hover -->
    CONTROLS: <div class="tree-controls">
      ZOOM_IN: <button id="zoom-in">+</button>
      ZOOM_OUT: <button id="zoom-out">-</button>
      RESET_VIEW: <button id="reset-view">重置视图</button>
```

**Canvas Layout**:
- Width: 800px (scales to modal width)
- Height: 600px
- 3 horizontal paths (Rifle, Machinegun, Shotgun)
- 1 convergence point (Ultimate Laser)

**L0 Trace**: weapon-evolution-requirements.md Section 6.1 (进化树标签页), FR-WEP-003 (进化路径定义)

---

#### 3.3.2 Props/State

**State** (internal):
```
STATE evolutionTreeState
  zoomLevel: number = 1.0 // 0.5 ~ 2.0
  panOffset: {x: number, y: number} = {x: 0, y: 0}
  hoveredNodeId: string | null = null
  treeData: Object = null // Cached from weaponManager.getEvolutionTree()
```

---

#### 3.3.3 Event Handlers & Rendering Logic

**EH-010: Render Evolution Tree Tab**
```
HANDLER renderEvolutionTreeTab(container: HTMLElement)
  INPUT: container - DOM element to render into

  STEP-01: Build canvas wrapper HTML
    container.innerHTML = `
      <div class="evolution-tab">
        <div class="canvas-wrapper">
          <canvas id="evolution-tree-canvas" width="800" height="600"></canvas>
          <div id="tree-tooltip" class="tree-tooltip hidden"></div>
        </div>
        <div class="tree-controls">
          <button id="zoom-in" aria-label="放大">+</button>
          <button id="zoom-out" aria-label="缩小">-</button>
          <button id="reset-view" aria-label="重置视图">重置</button>
        </div>
      </div>
    `

  STEP-02: Get Canvas context
    canvas = document.getElementById('evolution-tree-canvas')
    ctx = canvas.getContext('2d')
    IF ctx === null:
      // Fallback to text mode
      CALL renderTextModeEvolutionTree(container)
      RETURN early

  STEP-03: Fetch evolution tree data
    evolutionTreeState.treeData = weaponManager.getEvolutionTree()
    // Returns: {paths: [[rifle nodes], [mg nodes], [sg nodes]], fusion: ultimateNode}

  STEP-04: Render tree to canvas
    CALL renderEvolutionTreeCanvas(ctx, evolutionTreeState.treeData)

  STEP-05: Attach interaction event listeners
    CALL attachTreeInteractionListeners(canvas)

  STEP-06: Attach control button listeners
    document.getElementById('zoom-in').addEventListener('click', () => {
      evolutionTreeState.zoomLevel = Math.min(2.0, evolutionTreeState.zoomLevel + 0.2)
      CALL rerenderTree()
    })

    document.getElementById('zoom-out').addEventListener('click', () => {
      evolutionTreeState.zoomLevel = Math.max(0.5, evolutionTreeState.zoomLevel - 0.2)
      CALL rerenderTree()
    })

    document.getElementById('reset-view').addEventListener('click', () => {
      evolutionTreeState.zoomLevel = 1.0
      evolutionTreeState.panOffset = {x: 0, y: 0}
      CALL rerenderTree()
    })

  SOURCE: api-design.md Unit 12, weapon-evolution-requirements.md US-WEP-008
```

**EH-011: Render Evolution Tree Canvas (Core Rendering)**
```
METHOD renderEvolutionTreeCanvas(ctx: CanvasRenderingContext2D, treeData: Object)
  RETURNS: void

  INPUT: ctx - Canvas 2D context, treeData from weaponManager.getEvolutionTree()

  STEP-01: Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

  STEP-02: Apply zoom and pan transformations
    ctx.save()
    ctx.translate(evolutionTreeState.panOffset.x, evolutionTreeState.panOffset.y)
    ctx.scale(evolutionTreeState.zoomLevel, evolutionTreeState.zoomLevel)

  STEP-03: Define tree layout parameters
    pathVerticalSpacing = 150 // Vertical space between paths
    tierHorizontalSpacing = 150 // Horizontal space between tiers
    nodeRadius = 40
    startX = 100
    startY = 100

  STEP-04: Render 3 parallel evolution paths
    FOR pathIndex, path IN treeData.paths:
      pathY = startY + (pathIndex * pathVerticalSpacing)

      FOR tierIndex, node IN path:
        nodeX = startX + (tierIndex * tierHorizontalSpacing)
        nodeY = pathY

        // Store node position for hit detection
        node._position = {x: nodeX, y: nodeY, radius: nodeRadius}

        // Draw connection line to next tier
        IF tierIndex < path.length - 1:
          nextNodeX = nodeX + tierHorizontalSpacing
          nextNodeY = nodeY
          CALL drawConnectionLine(ctx, nodeX, nodeY, nextNodeX, nextNodeY, node)

        // Draw node
        CALL drawTreeNode(ctx, node, nodeX, nodeY, nodeRadius)

  STEP-05: Render fusion convergence lines
    fusionNode = treeData.fusion
    fusionX = startX + (4 * tierHorizontalSpacing) + 50
    fusionY = startY + pathVerticalSpacing // Center between 3 paths

    // Draw lines from 3 Super weapons to Ultimate
    superRifleNode = treeData.paths[0][3] // Last node of rifle path
    superMGNode = treeData.paths[1][3]
    superSGNode = treeData.paths[2][3]

    CALL drawFusionLine(ctx, superRifleNode._position, {x: fusionX, y: fusionY}, fusionNode.canFuse)
    CALL drawFusionLine(ctx, superMGNode._position, {x: fusionX, y: fusionY}, fusionNode.canFuse)
    CALL drawFusionLine(ctx, superSGNode._position, {x: fusionX, y: fusionY}, fusionNode.canFuse)

  STEP-06: Render ultimate fusion node
    fusionNode._position = {x: fusionX, y: fusionY, radius: nodeRadius + 10}
    CALL drawTreeNode(ctx, fusionNode, fusionX, fusionY, nodeRadius + 10, {isUltimate: true})

  STEP-07: Restore canvas state
    ctx.restore()

  SOURCE: weapon-evolution-requirements.md FR-WEP-003 (进化路径定义), Section 6.1 (进化树可视化)
```

**EH-012: Draw Tree Node**
```
METHOD drawTreeNode(ctx: CanvasRenderingContext2D, node: Object, x: number, y: number, radius: number, options: Object = {})
  RETURNS: void

  INPUT:
    ctx - Canvas context
    node = {id, tier, owned, count, canFuse (for ultimate only)}
    x, y - Node center position
    radius - Node circle radius
    options = {isUltimate: boolean}

  STEP-01: Determine node state colors
    IF options.isUltimate:
      fillColor = node.owned ? '#00ffff' : '#333333'
      strokeColor = '#00ffff'
      glowColor = 'rgba(0, 255, 255, 0.5)'
    ELSE IF node.owned AND node.canMerge:
      fillColor = weaponConfig[node.id].color
      strokeColor = '#ffeb3b' // Yellow border for mergeable
      glowColor = 'rgba(255, 235, 59, 0.6)'
    ELSE IF node.owned:
      fillColor = weaponConfig[node.id].color
      strokeColor = '#8eff71' // Green border for owned
      glowColor = 'rgba(142, 255, 113, 0.4)'
    ELSE:
      fillColor = '#222222' // Dark gray for locked
      strokeColor = '#555555'
      glowColor = 'rgba(100, 100, 100, 0.3)'

  STEP-02: Draw glow effect (if owned)
    IF node.owned:
      ctx.shadowBlur = 20
      ctx.shadowColor = glowColor

  STEP-03: Draw node circle
    ctx.fillStyle = fillColor
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0 // Reset shadow

  STEP-04: Draw tier badge
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    tierText = options.isUltimate ? 'ULT' : `T${node.tier}`
    ctx.fillText(tierText, x, y - radius - 15)

  STEP-05: Draw weapon name
    weaponName = options.isUltimate ? 'Ultimate Laser' : weaponConfig[node.id].name
    ctx.font = '10px Arial'
    ctx.fillText(weaponName, x, y + radius + 10)

  STEP-06: Draw count badge (if owned)
    IF node.owned:
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial'
      ctx.fillText(`x${node.count}`, x, y + 5)

  STEP-07: Draw hover highlight (if hovered)
    IF evolutionTreeState.hoveredNodeId === node.id:
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2)
      ctx.stroke()

  SOURCE: Inferred from Scenario 7 (已拥有武器高亮显示, 可合成武器突出提示)
```

**EH-013: Draw Connection Line**
```
METHOD drawConnectionLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, node: Object)
  RETURNS: void

  INPUT: Start point (x1, y1), end point (x2, y2), source node data

  STEP-01: Determine line style based on node state
    IF node.owned:
      strokeColor = weaponConfig[node.id].color
      lineWidth = 3
      dashArray = [] // Solid line
    ELSE:
      strokeColor = '#555555'
      lineWidth = 2
      dashArray = [5, 5] // Dashed line for locked path

  STEP-02: Draw line with arrow
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dashArray)

    ctx.beginPath()
    ctx.moveTo(x1 + 40, y1) // Start from node edge
    ctx.lineTo(x2 - 40, y2) // End at next node edge
    ctx.stroke()

    ctx.setLineDash([]) // Reset dash

  STEP-03: Draw arrow head
    arrowX = x2 - 40
    arrowY = y2
    arrowSize = 8

    ctx.fillStyle = strokeColor
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowY)
    ctx.lineTo(arrowX - arrowSize, arrowY - arrowSize / 2)
    ctx.lineTo(arrowX - arrowSize, arrowY + arrowSize / 2)
    ctx.closePath()
    ctx.fill()

  SOURCE: Inferred from tree visualization requirements
```

**EH-014: Draw Fusion Line (Convergence)**
```
METHOD drawFusionLine(ctx: CanvasRenderingContext2D, startPos: Object, endPos: Object, canFuse: boolean)
  RETURNS: void

  INPUT: startPos = {x, y}, endPos = {x, y}, canFuse - boolean

  STEP-01: Determine line style
    IF canFuse:
      strokeColor = '#00ffff'
      lineWidth = 4
      dashArray = []
    ELSE:
      strokeColor = '#555555'
      lineWidth = 2
      dashArray = [5, 5]

  STEP-02: Draw curved line (quadratic curve)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dashArray)

    // Calculate control point for curve
    midX = (startPos.x + endPos.x) / 2
    midY = (startPos.y + endPos.y) / 2 - 50 // Curve upward

    ctx.beginPath()
    ctx.moveTo(startPos.x, startPos.y)
    ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y)
    ctx.stroke()

    ctx.setLineDash([])

  SOURCE: weapon-evolution-requirements.md FR-WEP-004 (融合路径可视化)
```

**EH-015: Attach Tree Interaction Listeners**
```
METHOD attachTreeInteractionListeners(canvas: HTMLCanvasElement)
  RETURNS: void

  INPUT: canvas element

  STEP-01: Mousemove listener for hover tooltip
    canvas.addEventListener('mousemove', (event) => {
      mouseX = event.offsetX / evolutionTreeState.zoomLevel - evolutionTreeState.panOffset.x
      mouseY = event.offsetY / evolutionTreeState.zoomLevel - evolutionTreeState.panOffset.y

      hoveredNode = CALL detectNodeAtPosition(mouseX, mouseY)

      IF hoveredNode !== null:
        evolutionTreeState.hoveredNodeId = hoveredNode.id
        CALL showNodeTooltip(hoveredNode, event.pageX, event.pageY)
        CALL rerenderTree() // Re-render with hover highlight
      ELSE:
        evolutionTreeState.hoveredNodeId = null
        CALL hideNodeTooltip()
        CALL rerenderTree()
    })

  STEP-02: Click listener for locked nodes
    canvas.addEventListener('click', (event) => {
      mouseX = event.offsetX / evolutionTreeState.zoomLevel - evolutionTreeState.panOffset.x
      mouseY = event.offsetY / evolutionTreeState.zoomLevel - evolutionTreeState.panOffset.y

      clickedNode = CALL detectNodeAtPosition(mouseX, mouseY)

      IF clickedNode !== null AND NOT clickedNode.owned:
        // Show unlock requirements
        CALL showUnlockRequirements(clickedNode)
    })

  STEP-03: [OPTIONAL] Pan functionality (mouse drag)
    // Not in MVP, mark as future enhancement

  SOURCE: weapon-evolution-requirements.md US-WEP-008 (hover to show details, click locked node)
```

**EH-016: Detect Node at Position (Hit Detection)**
```
METHOD detectNodeAtPosition(mouseX: number, mouseY: number)
  RETURNS: Object | null (node data or null if no hit)

  INPUT: mouseX, mouseY - Mouse position on canvas

  STEP-01: Check all path nodes
    FOR path IN evolutionTreeState.treeData.paths:
      FOR node IN path:
        IF node._position exists:
          distance = SQRT((mouseX - node._position.x)^2 + (mouseY - node._position.y)^2)
          IF distance <= node._position.radius:
            RETURN node

  STEP-02: Check fusion node
    fusionNode = evolutionTreeState.treeData.fusion
    IF fusionNode._position exists:
      distance = SQRT((mouseX - fusionNode._position.x)^2 + (mouseY - fusionNode._position.y)^2)
      IF distance <= fusionNode._position.radius:
        RETURN fusionNode

  STEP-03: No hit
    RETURN null

  SOURCE: Inferred from hover interaction requirement
```

**EH-017: Show/Hide Node Tooltip**
```
METHOD showNodeTooltip(node: Object, mouseX: number, mouseY: number)
  RETURNS: void

  INPUT: node data, mouse position

  STEP-01: Get weapon config
    config = weaponConfig[node.id]

  STEP-02: Build tooltip HTML
    tooltipHTML = `
      <div class="tooltip-header">${config.name}</div>
      <div class="tooltip-content">
        <p>等级: Tier ${node.tier}</p>
        <p>伤害: ${config.damage}</p>
        <p>射速: ${config.fireRate}ms</p>
        <p>拥有: ${node.count}</p>
        ${node.canMerge ? '<p class="highlight">可合成!</p>' : ''}
      </div>
    `

  STEP-03: Position and show tooltip
    tooltip = document.getElementById('tree-tooltip')
    tooltip.innerHTML = tooltipHTML
    tooltip.style.left = `${mouseX + 15}px`
    tooltip.style.top = `${mouseY + 15}px`
    tooltip.classList.remove('hidden')

  SOURCE: Inferred from hover requirement in Scenario 7
```

```
METHOD hideNodeTooltip()
  RETURNS: void

  tooltip = document.getElementById('tree-tooltip')
  tooltip.classList.add('hidden')
```

**EH-018: Show Unlock Requirements (Click Locked Node)**
```
METHOD showUnlockRequirements(node: Object)
  RETURNS: void

  INPUT: node data (locked node)

  STEP-01: Get previous tier node
    path = FIND path containing node.id IN treeData.paths
    nodeIndex = FIND index of node IN path
    IF nodeIndex === 0:
      requirement = "通过击中掉落箱获得"
    ELSE:
      previousNode = path[nodeIndex - 1]
      requirement = `需要先获得 ${weaponConfig[previousNode.id].name}`

  STEP-02: Show alert or modal
    alert(`解锁 ${weaponConfig[node.id].name}:\n${requirement}`)

  SOURCE: Inferred from US-WEP-008 (显示解锁路径)
```

---

#### 3.3.4 Performance Optimization Notes

- **Offscreen Canvas Caching**: [OPTIMIZATION] Cache rendered tree to offscreen canvas, only re-render on data change or zoom/pan
- **Hit Detection Optimization**: Store node positions during render, avoid recalculating on every mousemove
- **Debounced Hover**: Debounce tooltip updates (50ms delay) to reduce re-renders
- **Canvas Resolution**: Use `devicePixelRatio` for high-DPI displays (Retina)

**[CRITICAL]**: If frame rate drops below 30fps, disable glow effects and reduce shadow blur.

---

### COMP-004: SynthesisTab (Merge Interface)

**Purpose**: Allow players to select weapons and merge 3:1 ratio

**L0 Trace**: US-WEP-009 (合成操作区), Scenario 2 (合成成功), Scenario 3 (材料不足)

#### 3.4.1 Component Structure

```
STRUCTURE SynthesisTabContent
  CONTAINER: <div class="synthesis-tab">
    SELECTOR: <div class="weapon-selector">
      LABEL: <label for="synthesis-weapon-select">选择武器:</label>
      DROPDOWN: <select id="synthesis-weapon-select">
        <option value="">-- 请选择 --</option>
        <!-- Dynamic options for mergeable weapons -->
    INFO_PANEL: <div id="synthesis-info" class="synthesis-info hidden">
      TARGET: <div class="synthesis-target">
        LABEL: 合成目标:
        NAME: <span id="target-weapon-name"></span>
      MATERIALS: <div class="synthesis-materials">
        REQUIRED: <p>所需材料: <span id="required-count"></span></p>
        CURRENT: <p>当前拥有: <span id="current-count"></span></p>
      ACTION: <div class="synthesis-action">
        BUTTON: <button id="synthesis-button" class="button-primary" disabled>合成</button>
        STATUS: <div id="synthesis-status"></div>
```

**L0 Trace**: weapon-evolution-requirements.md Section 6.1 (合成标签页)

---

#### 3.4.2 Props/State

**State** (internal):
```
STATE synthesisTabState
  selectedWeaponId: string | null = null
  canMerge: boolean = false
  targetWeaponId: string | null = null
  isMerging: boolean = false // Prevent double-click during animation
```

---

#### 3.4.3 Event Handlers

**EH-019: Render Synthesis Tab**
```
HANDLER renderSynthesisTab(container: HTMLElement)
  INPUT: container - DOM element to render into

  STEP-01: Build dropdown options
    inventory = weaponManager.getInventory()

    optionsHTML = '<option value="">-- 请选择 --</option>'
    FOR EACH weaponId IN weaponConfig:
      count = inventory[weaponId] || 0
      IF count > 0: // Only show owned weapons
        config = weaponConfig[weaponId]
        optionsHTML += `<option value="${weaponId}">${config.name} (拥有${count}个)</option>`

  STEP-02: Render tab HTML
    container.innerHTML = `
      <div class="synthesis-tab">
        <div class="weapon-selector">
          <label for="synthesis-weapon-select">选择要合成的武器:</label>
          <select id="synthesis-weapon-select" aria-label="选择武器">
            ${optionsHTML}
          </select>
        </div>
        <div id="synthesis-info" class="synthesis-info hidden" role="region" aria-live="polite">
          <div class="synthesis-target">
            <p>合成目标: <span id="target-weapon-name" class="highlight"></span></p>
          </div>
          <div class="synthesis-materials">
            <p>所需材料: <span id="required-count"></span></p>
            <p>当前拥有: <span id="current-count"></span></p>
          </div>
          <div class="synthesis-action">
            <button id="synthesis-button" class="button-primary" disabled>合成</button>
            <div id="synthesis-status"></div>
          </div>
        </div>
      </div>
    `

  STEP-03: Attach dropdown change event
    dropdown = document.getElementById('synthesis-weapon-select')
    dropdown.addEventListener('change', (event) => {
      selectedWeaponId = event.target.value
      IF selectedWeaponId !== '':
        CALL updateSynthesisInfo(selectedWeaponId)
      ELSE:
        CALL hideSynthesisInfo()
    })

  STEP-04: Attach synthesis button click event
    button = document.getElementById('synthesis-button')
    button.addEventListener('click', () => {
      CALL handleSynthesisClick()
    })

  SOURCE: api-design.md Unit 13, weapon-evolution-requirements.md US-WEP-009
```

**EH-020: Update Synthesis Info**
```
METHOD updateSynthesisInfo(weaponId: string)
  RETURNS: void

  INPUT: weaponId from dropdown selection

  STEP-01: Get merge eligibility
    mergeInfo = weaponManager.canMerge(weaponId)
    // Returns: {canMerge: boolean, reason?: string, nextWeapon?: string}

  STEP-02: Get weapon config and inventory count
    config = weaponConfig[weaponId]
    inventory = weaponManager.getInventory()
    currentCount = inventory[weaponId] || 0

  STEP-03: Update state
    synthesisTabState.selectedWeaponId = weaponId
    synthesisTabState.canMerge = mergeInfo.canMerge
    synthesisTabState.targetWeaponId = mergeInfo.nextWeapon

  STEP-04: Show synthesis info panel
    infoPanel = document.getElementById('synthesis-info')
    infoPanel.classList.remove('hidden')

  STEP-05: Update info panel content
    IF mergeInfo.canMerge:
      targetName = weaponConfig[mergeInfo.nextWeapon].name
      document.getElementById('target-weapon-name').textContent = targetName
      document.getElementById('required-count').textContent = `3个 ${config.name}`
      document.getElementById('current-count').textContent = `${currentCount}个`

      button = document.getElementById('synthesis-button')
      button.disabled = false
      button.textContent = '合成'

      statusDiv = document.getElementById('synthesis-status')
      statusDiv.textContent = '✓ 材料充足,可以合成'
      statusDiv.className = 'status-success'
    ELSE:
      targetName = config.nextTier ? weaponConfig[config.nextTier].name : '无'
      document.getElementById('target-weapon-name').textContent = targetName
      document.getElementById('required-count').textContent = `3个 ${config.name}`
      document.getElementById('current-count').textContent = `${currentCount}个`

      button = document.getElementById('synthesis-button')
      button.disabled = true
      button.textContent = '无法合成'

      statusDiv = document.getElementById('synthesis-status')
      statusDiv.textContent = `✗ ${mergeInfo.reason}`
      statusDiv.className = 'status-error'

  SOURCE: api-design.md Unit 14 (updateSynthesisInfo helper)
```

**EH-021: Hide Synthesis Info**
```
METHOD hideSynthesisInfo()
  RETURNS: void

  infoPanel = document.getElementById('synthesis-info')
  infoPanel.classList.add('hidden')

  synthesisTabState.selectedWeaponId = null
  synthesisTabState.canMerge = false
  synthesisTabState.targetWeaponId = null
```

**EH-022: Handle Synthesis Click**
```
METHOD handleSynthesisClick()
  RETURNS: void

  STEP-01: Validate state
    IF synthesisTabState.selectedWeaponId === null:
      alert("请先选择要合成的武器")
      RETURN early

    IF synthesisTabState.isMerging:
      RETURN early // Prevent double-click

  STEP-02: Disable button (prevent double-click)
    button = document.getElementById('synthesis-button')
    button.disabled = true
    button.textContent = '合成中...'
    synthesisTabState.isMerging = true

  STEP-03: Call synthesis logic
    result = weaponManager.mergeWeapons(synthesisTabState.selectedWeaponId)
    // Returns: {success: boolean, result?: string, error?: string}

  STEP-04: Handle result
    IF result.success:
      CALL playSynthesisAnimation(result.result)

      // Wait for animation to complete (1.5s)
      setTimeout(() => {
        CALL showSuccessMessage(`成功合成 ${weaponConfig[result.result].name}!`)

        // Refresh UI
        CALL renderSynthesisTab(container) // Re-render to update counts

        synthesisTabState.isMerging = false
      }, 1500)
    ELSE:
      CALL showErrorMessage(result.error)
      button.disabled = false
      button.textContent = '合成'
      synthesisTabState.isMerging = false

  SOURCE: api-design.md Unit 14, weapon-evolution-requirements.md Scenario 2 (合成成功)
```

**EH-023: Play Synthesis Animation**
```
METHOD playSynthesisAnimation(targetWeaponId: string)
  RETURNS: void

  INPUT: targetWeaponId - The weapon being created

  STEP-01: Create animation overlay
    animationHTML = `
      <div class="synthesis-animation-overlay" id="synthesis-animation">
        <div class="animation-content">
          <div class="material-icons">
            <div class="material-icon">🔫</div>
            <div class="material-icon">🔫</div>
            <div class="material-icon">🔫</div>
          </div>
          <div class="merge-arrow">→</div>
          <div class="result-icon glow-effect">
            <div class="weapon-icon" style="background: ${weaponConfig[targetWeaponId].color}">
              🔫
            </div>
          </div>
        </div>
      </div>
    `

  STEP-02: Append to modal
    modalContent = document.querySelector('.modal-content')
    modalContent.insertAdjacentHTML('beforeend', animationHTML)

  STEP-03: Trigger CSS animation
    animationOverlay = document.getElementById('synthesis-animation')
    requestAnimationFrame(() => {
      animationOverlay.classList.add('animate')
    })

  STEP-04: Remove after animation completes
    setTimeout(() => {
      animationOverlay.remove()
    }, 1500)

  SOURCE: weapon-evolution-requirements.md Scenario 2 (播放合成成功动画), NFR-WEP-003 (合成动画1.5秒)
```

**[INFERRED]**: Animation duration 1.5s is inferred from typical game UX, not explicitly in requirements. Mark as [CONF-004] for confirmation.

---

#### 3.4.4 Performance Optimization Notes

- **Debounced Dropdown Change**: Debounce dropdown change handler (100ms) to avoid excessive `canMerge()` calls
- **Animation Cleanup**: Ensure animation overlay is removed even if animation fails (use `finally` block)
- **Button State Management**: Use state flag `isMerging` to prevent rapid clicks during animation

---

### COMP-005: EvolutionTreeCanvas (Shared Canvas Renderer)

**Purpose**: Shared rendering utilities for evolution tree Canvas

**L0 Trace**: US-WEP-008 (进化树可视化), NFR-WEP-001 (进化树渲染时间 < 300ms)

#### 3.5.1 Canvas Rendering Pipeline

```
PIPELINE EvolutionTreeRenderingPipeline
  STEP-01: Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

  STEP-02: Apply Transformations (zoom, pan)
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoomLevel, zoomLevel)

  STEP-03: Draw Background Grid (optional)
    // Light grid lines for visual reference

  STEP-04: Draw Connection Lines
    FOR EACH path IN treeData.paths:
      FOR EACH node IN path:
        IF has next tier:
          CALL drawConnectionLine(ctx, node, nextNode)

  STEP-05: Draw Fusion Lines
    CALL drawFusionLines(ctx, superNodes, ultimateNode)

  STEP-06: Draw Nodes
    FOR EACH path IN treeData.paths:
      FOR EACH node IN path:
        CALL drawTreeNode(ctx, node)
    CALL drawTreeNode(ctx, ultimateNode, {isUltimate: true})

  STEP-07: Draw Labels (weapon names, tier badges)
    // Already included in drawTreeNode

  STEP-08: Restore Canvas State
    ctx.restore()
```

**Rendering Order**: Lines first, then nodes (ensures nodes are on top)

---

#### 3.5.2 Offscreen Canvas Caching Strategy

**[OPTIMIZATION]**: Cache static tree structure to offscreen canvas, only re-render on data change

```
STRATEGY OffscreenCanvasCaching
  CACHE_KEY: `tree_${JSON.stringify(inventory)}_${zoomLevel}`

  METHOD getOrCreateCache(treeData, zoomLevel)
    cacheKey = generateCacheKey(treeData, zoomLevel)

    IF cache.has(cacheKey):
      RETURN cache.get(cacheKey)

    offscreenCanvas = new OffscreenCanvas(800, 600)
    offscreenCtx = offscreenCanvas.getContext('2d')

    CALL renderEvolutionTreeCanvas(offscreenCtx, treeData)

    cache.set(cacheKey, offscreenCanvas)
    RETURN offscreenCanvas

  METHOD renderWithCache(ctx, treeData, zoomLevel)
    cachedCanvas = CALL getOrCreateCache(treeData, zoomLevel)
    ctx.drawImage(cachedCanvas, 0, 0)
```

**Cache Invalidation**: Clear cache when inventory changes (listen to `weapon:collected` or `weapon:synthesized` events)

**[CRITICAL]**: Only use if rendering performance is < 30fps. Otherwise, direct rendering is simpler.

---

#### 3.5.3 Node Positioning Algorithm

**Layout Algorithm**: Fixed grid with 3 horizontal paths

```
ALGORITHM CalculateNodePositions
  INPUT: treeData = {paths: Array, fusion: Object}
  OUTPUT: Updated treeData with _position fields

  CONSTANTS:
    START_X = 100
    START_Y = 100
    PATH_SPACING = 150 // Vertical space between paths
    TIER_SPACING = 150 // Horizontal space between tiers
    NODE_RADIUS = 40

  STEP-01: Calculate positions for 3 paths
    FOR pathIndex, path IN treeData.paths:
      pathY = START_Y + (pathIndex * PATH_SPACING)

      FOR tierIndex, node IN path:
        nodeX = START_X + (tierIndex * TIER_SPACING)
        nodeY = pathY

        node._position = {
          x: nodeX,
          y: nodeY,
          radius: NODE_RADIUS
        }

  STEP-02: Calculate fusion node position (center-right)
    fusionX = START_X + (4 * TIER_SPACING) + 50
    fusionY = START_Y + PATH_SPACING // Centered between 3 paths

    treeData.fusion._position = {
      x: fusionX,
      y: fusionY,
      radius: NODE_RADIUS + 10 // Larger node for ultimate weapon
    }

  RETURN treeData
```

**[INFERRED]**: Node positions are hardcoded for 3-path layout. If more paths are added in future, algorithm needs update.

---

#### 3.5.4 Interaction Hit Detection

**Hit Detection Algorithm**: Circle-based collision detection

```
ALGORITHM DetectNodeClick
  INPUT: mouseX, mouseY (canvas coordinates)
  OUTPUT: Clicked node or null

  STEP-01: Adjust mouse position for zoom/pan
    adjustedX = (mouseX / zoomLevel) - panX
    adjustedY = (mouseY / zoomLevel) - panY

  STEP-02: Check all nodes (paths + fusion)
    FOR EACH node IN allNodes:
      IF node._position exists:
        distance = SQRT((adjustedX - node._position.x)^2 + (adjustedY - node._position.y)^2)

        IF distance <= node._position.radius:
          RETURN node

  STEP-03: No hit
    RETURN null
```

**Performance**: O(n) where n = total nodes (max ~13 nodes, acceptable performance)

---

#### 3.5.5 Zoom/Pan Controls (Optional - Not MVP)

**[OPTIONAL]**: Mark as future enhancement

```
FEATURE ZoomPanControls
  STATUS: Not MVP, defer to Phase 2

  ZOOM:
    - Mouse wheel: zoom in/out centered on cursor
    - Zoom buttons: +/- buttons in UI
    - Zoom range: 0.5x ~ 2.0x

  PAN:
    - Mouse drag: pan canvas view
    - Touch drag: pan on mobile

  RESET:
    - Reset button: restore to default zoom (1.0) and pan (0, 0)
```

**Reason for deferral**: Core functionality (view tree, click nodes) works without zoom/pan. Add only if user feedback requests it.

---

## 4. Part 2: State Management Design

### STORE-001: weaponModule (Vuex Module - Conceptual)

**Note**: Project uses pure JavaScript, no Vuex. This section defines conceptual state structure for clarity.

**L0 Trace**: data-flow.md Section 2 (状态管理), weapon-evolution-requirements.md FR-WEP-001 (库存持久化)

#### 4.1 State Structure

```
STATE weaponModule
  // Weapon inventory (managed by WeaponManager, not UI)
  inventory: {
    [weaponId: string]: number
  }

  // UI-specific state
  ui: {
    modalOpen: boolean
    currentTab: 'inventory' | 'evolution' | 'synthesis'
    selectedWeaponId: string | null
    isSynthesizing: boolean
    isAnimating: boolean
  }

  // Evolution tree cache
  evolutionTree: {
    paths: Array<Array<WeaponNode>>
    fusion: FusionNode
    lastUpdated: timestamp
  }
```

**State Source**: Inferred from component requirements and api-design.md Unit 9-14

---

#### 4.2 Mutations (State Changes)

```
MUTATION setModalOpen(state, isOpen: boolean)
  state.ui.modalOpen = isOpen

MUTATION setCurrentTab(state, tabName: string)
  state.ui.currentTab = tabName

MUTATION setSelectedWeapon(state, weaponId: string | null)
  state.ui.selectedWeaponId = weaponId

MUTATION setSynthesizing(state, isSynthesizing: boolean)
  state.ui.isSynthesizing = isSynthesizing

MUTATION setAnimating(state, isAnimating: boolean)
  state.ui.isAnimating = isAnimating

MUTATION updateEvolutionTree(state, treeData: Object)
  state.evolutionTree = treeData
  state.evolutionTree.lastUpdated = Date.now()
```

**Note**: In pure JavaScript implementation, these become simple state setters in a `weaponUIState` object.

---

#### 4.3 Actions (Async Operations)

**Note**: No async operations at UI layer. Data fetching is synchronous from WeaponManager.

---

#### 4.4 Getters (Computed Properties)

```
GETTER canSynthesize(state)
  RETURNS: boolean
  RETURN state.ui.selectedWeaponId !== null AND NOT state.ui.isSynthesizing

GETTER currentInventoryCount(state)
  RETURNS: number
  IF state.ui.selectedWeaponId:
    RETURN state.inventory[state.ui.selectedWeaponId] || 0
  RETURN 0
```

**Note**: In pure JavaScript, these become computed functions.

---

#### 4.5 Component ↔ Store Mapping

| Component | Reads State | Mutates State | Calls Actions |
|-----------|-------------|---------------|---------------|
| WeaponModal | ui.modalOpen, ui.currentTab | setModalOpen, setCurrentTab | None |
| InventoryTab | inventory, evolutionTree | None | None |
| EvolutionTreeTab | inventory, evolutionTree | updateEvolutionTree | None |
| SynthesisTab | ui.selectedWeaponId, inventory | setSelectedWeapon, setSynthesizing | None |

**Data Flow**: Components read from WeaponManager directly (no Vuex), update UI state via internal state objects.

---

## 5. Part 3: Page Composition & Routing Design

### PAGE-001: Single Modal Page (No Multi-Page Routing)

**Architecture**: Single-page interface, no routing required

**L0 Trace**: weapon-evolution-requirements.md FR-WEP-006 (武器管理弹窗)

#### 5.1 Page Composition

```
COMPOSITION WeaponManagementPage
  ENTRY_POINT: Button in game HUD ("武器管理" button)

  MODAL_TRIGGER:
    <button id="open-weapon-modal" class="hud-button">武器管理</button>

    EVENT_HANDLER:
      document.getElementById('open-weapon-modal').addEventListener('click', () => {
        CALL weaponUI.openWeaponModal()
      })

  MODAL_CONTENT: WeaponModal component (COMP-001)
    CONTAINS: InventoryTab, EvolutionTreeTab, SynthesisTab

  CLOSE_TRIGGERS:
    - Close button ([X])
    - ESC key
    - Overlay click (optional)
```

---

#### 5.2 Navigation Flow

```
FLOW WeaponManagementNavigation
  STEP-01: User in game (waveActive = false)
  STEP-02: User clicks "武器管理" button
  STEP-03: Modal opens, game pauses
  STEP-04: User navigates tabs (Inventory → Evolution → Synthesis)
  STEP-05: User performs action (view details, synthesize, etc.)
  STEP-06: User closes modal
  STEP-07: Game resumes
```

**Navigation Guards**: Check `game.waveActive` before opening modal (block during battle)

---

#### 5.3 Lazy Loading Strategy

**Not Applicable**: Pure JavaScript, no module bundler. All code loaded on page load.

**[FUTURE]**: If using ES6 modules, consider dynamic import for modal content:
```javascript
// Future enhancement
async function openWeaponModal() {
  const { renderInventoryTab } = await import('./weaponUI.js');
  // ...
}
```

---

## 6. Part 4: Form & Interaction Design

### FORM-001: Synthesis Form Validation

**Purpose**: Validate weapon selection and material count before synthesis

**L0 Trace**: Scenario 3 (材料不足无法合成), FR-WEP-002 (3合1线性合成规则)

#### 6.1 Form Fields

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| selectedWeaponId | string (dropdown) | Yes | Must exist in weaponConfig |
| targetWeaponId | string (computed) | No | Auto-computed from selectedWeaponId |
| currentCount | number (display only) | No | From inventory |
| requiredCount | number (display only) | No | Always 3 |

---

#### 6.2 Validation Rules

**VR-001: Weapon Selection Required**
```
RULE weaponSelectionRequired
  TRIGGER: User clicks "合成" button
  CONDITION: selectedWeaponId === null OR selectedWeaponId === ''
  MESSAGE: "请先选择要合成的武器"
  UI_FEEDBACK: Alert dialog
  SOURCE: Inferred from form structure
```

**VR-002: Material Count Sufficient**
```
RULE materialCountSufficient
  TRIGGER: User selects weapon from dropdown
  CONDITION: inventory[selectedWeaponId] >= 3
  MESSAGE: (if fail) "材料不足: 需要3个{name},当前拥有{count}个"
  UI_FEEDBACK:
    - Success: Enable "合成" button, show green checkmark
    - Fail: Disable "合成" button, show red error text
  SOURCE: weapon-evolution-requirements.md FR-WEP-002 (3:1 ratio)
```

**VR-003: Weapon Has Next Tier**
```
RULE weaponHasNextTier
  TRIGGER: User selects weapon from dropdown
  CONDITION: weaponConfig[selectedWeaponId].nextTier !== null
  MESSAGE: (if fail) "{name}已是最高级武器,无法继续合成"
  UI_FEEDBACK: Disable "合成" button, show error text
  SOURCE: weapon-evolution-requirements.md FR-WEP-002 (最高级武器无法合成)
```

**VR-004: Weapon Not Currently Equipped**
```
RULE weaponNotEquipped
  TRIGGER: User selects weapon from dropdown
  CONDITION: player.weapon.id !== selectedWeaponId
  MESSAGE: (if fail) "无法合成当前装备的武器,请先切换"
  UI_FEEDBACK: Disable "合成" button, show warning text
  SOURCE: weapon-evolution-requirements.md Section 5.3 (装备不可合成)
```

---

#### 6.3 Error Display Strategy

**Error Display Modes**:
1. **Inline Error** (below synthesis button): For validation failures (material count, equipped weapon)
2. **Alert Dialog**: For critical errors (selection required, synthesis failed)
3. **Toast Notification**: For success messages ("合成成功!")

**Example Inline Error**:
```html
<div id="synthesis-status" class="status-error">
  ✗ 材料不足: 需要3个Rifle,当前拥有2个
</div>
```

**Example Success Feedback**:
```html
<div id="synthesis-status" class="status-success">
  ✓ 材料充足,可以合成
</div>
```

---

#### 6.4 Three-State UI Handling (Loading, Success, Error)

**Three States**:
1. **Idle**: Form ready, button enabled/disabled based on validation
2. **Loading**: Synthesis in progress, button disabled, "合成中..." text
3. **Complete**: Success or error, show result message

**State Transitions**:
```
IDLE (waiting for user input)
  ↓ (user clicks "合成")
LOADING (isSynthesizing = true, button disabled)
  ↓ (synthesis completes)
COMPLETE (show success/error, re-enable button after delay)
  ↓ (auto-reset after 2s)
IDLE (reset to default state)
```

**Implementation**:
```
STATE_MACHINE SynthesisFormState
  IDLE:
    button.disabled = NOT canSynthesize
    button.textContent = '合成'
    statusDiv.textContent = validationMessage

  LOADING:
    button.disabled = true
    button.textContent = '合成中...'
    statusDiv.textContent = ''

  COMPLETE_SUCCESS:
    button.disabled = true
    button.textContent = '合成成功!'
    statusDiv.textContent = '✓ 成功合成 {targetWeaponName}!'
    statusDiv.className = 'status-success'

    // Auto-reset after 2s
    setTimeout(() => {
      TRANSITION_TO IDLE
      CALL renderSynthesisTab() // Refresh to update counts
    }, 2000)

  COMPLETE_ERROR:
    button.disabled = false
    button.textContent = '合成'
    statusDiv.textContent = `✗ ${errorMessage}`
    statusDiv.className = 'status-error'
```

---

## 7. Cyberpunk Styling Guide (CSS Class Conventions)

**Note**: This section defines class naming and style intent only. Actual CSS implementation is out of scope for L2 design.

**L0 Trace**: NFR-WEP-003 (赛博朋克风格一致性), existing game.js (cyberpunk colors)

### 7.1 Color Palette

**Primary Colors** (from existing game.js):
- Neon Green: `#8eff71` (owned weapons, borders)
- Neon Blue: `#00d4ec` (sniper, evolution tree)
- Neon Cyan: `#00e3fd` (player, ultimate weapon)
- Neon Yellow: `#ffeb3b` (can merge highlight)
- Neon Orange: `#ff7948` (rifle, danger)
- Neon Red: `#ff4848` (shotgun, error)

**Background Colors**:
- Dark Purple: `#1a1a3e` (modal background)
- Darker Purple: `#0c0c1f` (overlay)
- Gray: `#222222` (locked nodes)
- Dark Gray: `#555555` (borders)

**Glow Effects**:
- Green Glow: `rgba(142, 255, 113, 0.5)`
- Blue Glow: `rgba(0, 212, 236, 0.5)`
- Cyan Glow: `rgba(0, 255, 255, 0.5)`
- Yellow Glow: `rgba(255, 235, 59, 0.6)`

---

### 7.2 Font Stack

**Primary Font**: `'Arial', 'Microsoft YaHei', sans-serif`
**Monospace Font**: `'Courier New', monospace` (for counts, stats)

**Font Sizes**:
- Modal Title: `24px` (bold)
- Tab Labels: `16px`
- Weapon Names: `14px`
- Counts: `12px` (bold)
- Tier Badges: `10px` (uppercase)

---

### 7.3 Effect Guidelines

**Glow Effect** (for owned weapons):
```css
/* Intent only, not implementation */
.weapon-card--owned {
  box-shadow: 0 0 20px rgba(142, 255, 113, 0.5);
}
```

**Hover Effect** (for interactive elements):
```css
.weapon-card:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}
```

**Animation** (for synthesis):
```css
.synthesis-animation-overlay {
  animation: synthesis-pulse 1.5s ease-in-out;
}

@keyframes synthesis-pulse {
  0% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0; transform: scale(1.0); }
}
```

**Neon Border** (for can-merge highlight):
```css
.weapon-card--can-merge {
  border: 2px solid #ffeb3b;
  box-shadow: 0 0 15px rgba(255, 235, 59, 0.6);
}
```

---

## 8. Accessibility Considerations

### 8.1 ARIA Labels

**Modal**:
- `role="dialog"` on modal container
- `aria-labelledby="modal-title"` pointing to title
- `aria-modal="true"` to indicate modal state
- `aria-hidden="true"` when closed

**Tabs**:
- `role="tablist"` on tab navigation
- `role="tab"` on each tab button
- `role="tabpanel"` on tab content
- `aria-selected="true"` on active tab

**Weapon Cards**:
- `role="button"` (since they're clickable)
- `aria-label="${weaponName}, 拥有 ${count} 个"` for screen readers
- `tabindex="0"` to make keyboard navigable

**Buttons**:
- `aria-label` for icon-only buttons (close button, zoom buttons)
- `aria-disabled="true"` for disabled synthesis button

---

### 8.2 Keyboard Navigation

**Tab Order**:
1. Modal close button
2. Tab navigation (Inventory, Evolution, Synthesis)
3. Active tab content (weapon cards / canvas / form fields)
4. Modal action buttons (if any)

**Keyboard Shortcuts**:
- **ESC**: Close modal (COMP-001 EH-004)
- **Arrow Keys**: Navigate between tabs (optional)
- **Enter/Space**: Activate buttons and links
- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward

**Focus Trap**: When modal is open, Tab key cycles within modal (does not escape to background page)

---

### 8.3 Screen Reader Support

**Announcements**:
- When modal opens: "武器管理对话框已打开"
- When tab switches: "已切换到{tab name}标签页"
- When synthesis succeeds: "合成成功: 获得{weapon name}"
- When synthesis fails: "合成失败: {error message}"

**Live Regions**:
- `aria-live="polite"` on synthesis status div (announces changes without interrupting)
- `aria-atomic="true"` to read entire message

---

## 9. Performance Optimization Summary

| Component | Optimization | Priority | Impact |
|-----------|-------------|----------|--------|
| WeaponModal | CSS transitions (GPU-accelerated) | P0 | Smooth open/close (300ms) |
| InventoryTab | Event delegation (1 listener on grid) | P1 | Reduce memory for 50+ cards |
| EvolutionTreeTab | Offscreen canvas caching | P2 | 60fps rendering (from 30fps) |
| EvolutionTreeTab | Debounced hover (50ms) | P1 | Reduce tooltip flicker |
| SynthesisTab | Debounced dropdown (100ms) | P1 | Reduce `canMerge()` calls |
| All | Lazy loading (optional, future) | P3 | Faster initial page load |

**Critical Optimization**: If evolution tree rendering < 30fps, implement offscreen canvas caching (COMP-003, Section 3.3.4).

---

## 10. Cross-Component Consistency Validation

### 10.1 Component Interface Alignment

| Component | Reads from WeaponManager | Calls WeaponManager | Events Emitted |
|-----------|-------------------------|---------------------|----------------|
| WeaponModal | None | None | weapon:modal:open, weapon:modal:close |
| InventoryTab | getInventory(), canMerge() | equipWeapon() | None |
| EvolutionTreeTab | getEvolutionTree(), getInventory() | None | None |
| SynthesisTab | getInventory(), canMerge() | mergeWeapons() | None |

**Consistency Check**: ✅ No circular dependencies, clear data flow from WeaponManager to UI.

---

### 10.2 Event Flow Consistency

```
EventBus Events (cross-module):
  weapon:collected → WeaponUI.refreshInventoryTab()
  weapon:synthesized → WeaponUI.refreshEvolutionTreeTab()
  weapon:equipped → HUD.updateWeaponDisplay()
  weapon:modal:open → Core.pauseGame()
  weapon:modal:close → Core.resumeGame()
```

**Consistency Check**: ✅ Event names match api-contracts/README.md EventBus Contracts.

---

### 10.3 State Transition Consistency

```
Modal State Transitions:
  CLOSED (modalState.isOpen = false)
    ↓ (user clicks "武器管理" AND game.waveActive = false)
  OPEN (modalState.isOpen = true, currentTab = 'inventory')
    ↓ (user switches tab)
  OPEN (modalState.isOpen = true, currentTab = 'evolution' | 'synthesis')
    ↓ (user closes modal)
  CLOSED (modalState.isOpen = false)
```

**Consistency Check**: ✅ State transitions match WeaponUI.openWeaponModal() and closeWeaponModal() logic.

---

## 11. Inferred Designs (Marked for Confirmation)

| ID | Design Content | Inference Basis | Confidence | Confirmation Needed |
|----|----------------|-----------------|------------|---------------------|
| INF-FE-001 | Modal close animation duration: 300ms | Standard web UI transition | ⚠️ Medium | [CONF-001] UX team |
| INF-FE-002 | Synthesis animation duration: 1.5s | Typical game animation (not in requirements) | ⚠️ Medium | [CONF-002] Game designer |
| INF-FE-003 | Evolution tree Canvas size: 800x600 | Modal width constraint | ⚠️ Medium | [CONF-003] UI designer |
| INF-FE-004 | Node spacing: 150px horizontal, 150px vertical | Visual balance for 3 paths | ⚠️ Medium | [CONF-004] UI designer |
| INF-FE-005 | Weapon card grid: 4-6 columns | Responsive design assumption | ⚠️ Medium | [CONF-005] UI designer |
| INF-FE-006 | Tooltip delay: 50ms debounce | Reduce flicker (UX best practice) | ✅ High | None (standard pattern) |
| INF-FE-007 | Focus trap on modal | ARIA best practice | ✅ High | None (accessibility standard) |

**Total Inferred Designs**: 7 (5 medium confidence, 2 high confidence)

---

## 12. Risks and Pending Confirmations

| ID | Issue | Impact | Recommendation |
|----|-------|--------|----------------|
| RISK-FE-001 | Canvas rendering performance on low-end devices | Frame rate < 30fps | Implement offscreen caching (COMP-005) |
| RISK-FE-002 | Modal animation janky on mobile Safari | Poor UX | Test on iOS, simplify animation if needed |
| RISK-FE-003 | Synthesis animation skippable? | User frustration if forced to wait 1.5s | Add "Skip" button or reduce to 0.8s |
| RISK-FE-004 | Tooltip overflow on small screens | Tooltip cut off | Add auto-positioning logic (flip to left if near edge) |
| CONF-001 | Modal close animation duration (300ms) | Visual consistency | Confirm with UX team |
| CONF-002 | Synthesis animation duration (1.5s) | User experience | Confirm with game designer |
| CONF-003 | Evolution tree Canvas size (800x600) | Responsive design | Confirm with UI designer |
| CONF-004 | Node spacing (150px) | Visual balance | Confirm with UI designer |

---

## 13. Self-Check Execution Results

### 13.1 Coverage Completeness
- [x] All 5 UI components designed (COMP-001 to COMP-005)
- [x] Component tree hierarchy defined
- [x] Props/State for each component documented
- [x] Event handlers with pseudo-code
- [x] Rendering logic with step-by-step flow
- [x] State management conceptual design (STORE-001)
- [x] Page composition (PAGE-001)
- [x] Form validation rules (FORM-001)
- [x] Cyberpunk styling guide
- [x] Accessibility considerations

### 13.2 Traceability
- [x] All components traced to L0 requirements (US-WEP-007~009, FR-WEP-006, Scenario 1-7)
- [x] All event handlers reference api-design.md units
- [x] All validation rules reference FR-WEP requirements
- [x] All styling follows existing game.js patterns

### 13.3 Granularity Compliance
- [x] Pseudo-code level (not runnable Vue/React code)
- [x] No CSS implementation details (class names only)
- [x] No framework-specific syntax (no `<template>`, `v-if`, `useState`)
- [x] No specific Element UI components (no `el-table`, `el-form`)
- [x] Performance notes identified (not implemented)

### 13.4 Consistency
- [x] Component interfaces align with WeaponManager API (api-design.md)
- [x] Event names match EventBus contracts (api-contracts/README.md)
- [x] State transitions align with openWeaponModal/closeWeaponModal logic
- [x] Validation rules consistent across components

### 13.5 Evidence Compliance
- [x] No components added without L0 trace
- [x] All state fields justified by requirements or component needs
- [x] All event handlers traced to user stories or scenarios
- [x] Inferred designs marked [INFERRED] and logged

---

## 14. Deliverables Summary

### 14.1 Design Scope Completion

| Category | Designed Units | Status |
|----------|---------------|--------|
| UI Components | 5 / 5 | ✅ Complete |
| State Management | 1 / 1 | ✅ Complete |
| Page Composition | 1 / 1 | ✅ Complete |
| Form Design | 1 / 1 | ✅ Complete |
| **Total** | **8 / 8** | ✅ **100% Complete** |

### 14.2 Design Quality Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Components with complete design | 5 / 5 | 100% | ✅ Met |
| Event handlers with pseudo-code | 23 / 23 | 100% | ✅ Met |
| Validation rules with L0 trace | 4 / 4 | 100% | ✅ Met |
| L0 traceability | 100% | 100% | ✅ Met |
| Granularity compliance | 5 / 5 | 100% | ✅ Met |

### 14.3 Referenced Documents

- [x] weapon-evolution-requirements.md (Section 6 UI wireframes, US-WEP-007~009, Scenarios 1-7)
- [x] api-contracts/README.md (WeaponUI interface, EventBus contracts)
- [x] api-design.md (WeaponUI methods Units 9-14)
- [x] l2-task-distribution.md (Units 43-47 assignment)
- [x] game.js (Cyberpunk styling patterns, Canvas rendering reference)

---

**Document Status**: ✅ Complete (Draft)
**Next Steps**:
1. L2 Coordinator review and approve
2. Designer-Test uses this design to create UI component tests
3. L3 Implementation agents use this as UI implementation blueprint
4. Confirm inferred designs with UX/UI team (CONF-001~004)

---

**Estimated Implementation Effort** (for L3):
- WeaponModal + Tab Structure: ~4 hours
- InventoryTab: ~6 hours (grid rendering + details panel)
- EvolutionTreeTab: ~10 hours (Canvas rendering + interactions)
- SynthesisTab: ~5 hours (form + validation + animation)
- Styling (Cyberpunk CSS): ~8 hours
- **Total**: ~33 hours (4 developer days)

---

**End of Frontend Detailed Design**
