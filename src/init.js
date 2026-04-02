// src/init.js
// Event listener initialization for UI buttons
// Removes inline onclick handlers from HTML

/**
 * Setup all event listeners after Phaser game is initialized
 * @param {Phaser.Game} game - The Phaser game instance
 */
export function setupEventListeners(game) {
  // Poll until GameScene is fully created (has enemySpawner)
  const poll = () => {
    const scene = game.scene.getScene('GameScene');
    if (scene && scene.enemySpawner) {
      setupListeners(scene);
    } else {
      setTimeout(poll, 100);
    }
  };
  poll();
}

function setupListeners(scene) {
  // Start wave button - CRITICAL: starts the game
  const startWaveBtn = document.getElementById('start-wave');
  if (startWaveBtn) {
    startWaveBtn.addEventListener('click', () => {
      scene._startWave();
      console.log('Wave started! wave =', scene.gameState.wave);
    });
  }

  // Weapon button - opens weapon modal
  const weaponBtn = document.getElementById('weapon-btn');
  if (weaponBtn) {
    weaponBtn.addEventListener('click', () => {
      if (scene.weaponUI) {
        scene.weaponUI.openWeaponModal();
      }
    });
  }

  // Close button - closes weapon modal
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (scene.weaponUI) {
        scene.weaponUI.closeWeaponModal();
      }
    });
  }

  // Tab buttons - switch between inventory/evolution/synthesis
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      if (scene.weaponUI && tabName) {
        scene.weaponUI.switchTab(tabName);
      }
    });
  });

  // Restart button - reload page
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      location.reload();
    });
  }

  // Next wave button
  const nextWaveBtn = document.getElementById('next-wave-btn');
  if (nextWaveBtn) {
    nextWaveBtn.addEventListener('click', () => {
      document.getElementById('waveclear-modal').style.display = 'none';
      scene._startWave();
    });
  }

  console.log('Event listeners set up successfully');
}

