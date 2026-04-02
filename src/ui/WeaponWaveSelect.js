// src/ui/WeaponWaveSelect.js
// REQ-WEAPON-004: Wave weapon selection interface (migrated from weaponWaveSelect.js)

/**
 * WeaponWaveSelect — HTML overlay for selecting weapon before each wave.
 * REQ-WEAPON-004: preserves existing wave selection logic.
 */
export class WeaponWaveSelect {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Show weapon selection modal.
   * Migrated from weaponWaveSelect.js:3-33.
   */
  show() {
    const inventory = this.scene.weaponManager.getInventory();
    const weapons = Object.entries(inventory).filter(([_, count]) => count > 0);

    if (weapons.length === 0) {
      this.selectWeapon('rifle');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'wave-select-modal';
    modal.innerHTML = `
      <div class="wave-select-content">
        <h2>选择武器 - 第 ${this.scene.gameState.wave} 波</h2>
        <div class="weapon-grid">
          ${weapons.map(([type, count]) => {
            const cfg = this.scene.weaponManager.getWeaponConfig(type);
            if (!cfg) return '';
            return `
              <div class="weapon-card" data-weapon-type="${type}">
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

    // Event delegation instead of global window assignment
    modal.addEventListener('click', (e) => {
      const card = e.target.closest('.weapon-card');
      if (card) {
        const type = card.dataset.weaponType;
        this.selectWeapon(type);
      }
    });
  }

  /**
   * Select a weapon and start the wave.
   * Migrated from weaponWaveSelect.js:35-54.
   */
  selectWeapon(type) {
    this.scene.weaponManager.setActiveWeapon(type);
    const modal = document.getElementById('wave-select-modal');
    if (modal) modal.remove();
    this.scene.gameState.waveActive = true;
    this.scene._startWave();
  }
}
