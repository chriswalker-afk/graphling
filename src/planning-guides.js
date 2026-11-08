/* Sparse environmental guide marks. Deliberately never samples the player's equation.
   Hint lines mark geometry, not the route or its outcome. */
(function (root) {
  'use strict';
  const DEFAULT_REACH = 10;
  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  function surface(level, column, footY) {
    const grid = level.grid;
    if (!grid || column < 0 || column >= grid[0].length) return null;
    const minY = Math.max(0, Math.floor(footY - 5));
    const maxY = Math.min(grid.length - 1, Math.floor(footY + 2));
    for (let y = minY; y <= maxY; y++) {
      const tile = grid[y][column];
      if (tile !== 0) return { y, type: tile };
    }
    return null;
  }
  function guides(level, graphling, energy = DEFAULT_REACH) {
    if (!level || !graphling || !Number.isFinite(graphling.x) || !Number.isFinite(graphling.y)) return null;
    const width = level.grid[0].length;
    const direction = graphling.dir === -1 ? -1 : 1;
    const reachX = graphling.x + direction * energy;
    const first = Math.floor(graphling.x);
    let previous = surface(level, first, graphling.y);
    let lastMarked = -Infinity;
    const markers = [];
    for (let step = 1; step <= energy && markers.length < 3; step++) {
      const x = Math.floor(graphling.x + direction * (step + .08));
      if (x < 0 || x >= width) break;
      const current = surface(level, x, graphling.y);
      const changed = (previous === null) !== (current === null) ||
        (previous && current && (previous.y !== current.y ||
          (previous.type === 4) !== (current.type === 4)));
      if (changed && step - lastMarked >= 1.5) {
        // Reference marks belong to the terrain transition, not the entered function.
        markers.push({
          x: direction > 0 ? x : x + 1,
          y: current ? current.y : previous ? previous.y : graphling.y,
          hazard: Boolean(current && current.type === 4)
        });
        lastMarked = step;
      }
      previous = current;
    }
    return { x: graphling.x, y: graphling.y, direction,
      reachX: clamp(reachX, 0, width), markers };
  }
  const API = { surface, guides, DEFAULT_REACH };
  root.GraphlingGuides = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
