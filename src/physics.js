/* Graphlings physics and linear specialist actions. Pure JS: browser and Node. */
(function (root) {
  'use strict';
  const TILE = Object.freeze({ EMPTY: 0, EARTH: 1, ROCK: 2, BRIDGE: 3, SPIKE: 4 });
  const WIDTH = 35, HEIGHT = 18;
  const SPEED = 2.15, GRAVITY = 25, TERMINAL = 18, SAFE_FALL = 4;
  const BODY_RADIUS = 0.19, BODY_HEIGHT = 0.64;
  const PROXIMITY = 0.35, MAX_SLOPE = 1, ENERGY = 10, JOIN_DISTANCE = 0.75;
  const SOLID = new Set([TILE.EARTH, TILE.ROCK, TILE.BRIDGE]);

  function createGrid() { return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(TILE.EMPTY)); }
  function put(grid, x, y, type) { if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) grid[y][x] = type; }
  function fill(grid, x0, x1, y0, y1, type) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(grid, x, y, type);
  }
  function makeLevel(index = 0) {
    const grid = createGrid();
    fill(grid, 0, WIDTH - 1, 15, 17, TILE.EARTH);
    fill(grid, 0, WIDTH - 1, 17, 17, TILE.ROCK);
    let name, exitY = 15, charges, hint;
    if (index === 0) {
      name = 'Bridge the Gap';
      fill(grid, 11, 17, 15, 17, TILE.EMPTY);
      charges = { rampwright: 2, trencher: 1 };
      hint = 'A horizontal walkway can span the gap. Select a Graphling before the edge, then use a Rampwright.';
    } else if (index === 1) {
      name = 'The Earth Wall';
      fill(grid, 12, 17, 13, 14, TILE.EARTH);
      fill(grid, 23, 25, 10, 11, TILE.ROCK); // Visible, indestructible overhead obstacle.
      charges = { rampwright: 1, trencher: 2 };
      hint = 'The wall is earth, not bedrock. A horizontal Trencher can clear a passage through it.';
    } else {
      name = 'Spike Garden';
      fill(grid, 13, 18, 14, 14, TILE.SPIKE);
      fill(grid, 21, 34, 12, 14, TILE.ROCK);
      exitY = 12;
      charges = { rampwright: 3, trencher: 1 };
      hint = 'Build upwards before reaching the spikes. The destination is three units above the entrance.';
    }
    return {
      grid, paths: [], entrance: { x: 2, y: 15 }, exit: { x: 32, y: exitY },
      count: 12, target: 8, charges, name, hint,
    };
  }
  function tileAt(level, x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || ix >= WIDTH || iy < 0 || iy >= HEIGHT) return TILE.EMPTY;
    return level.grid[iy][ix];
  }
  function isSolid(tile) { return SOLID.has(tile); }
  function mathX(level, worldX) { return worldX - level.entrance.x; }
  function mathY(level, worldY) { return level.entrance.y - worldY; }
  function curveY(level, m, c, worldX) {
    return level.entrance.y - (m * mathX(level, worldX) + c);
  }
  function parseCoefficient(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? input : null;
    if (typeof input !== 'string') return null;
    const value = input.trim().replace(/\s+/g, '');
    if (!value) return null;
    const pattern = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\/([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?$/;
    const match = value.match(pattern);
    if (!match) return null;
    const denominator = match[2] === undefined ? 1 : Number(match[2]);
    const output = Number(match[1]) / denominator;
    return Number.isFinite(output) ? output : null;
  }
  function surfaceOnPath(segment, x) {
    const low = Math.min(segment.x1, segment.x2), high = Math.max(segment.x1, segment.x2);
    if (x < low - 1e-5 || x > high + 1e-5 || high - low < 1e-7) return null;
    const t = (x - segment.x1) / (segment.x2 - segment.x1);
    return segment.y1 + t * (segment.y2 - segment.y1);
  }
  function surfacesNear(level, x, y, tolerance = 0.17) {
    const surfaces = [];
    for (let row = Math.max(0, Math.floor(y - tolerance)); row <= Math.min(HEIGHT - 1, Math.ceil(y + tolerance)); row++) {
      if (Math.abs(row - y) <= tolerance + 1e-5 && isSolid(tileAt(level, x, row + 0.05))) surfaces.push(row);
    }
    for (const segment of level.paths || []) {
      const sy = surfaceOnPath(segment, x);
      if (sy !== null && Math.abs(sy - y) <= tolerance + 1e-5) surfaces.push(sy);
    }
    if (!surfaces.length) return null;
    return Math.min(...surfaces); // Prefer the uppermost reachable surface, e.g. a ramp over earth.
  }
  function supportAt(level, x, feet) { return surfacesNear(level, x, feet) !== null; }
  function wallAt(level, x, feet) {
    const lower = Math.floor(feet - 0.08), upper = Math.floor(feet - BODY_HEIGHT + 0.1);
    for (let row = upper; row <= lower; row++) if (isSolid(tileAt(level, x, row + 0.05))) return true;
    return false;
  }
  function bodyCells(x, feet, radius = BODY_RADIUS) {
    const cells = [];
    const l = Math.floor(x - radius), r = Math.floor(x + radius);
    const t = Math.floor(feet - BODY_HEIGHT + 0.02), b = Math.floor(feet - 0.075);
    for (let yy = t; yy <= b; yy++) for (let xx = l; xx <= r; xx++) {
      if (xx < 0 || xx >= WIDTH || yy < 0 || yy >= HEIGHT) continue;
      cells.push([xx, yy]);
    }
    return cells;
  }
  function hazardous(level, x, feet) {
    for (let xx = Math.floor(x - BODY_RADIUS); xx <= Math.floor(x + BODY_RADIUS); xx++) {
      for (let yy = Math.floor(feet - BODY_HEIGHT); yy <= Math.floor(feet); yy++) {
        if (tileAt(level, xx + 0.01, yy + 0.01) === TILE.SPIKE &&
          feet > yy + 0.17 && feet - BODY_HEIGHT < yy + 0.9) return true;
      }
    }
    return false;
  }
  function walker(x, y, id) {
    return { id, x, y, dir: 1, vy: 0, grounded: true, fallStart: y, alive: true,
      rescued: false, death: null, deathTime: 0, phase: id * 0.73,
      specialist: null, lastAction: null, shrug: 0, celebrate: 0 };
  }
  function outcome(w, reason) {
    w.alive = false; w.death = reason; w.deathTime = 0; w.specialist = null;
    return reason;
  }
  function stopSpecialist(w, reason) {
    if (!w.specialist) return;
    w.lastAction = { kind: w.specialist.kind, reason, travelled: w.specialist.travelled };
    w.specialist = null;
    if (reason === 'complete') w.celebrate = 0.7;
  }
  function validateSpecialist(level, w, { kind, m, c }) {
    if (kind !== 'rampwright' && kind !== 'trencher') return { ok: false, reason: 'unknown-specialist' };
    if (!w || !w.alive || w.rescued || w.specialist) return { ok: false, reason: 'unavailable' };
    if (!Number.isFinite(m) || !Number.isFinite(c)) return { ok: false, reason: 'invalid-equation' };
    if (Math.abs(m) > MAX_SLOPE + 1e-8) return { ok: false, reason: 'too-steep' };
    if (!w.grounded) return { ok: false, reason: 'not-grounded' };
    const joinDelta = w.y - curveY(level, m, c, w.x);
    const deviation = Math.abs(joinDelta);
    if (deviation > PROXIMITY + 1e-7) return { ok: false, reason: 'too-far', deviation };
    // The brief joining ramp must also be physically walkable; never spend a charge on an impossible start.
    const joiningSlope = -m - w.dir * joinDelta / JOIN_DISTANCE;
    if (Math.abs(joiningSlope) > MAX_SLOPE + 1e-8) return { ok: false, reason: 'join-too-steep' };
    return { ok: true, deviation };
  }
  function assignSpecialist(level, w, settings) {
    const valid = validateSpecialist(level, w, settings);
    if (!valid.ok) {
      if (w && valid.reason === 'too-far') w.shrug = 1.1;
      return valid;
    }
    const { kind, m, c } = settings;
    // Every job starts with the same, non-configurable 10-energy allowance.
    // One energy is spent per horizontal world unit; blocked jobs forfeit the remainder.
    w.specialist = { kind, m, c, energy: ENERGY, travelled: 0,
      joinDelta: w.y - curveY(level, m, c, w.x), startX: w.x, startY: w.y,
      lastMaterialAt: 0 };
    w.lastAction = null;
    w.celebrate = 0;
    return { ok: true, deviation: valid.deviation };
  }
  function routeY(level, job, x) {
    const distance = Math.abs(x - job.startX);
    return curveY(level, job.m, job.c, x) + job.joinDelta * Math.max(0, 1 - distance / JOIN_DISTANCE);
  }
  function appendPath(level, kind, x1, y1, x2, y2) {
    if (Math.abs(x2 - x1) < 1e-8) return;
    if (!level.paths) level.paths = [];
    const last = level.paths[level.paths.length - 1];
    const slope = (y2 - y1) / (x2 - x1);
    if (last && last.kind === kind && Math.abs(last.x2 - x1) < 1e-5 &&
      Math.abs(last.y2 - y1) < 1e-5 &&
      Math.abs((last.y2 - last.y1) / (last.x2 - last.x1) - slope) < 0.02) {
      last.x2 = x2; last.y2 = y2;
    } else level.paths.push({ kind, x1, y1, x2, y2 });
  }
  function removeBuiltPathInBody(level, x, y) {
    if (!level.paths || !level.paths.length) return 0;
    const low = x - BODY_RADIUS - 0.02, high = x + BODY_RADIUS + 0.02;
    const output = [];
    let removed = 0;
    for (const seg of level.paths) {
      if (seg.kind !== 'build') { output.push(seg); continue; }
      const left = Math.max(low, Math.min(seg.x1, seg.x2));
      const right = Math.min(high, Math.max(seg.x1, seg.x2));
      const ym = surfaceOnPath(seg, (left + right) / 2);
      if (left >= right || ym === null || ym < y - BODY_HEIGHT - .1 || ym > y + .02) {
        output.push(seg); continue;
      }
      removed++;
      const make = (a, b) => ({ kind: seg.kind, x1: a, y1: surfaceOnPath(seg, a), x2: b, y2: surfaceOnPath(seg, b) });
      if (seg.x1 <= seg.x2) {
        if (left > seg.x1 + 1e-5) output.push(make(seg.x1, left));
        if (right < seg.x2 - 1e-5) output.push(make(right, seg.x2));
      } else {
        if (right < seg.x1 - 1e-5) output.push(make(seg.x1, right));
        if (left > seg.x2 + 1e-5) output.push(make(left, seg.x2));
      }
    }
    level.paths = output;
    return removed;
  }
  function hasSubstrate(level, x, feet) {
    // A digger may retain a compacted floor in earth, but not tunnel through empty air.
    const tile = tileAt(level, x, feet + .12);
    return isSolid(tile) || surfacesNear(level, x, feet, .30) !== null;
  }
  function workStep(level, w, h) {
    const job = w.specialist;
    if (!job) return null;
    const distance = Math.min(SPEED * h, job.energy - job.travelled);
    if (distance <= 1e-7) { stopSpecialist(w, 'complete'); return null; }
    const nx = w.x + w.dir * distance;
    const ny = routeY(level, job, nx);
    if (nx < BODY_RADIUS || nx > WIDTH - BODY_RADIUS || ny < BODY_HEIGHT || ny > HEIGHT + .2) {
      stopSpecialist(w, 'boundary'); return null;
    }
    if (Math.abs((ny - w.y) / distance) > MAX_SLOPE + .001) {
      stopSpecialist(w, 'too-steep'); return null;
    }
    if (job.kind === 'rampwright') {
      const solid = bodyCells(nx, ny).some(([x, y]) => isSolid(tileAt(level, x + .01, y + .01)));
      if (solid) { stopSpecialist(w, 'blocked'); return null; }
      appendPath(level, 'build', w.x, w.y, nx, ny);
    } else {
      const cells = bodyCells(nx, ny);
      if (cells.some(([x, y]) => tileAt(level, x + .01, y + .01) === TILE.ROCK)) {
        stopSpecialist(w, 'bedrock'); return null;
      }
      if (!hasSubstrate(level, nx, ny)) { stopSpecialist(w, 'unsupported'); return null; }
      let removed = 0;
      for (const [x, y] of cells) if (level.grid[y][x] === TILE.EARTH || level.grid[y][x] === TILE.BRIDGE) {
        level.grid[y][x] = TILE.EMPTY; removed++;
      }
      removed += removeBuiltPathInBody(level, nx, ny);
      if (removed) job.lastMaterialAt = job.travelled;
      if (!removed && job.travelled - job.lastMaterialAt > 1.15) {
        stopSpecialist(w, 'no-material'); return null;
      }
      appendPath(level, 'tunnel', w.x, w.y, nx, ny);
    }
    w.x = nx; w.y = ny; w.vy = 0; w.grounded = true;
    job.travelled += distance;
    if (hazardous(level, w.x, w.y)) return outcome(w, 'spikes');
    if (job.travelled >= job.energy - 1e-6) stopSpecialist(w, 'complete');
    return null;
  }
  function firstLandingY(level, x, start, end) {
    const surfaces = [];
    for (let row = Math.max(0, Math.floor(start)); row <= Math.min(HEIGHT - 1, Math.floor(end + .03)); row++) {
      if (row >= start - .025 && row <= end + .03 && isSolid(tileAt(level, x, row + .05))) surfaces.push(row);
    }
    for (const segment of level.paths || []) {
      const yy = surfaceOnPath(segment, x);
      if (yy !== null && yy >= start - .025 && yy <= end + .03) surfaces.push(yy);
    }
    return surfaces.length ? Math.min(...surfaces) : null;
  }
  function normalStep(level, w, h) {
    if (w.grounded && surfacesNear(level, w.x, w.y) === null) {
      w.grounded = false; w.vy = 0; w.fallStart = w.y;
    }
    const nx = w.x + w.dir * SPEED * h;
    const nextSurface = w.grounded ? surfacesNear(level, nx, w.y) : null;
    if (wallAt(level, nx + w.dir * BODY_RADIUS, nextSurface === null ? w.y : nextSurface)) {
      w.dir *= -1;
    } else {
      w.x = nx;
      if (w.grounded) {
        if (nextSurface !== null) w.y = nextSurface;
        else { w.grounded = false; w.vy = 0; w.fallStart = w.y; }
      }
    }
    if (!w.grounded) {
      const prior = w.y;
      w.vy = Math.min(TERMINAL, w.vy + GRAVITY * h);
      const next = w.y + w.vy * h;
      const landing = firstLandingY(level, w.x, prior, next);
      if (landing !== null) {
        w.y = landing; w.vy = 0; w.grounded = true;
        if (landing - w.fallStart > SAFE_FALL + .001) return outcome(w, 'fall');
      } else w.y = next;
    }
    if (hazardous(level, w.x, w.y)) return outcome(w, 'spikes');
    if (w.y > HEIGHT + 1 || w.x < -.5 || w.x > WIDTH + .5) return outcome(w, 'void');
    if (w.grounded && Math.abs(w.x - level.exit.x) < .43 && Math.abs(w.y - level.exit.y) < .29) {
      w.rescued = true; w.specialist = null; return 'rescue';
    }
    return null;
  }
  function advance(level, w, dt) {
    if (!w || !w.alive || w.rescued) return null;
    const n = Math.max(1, Math.ceil(dt / .012));
    for (let i = 0; i < n; i++) {
      const h = dt / n;
      w.shrug = Math.max(0, (w.shrug || 0) - h);
      w.celebrate = Math.max(0, (w.celebrate || 0) - h);
      const event = w.specialist ? workStep(level, w, h) : normalStep(level, w, h);
      if (event) return event;
    }
    return null;
  }
  const API = { TILE, WIDTH, HEIGHT, SPEED, GRAVITY, SAFE_FALL, BODY_HEIGHT, BODY_RADIUS,
    PROXIMITY, MAX_SLOPE, ENERGY, createGrid, makeLevel, put, tileAt, isSolid, supportAt,
    surfacesNear, hazardous, walker, advance, mathX, mathY, curveY, parseCoefficient,
    validateSpecialist, assignSpecialist, routeY, appendPath, stopSpecialist };
  root.GraphlingPhysics = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
