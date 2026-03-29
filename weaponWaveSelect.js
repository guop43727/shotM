// Wave Weapon Selection UI
const weaponWaveSelect = {
  show() {
    const inventory = weaponManager.getInventory();
    const weapons = Object.entries(inventory).filter(([_, count]) => count > 0);

    if (weapons.length === 0) {
      this.selectWeapon('rifle');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'wave-select-modal';
    modal.innerHTML = `
      <div class="wave-select-content">
        <h2>选择武器 - 第 ${game.wave} 波</h2>
        <div class="weapon-grid">
          ${weapons.map(([type, count]) => {
            const cfg = weaponConfig[type];
            return `
              <div class="weapon-card" onclick="weaponWaveSelect.selectWeapon('${type}')">
                <div class="weapon-icon" style="background: ${cfg.color}"></div>
                <div class="weapon-name">${cfg.name}</div>
                <div class="weapon-stats">伤害: ${cfg.damage} | 射速: ${cfg.fireRate}</div>
                <div class="weapon-count">x${count}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  selectWeapon(type) {
    const cfg = weaponConfig[type];
    player.weapon = {
      type,
      fireRate: cfg.fireRate,
      damage: cfg.damage,
      bulletCount: cfg.bulletCount,
      color: cfg.color,
      name: cfg.name,
      lastFire: 0
    };

    const modal = document.getElementById('wave-select-modal');
    if (modal) modal.remove();

    startWave();
  }
};
