// src/utils/PerspectiveProjection.js
// REQ-ENEMY-002: Perspective projection kept from game.js getScreenPosition()
// Constraint: scale = 1 / (1 + z / 1000) — unit-003 task §5.1

/**
 * VANISHING_POINT_Y — top of road in screen space.
 * Matches game.js GAME_CONSTANTS.VANISHING_POINT_Y = 50.
 */
export const VANISHING_POINT_Y = 50;

/**
 * Calculate perspective scale for a given world-z depth.
 * Constraint (unit-003 §5.1): scale = 1 / (1 + z / 1000)
 * z = 0 → scale = 1.0 (full size, at player)
 * z = 1000 → scale = 0.5 (half size, far away)
 *
 * @param {number} z  World-space depth (0 = near, ∞ = far)
 * @returns {number}  Screen-space scale factor
 */
export function perspectiveScale(z) {
  // REQ-ENEMY-002: formula preserved from design constraint
  return 1 / (1 + z / 1000);
}

/**
 * Project a world position (laneOffset, z) to screen (x, y, scale).
 * Matches game.js Enemy.getScreenPosition() logic.
 *
 * @param {number} laneOffset  Lateral offset in world units
 * @param {number} z           Depth in world units (0..1000+)
 * @param {number} canvasWidth  Screen width
 * @param {number} canvasHeight Screen height
 * @returns {{ x: number, y: number, scale: number }}
 */
export function projectToScreen(laneOffset, z, canvasWidth, canvasHeight) {
  // REQ-ENEMY-002: perspective projection — near big, far small
  const scale = perspectiveScale(z);

  // Map z [0..1000] to y [canvasHeight-100 .. VANISHING_POINT_Y]
  // z=0 → bottom of road; z=1000 → vanishing point
  const tNorm = Math.min(z / 1000, 1);
  const y = (canvasHeight - 100) - (canvasHeight - 100 - VANISHING_POINT_Y) * tNorm;

  const x = canvasWidth / 2 + laneOffset * scale;

  return { x, y, scale };
}
