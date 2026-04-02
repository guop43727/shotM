// WeaponUI - Modal interface for weapon management
// COMP-001: WeaponModal, COMP-002: InventoryTab,
// COMP-003: EvolutionTreeTab, COMP-004: SynthesisTab
// US-WEP-006, US-WEP-007, US-WEP-008, US-WEP-009

const weaponUI = {
  // Internal state (STORE-001)
  modalState: {
    isOpen: false,
    currentTab: 'inventory',
    lastOpenedTab: 'inventory'
  },

  evolutionTreeState: {
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 },
    hoveredNodeId: null,
    treeData: null,
    nodePositions: []
  },

  synthesisTabState: {
    selectedWeaponId: null,
    canMerge: false,
    targetWeaponId: null,
    isMerging: false
  },

  inventoryTabState: {
    sortBy: 'tier',
    filterBy: 'all'
  },

  canvasCache: null,
  synthesisInProgress: false,
  _keydownHandler: null,

  // -------------------------
  // EH-001: Open modal (US-WEP-006, STEP-01~06)
  // -------------------------
  openWeaponModal() {
    // STEP-01: Validate game state (US-WEP-006 - cannot open during combat)
    if (typeof game !== 'undefined' && game.waveActive) {
      this._showWarning('战斗中无法打开武器管理!');
      return;
    }

    // STEP-02: Show modal
    const modal = document.getElementById('weapon-modal');
    if (!modal) return;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    // STEP-03: Update state
    this.modalState.isOpen = true;
    this.modalState.currentTab = this.modalState.lastOpenedTab || 'inventory';

    // STEP-04: Pause game (using window.gamePaused flag as agreed)
    window.gamePaused = true;

    // STEP-05: Render active tab
    this.switchTab(this.modalState.currentTab);

    // STEP-06: Set ESC key handler (EH-004)
    this._keydownHandler = (e) => {
      if (e.key === 'Escape' && this.modalState.isOpen) {
        e.preventDefault();
        this.closeWeaponModal();
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  },

  // -------------------------
  // EH-002: Close modal (STEP-01~05)
  // -------------------------
  closeWeaponModal() {
    // STEP-01: Check if open (idempotent)
    if (!this.modalState.isOpen) return;

    // STEP-02: Hide modal
    const modal = document.getElementById('weapon-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    // STEP-03: Update state
    this.modalState.lastOpenedTab = this.modalState.currentTab;
    this.modalState.isOpen = false;

    // STEP-04: Resume game
    window.gamePaused = false;

    // STEP-05: Remove ESC handler
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
  },

  // -------------------------
  // EH-003: Switch tab (RL-001)
  // -------------------------
  switchTab(tabName) {
    // STEP-01: Validate tab name
    const validTabs = ['inventory', 'evolution', 'synthesis'];
    if (!validTabs.includes(tabName)) {
      console.warn(`Unknown tab: ${tabName}`);
      return;
    }

    // STEP-02: Update active tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
      btn.setAttribute('aria-selected', String(btn.dataset.tab === tabName));
    });

    // Hide all tab content panels
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Show active tab content
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) activeContent.style.display = 'block';

    // STEP-03: Update state
    this.modalState.currentTab = tabName;

    // STEP-04: Render new tab content
    if (tabName === 'inventory') this.renderInventory();
    else if (tabName === 'evolution') this.renderEvolutionTree();
    else if (tabName === 'synthesis') this.renderSynthesis();
  },

  // -------------------------
  // COMP-002: InventoryTab (US-WEP-007)
  // EH-005: Render inventory grid
  // -------------------------
  renderInventory() {
    // Target the inventory-tab container directly (rendered by switchTab)
    const container = document.getElementById('inventory-tab');
    if (!container) return;

    // STEP-01: Fetch inventory data
    const inv = window.weaponManager.getInventory();

    // STEP-02: Build weapon array with config (immutable map, no mutation)
    const weaponArray = Object.keys(weaponConfig).map(id => {
      const cfg = weaponConfig[id];
      const count = inv[id] || 0;
      const mergeInfo = window.weaponManager.canMerge(id);
      return {
        id,
        name: cfg.name,
        tier: cfg.tier,
        count,
        color: cfg.color,
        isOwned: count > 0,
        canMerge: mergeInfo.canMerge,
        isEquipped: (typeof player !== 'undefined' && player.weapon && player.weapon.id === id)
      };
    });

    // STEP-03: Apply sorting (returns new array, no mutation)
    const sortedArray = this._sortWeaponArray(weaponArray, this.inventoryTabState.sortBy);

    // STEP-04: Apply filtering (returns new array)
    const filteredWeapons = this._filterWeaponArray(sortedArray, this.inventoryTabState.filterBy);

    // STEP-05: Build grid HTML (EH-006: buildWeaponCard)
    const gridHTML = filteredWeapons.map(w => this._buildWeaponCard(w)).join('');

    // STEP-06: Render to container
    const filterControls = this._buildFilterControls();
    container.innerHTML = filterControls + `<div class="weapon-grid-inner">${gridHTML}</div>`;

    // STEP-07: Event delegation for cards
    const gridInner = container.querySelector('.weapon-grid-inner');
    if (gridInner) {
      gridInner.onclick = (e) => {
        const card = e.target.closest('.weapon-card');
        if (card && card.dataset.weaponId) {
          this._showWeaponDetails(card.dataset.weaponId);
        }
      };
    }

    // Attach filter/sort events
    const sortSelect = container.querySelector('#inv-sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.inventoryTabState.sortBy = e.target.value;
        this.renderInventory();
      });
    }
    const filterSelect = container.querySelector('#inv-filter-by');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.inventoryTabState.filterBy = e.target.value;
        this.renderInventory();
      });
    }
  },

  // EH-006: Build weapon card HTML
  _buildWeaponCard(weapon) {
    // BLOCK-004: Use BEM naming convention for state classes
    const stateClasses = [];
    if (weapon.isOwned) stateClasses.push('weapon-card--owned');
    else stateClasses.push('weapon-card--locked');
    if (weapon.isEquipped) stateClasses.push('weapon-card--equipped');
    if (weapon.canMerge) stateClasses.push('weapon-card--can-merge');

    let badgeHTML = '';
    if (weapon.isEquipped) badgeHTML += '<span class="badge badge--equipped">已装备</span>';
    if (weapon.canMerge) badgeHTML += '<span class="badge badge--can-merge">可合成</span>';
    if (!weapon.isOwned) badgeHTML += '<span class="badge badge--locked">未拥有</span>';

    // BLOCK-003: Display 999+ for counts >= 1000 (L0 AC-004)
    const displayCount = weapon.count >= 1000 ? '999+' : weapon.count;

    return `
      <div class="weapon-card ${stateClasses.join(' ')}"
           data-weapon-id="${weapon.id}"
           role="button"
           tabindex="0"
           aria-label="${weapon.name}, 拥有 ${weapon.count} 个">
        <div class="weapon-icon-wrapper">
          <div class="weapon-icon" style="background-color: ${weapon.color}">T${weapon.tier}</div>
          <span class="tier-badge tier-${weapon.tier}">T${weapon.tier}</span>
        </div>
        <div class="weapon-info">
          <div class="weapon-name">${weapon.name}</div>
          <div class="weapon-count">x${displayCount}</div>
        </div>
        ${badgeHTML}
      </div>
    `;
  },

  // Build filter/sort controls HTML
  _buildFilterControls() {
    return `
      <div class="inventory-filters">
        <select id="inv-sort-by" aria-label="排序方式">
          <option value="tier" ${this.inventoryTabState.sortBy === 'tier' ? 'selected' : ''}>按等级排序</option>
          <option value="count" ${this.inventoryTabState.sortBy === 'count' ? 'selected' : ''}>按数量排序</option>
          <option value="name" ${this.inventoryTabState.sortBy === 'name' ? 'selected' : ''}>按名称排序</option>
        </select>
        <select id="inv-filter-by" aria-label="筛选方式">
          <option value="all" ${this.inventoryTabState.filterBy === 'all' ? 'selected' : ''}>全部武器</option>
          <option value="owned" ${this.inventoryTabState.filterBy === 'owned' ? 'selected' : ''}>已拥有</option>
        </select>
      </div>
    `;
  },

  // EH-007: Sort weapon array (returns new sorted array, no mutation)
  _sortWeaponArray(weaponArray, sortBy) {
    const arr = [...weaponArray];
    switch (sortBy) {
      case 'tier':
        return arr.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
      case 'count':
        return arr.sort((a, b) => b.count - a.count || a.tier - b.tier);
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return arr;
    }
  },

  // EH-008: Filter weapon array
  _filterWeaponArray(weaponArray, filterBy) {
    switch (filterBy) {
      case 'all':
        return weaponArray;
      case 'owned':
        return weaponArray.filter(w => w.isOwned);
      default:
        return weaponArray;
    }
  },

  // EH-009: Show weapon details (click handler)
  _showWeaponDetails(weaponId) {
    const cfg = weaponConfig[weaponId];
    if (!cfg) return;
    const count = window.weaponManager.getInventory()[weaponId] || 0;

    const container = document.getElementById('inventory-tab');
    if (!container) return;

    // Remove existing panel
    const existing = container.querySelector('.weapon-details-panel');
    if (existing) existing.remove();

    const detailsHTML = `
      <div class="weapon-details-panel" id="weapon-details">
        <h3>${cfg.name}</h3>
        <p class="tier-label">等级: Tier ${cfg.tier}</p>
        <div class="stats">
          <div class="stat-item-detail">
            <span class="stat-label">伤害:</span>
            <span class="stat-value">${cfg.damage}</span>
          </div>
          <div class="stat-item-detail">
            <span class="stat-label">射速:</span>
            <span class="stat-value">${cfg.fireRate}ms</span>
          </div>
          <div class="stat-item-detail">
            <span class="stat-label">拥有数量:</span>
            <span class="stat-value">${count}</span>
          </div>
        </div>
        ${count > 0 ? '<button class="equip-button">装备</button>' : ''}
        <button class="close-details-button">关闭</button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', detailsHTML);

    const panel = document.getElementById('weapon-details');
    const equipBtn = panel.querySelector('.equip-button');
    if (equipBtn) {
      equipBtn.addEventListener('click', () => {
        // BLOCK-009: Add UI feedback on equip failure
        const result = window.weaponManager.equipWeapon(weaponId);
        if (result && result.success) {
          this._showNotification('装备成功！', 'success');
          this.closeWeaponModal();
        } else {
          const errorMsg = result && result.message ? result.message : '装备失败';
          this._showNotification(errorMsg, 'error');
        }
      });
    }
    panel.querySelector('.close-details-button').addEventListener('click', () => {
      panel.remove();
    });
  },

  // -------------------------
  // COMP-003: EvolutionTreeTab (US-WEP-008)
  // EH-010: Render evolution tree tab
  // -------------------------
  renderEvolutionTree() {
    const container = document.getElementById('evolution-tab');
    if (!container) return;

    // STEP-01: Build canvas wrapper HTML
    container.innerHTML = `
      <div class="evolution-tab-inner">
        <div class="canvas-wrapper">
          <canvas id="evolution-tree-canvas" width="700" height="400"></canvas>
          <div id="tree-tooltip" class="tree-tooltip hidden"></div>
        </div>
        <div class="tree-controls">
          <button id="zoom-in" aria-label="放大">+</button>
          <button id="zoom-out" aria-label="缩小">-</button>
          <button id="reset-view" aria-label="重置视图">重置</button>
        </div>
        <button class="fusion-btn" id="fusion-action-btn">融合终极武器</button>
      </div>
    `;

    // STEP-02: Get canvas context
    const canvas = document.getElementById('evolution-tree-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // STEP-03: Fetch evolution tree data
    this.evolutionTreeState.treeData = window.weaponManager.getEvolutionTree();

    // STEP-04: Render tree
    this._renderEvolutionTreeCanvas(ctx, canvas, this.evolutionTreeState.treeData);

    // STEP-05: Attach interaction listeners
    this._attachTreeInteractionListeners(canvas);

    // STEP-06: Control buttons
    document.getElementById('zoom-in').addEventListener('click', () => {
      this.evolutionTreeState.zoomLevel = Math.min(2.0, this.evolutionTreeState.zoomLevel + 0.2);
      this._rerenderTree(canvas);
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      this.evolutionTreeState.zoomLevel = Math.max(0.5, this.evolutionTreeState.zoomLevel - 0.2);
      this._rerenderTree(canvas);
    });
    document.getElementById('reset-view').addEventListener('click', () => {
      this.evolutionTreeState.zoomLevel = 1.0;
      this.evolutionTreeState.panOffset = { x: 0, y: 0 };
      this._rerenderTree(canvas);
    });

    // Fusion button
    const fusionBtn = document.getElementById('fusion-action-btn');
    if (fusionBtn) {
      const tree = this.evolutionTreeState.treeData;
      fusionBtn.disabled = !tree.fusion.canFuse;
      if (!tree.fusion.canFuse) fusionBtn.classList.add('disabled');
      fusionBtn.addEventListener('click', () => this.doFusion());
    }
  },

  // EH-011: Render evolution tree canvas (core rendering)
  _renderEvolutionTreeCanvas(ctx, canvas, treeData) {
    // STEP-01: Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // STEP-02: Apply transformations
    ctx.save();
    ctx.translate(this.evolutionTreeState.panOffset.x, this.evolutionTreeState.panOffset.y);
    ctx.scale(this.evolutionTreeState.zoomLevel, this.evolutionTreeState.zoomLevel);

    // STEP-03: Layout parameters
    const startX = 80;
    const startY = 80;
    const pathVerticalSpacing = 120;
    const tierHorizontalSpacing = 140;
    const nodeRadius = 25;

    // Reset node positions for hit detection
    this.evolutionTreeState.nodePositions = [];

    // Draw connection lines first (so nodes appear on top)
    treeData.paths.forEach((path, pathIdx) => {
      const pathY = startY + pathIdx * pathVerticalSpacing;
      path.forEach((node, tierIdx) => {
        const nodeX = startX + tierIdx * tierHorizontalSpacing;
        const nodeY = pathY;
        if (tierIdx < path.length - 1) {
          const nextX = startX + (tierIdx + 1) * tierHorizontalSpacing;
          this._drawConnectionLine(ctx, nodeX, nodeY, nextX, nodeY, node);
        }
      });
    });

    // STEP-04: Draw 3 evolution paths and record positions
    treeData.paths.forEach((path, pathIdx) => {
      const pathY = startY + pathIdx * pathVerticalSpacing;
      path.forEach((node, tierIdx) => {
        const nodeX = startX + tierIdx * tierHorizontalSpacing;
        const nodeY = pathY;

        // Store position for hit detection
        this.evolutionTreeState.nodePositions.push({
          node,
          x: nodeX,
          y: nodeY,
          radius: nodeRadius
        });

        this._drawTreeNode(ctx, node, nodeX, nodeY, nodeRadius);
      });
    });

    // STEP-05: Render fusion convergence lines
    const fusionX = startX + 4 * tierHorizontalSpacing + 40;
    const fusionY = startY + pathVerticalSpacing;

    const superNodes = treeData.paths.map(path => {
      const last = path[path.length - 1];
      const pos = this.evolutionTreeState.nodePositions.find(p => p.node.id === last.id);
      return pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 };
    });

    superNodes.forEach(startPos => {
      this._drawFusionLine(ctx, startPos, { x: fusionX, y: fusionY }, treeData.fusion.canFuse);
    });

    // STEP-06: Render fusion (ultimate) node
    const fusionNode = treeData.fusion;
    const fusionRadius = nodeRadius + 10;
    this.evolutionTreeState.nodePositions.push({
      node: fusionNode,
      x: fusionX,
      y: fusionY,
      radius: fusionRadius
    });
    this._drawTreeNode(ctx, fusionNode, fusionX, fusionY, fusionRadius, { isUltimate: true });

    // STEP-07: Restore canvas state
    ctx.restore();
  },

  // EH-012: Draw tree node (US-WEP-008: owned=bright, synthesizable=pulsing, locked=dim)
  _drawTreeNode(ctx, node, x, y, radius, options) {
    options = options || {};
    let fillColor, strokeColor, glowColor;

    if (options.isUltimate) {
      fillColor = node.owned ? '#00e3fd' : '#222222';
      strokeColor = '#00e3fd';
      glowColor = 'rgba(0, 227, 253, 0.5)';
    } else if (node.owned && node.canMerge) {
      fillColor = weaponConfig[node.id] ? weaponConfig[node.id].color : '#666';
      strokeColor = '#ffeb3b';
      glowColor = 'rgba(255, 235, 59, 0.6)';
    } else if (node.owned) {
      fillColor = weaponConfig[node.id] ? weaponConfig[node.id].color : '#666';
      strokeColor = '#8eff71';
      glowColor = 'rgba(142, 255, 113, 0.4)';
    } else {
      fillColor = '#222222';
      strokeColor = '#555555';
      glowColor = 'rgba(100, 100, 100, 0.2)';
    }

    // STEP-02: Draw glow if owned
    if (node.owned) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = glowColor;
    }

    // STEP-03: Draw circle
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = (this.evolutionTreeState.hoveredNodeId === node.id)
      ? '#ffffff'
      : strokeColor;
    ctx.lineWidth = (this.evolutionTreeState.hoveredNodeId === node.id) ? 4 : 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // STEP-04: Draw tier badge
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tierText = options.isUltimate ? 'ULT' : `T${node.tier}`;
    ctx.fillText(tierText, x, y - radius - 14);

    // STEP-05: Draw weapon name below node
    const nameText = options.isUltimate ? '终极激光炮'
      : (weaponConfig[node.id] ? weaponConfig[node.id].name : node.id);
    ctx.font = '9px Arial';
    ctx.fillText(nameText, x, y + radius + 6);

    // STEP-06: Draw count badge if owned
    if (node.owned && node.count > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textBaseline = 'middle';
      ctx.fillText(`x${node.count}`, x, y);
    }
  },

  // EH-013: Draw connection line
  _drawConnectionLine(ctx, x1, y1, x2, y2, node) {
    const isOwned = node.owned;
    ctx.strokeStyle = (isOwned && weaponConfig[node.id]) ? weaponConfig[node.id].color : '#555555';
    ctx.lineWidth = isOwned ? 3 : 2;
    ctx.setLineDash(isOwned ? [] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(x1 + 25, y1);
    ctx.lineTo(x2 - 25, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    const arrowX = x2 - 25;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(arrowX, y2);
    ctx.lineTo(arrowX - 8, y2 - 4);
    ctx.lineTo(arrowX - 8, y2 + 4);
    ctx.closePath();
    ctx.fill();
  },

  // EH-014: Draw fusion line (convergence)
  _drawFusionLine(ctx, startPos, endPos, canFuse) {
    ctx.strokeStyle = canFuse ? '#00e3fd' : '#555555';
    ctx.lineWidth = canFuse ? 3 : 2;
    ctx.setLineDash(canFuse ? [] : [5, 5]);

    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2 - 40;
    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  // Rerender tree (for zoom/pan updates)
  _rerenderTree(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.evolutionTreeState.treeData) return;
    this._renderEvolutionTreeCanvas(ctx, canvas, this.evolutionTreeState.treeData);
  },

  // EH-015: Attach tree interaction listeners
  _attachTreeInteractionListeners(canvas) {
    let hoverTimeout = null;

    // Mousemove: hover tooltip (debounced 50ms - INF-FE-006)
    canvas.addEventListener('mousemove', (e) => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / this.evolutionTreeState.zoomLevel - this.evolutionTreeState.panOffset.x;
        const mouseY = (e.clientY - rect.top) / this.evolutionTreeState.zoomLevel - this.evolutionTreeState.panOffset.y;

        const hovered = this._detectNodeAtPosition(mouseX, mouseY);
        if (hovered) {
          this.evolutionTreeState.hoveredNodeId = hovered.node.id;
          this._showNodeTooltip(hovered.node, e.pageX, e.pageY);
          this._rerenderTree(canvas);
        } else {
          this.evolutionTreeState.hoveredNodeId = null;
          this._hideNodeTooltip();
          this._rerenderTree(canvas);
        }
      }, 50);
    });

    // Mouseleave: clear tooltip
    canvas.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      this.evolutionTreeState.hoveredNodeId = null;
      this._hideNodeTooltip();
      this._rerenderTree(canvas);
    });

    // Click: show unlock requirements for locked nodes
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / this.evolutionTreeState.zoomLevel - this.evolutionTreeState.panOffset.x;
      const mouseY = (e.clientY - rect.top) / this.evolutionTreeState.zoomLevel - this.evolutionTreeState.panOffset.y;

      const clicked = this._detectNodeAtPosition(mouseX, mouseY);
      if (clicked && !clicked.node.owned) {
        this._showUnlockRequirements(clicked.node);
      }
    });
  },

  // EH-016: Hit detection
  _detectNodeAtPosition(mouseX, mouseY) {
    for (const pos of this.evolutionTreeState.nodePositions) {
      const dx = mouseX - pos.x;
      const dy = mouseY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= pos.radius) {
        return pos;
      }
    }
    return null;
  },

  // EH-017: Show node tooltip
  _showNodeTooltip(node, pageX, pageY) {
    const tooltip = document.getElementById('tree-tooltip');
    if (!tooltip) return;

    const cfg = weaponConfig[node.id];
    const nameText = cfg ? cfg.name : (node.id === 'ultimate_laser' ? '终极激光炮' : node.id);
    const damageText = cfg ? cfg.damage : '-';
    const fireRateText = cfg ? cfg.fireRate : '-';

    tooltip.innerHTML = `
      <div class="tooltip-header">${nameText}</div>
      <div class="tooltip-content">
        <p>等级: Tier ${node.tier}</p>
        <p>伤害: ${damageText}</p>
        <p>射速: ${fireRateText}ms</p>
        <p>拥有: ${node.count}</p>
        ${node.canMerge ? '<p class="tooltip-highlight">可合成!</p>' : ''}
        ${node.canFuse ? '<p class="tooltip-highlight">可融合!</p>' : ''}
      </div>
    `;
    tooltip.style.left = `${pageX + 15}px`;
    tooltip.style.top = `${pageY + 15}px`;
    tooltip.classList.remove('hidden');
  },

  _hideNodeTooltip() {
    const tooltip = document.getElementById('tree-tooltip');
    if (tooltip) tooltip.classList.add('hidden');
  },

  // EH-018: Show unlock requirements
  _showUnlockRequirements(node) {
    const cfg = weaponConfig[node.id];
    const nameText = cfg ? cfg.name : node.id;
    alert(`解锁 ${nameText}:\n通过击败怪物获得或合成获得`);
  },

  // -------------------------
  // COMP-004: SynthesisTab (US-WEP-009)
  // EH-019: Render synthesis tab
  // -------------------------
  renderSynthesis() {
    const container = document.getElementById('synthesis-tab');
    if (!container) return;

    const inv = window.weaponManager.getInventory();

    // STEP-01: Build dropdown options (only show owned weapons)
    let optionsHTML = '<option value="">-- 请选择 --</option>';
    Object.keys(weaponConfig).forEach(id => {
      const count = inv[id] || 0;
      if (count > 0) {
        const cfg = weaponConfig[id];
        optionsHTML += `<option value="${id}">${cfg.name} (拥有${count}个)</option>`;
      }
    });

    // STEP-02: Render tab HTML
    container.innerHTML = `
      <div class="synthesis-tab-inner">
        <div class="weapon-selector">
          <label for="synthesis-weapon-select">选择要合成的武器:</label>
          <select id="synthesis-weapon-select" aria-label="选择武器">
            ${optionsHTML}
          </select>
        </div>
        <div id="synthesis-info" class="synthesis-info hidden" role="region" aria-live="polite" aria-atomic="true">
          <div class="synthesis-target">
            <p>合成目标: <span id="target-weapon-name" class="synthesis-highlight"></span></p>
          </div>
          <div class="synthesis-materials">
            <p>所需材料: <span id="required-count"></span></p>
            <p>当前拥有: <span id="current-count"></span></p>
          </div>
          <div class="synthesis-action">
            <button id="synthesis-button" class="synthesis-btn synthesis-btn--max" disabled aria-disabled="true">一键合成最高</button>
            <div id="synthesis-status" class="synthesis-status" aria-live="polite"></div>
          </div>
        </div>
      </div>
    `;

    // STEP-03: Attach dropdown change event
    const dropdown = document.getElementById('synthesis-weapon-select');
    dropdown.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        this._updateSynthesisInfo(selectedId);
      } else {
        this._hideSynthesisInfo();
      }
    });

    // STEP-04: Attach synthesis button click
    const button = document.getElementById('synthesis-button');
    button.addEventListener('click', () => {
      this._handleSynthesisClick(container);
    });
  },

  // EH-020: Update synthesis info (US-WEP-009: show materials, disable button when insufficient)
  _updateSynthesisInfo(weaponId) {
    const cfg = weaponConfig[weaponId];
    const inv = window.weaponManager.getInventory();
    const currentCount = inv[weaponId] || 0;

    this.synthesisTabState.selectedWeaponId = weaponId;

    // Show info panel
    const infoPanel = document.getElementById('synthesis-info');
    if (infoPanel) infoPanel.classList.remove('hidden');

    const targetNameEl = document.getElementById('target-weapon-name');
    const requiredEl = document.getElementById('required-count');
    const currentEl = document.getElementById('current-count');
    const button = document.getElementById('synthesis-button');
    const statusDiv = document.getElementById('synthesis-status');

    if (!targetNameEl || !button || !statusDiv) return;

    // 计算最高可达等级（模拟 mergeToMax 的逻辑，不实际执行）
    let simInv = { ...inv };
    let simId = weaponId;
    let maxReachable = null;
    let totalSteps = 0;

    while (true) {
      const simCfg = weaponConfig[simId];
      if (!simCfg || !simCfg.nextTier) break;
      if (typeof player !== 'undefined' && player.weapon && player.weapon.id === simId) break;
      const available = simInv[simId] || 0;
      const times = Math.floor(available / 3);
      if (times === 0) break;
      simInv[simId] = available - times * 3;
      simInv[simCfg.nextTier] = (simInv[simCfg.nextTier] || 0) + times;
      maxReachable = simCfg.nextTier;
      totalSteps += times;
      simId = simCfg.nextTier;
    }

    this.synthesisTabState.canMerge = !!maxReachable;
    this.synthesisTabState.targetWeaponId = maxReachable;

    if (maxReachable) {
      const targetCfg = weaponConfig[maxReachable];
      targetNameEl.textContent = targetCfg ? targetCfg.name : maxReachable;
      if (requiredEl) requiredEl.textContent = `共合成 ${totalSteps} 次`;
      if (currentEl) currentEl.textContent = `当前 ${cfg ? cfg.name : weaponId} x${currentCount}`;
      button.disabled = false;
      button.setAttribute('aria-disabled', 'false');
      button.textContent = '一键合成最高';
      statusDiv.textContent = `可合成至 ${targetCfg ? targetCfg.name : maxReachable}`;
      statusDiv.className = 'synthesis-status status-success';
    } else {
      const nextTierCfg = cfg && cfg.nextTier ? weaponConfig[cfg.nextTier] : null;
      targetNameEl.textContent = nextTierCfg ? nextTierCfg.name : '无';
      if (requiredEl) requiredEl.textContent = `需要3个 ${cfg ? cfg.name : weaponId}`;
      if (currentEl) currentEl.textContent = `当前 x${currentCount}`;
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = '一键合成最高';
      const isEquipped = typeof player !== 'undefined' && player.weapon && player.weapon.id === weaponId;
      statusDiv.textContent = isEquipped ? '当前装备中，无法合成' : (currentCount < 3 ? `材料不足（需要3个）` : '已是最高级');
      statusDiv.className = 'synthesis-status status-error';
    }
  },

  // EH-021: Hide synthesis info
  _hideSynthesisInfo() {
    const infoPanel = document.getElementById('synthesis-info');
    if (infoPanel) infoPanel.classList.add('hidden');
    this.synthesisTabState.selectedWeaponId = null;
    this.synthesisTabState.canMerge = false;
    this.synthesisTabState.targetWeaponId = null;
  },

  // EH-022: Handle synthesis click
  _handleSynthesisClick(container) {
    // STEP-01: Validate
    if (!this.synthesisTabState.selectedWeaponId) {
      alert('请先选择要合成的武器');
      return;
    }
    if (this.synthesisTabState.isMerging) return;

    // STEP-02: Disable button (prevent double-click)
    const button = document.getElementById('synthesis-button');
    if (button) {
      button.disabled = true;
      button.textContent = '合成中...';
    }
    this.synthesisTabState.isMerging = true;

    // STEP-03: Execute max synthesis
    const result = window.weaponManager.mergeToMax(this.synthesisTabState.selectedWeaponId);

    // STEP-04: Handle result
    if (result.success) {
      if (typeof weaponMergeAnimation !== 'undefined') {
        weaponMergeAnimation.playMergeEffect(result.finalWeapon);
      }

      this._playSynthesisAnimation(result.finalWeapon);

      setTimeout(() => {
        const targetCfg = weaponConfig[result.finalWeapon];
        const statusDiv = document.getElementById('synthesis-status');
        if (statusDiv) {
          const stepsDesc = result.steps.map(s => {
            const fromCfg = weaponConfig[s.from];
            const toCfg = weaponConfig[s.to];
            return `${fromCfg ? fromCfg.name : s.from}×${s.times * 3}→${toCfg ? toCfg.name : s.to}×${s.times}`;
          }).join('，');
          statusDiv.textContent = `合成成功！${stepsDesc}`;
          statusDiv.className = 'synthesis-status status-success';
        }

        this.renderSynthesis();
        this.synthesisTabState.isMerging = false;
      }, 1500);
    } else {
      const statusDiv = document.getElementById('synthesis-status');
      if (statusDiv) {
        statusDiv.textContent = result.message || '合成失败';
        statusDiv.className = 'synthesis-status status-error';
      }
      if (button) {
        button.disabled = false;
        button.textContent = '一键合成最高';
      }
      this.synthesisTabState.isMerging = false;
    }
  },

  // EH-023: Play synthesis animation (NFR-WEP-003: 1.5s animation)
  _playSynthesisAnimation(targetWeaponId) {
    const cfg = weaponConfig[targetWeaponId];
    const color = cfg ? cfg.color : '#8eff71';

    const animHTML = `
      <div class="synthesis-animation-overlay animate" id="synthesis-animation">
        <div class="animation-content">
          <div class="material-icons-anim">
            <div class="material-icon-anim" style="color:${color}">×3</div>
          </div>
          <div class="merge-arrow-anim">→</div>
          <div class="result-icon-anim glow-effect" style="color:${color}">
            <span>${cfg ? cfg.name : targetWeaponId}</span>
          </div>
        </div>
      </div>
    `;

    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.insertAdjacentHTML('beforeend', animHTML);
      setTimeout(() => {
        const anim = document.getElementById('synthesis-animation');
        if (anim) anim.remove();
      }, 1500);
    }
  },

  // -------------------------
  // Fusion (from evolution tree)
  // -------------------------
  doFusion() {
    const result = window.weaponManager.fuseUltimateWeapon();
    if (result.success) {
      if (typeof weaponMergeAnimation !== 'undefined') {
        weaponMergeAnimation.playMergeEffect(result.result);
      }
      alert('融合成功! 获得终极激光炮!');
      this.renderEvolutionTree();
      this.renderInventory();
    } else {
      alert(result.message || result.error || '融合失败');
    }
  },

  // -------------------------
  // Show warning helper
  // -------------------------
  _showWarning(message) {
    const existing = document.getElementById('weapon-warning');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'weapon-warning';
    el.className = 'weapon-notification';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
  },

  // -------------------------
  // Show notification helper (BLOCK-009: UI feedback)
  // -------------------------
  _showNotification(message, type = 'info') {
    const existing = document.getElementById('weapon-notification');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'weapon-notification';
    el.className = `weapon-notification ${type === 'error' ? 'notification-error' : 'notification-success'}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
  }
};

// Expose as window.weaponUI for global access
window.weaponUI = weaponUI;
