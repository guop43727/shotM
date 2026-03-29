// Weapon Drop Integration
// Uses a separate drops array to avoid conflict with game.js WeaponDrop class
const weaponDropIntegration = {
  drops: [], // own array, separate from game.weaponDrops (WeaponDrop instances)

  // Add weapon drop when enemy dies
  // x: screen x position of enemy at death (for lane detection)
  // z: enemy's 3D z value at death (determines how far along the road)
  createDrop(x, z) {
    const dropChance = 0.15;
    if (Math.random() > dropChance) return;

    const types = ['rifle', 'machinegun', 'shotgun'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Store lane x and starting z; drop advances toward player each frame
    this.drops.push({ x, z: z || 0, type, collected: false });
  },

  // Called each frame: advance drops and check if player walks through them
  checkCollection() {
    const collectZ = 0.85; // z threshold at which drop is collectible (close to player)
    const laneWidth = 80;  // x-axis tolerance for "same lane" collection

    this.drops.forEach(drop => {
      if (drop.collected) return;

      // Advance drop toward player (same speed as enemies)
      drop.z += 0.004;

      // Collect when drop reaches the player's zone and is in the same lane
      if (drop.z >= collectZ) {
        const dx = Math.abs(drop.x - player.x);
        if (dx < laneWidth) {
          weaponManager.addWeapon(drop.type);
          drop.collected = true;
          this.showNotification(`获得 ${weaponConfig[drop.type].name}`);
        }
      }

      // Remove drops that go past the player without being collected
      if (drop.z > 1.1) {
        drop.collected = true;
      }
    });

    this.drops = this.drops.filter(d => !d.collected);
  },

  showNotification(text) {
    const notif = document.createElement('div');
    notif.className = 'weapon-notification';
    notif.textContent = text;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
  }
};
