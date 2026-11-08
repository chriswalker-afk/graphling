/* Graphlings Pass B: world, linear editor and specialist interactions. */
(() => {
  'use strict';
  const P = globalThis.GraphlingPhysics;
  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas.getContext('2d');
  const U = 32, W = P.WIDTH * U, H = P.HEIGHT * U;
  canvas.width = W; canvas.height = H;
  const els = {
    level: $('level'), reset: $('reset'), restore: $('restore'), pause: $('pause'),
    step: $('step'), speed: $('speed'), grid: $('grid'), message: $('message'),
    rescued: $('rescued'), lost: $('lost'), active: $('active'), remaining: $('remaining'), target: $('target'),
    levelHint: $('levelHint'), editor: $('editor'), cancel: $('cancel'), plotForm: $('plotForm'),
    m: $('m'), c: $('c'), ticks: $('ticks'), tickValue: $('tickValue'), position: $('position'),
    facing: $('facing'), equation: $('equation'), previewNote: $('previewNote'), activate: $('activate'),
    toggleEdit: $('toggleEdit'), tools: $('tools'), countRamp: $('count-rampwright'),
    countTrench: $('count-trencher'),
  };
  const roles = ['rampwright', 'trencher'];
  const paintTypes = { earth: P.TILE.EARTH, rock: P.TILE.ROCK, bridge: P.TILE.BRIDGE,
    spike: P.TILE.SPIKE, empty: P.TILE.EMPTY };
  const feedback = {
    complete: 'The Graphling finished its allotted ticks and returned to ordinary walking.',
    blocked: 'Construction met solid terrain. The Graphling stopped and returned to walking.',
    bedrock: 'The drill struck indestructible bedrock. The Graphling stopped digging.',
    unsupported: 'No supporting ground for a tunnel. The Graphling returned to walking.',
    'no-material': 'There is no material left to dig. The Graphling returned to walking.',
    'too-steep': 'This route becomes too steep for a physical worker.',
    boundary: 'The route reached the world boundary.',
    spikes: 'Squish! This route intersects a spike hazard.',
    fall: 'Squish! The drop was too high.',
  };
  let level, baseline, charges, walkers, spawned, spawnClock, rescued, lost;
  let paused = false, finished = false, speed = 1, elapsed = 0, accumulator = 0, frameCount = 0;
  let chosenRole = 'rampwright', selected = null, preview = null;
  let editMode = false, brush = 'earth', painting = false, last = performance.now();
  let particles = [], squishes = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const cloneGrid = grid => grid.map(row => row.slice());
  const fmt = n => (Math.abs(n) < .005 ? '0' : Number(n.toFixed(2)).toString());

  function notice(text) { els.message.textContent = text; }
  function resetSimulation() {
    level.grid = cloneGrid(baseline); level.paths = [];
    charges = { ...level.charges };
    walkers = []; spawned = rescued = lost = 0; spawnClock = .4;
    elapsed = 0; accumulator = frameCount = 0; particles = []; squishes = [];
    paused = false; finished = false; selected = null; preview = null;
    els.editor.hidden = true;
    notice('Click a walking Graphling to pause and give it a specialist role.');
    sync();
  }
  function loadLevel() {
    level = P.makeLevel(Number(els.level.value));
    baseline = cloneGrid(level.grid);
    els.levelHint.textContent = level.hint;
    chosenRole = 'rampwright';
    setPainting(false);
    resetSimulation();
  }
  function sync() {
    els.rescued.textContent = rescued; els.lost.textContent = lost;
    els.active.textContent = walkers.filter(w => w.alive && !w.rescued).length;
    els.remaining.textContent = level.count - spawned; els.target.textContent = level.target;
    els.countRamp.textContent = '×' + charges.rampwright;
    els.countTrench.textContent = '×' + charges.trencher;
    for (const role of roles) {
      const button = $('role-' + role);
      button.classList.toggle('selected', chosenRole === role);
      button.setAttribute('aria-pressed', String(chosenRole === role));
      button.disabled = charges[role] <= 0;
    }
    els.pause.textContent = paused ? 'Play' : 'Pause';
    els.pause.setAttribute('aria-pressed', String(paused));
  }
  function setPaused(value) { paused = value; sync(); }
  function setPainting(value) {
    editMode = value;
    els.toggleEdit.setAttribute('aria-pressed', String(value));
    els.toggleEdit.textContent = value ? 'Painting enabled · click to stop' : 'Enable painting';
    els.tools.disabled = !value;
    canvas.classList.toggle('paint-mode', value);
    if (value) {
      selected = null; preview = null; els.editor.hidden = true;
      if (level) setPaused(true);
      notice('Terrain brush active. Painting is a sandbox tool, not a specialist action.');
    }
  }
  function emit(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-2, 2), vy: rand(-3.4, -.5),
      life: rand(.25, .65), max: .65, color });
  }
  function simulationStep(dt) {
    if (finished) return;
    elapsed += dt; frameCount++;
    spawnClock -= dt;
    if (spawned < level.count && spawnClock <= 0) {
      walkers.push(P.walker(level.entrance.x + .2, level.entrance.y, spawned));
      spawned++; spawnClock += 1.3;
    }
    for (const w of walkers) {
      const wasWorking = Boolean(w.specialist);
      const event = P.advance(level, w, dt);
      if (wasWorking && w.specialist && frameCount % 11 === 0) {
        emit(w.x + rand(-.1, .1), w.y - .25, w.specialist.kind === 'rampwright' ? '#e8bd6d' : '#ae9275', 2);
      }
      if (wasWorking && !w.specialist && w.lastAction && w.alive) {
        const action = w.lastAction;
        const text = feedback[action.reason] || 'The specialist action has finished.';
        notice(text);
        w.lastAction = null;
      }
      if (event === 'rescue') { rescued++; emit(w.x, w.y - .4, '#7ed3a9', 13); }
      else if (event) {
        lost++; squishes.push({ x: w.x, y: Math.min(w.y, P.HEIGHT - .4), t: 0, reason: event });
        emit(w.x, w.y - .3, '#b7d1d3', 13);
        if (wasWorking) notice(feedback[event] || 'A Graphling was lost.');
      }
    }
    for (const particle of particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vy += 11 * dt; particle.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
    for (const squish of squishes) squish.t += dt;
    squishes = squishes.filter(s => s.t < .82);
    if (spawned >= level.count && !walkers.some(w => w.alive && !w.rescued)) {
      finished = true; paused = true;
      notice(rescued >= level.target ? 'Target rescued! Restart to try another solution.' :
        'No Graphlings remain. Restart and try another route.');
    }
    if (frameCount % 7 === 0 || finished) sync();
  }
  function selectGraphling(x, y) {
    let nearest = null, closest = Infinity;
    for (const w of walkers) {
      if (!w.alive || w.rescued) continue;
      const dx = w.x - x, dy = w.y - .33 - y;
      const distance = Math.hypot(dx, dy);
      if (distance < closest) { closest = distance; nearest = w; }
    }
    if (!nearest || closest > .83) { notice('Click directly on a moving Graphling to select it.'); return; }
    if (nearest.specialist) { notice('That Graphling is already working. Select it again when its action finishes.'); return; }
    selected = nearest;
    setPaused(true);
    els.editor.hidden = false;
    // Start with a horizontal graph through the selected Graphling.
    els.m.value = '0'; els.c.value = fmt(P.mathY(level, selected.y)); els.ticks.value = '8';
    els.position.textContent = '(' + fmt(P.mathX(level, selected.x)) + ', ' + fmt(P.mathY(level, selected.y)) + ')';
    els.facing.textContent = selected.dir > 0 ? 'Facing right →' : '← Facing left';
    updatePreview();
    notice('Simulation paused. Plot a line, preview it, then assign the specialist.');
  }
  function formSettings() {
    return { kind: chosenRole, m: P.parseCoefficient(els.m.value),
      c: P.parseCoefficient(els.c.value), ticks: Number(els.ticks.value) };
  }
  function previewMessage(p) {
    if (!p.ok) {
      if (p.reason === 'too-far') return ['The line is too far away (' + fmt(p.deviation) +
        ' units). Trying it makes the Graphling shrug and keep walking; no charge is used.', 'warn'];
      if (p.reason === 'too-steep') return ['This slope is too steep. Physical workers require |m| ≤ 1.', 'warn'];
      if (p.reason === 'join-too-steep') return ['The line is nearby, but joining it would make the initial slope too steep. Adjust the equation or wait for a better position.', 'warn'];
      if (p.reason === 'not-grounded') return ['This Graphling is falling. Select one standing on a surface.', 'warn'];
      if (p.reason === 'invalid-ticks') return ['Choose between 1 and 16 ticks.', 'warn'];
      return ['Enter valid coefficients for the line.', 'warn'];
    }
    const endpoint = '(' + fmt(P.mathX(level, p.endpoint.x)) + ', ' + fmt(P.mathY(level, p.endpoint.y)) + ')';
    if (p.reason === 'complete') return ['Preview ends at ' + endpoint + ' after the available ticks. The terrain changes persist.', ''];
    if (p.reason === 'spikes' || p.reason === 'fall') return ['Danger: this route reaches a hazard. The Graphling will squish!', 'danger'];
    return [(feedback[p.reason] || 'The worker stops early.') + ' Predicted endpoint: ' + endpoint + '.', 'warn'];
  }
  function updatePreview() {
    if (!selected || els.editor.hidden) return;
    const settings = formSettings();
    els.tickValue.textContent = settings.ticks;
    els.equation.textContent = settings.m === null || settings.c === null ? 'Enter m and c' :
      'y = (' + els.m.value.trim() + ')x + (' + els.c.value.trim() + ')';
    els.previewNote.className = 'preview-note';
    els.activate.disabled = charges[chosenRole] <= 0 || settings.m === null || settings.c === null;
    if (charges[chosenRole] <= 0) {
      preview = null; els.previewNote.textContent = 'No ' + chosenRole + ' assignments remain in this level.';
      return;
    }
    if (settings.m === null || settings.c === null) {
      preview = null; els.previewNote.textContent = 'Use a number or fraction such as 1/2, -3/4 or 0.5.';
      els.previewNote.classList.add('warn'); return;
    }
    preview = P.previewAction(level, selected, settings);
    const [text, severity] = previewMessage(preview);
    els.previewNote.textContent = text;
    if (severity) els.previewNote.classList.add(severity);
    if (preview.reason === 'too-steep' || preview.reason === 'not-grounded' || preview.reason === 'join-too-steep') els.activate.disabled = true;
    els.activate.textContent = preview.reason === 'too-far' ? 'Try anyway (shrug)' : 'Assign ' +
      (chosenRole === 'rampwright' ? 'Rampwright' : 'Trencher');
  }
  function commitJob(event) {
    event.preventDefault();
    if (!selected) return;
    if (charges[chosenRole] <= 0) return;
    const settings = formSettings();
    const result = P.assignSpecialist(level, selected, settings);
    if (!result.ok) {
      if (result.reason === 'too-far') {
        notice('Shrug! The Graphling is not close enough to this line. No specialist used.');
        selected = null; preview = null; els.editor.hidden = true; setPaused(false);
      } else { updatePreview(); notice('The route cannot be started: ' + result.reason + '.'); }
      return;
    }
    charges[chosenRole]--;
    const name = chosenRole === 'rampwright' ? 'Rampwright' : 'Trencher';
    notice(name + ' assigned! The Graphling is now physically following the line.');
    selected = null; preview = null; els.editor.hidden = true;
    setPaused(false); sync();
  }
  function cancelEditor() {
    selected = null; preview = null; els.editor.hidden = true;
    notice('Editor closed. Press Play to resume walking.');
  }
  function pointerCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * P.WIDTH,
      y: (event.clientY - rect.top) / rect.height * P.HEIGHT };
  }
  function paint(event) {
    if (!painting || !editMode) return;
    const p = pointerCoords(event), x = Math.floor(p.x), y = Math.floor(p.y);
    if (x < 0 || x >= P.WIDTH || y < 0 || y >= P.HEIGHT) return;
    if ((Math.abs(x - level.entrance.x) <= 1 && y >= 12 && y <= 15) ||
      (Math.abs(x - level.exit.x) <= 1 && y >= level.exit.y - 3 && y <= level.exit.y)) return;
    P.put(level.grid, x, y, paintTypes[brush]);
    P.put(baseline, x, y, paintTypes[brush]);
  }
  function drawCloud(x, y, s) {
    ctx.fillStyle = '#edf6f2'; ctx.beginPath();
    ctx.ellipse(x, y, 41 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 17 * s, y - 10 * s, 22 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 17 * s, y - 4 * s, 23 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  function drawTile(x, y, type) {
    const px = x * U, py = y * U;
    if (type === P.TILE.EARTH) {
      ctx.fillStyle = '#ae8869'; ctx.fillRect(px, py, U, U);
      ctx.fillStyle = '#98765c'; ctx.fillRect(px, py + 5, U, U - 5);
      ctx.fillStyle = '#c5a384'; ctx.fillRect(px + 5, py + 13, 6, 3); ctx.fillRect(px + 21, py + 24, 5, 3);
      if (!P.isSolid(P.tileAt(level, x + .1, y - .1))) {
        ctx.fillStyle = '#8bb18a'; ctx.fillRect(px, py, U, 5);
        ctx.fillStyle = '#b8cf9a'; ctx.fillRect(px, py, U, 2);
      }
    } else if (type === P.TILE.ROCK) {
      ctx.fillStyle = '#647b83'; ctx.fillRect(px, py, U, U);
      ctx.strokeStyle = '#92a5a7'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(px + 3, py + 13); ctx.lineTo(px + 15, py + 7); ctx.lineTo(px + 29, py + 14);
      ctx.moveTo(px + 12, py + 29); ctx.lineTo(px + 22, py + 18); ctx.stroke();
    } else if (type === P.TILE.BRIDGE) {
      ctx.fillStyle = '#9b6b47'; ctx.fillRect(px, py + 3, U, 9);
      ctx.fillStyle = '#deb674'; ctx.fillRect(px, py, U, 5);
      ctx.fillStyle = '#6b4f36'; ctx.fillRect(px + 6, py + 3, 2, 7); ctx.fillRect(px + 25, py + 3, 2, 7);
    } else if (type === P.TILE.SPIKE) {
      ctx.fillStyle = '#b34842'; ctx.fillRect(px, py + U - 6, U, 6);
      ctx.fillStyle = '#e0ebea';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(px + k * 11, py + U - 6);
        ctx.lineTo(px + k * 11 + 5.5, py + 7); ctx.lineTo(px + k * 11 + 11, py + U - 6); ctx.fill();
      }
      ctx.fillStyle = '#973e40'; ctx.fillRect(px, py + U - 4, U, 4);
    }
  }
  function drawPaths() {
    for (const path of level.paths) {
      const x1 = path.x1 * U, y1 = path.y1 * U, x2 = path.x2 * U, y2 = path.y2 * U;
      ctx.lineCap = 'round';
      ctx.strokeStyle = path.kind === 'build' ? '#835e3d' : '#6a6758'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = path.kind === 'build' ? '#e3b874' : '#bd9b73'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x1, y1 - 2); ctx.lineTo(x2, y2 - 2); ctx.stroke();
    }
  }
  function drawAxes() {
    ctx.save(); ctx.strokeStyle = '#338d8080'; ctx.lineWidth = .85; ctx.font = '11px system-ui';
    for (let x = 0; x <= P.WIDTH; x++) {
      if (x % 2 === 0) {
        ctx.globalAlpha = .17; ctx.beginPath(); ctx.moveTo(x * U, 0); ctx.lineTo(x * U, H); ctx.stroke();
      }
      if (x >= level.entrance.x && (x - level.entrance.x) % 4 === 0) {
        ctx.globalAlpha = 1; ctx.fillStyle = '#286f69'; ctx.fillText(String(x - level.entrance.x), x * U + 3, level.entrance.y * U + 13);
      }
    }
    for (let y = 0; y <= P.HEIGHT; y += 2) {
      ctx.globalAlpha = .17; ctx.beginPath(); ctx.moveTo(0, y * U); ctx.lineTo(W, y * U); ctx.stroke();
      if ((level.entrance.y - y) % 4 === 0 && y !== level.entrance.y) {
        ctx.globalAlpha = 1; ctx.fillStyle = '#286f69'; ctx.fillText(String(level.entrance.y - y), level.entrance.x * U + 5, y * U - 4);
      }
    }
    ctx.globalAlpha = .85; ctx.strokeStyle = '#2d8179'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, level.entrance.y * U); ctx.lineTo(W, level.entrance.y * U);
    ctx.moveTo(level.entrance.x * U, 0); ctx.lineTo(level.entrance.x * U, H); ctx.stroke();
    ctx.fillStyle = '#235f57'; ctx.font = 'bold 13px system-ui'; ctx.fillText('x', W - 13, level.entrance.y * U - 5);
    ctx.fillText('y', level.entrance.x * U + 7, 17);
    ctx.restore();
  }
  function drawGraphPreview() {
    if (!selected || els.editor.hidden) return;
    const settings = formSettings();
    if (settings.m === null || settings.c === null) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = '#2587a1c7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, P.curveY(level, settings.m, settings.c, 0) * U);
    ctx.lineTo(W, P.curveY(level, settings.m, settings.c, P.WIDTH) * U); ctx.stroke();
    ctx.setLineDash([]);
    if (preview && preview.points && preview.points.length > 1) {
      const isDanger = preview.reason === 'spikes' || preview.reason === 'fall';
      ctx.strokeStyle = isDanger ? '#be514c' : chosenRole === 'rampwright' ? '#e4aa52' : '#7c6c5b';
      ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = .85; ctx.beginPath();
      preview.points.forEach((point, i) => (i === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, point.x * U, point.y * U));
      ctx.stroke();
      const end = preview.points[preview.points.length - 1];
      ctx.globalAlpha = 1; ctx.fillStyle = isDanger ? '#c84d4b' : '#f8e59a';
      ctx.strokeStyle = '#235d56'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.arc(end.x * U, end.y * U, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#fdfefd'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(selected.x * U, (selected.y - .33) * U, 19, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#287e76'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(selected.x * U, (selected.y - .33) * U, 23, 0, 2 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  function drawEntrance(x, y, isExit) {
    const cx = x * U, cy = y * U;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = isExit ? '#547f70' : '#527387'; ctx.fillRect(-16, -55, 32, 55);
    ctx.fillStyle = isExit ? '#d8f5bc' : '#e2f5f2'; ctx.beginPath();
    ctx.roundRect(-10, -47, 20, 47, [11, 11, 0, 0]); ctx.fill();
    ctx.fillStyle = isExit ? '#408666' : '#427b8a'; ctx.beginPath();
    ctx.roundRect(-7, -42, 14, 42, [8, 8, 0, 0]); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui';
    ctx.fillText(isExit ? 'EXIT' : 'IN', 0, -62); ctx.restore();
  }
  function drawCreature(w) {
    const x = w.x * U, y = w.y * U;
    const bounce = w.grounded && !w.specialist ? Math.sin(elapsed * 16 + w.phase) * 1.2 : 0;
    ctx.save(); ctx.translate(x, y + bounce);
    if (w.shrug > 0) {
      ctx.globalAlpha = Math.min(1, w.shrug * 2);
      ctx.fillStyle = '#325e63'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('?', 0, -35 - Math.sin(w.shrug * 6) * 6); ctx.globalAlpha = 1;
    }
    if (w.celebrate > 0) {
      ctx.fillStyle = '#438970'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('★', 0, -34 - Math.sin(w.celebrate * 8) * 4);
    }
    ctx.strokeStyle = '#405e5b'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6, 0); ctx.moveTo(5, -4); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = ['#85cdb3', '#f1c77e', '#9ccbe1', '#cbb4e7'][w.id % 4];
    ctx.beginPath(); ctx.ellipse(0, -12, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4d7977'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-9, -28);
    ctx.moveTo(6, -22); ctx.lineTo(9, -28); ctx.stroke();
    ctx.fillStyle = '#244048'; ctx.beginPath(); ctx.arc(w.dir * 4 - 3, -15, 1.5, 0, Math.PI * 2);
    ctx.arc(w.dir * 4 + 3, -15, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#244048'; ctx.beginPath(); ctx.arc(w.dir * 4, -9, 2, 0, Math.PI); ctx.stroke();
    if (w.specialist) {
      ctx.fillStyle = w.specialist.kind === 'rampwright' ? '#eac06d' : '#adc3c7';
      ctx.fillRect(-10, -26, 20, 4); ctx.fillRect(-7, -30, 14, 5);
      ctx.save(); ctx.translate(w.dir * 13, -9); ctx.rotate(Math.sin(elapsed * 19) * .45);
      ctx.strokeStyle = '#5d665f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -15); ctx.stroke();
      ctx.fillStyle = w.specialist.kind === 'rampwright' ? '#c99f53' : '#82969a';
      ctx.fillRect(-6, -18, 12, 5); ctx.restore();
    }
    ctx.restore();
    if (w.specialist) {
      const left = Math.max(0, w.specialist.ticks - w.specialist.travelled);
      ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      const label = (w.specialist.kind === 'rampwright' ? 'R' : 'T') + ' · ' + fmt(left);
      ctx.fillStyle = '#fffbe9'; ctx.fillRect(x - 20, y - 54, 40, 16);
      ctx.fillStyle = '#375d57'; ctx.fillText(label, x, y - 42);
    }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#bfdddd'); gradient.addColorStop(1, '#e4e9d9');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    drawCloud(125, 99, 1); drawCloud(562, 88, .75); drawCloud(940, 133, 1.1);
    ctx.fillStyle = '#afc8b8'; ctx.beginPath(); ctx.moveTo(0, 384);
    ctx.quadraticCurveTo(160, 245, 345, 377); ctx.quadraticCurveTo(540, 301, 719, 390);
    ctx.quadraticCurveTo(900, 267, W, 379); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#91b6a2'; ctx.beginPath(); ctx.moveTo(0, 440);
    ctx.quadraticCurveTo(200, 350, 400, 445); ctx.quadraticCurveTo(700, 350, 880, 432);
    ctx.quadraticCurveTo(988, 390, W, 438); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    for (let y = 0; y < P.HEIGHT; y++) for (let x = 0; x < P.WIDTH; x++) {
      const tile = level.grid[y][x]; if (tile !== P.TILE.EMPTY) drawTile(x, y, tile);
    }
    drawPaths();
    if (els.grid.checked || selected) drawAxes();
    drawEntrance(level.entrance.x, level.entrance.y, false);
    drawEntrance(level.exit.x, level.exit.y, true);
    drawGraphPreview();
    for (const w of walkers) if (w.alive && !w.rescued) drawCreature(w);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x * U, p.y * U, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const s of squishes) {
      const x = s.x * U, y = s.y * U;
      ctx.globalAlpha = Math.max(0, 1 - s.t / .82); ctx.fillStyle = '#a9c6cd';
      ctx.beginPath(); ctx.ellipse(x, y - 3, Math.min(16, 7 + s.t * 27), Math.max(2, 7 - s.t * 6), 0, 0, 2 * Math.PI); ctx.fill();
      if (s.t < .5) {
        ctx.fillStyle = '#476269'; ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
        ctx.fillText('squish!', x, y - 20 - s.t * 18);
      }
    }
    ctx.globalAlpha = 1;
    if (paused) {
      ctx.fillStyle = '#17353aaf'; ctx.fillRect(0, 0, W, 35);
      ctx.fillStyle = '#f5faf6'; ctx.textAlign = 'left'; ctx.font = 'bold 15px system-ui';
      ctx.fillText(finished ? 'SIMULATION FINISHED' : editMode ? 'PAUSED · PAINT THE WORLD' : selected ?
        'PAUSED · DEFINE THE GRAPH' : 'PAUSED', 13, 23);
    }
  }
  function loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!paused) {
      accumulator += dt * speed;
      let count = 0;
      while (accumulator >= 1 / 120 && count++ < 20) {
        simulationStep(1 / 120); accumulator -= 1 / 120;
        if (paused) { accumulator = 0; break; }
      }
    }
    draw(); requestAnimationFrame(loop);
  }
  canvas.addEventListener('pointerdown', event => {
    if (editMode) {
      painting = true; setPaused(true);
      canvas.setPointerCapture(event.pointerId);
      paint(event);
    } else {
      const p = pointerCoords(event); selectGraphling(p.x, p.y);
    }
  });
  canvas.addEventListener('pointermove', paint);
  canvas.addEventListener('pointerup', () => { painting = false; });
  canvas.addEventListener('pointercancel', () => { painting = false; });
  els.pause.addEventListener('click', () => { if (selected) cancelEditor(); setPaused(!paused); });
  els.step.addEventListener('click', () => {
    if (selected) cancelEditor(); setPaused(true);
    for (let i = 0; i < 12 && !finished; i++) simulationStep(1 / 120);
    sync();
  });
  els.speed.addEventListener('change', () => { speed = Number(els.speed.value); });
  els.reset.addEventListener('click', resetSimulation);
  els.level.addEventListener('change', loadLevel);
  els.restore.addEventListener('click', loadLevel);
  els.toggleEdit.addEventListener('click', () => setPainting(!editMode));
  document.querySelectorAll('input[name="brush"]').forEach(input => input.addEventListener('change', () => {
    if (input.checked) brush = input.value;
  }));
  for (const role of roles) $('role-' + role).addEventListener('click', () => {
    chosenRole = role; sync(); updatePreview();
  });
  [els.m, els.c, els.ticks].forEach(input => input.addEventListener('input', updatePreview));
  els.plotForm.addEventListener('submit', commitJob);
  els.cancel.addEventListener('click', cancelEditor);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) { cancelEditor(); return; }
    const target = document.activeElement;
    if (event.code === 'Space' && !['SELECT', 'INPUT', 'BUTTON', 'TEXTAREA', 'SUMMARY'].includes(target.tagName)) {
      event.preventDefault(); if (selected) cancelEditor(); setPaused(!paused);
    }
  });
  loadLevel(); requestAnimationFrame(loop);
})();
