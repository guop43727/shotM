// WeaponManager - Core weapon inventory and evolution logic
// L0-AC-001, L0-AC-002, L0-AC-003

const weaponConfig = {
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

const weaponManager = {
  inventory: null,
  saveTimer: null,

  // V-001: Load inventory from localStorage with validation
  loadInventory() {
    try {
      const stored = localStorage.getItem('monsterTide_weaponInventory');
      if (stored) {
        const payload = JSON.parse(stored);
        const raw = payload.data || payload;

        // FND-SEC-003: Validate structure
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
          throw new Error('Invalid inventory format');
        }

        // FND-SEC-002: Sanitize - only allow known weapons with valid counts
        this.inventory = {};
        Object.keys(raw).forEach(key => {
          if (weaponConfig[key] && typeof raw[key] === 'number' && raw[key] >= 0 && raw[key] <= 9999) {
            this.inventory[key] = Math.floor(raw[key]);
          }
        });

        if (Object.keys(this.inventory).length === 0) {
          this.inventory = { rifle: 1 };
        }
      } else {
        this.inventory = { rifle: 1 };
      }
    } catch (e) {
      console.warn('Load failed:', e);
      this.inventory = { rifle: 1 };
      // FND-FUNC-006: Try sessionStorage fallback
      try {
        const sessionData = sessionStorage.getItem('monsterTide_weaponInventory');
        if (sessionData) {
          const payload = JSON.parse(sessionData);
          this.inventory = payload.data || payload;
        }
      } catch (se) {
        console.warn('Session load failed:', se);
      }
    }
    return this.inventory;
  },

  // STEP-01: Get inventory
  getInventory() {
    return this.inventory || { rifle: 1 };
  },

  // STEP-02: Add weapon
  addWeapon(weaponId) {
    if (!weaponConfig[weaponId]) return;
    this.inventory[weaponId] = (this.inventory[weaponId] || 0) + 1;
    this.debouncedSave();
  },

  // STEP-03: Merge weapons (3:1 ratio)
  mergeWeapons(weaponId) {
    const config = weaponConfig[weaponId];
    if (!config || !config.nextTier) {
      return { success: false, error: `${config ? config.name : '未知武器'}已是最高级武器,无法继续合成` };
    }

    const count = this.inventory[weaponId] || 0;
    if (count < 3) {
      return { success: false, error: `材料不足: 需要3个${config.name},当前拥有${count}个` };
    }

    // FND-FUNC-005: Check if equipped weapon
    if (typeof player !== 'undefined' && player.weapon && player.weapon.id === weaponId) {
      return { success: false, error: '无法合成当前装备的武器' };
    }

    this.inventory[weaponId] -= 3;
    this.inventory[config.nextTier] = (this.inventory[config.nextTier] || 0) + 1;
    this.debouncedSave();

    return { success: true, result: config.nextTier };
  },

  // STEP-04: Check if can merge
  canMerge(weaponId) {
    const config = weaponConfig[weaponId];
    if (!config) return { canMerge: false, reason: '未知武器' };
    if (!config.nextTier) return { canMerge: false, reason: '已是最高级' };

    const count = this.inventory[weaponId] || 0;
    if (count < 3) return { canMerge: false, reason: `需要3个,当前${count}个` };

    return { canMerge: true, nextWeapon: config.nextTier };
  },

  // STEP-05: Get evolution tree
  getEvolutionTree() {
    const inv = this.inventory;
    const paths = [
      ['rifle', 'rifle+', 'rifle++', 'super_rifle'].map(id => ({
        id, tier: weaponConfig[id].tier, owned: (inv[id] || 0) > 0, count: inv[id] || 0
      })),
      ['machinegun', 'machinegun+', 'machinegun++', 'super_machinegun'].map(id => ({
        id, tier: weaponConfig[id].tier, owned: (inv[id] || 0) > 0, count: inv[id] || 0
      })),
      ['shotgun', 'shotgun+', 'shotgun++', 'super_shotgun'].map(id => ({
        id, tier: weaponConfig[id].tier, owned: (inv[id] || 0) > 0, count: inv[id] || 0
      }))
    ];

    const canFuse = (inv.super_rifle || 0) > 0 && (inv.super_machinegun || 0) > 0 && (inv.super_shotgun || 0) > 0;
    const fusion = {
      id: 'ultimate_laser',
      tier: 5,
      owned: (inv.ultimate_laser || 0) > 0,
      count: inv.ultimate_laser || 0,
      canFuse
    };

    return { paths, fusion };
  },

  // STEP-06: Fuse ultimate weapon
  fuseUltimate() {
    const inv = this.inventory;
    if ((inv.super_rifle || 0) === 0 || (inv.super_machinegun || 0) === 0 || (inv.super_shotgun || 0) === 0) {
      return { success: false, error: '需要3种超级武器各1个' };
    }

    inv.super_rifle -= 1;
    inv.super_machinegun -= 1;
    inv.super_shotgun -= 1;
    inv.ultimate_laser = (inv.ultimate_laser || 0) + 1;
    this.debouncedSave();

    return { success: true, result: 'ultimate_laser' };
  },

  // FND-PERF-001: Debounced save (300ms)
  debouncedSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveInventory(), 300);
  },

  // STEP-07: Save inventory with fallback
  saveInventory() {
    try {
      const payload = { data: this.inventory };
      localStorage.setItem('monsterTide_weaponInventory', JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      // FND-FUNC-006: Fallback to sessionStorage
      try {
        sessionStorage.setItem('monsterTide_weaponInventory', JSON.stringify({ data: this.inventory }));
      } catch (se) {
        console.warn('Session save failed:', se);
      }
      return false;
    }
  },

  // STEP-08: Equip weapon
  equipWeapon(weaponId) {
    const config = weaponConfig[weaponId];
    if (!config || (this.inventory[weaponId] || 0) === 0) return;

    if (typeof player !== 'undefined' && player.weapon) {
      player.weapon.id = config.id;
      player.weapon.type = config.id;
      player.weapon.damage = config.damage;
      player.weapon.fireRate = config.fireRate;
      player.weapon.bulletCount = config.bulletCount;
      player.weapon.color = config.color;
    }
  }
};

// Initialize on load
weaponManager.loadInventory();
