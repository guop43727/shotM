// WeaponUI - Modal interface for weapon management
// COMP-001, COMP-002, COMP-003, COMP-004

const weaponUI = {
  modalState: { isOpen: false, currentTab: 'inventory' },
  canvasCache: null,
  synthesisInProgress: false,

  // EH-001: Open modal
  openWeaponModal() {
    if (game.waveActive) {
      alert('战斗中无法打开武器管理!');
      return;
    }

    const modal = document.getElementById('weapon-modal');
    modal.style.display = 'block';
    this.modalState.isOpen = true;
    this.switchTab('inventory');
  },

  // EH-002: Close modal
  closeWeaponModal() {
    const modal = document.getElementById('weapon-modal');
    modal.style.display = 'none';
    this.modalState.isOpen = false;
  },

  // EH-003: Switch tab
  switchTab(tabName) {
    this.modalState.currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) activeContent.style.display = 'block';

    if (tabName === 'inventory') this.renderInventory();
    else if (tabName === 'evolution') this.renderEvolutionTree();
    else if (tabName === 'synthesis') this.renderSynthesis();
  },

  // RL-001: Render inventory grid
  renderInventory() {
    const container = document.getElementById('inventory-grid');
    const inv = weaponManager.getInventory();

    let html = '';
    Object.keys(weaponConfig).forEach(id => {
      const cfg = weaponConfig[id];
      const count = inv[id] || 0;
      const owned = count > 0;

      // FND-SEC-001: Use data attribute instead of inline onclick
      html += `
        <div class="weapon-card ${owned ? 'owned' : 'locked'}" data-weapon-id="${id}">
          <div class="weapon-icon" style="background:${cfg.color}">T${cfg.tier}</div>
          <div class="weapon-name">${cfg.name}</div>
          <div class="weapon-count">x${count}</div>
        </div>
      `;
    });

    container.innerHTML = html;

    // FND-SEC-001: Event delegation
    container.onclick = (e) => {
      const card = e.target.closest('.weapon-card');
      if (card) {
        const weaponId = card.dataset.weaponId;
        if (weaponId) this.showDetails(weaponId);
      }
    };
  },

  // Show weapon details
  showDetails(weaponId) {
    const cfg = weaponConfig[weaponId];
    const count = weaponManager.getInventory()[weaponId] || 0;

    alert(`${cfg.name}\n等级: Tier ${cfg.tier}\n伤害: ${cfg.damage}\n射速: ${cfg.fireRate}ms\n拥有: ${count}个`);
  },

  // RL-002: Render evolution tree (Canvas) with caching
  renderEvolutionTree() {
    const canvas = document.getElementById('evolution-canvas');
    const ctx = canvas.getContext('2d');

    // FND-PERF-002: Cache static elements
    if (!this.canvasCache) {
      this.canvasCache = document.createElement('canvas');
      this.canvasCache.width = canvas.width;
      this.canvasCache.height = canvas.height;
      const cacheCtx = this.canvasCache.getContext('2d');

      const startX = 80, startY = 80, spacing = 140;

      // Draw static connection lines
      for (let pathIdx = 0; pathIdx < 3; pathIdx++) {
        const y = startY + pathIdx * 120;
        for (let tierIdx = 0; tierIdx < 3; tierIdx++) {
          const x = startX + tierIdx * spacing;
          cacheCtx.strokeStyle = '#555';
          cacheCtx.lineWidth = 2;
          cacheCtx.beginPath();
          cacheCtx.moveTo(x + 30, y);
          cacheCtx.lineTo(x + spacing - 30, y);
          cacheCtx.stroke();
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.canvasCache, 0, 0);

    const tree = weaponManager.getEvolutionTree();
    const startX = 80, startY = 80, spacing = 140;

    // Draw nodes only
    tree.paths.forEach((path, pathIdx) => {
      const y = startY + pathIdx * 120;

      path.forEach((node, tierIdx) => {
        const x = startX + tierIdx * spacing;
        const cfg = weaponConfig[node.id];

        ctx.fillStyle = node.owned ? cfg.color : '#333';
        ctx.strokeStyle = node.owned ? '#8eff71' : '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.count > 0 ? `x${node.count}` : '', x, y + 4);
      });
    });

    // FND-FUNC-003: Draw fusion node with click detection
    const fusionX = startX + 4 * spacing + 40;
    const fusionY = startY + 120;

    ctx.fillStyle = tree.fusion.owned ? '#00e3fd' : '#333';
    ctx.strokeStyle = tree.fusion.canFuse ? '#0ff' : '#555';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(fusionX, fusionY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('ULT', fusionX, fusionY + 3);

    // FND-FUNC-003: Add click event for fusion node
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dist = Math.sqrt((x - fusionX) ** 2 + (y - fusionY) ** 2);

      if (dist <= 30 && tree.fusion.canFuse) {
        this.doFusion();
      }
    };
  },

  // RL-003: Render synthesis interface
  renderSynthesis() {
    const select = document.getElementById('synthesis-select');
    const inv = weaponManager.getInventory();

    let html = '<option value="">选择武器</option>';
    Object.keys(weaponConfig).forEach(id => {
      const count = inv[id] || 0;
      if (count > 0 && weaponConfig[id].nextTier) {
        html += `<option value="${id}">${weaponConfig[id].name} (x${count})</option>`;
      }
    });

    select.innerHTML = html;
  },

  // Handle synthesis selection
  onSynthesisSelect(weaponId) {
    const info = document.getElementById('synthesis-info');

    if (!weaponId) {
      info.style.display = 'none';
      return;
    }

    const result = weaponManager.canMerge(weaponId);
    const cfg = weaponConfig[weaponId];
    const count = weaponManager.getInventory()[weaponId] || 0;

    info.style.display = 'block';
    document.getElementById('target-name').textContent = result.nextWeapon ? weaponConfig[result.nextWeapon].name : '无';
    document.getElementById('material-count').textContent = `需要3个 ${cfg.name}, 当前${count}个`;

    const btn = document.getElementById('synthesis-btn');
    btn.disabled = !result.canMerge;
    btn.onclick = () => this.doSynthesis(weaponId);
  },

  // Execute synthesis
  doSynthesis(weaponId) {
    // FND-FUNC-005: Debounce - prevent double clicks
    if (this.synthesisInProgress) return;
    this.synthesisInProgress = true;

    const result = weaponManager.mergeWeapons(weaponId);

    if (result.success) {
      weaponMergeAnimation.playMergeEffect(result.result);
      alert(`合成成功! 获得 ${weaponConfig[result.result].name}`);
      this.renderInventory();
      this.renderEvolutionTree();
      this.renderSynthesis();
    } else {
      alert(result.error);
    }

    setTimeout(() => { this.synthesisInProgress = false; }, 500);
  },

  // Execute fusion
  doFusion() {
    const result = weaponManager.fuseUltimate();

    if (result.success) {
      alert('融合成功! 获得终极激光炮!');
      this.renderInventory();
      this.renderEvolutionTree();
    } else {
      alert(result.error);
    }
  }
};
