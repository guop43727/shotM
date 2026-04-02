// WeaponManager - Core weapon inventory and evolution logic
// L0-AC-001: Weapon collection and persistence
// L0-AC-002: 3:1 synthesis with atomic rollback
// L0-AC-003: Ultimate fusion (3 Super → Ultimate Laser)

// FR-WEP-003: Complete evolution tree configuration
const weaponEvolutionConfig = {
  rifle: { id: 'rifle', name: '步枪', tier: 1, damage: 50, fireRate: 50, bulletCount: 1, color: '#ff7948', nextTier: 'rifle+' },
  'rifle+': { id: 'rifle+', name: '步枪+', tier: 2, damage: 65, fireRate: 45, bulletCount: 1, color: '#ff8958', nextTier: 'rifle++' },
  'rifle++': { id: 'rifle++', name: '步枪++', tier: 3, damage: 85, fireRate: 40, bulletCount: 1, color: '#ff9968', nextTier: 'super_rifle' },
  super_rifle: { id: 'super_rifle', name: '超级步枪', tier: 4, damage: 110, fireRate: 35, bulletCount: 1, color: '#ffa978', nextTier: null },

  machinegun: { id: 'machinegun', name: '机枪', tier: 1, damage: 60, fireRate: 30, bulletCount: 1, color: '#ffeb3b', nextTier: 'machinegun+' },
  'machinegun+': { id: 'machinegun+', name: '机枪+', tier: 2, damage: 75, fireRate: 25, bulletCount: 1, color: '#ffee4b', nextTier: 'machinegun++' },
  'machinegun++': { id: 'machinegun++', name: '机枪++', tier: 3, damage: 95, fireRate: 20, bulletCount: 1, color: '#fff15b', nextTier: 'super_machinegun' },
  super_machinegun: { id: 'super_machinegun', name: '超级机枪', tier: 4, damage: 120, fireRate: 15, bulletCount: 1, color: '#fff46b', nextTier: null },

  shotgun: { id: 'shotgun', name: '霰弹枪', tier: 1, damage: 30, fireRate: 150, bulletCount: 5, color: '#ff4848', nextTier: 'shotgun+' },
  'shotgun+': { id: 'shotgun+', name: '霰弹枪+', tier: 2, damage: 40, fireRate: 140, bulletCount: 5, color: '#ff5858', nextTier: 'shotgun++' },
  'shotgun++': { id: 'shotgun++', name: '霰弹枪++', tier: 3, damage: 55, fireRate: 130, bulletCount: 5, color: '#ff6868', nextTier: 'super_shotgun' },
  super_shotgun: { id: 'super_shotgun', name: '超级霰弹枪', tier: 4, damage: 75, fireRate: 120, bulletCount: 5, color: '#ff7878', nextTier: null },

  ultimate_laser: { id: 'ultimate_laser', name: '终极激光炮', tier: 5, damage: 150, fireRate: 10, bulletCount: 1, color: '#00e3fd', nextTier: null }
};

// StorageAdapter: localStorage with sessionStorage fallback
// NFR-WEP-002: Fallback to sessionStorage when localStorage full
const StorageAdapter = {
  useSessionStorage: false,
  STORAGE_KEY: 'monsterTide_weaponInventory',
  VERSION_KEY: 'monsterTide_version',

  // RM-001: save(key, data)
  save(data) {
    const payload = {
      schemaVersion: '2.0.0',
      lastSaved: Date.now(),
      inventory: data,
      checksum: this.calculateChecksum(data)
    };

    const jsonString = JSON.stringify(payload);

    // Try localStorage first
    if (!this.useSessionStorage) {
      try {
        localStorage.setItem(this.STORAGE_KEY, jsonString);
        localStorage.setItem(this.VERSION_KEY, '2.0.0');
        return { success: true, storage: 'localStorage' };
      } catch (error) {
        // STOR-001: QuotaExceededError
        if (error.name === 'QuotaExceededError') {
          console.warn('[STOR-001] localStorage full, falling back to sessionStorage');
          this.useSessionStorage = true;
        }
        // STOR-002: SecurityError (privacy mode)
        else if (error.name === 'SecurityError') {
          console.warn('[STOR-002] localStorage disabled (privacy mode)');
          this.useSessionStorage = true;
        }
        // STOR-003: Unknown error
        else {
          console.error('[STOR-003] Unknown storage error:', error);
          return { success: false, error: 'STOR-003' };
        }
      }
    }

    // Fallback to sessionStorage
    try {
      sessionStorage.setItem(this.STORAGE_KEY, jsonString);
      sessionStorage.setItem(this.VERSION_KEY, '2.0.0');
      console.warn('[Storage] Using sessionStorage (data temporary)');
      return { success: true, storage: 'sessionStorage', warning: 'Data temporary' };
    } catch (sessionError) {
      // STOR-004: Both storage types failed
      console.error('[STOR-004] sessionStorage also failed:', sessionError);
      return { success: false, error: 'STOR-004' };
    }
  },

  // RM-002: load(key)
  load() {
    let stored = null;
    try {
      stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        stored = sessionStorage.getItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('[DATA-001] Storage read failed:', error);
      return this.getDefaultInventory();
    }

    if (!stored) {
      return this.getDefaultInventory();
    }

    try {
      const payload = JSON.parse(stored);
      const inventory = payload.data || payload.inventory || payload;

      // Validate inventory (returns validated copy or false)
      const validated = this.validateInventory(inventory);
      if (!validated) {
        console.warn('[DATA-004] Invalid inventory format, using default');
        return this.getDefaultInventory();
      }

      return validated;
    } catch (parseError) {
      // DATA-002: JSON parse failed
      console.error('[DATA-002] JSON parse failed:', parseError);
      return this.getDefaultInventory();
    }
  },

  // RM-004: validate(data)
  validateInventory(inventory) {
    if (typeof inventory !== 'object' || inventory === null || Array.isArray(inventory)) {
      return false;
    }

    // BLOCK-007 fix: Return new object instead of mutating input
    const validated = { ...inventory };

    // Ensure at least rifle exists
    if (!validated.rifle || validated.rifle < 1) {
      validated.rifle = 1;
    }

    // Validate counts
    for (const weaponId in validated) {
      const count = validated[weaponId];
      if (typeof count !== 'number' || count < 0 || count > 999999) {
        validated[weaponId] = Math.max(0, Math.min(999999, Math.floor(count || 0)));
      }
    }

    return validated;
  },

  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(36);
  },

  getDefaultInventory() {
    return { rifle: 1 };
  }
};

// WeaponManager: Core business logic
const WeaponManager = {
  inventory: null,
  saveTimer: null,

  // Unit 8: loadInventory()
  loadInventory() {
    this.inventory = StorageAdapter.load();
    return this.inventory;
  },

  // Unit 1: getInventory()
  getInventory() {
    if (!this.inventory) {
      this.loadInventory();
    }
    return { ...this.inventory };
  },

  // Unit 2: addWeapon(weaponType)
  addWeapon(weaponType) {
    // V-001: Validate weaponType
    if (!weaponEvolutionConfig[weaponType]) {
      console.error('[DATA-004] Unknown weapon type:', weaponType);
      return { success: false, error: 'DATA-004', message: '未知武器类型' };
    }

    // STEP-03: Increment weapon count
    this.inventory[weaponType] = (this.inventory[weaponType] || 0) + 1;

    // STEP-04: Persist to storage
    this.debouncedSave();

    // STEP-05: Auto-equip if no weapon equipped
    if (typeof player !== 'undefined' && player.weapon) {
      const hasEquippedWeapon = player.weapon.id && weaponEvolutionConfig[player.weapon.id];
      const playerOwnsEquipped = hasEquippedWeapon && (this.inventory[player.weapon.id] || 0) > 0;

      if (!playerOwnsEquipped) {
        // Find highest rarity weapon in inventory
        let highestWeapon = null;
        let highestTier = 0;

        for (const weaponId in this.inventory) {
          if (this.inventory[weaponId] > 0 && weaponEvolutionConfig[weaponId]) {
            const tier = weaponEvolutionConfig[weaponId].tier;
            if (tier > highestTier) {
              highestTier = tier;
              highestWeapon = weaponId;
            }
          }
        }

        if (highestWeapon) {
          this.equipWeapon(highestWeapon);
        }
      }
    }

    return { success: true, weaponType: weaponType, count: this.inventory[weaponType] };
  },

  // Unit 3: mergeWeapons(weaponType)
  mergeWeapons(weaponType) {
    // STEP-01: Validate weapon type
    const config = weaponEvolutionConfig[weaponType];
    if (!config) {
      return { success: false, error: 'BIZ-002', message: '未知武器类型' };
    }

    // STEP-03: Check if max tier
    if (!config.nextTier) {
      return { success: false, error: 'BIZ-004', message: `${config.name}已是最高级武器，无法继续合成` };
    }

    // STEP-02: Check material count
    const count = this.inventory[weaponType] || 0;
    if (count < 3) {
      return { success: false, error: 'BIZ-002', message: `材料不足: 需要3个${config.name}，当前拥有${count}个` };
    }

    // STEP-04: Check if currently equipped
    if (typeof player !== 'undefined' && player.weapon && player.weapon.id === weaponType) {
      return { success: false, error: 'BIZ-003', message: '无法合成当前装备的武器，请先切换' };
    }

    // STEP-05: Begin transaction (snapshot for rollback)
    const snapshot = { ...this.inventory };

    try {
      // STEP-06: Deduct materials
      this.inventory[weaponType] -= 3;

      // STEP-07: Add result
      this.inventory[config.nextTier] = (this.inventory[config.nextTier] || 0) + 1;

      // STEP-08: Persist (commit transaction)
      const saveResult = this.saveInventory();
      if (!saveResult) {
        throw new Error('Save failed');
      }

      return { success: true, result: config.nextTier };
    } catch (error) {
      // Rollback on failure
      this.inventory = snapshot;
      console.error('[TXN-004] Transaction failed, rolled back:', error);
      return { success: false, error: 'TXN-004', message: '合成失败，已回滚' };
    }
  },

  // Unit 4: equipWeapon(weaponType)
  equipWeapon(weaponType) {
    // V-002: Validate weapon type
    const config = weaponEvolutionConfig[weaponType];
    if (!config) {
      console.error('[DATA-004] Unknown weapon type:', weaponType);
      return { success: false, error: 'DATA-004', message: '未知武器类型' };
    }

    // V-003: Check ownership (BLOCK-006 fix)
    if ((this.inventory[weaponType] || 0) === 0) {
      console.error('[BIZ-002] Weapon not owned:', weaponType);
      return { success: false, error: 'BIZ-002', message: '您还未拥有该武器' };
    }

    // STEP-03: Update player weapon
    if (typeof player !== 'undefined' && player.weapon) {
      player.weapon.id = config.id;
      player.weapon.type = config.id;
      player.weapon.damage = config.damage;
      player.weapon.fireRate = config.fireRate;
      player.weapon.bulletCount = config.bulletCount;
      player.weapon.color = config.color;
    }

    return { success: true, weaponType: weaponType };
  },

  // Unit 5: canMerge(weaponType)
  canMerge(weaponType) {
    const config = weaponEvolutionConfig[weaponType];
    if (!config) {
      return { canMerge: false, reason: '未知武器类型' };
    }

    if (!config.nextTier) {
      return { canMerge: false, reason: '已是最高级武器' };
    }

    const count = this.inventory[weaponType] || 0;
    if (count < 3) {
      return { canMerge: false, reason: `需要3个，当前${count}个` };
    }

    // Check if equipped
    if (typeof player !== 'undefined' && player.weapon && player.weapon.id === weaponType) {
      return { canMerge: false, reason: '当前装备的武器无法合成' };
    }

    return { canMerge: true, nextWeapon: config.nextTier };
  },

  // Unit 6: getEvolutionTree()
  getEvolutionTree() {
    const inv = this.inventory;
    const paths = [
      ['rifle', 'rifle+', 'rifle++', 'super_rifle'].map(id => ({
        id,
        tier: weaponEvolutionConfig[id].tier,
        owned: (inv[id] || 0) > 0,
        count: inv[id] || 0,
        canMerge: (inv[id] || 0) >= 3 && !!weaponEvolutionConfig[id].nextTier
      })),
      ['machinegun', 'machinegun+', 'machinegun++', 'super_machinegun'].map(id => ({
        id,
        tier: weaponEvolutionConfig[id].tier,
        owned: (inv[id] || 0) > 0,
        count: inv[id] || 0,
        canMerge: (inv[id] || 0) >= 3 && !!weaponEvolutionConfig[id].nextTier
      })),
      ['shotgun', 'shotgun+', 'shotgun++', 'super_shotgun'].map(id => ({
        id,
        tier: weaponEvolutionConfig[id].tier,
        owned: (inv[id] || 0) > 0,
        count: inv[id] || 0,
        canMerge: (inv[id] || 0) >= 3 && !!weaponEvolutionConfig[id].nextTier
      }))
    ];

    const canFuse = (inv.super_rifle || 0) > 0 && (inv.super_machinegun || 0) > 0 && (inv.super_shotgun || 0) > 0;
    const fusion = {
      id: 'ultimate_laser',
      tier: 5,
      owned: (inv.ultimate_laser || 0) > 0,
      count: inv.ultimate_laser || 0,
      canFuse,
      requirements: ['super_rifle', 'super_machinegun', 'super_shotgun']
    };

    return { paths, fusion };
  },

  // FR-WEP-004: fuseUltimateWeapon()
  fuseUltimateWeapon() {
    const inv = this.inventory;

    // Check materials
    if ((inv.super_rifle || 0) < 1 || (inv.super_machinegun || 0) < 1 || (inv.super_shotgun || 0) < 1) {
      return { success: false, error: 'BIZ-005', message: '需要集齐三个Super武器' };
    }

    // Transaction snapshot
    const snapshot = { ...this.inventory };

    try {
      // Consume materials
      inv.super_rifle -= 1;
      inv.super_machinegun -= 1;
      inv.super_shotgun -= 1;

      // Add ultimate weapon
      inv.ultimate_laser = (inv.ultimate_laser || 0) + 1;

      // Persist
      const saveResult = this.saveInventory();
      if (!saveResult) {
        throw new Error('Save failed');
      }

      return { success: true, result: 'ultimate_laser' };
    } catch (error) {
      // Rollback
      this.inventory = snapshot;
      console.error('[TXN-004] Fusion failed, rolled back:', error);
      return { success: false, error: 'TXN-004', message: '融合失败，已回滚' };
    }
  },

  // Unit 20: validateInventory(data)
  validateInventory(data) {
    const validated = StorageAdapter.validateInventory(data);
    if (validated && typeof validated === 'object') {
      // Update internal inventory with validated copy
      this.inventory = validated;
      return validated;
    }
    return validated;
  },

  // Unit 7: saveInventory()
  saveInventory() {
    if (!this.inventory) {
      return false;
    }

    const result = StorageAdapter.save(this.inventory);
    return result.success;
  },

  // mergeToMax(weaponType): 自动合成到当前库存可达的最高等级
  // 返回 { success, steps: [{from, to, times}], finalWeapon, finalCount }
  mergeToMax(weaponType) {
    const config = weaponEvolutionConfig[weaponType];
    if (!config) {
      return { success: false, message: '未知武器类型' };
    }

    // 计算从 weaponType 开始，沿进化链能合成到哪一级
    // 规则：每3个当前级 → 1个下一级，递归计算
    const snapshot = { ...this.inventory };
    const steps = [];

    let currentId = weaponType;
    let merged = false;

    try {
      while (true) {
        const cfg = weaponEvolutionConfig[currentId];
        if (!cfg || !cfg.nextTier) break; // 已是最高级

        // 检查是否装备中（不能合成装备中的武器）
        if (typeof player !== 'undefined' && player.weapon && player.weapon.id === currentId) break;

        const available = this.inventory[currentId] || 0;
        const times = Math.floor(available / 3);
        if (times === 0) break;

        // 执行 times 次合成
        this.inventory[currentId] = available - times * 3;
        this.inventory[cfg.nextTier] = (this.inventory[cfg.nextTier] || 0) + times;

        steps.push({ from: currentId, to: cfg.nextTier, times });
        merged = true;

        // 继续尝试对下一级进行合成
        currentId = cfg.nextTier;
      }

      if (!merged) {
        this.inventory = snapshot;
        const count = this.inventory[weaponType] || 0;
        return { success: false, message: `材料不足或已是最高级（当前${count}个，需要至少3个）` };
      }

      const saveResult = this.saveInventory();
      if (!saveResult) throw new Error('Save failed');

      // 找到最终产出的最高级武器
      const lastStep = steps[steps.length - 1];
      return {
        success: true,
        steps,
        finalWeapon: lastStep.to,
        finalCount: this.inventory[lastStep.to] || 0
      };
    } catch (error) {
      this.inventory = snapshot;
      return { success: false, message: '合成失败，已回滚' };
    }
  },

  // Debounced save (300ms)
  debouncedSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => this.saveInventory(), 300);
  }
};

// Initialize on load
WeaponManager.loadInventory();

// Expose globally
if (typeof window !== 'undefined') {
  window.weaponManager = WeaponManager;
  window.weaponEvolutionConfig = weaponEvolutionConfig;
  window.weaponConfig = weaponEvolutionConfig; // Alias for weaponUI.js compatibility
}
