/* Graphlings appearance and cosmetic progression. Rendering never changes physics. */
(function (root) {
  'use strict';
  const KEY = 'graphlings.wardrobe.v1';
  const CATALOG = Object.freeze({
    body: [
      { id: 'round', name: 'Round', hint: 'Always available' },
      { id: 'pear', name: 'Pear', stat: 'rescued', need: 4, hint: 'Rescue 4 Graphlings' },
      { id: 'boxy', name: 'Boxy', stat: 'rescued', need: 12, hint: 'Rescue 12 Graphlings' },
    ],
    feet: [
      { id: 'paws', name: 'Little paws', hint: 'Always available' },
      { id: 'sneakers', name: 'Sneakers', stat: 'rescued', need: 1, hint: 'Rescue your first Graphling' },
      { id: 'boots', name: 'Builder boots', stat: 'built', need: 1, hint: 'Finish a Rampwright action' },
    ],
    antenna: [
      { id: 'feelers', name: 'Feelers', hint: 'Always available' },
      { id: 'sprout', name: 'Sprout', stat: 'dug', need: 1, hint: 'Finish a Trencher action' },
      { id: 'star', name: 'Star tips', stat: 'rescued', need: 8, hint: 'Rescue 8 Graphlings' },
    ],
    hat: [
      { id: 'none', name: 'No hat', hint: 'Always available' },
      { id: 'cap', name: 'Work cap', stat: 'built', need: 2, hint: 'Finish 2 Rampwright actions' },
      { id: 'crown', name: 'Tiny crown', stat: 'levels', need: 2, hint: 'Meet the target in 2 different levels' },
    ],
  });
  const DEFAULT = Object.freeze({ body: 'round', feet: 'paws', antenna: 'feelers', hat: 'none', tone: 'mint' });
  const TONES = Object.freeze([
    { id: 'mint', name: 'Mint', color: '#87d5bf' }, { id: 'peach', name: 'Peach', color: '#ffd09c' },
    { id: 'sky', name: 'Sky', color: '#a4ccef' }, { id: 'lilac', name: 'Lilac', color: '#cbb8f1' },
  ]);
  const clampInt = value => Number.isFinite(value) ? Math.max(0, Math.min(999999, Math.floor(value))) : 0;
  function newProfile() {
    return { version: 1, equipped: { ...DEFAULT }, stats: { rescued: 0, built: 0, dug: 0, levels: [] } };
  }
  function normalized(raw) {
    const profile = newProfile();
    if (!raw || typeof raw !== 'object') return profile;
    const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
    for (const key of ['rescued', 'built', 'dug']) profile.stats[key] = clampInt(stats[key]);
    profile.stats.levels = Array.isArray(stats.levels) ? [...new Set(stats.levels.filter(
      v => Number.isInteger(v) && v >= 0 && v <= 100))] : [];
    if (raw.equipped && typeof raw.equipped === 'object') {
      for (const category of Object.keys(CATALOG)) {
        const candidate = raw.equipped[category];
        if (isUnlocked(profile, category, candidate)) profile.equipped[category] = candidate;
      }
      if (TONES.some(t => t.id === raw.equipped.tone)) profile.equipped.tone = raw.equipped.tone;
    }
    return profile;
  }
  function options(category) { return CATALOG[category] || []; }
  function part(category, id) { return options(category).find(item => item.id === id); }
  function isUnlocked(profile, category, id) {
    const item = part(category, id);
    if (!item) return false;
    if (!item.stat) return true;
    return item.stat === 'levels' ? profile.stats.levels.length >= item.need : profile.stats[item.stat] >= item.need;
  }
  function progress(profile, item) {
    return item.stat === 'levels' ? profile.stats.levels.length : (profile.stats[item.stat] || 0);
  }
  function equip(profile, category, id) {
    if (category === 'tone') {
      if (!TONES.some(t => t.id === id)) return false;
    } else if (!isUnlocked(profile, category, id)) return false;
    profile.equipped[category] = id;
    return true;
  }
  function record(profile, event, value) {
    const before = [];
    for (const [category, items] of Object.entries(CATALOG)) for (const item of items) {
      if (isUnlocked(profile, category, item.id)) before.push(category + ':' + item.id);
    }
    if (event === 'rescue') profile.stats.rescued = clampInt(profile.stats.rescued + 1);
    if (event === 'build') profile.stats.built = clampInt(profile.stats.built + 1);
    if (event === 'dig') profile.stats.dug = clampInt(profile.stats.dug + 1);
    if (event === 'level' && Number.isInteger(value) && value >= 0 && value <= 100 &&
      !profile.stats.levels.includes(value)) profile.stats.levels.push(value);
    const newlyUnlocked = [];
    for (const [category, items] of Object.entries(CATALOG)) for (const item of items) {
      if (!before.includes(category + ':' + item.id) && isUnlocked(profile, category, item.id)) {
        newlyUnlocked.push({ category, ...item });
      }
    }
    return newlyUnlocked;
  }
  function load(storage) {
    try { return normalized(JSON.parse((storage || root.localStorage).getItem(KEY))); }
    catch (_) { return newProfile(); }
  }
  function save(profile, storage) {
    try { (storage || root.localStorage).setItem(KEY, JSON.stringify(normalized(profile))); return true; }
    catch (_) { return false; }
  }
  function oval(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function line(ctx, coords, color, width) {
    ctx.beginPath(); ctx.moveTo(coords[0], coords[1]);
    for (let i = 2; i < coords.length; i += 2) ctx.lineTo(coords[i], coords[i + 1]);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function star(ctx, x, y, outer, inner, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? inner : outer;
      if (!i) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function draw(ctx, look, state = {}) {
    const outfit = { ...DEFAULT, ...(look || {}) };
    const x = state.x || 0, y = state.y || 0, scale = state.scale || 1;
    const working = state.specialist === 'rampwright' || state.specialist === 'trencher';
    const grounded = state.grounded !== false;
    const moving = state.moving !== false && grounded && !(state.shrug > 0.15);
    const phase = state.phase || 0, dir = state.dir < 0 ? -1 : 1;
    const stride = moving ? Math.sin(phase) : 0;
    const liftLeft = moving ? Math.max(0, Math.sin(phase)) * 4 : 0;
    const liftRight = moving ? Math.max(0, -Math.sin(phase)) * 4 : 0;
    const bob = moving ? Math.abs(Math.sin(phase)) * 1.45 : Math.sin((state.time || 0) * 2.4 + x) * .55;
    const turn = (state.turn || 0) * .14;
    const land = Math.max(0, Math.min(1, state.land || 0));
    const airborne = !grounded;
    const tone = TONES.find(t => t.id === outfit.tone) || TONES[0];
    const outline = '#446472';
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    // Shadow stays anchored to the foot position even while the body bobs.
    ctx.globalAlpha = airborne ? .09 : .18;
    oval(ctx, 0, 1.2, 11.2, 2.3, '#2b5049'); ctx.globalAlpha = 1;
    ctx.scale(1 + .16 * land, 1 - .14 * land);
    ctx.scale(dir, 1);
    if (state.shrug > 0.08) {
      ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#3b6670';
      ctx.fillText('?', 0, -39 - Math.sin((state.time || 0) * 13) * 2);
    }
    if (state.celebrate > 0) star(ctx, 0, -39 - Math.sin((state.time || 0) * 10) * 2, 5, 2.6, '#f3c65d');
    // Legs and feet: alternating reach and lift, tied to actual walking distance.
    const leftFootX = -5 + stride * 3.4, rightFootX = 5 - stride * 3.4;
    const feet = [[leftFootX, liftLeft, -1], [rightFootX, liftRight, 1]];
    for (const [fx, lift, side] of feet) {
      line(ctx, [side * 4.5, -7 - bob, fx, -2 - lift], outline, 2.7);
      if (outfit.feet === 'boots') {
        ctx.fillStyle = '#6a7d81'; ctx.beginPath(); ctx.roundRect(fx - 3.8, -8 - lift, 8.2, 8, 2); ctx.fill();
        ctx.fillStyle = '#304e58'; ctx.beginPath(); ctx.roundRect(fx - 5, -2 - lift, 12, 3.5, 1.5); ctx.fill();
      } else if (outfit.feet === 'sneakers') {
        ctx.fillStyle = '#fae2b2'; ctx.beginPath(); ctx.roundRect(fx - 4, -4 - lift, 10, 4, 2); ctx.fill();
        line(ctx, [fx - 3, -1 - lift, fx + 5, -1 - lift], '#f9fbf6', 1.5);
        line(ctx, [fx - .5, -3 - lift, fx + 1.8, -3 - lift], '#b37465', 1);
      } else oval(ctx, fx + 1, -1.4 - lift, 4.3, 2.4, outline);
    }
    // Antennae belong behind the body, with subtle lag as the Graphling walks.
    const sway = Math.sin(phase * .5) * (moving ? 1.4 : .45) + turn * 10;
    if (outfit.antenna === 'sprout') {
      line(ctx, [0, -23 - bob, sway, -34 - bob], outline, 1.6);
      oval(ctx, sway - 3.2, -35 - bob, 4.4, 2.4, '#7cb58a');
      oval(ctx, sway + 3.2, -37 - bob, 4.4, 2.4, '#a5c985');
    } else if (outfit.antenna === 'star') {
      line(ctx, [-5, -22 - bob, -8 + sway, -32 - bob], outline, 1.5);
      line(ctx, [5, -22 - bob, 8 + sway, -32 - bob], outline, 1.5);
      star(ctx, -8 + sway, -32 - bob, 4.3, 2.1, '#f1c75b');
      star(ctx, 8 + sway, -32 - bob, 4.3, 2.1, '#f1c75b');
    } else {
      line(ctx, [-5.5, -22 - bob, -9 + sway, -32 - bob], outline, 1.5);
      line(ctx, [5.5, -22 - bob, 9 + sway, -32 - bob], outline, 1.5);
      oval(ctx, -9 + sway, -32 - bob, 2, 2, '#f1cf8d');
      oval(ctx, 9 + sway, -32 - bob, 2, 2, '#f1cf8d');
    }
    // Arms swing opposite the feet; work tools get the foreground arm.
    const armSwing = moving ? stride * 3.5 : (airborne ? -4 : .5);
    line(ctx, [-8, -16 - bob, -11 - armSwing, -11 - bob + (airborne ? -3 : 0)], outline, 2.3);
    line(ctx, [8, -16 - bob, 11 + armSwing, -10 - bob + (airborne ? -3 : 0)], outline, 2.3);
    ctx.save();ctx.translate(0, -bob);ctx.rotate(turn);
    if (outfit.body === 'boxy') {
      ctx.fillStyle = tone.color; ctx.beginPath();ctx.roundRect(-11,-24,22,24,7);ctx.fill();
    } else if (outfit.body === 'pear') {
      ctx.fillStyle = tone.color;ctx.beginPath();ctx.moveTo(0,-25);ctx.bezierCurveTo(-9,-25,-10,-19,-13,-9);
      ctx.bezierCurveTo(-15,2,15,2,13,-9);ctx.bezierCurveTo(10,-19,9,-25,0,-25);ctx.fill();
    } else { oval(ctx,0,-13,11.3,12.6,tone.color); }
    ctx.strokeStyle = outline;ctx.lineWidth = 1.2;ctx.stroke();
    oval(ctx,-5.2,-18.5,4.4,3.9,'#ffffff52');
    // Eyes blink independently of the stride.
    const blink = Math.sin((state.time || 0) * 1.65 + (state.id || 0) * 2.8) > .988;
    const wideEyes = airborne || state.shrug > .1;
    for(const ex of [-3.7,4.4]) {
      if(blink&&!wideEyes) line(ctx,[ex-1.4,-15.7,ex+1.4,-15.7],outline,1.6);
      else oval(ctx,ex,-15.5,1.45,wideEyes?2.4:1.95,'#284452');
    }
    if(wideEyes) { oval(ctx,0.6,-9.1,1.6,2.0,'#3b5b62'); }
    else { ctx.strokeStyle='#385c64';ctx.lineWidth=1.25;ctx.beginPath();ctx.arc(.7,-10.4,2.4,.1,Math.PI-.1);ctx.stroke(); }
    oval(ctx,-8,-10.2,2.2,1.25,'#f09a9b88');
    oval(ctx,8,-10.2,2.2,1.25,'#f09a9b88');
    ctx.restore();
    // Hats sit over the body and never change collision geometry.
    if(outfit.hat==='cap'&&!working) {
      ctx.fillStyle='#6b8fa3';ctx.beginPath();ctx.roundRect(-10,-26-bob,20,6,2);ctx.fill();
      ctx.fillStyle='#4c7286';ctx.beginPath();ctx.roundRect(1,-22-bob,12,3,1);ctx.fill();
    } else if(outfit.hat==='crown'&&!working) {
      ctx.fillStyle='#ecc66c';ctx.beginPath();ctx.moveTo(-9,-22-bob);ctx.lineTo(-10,-33-bob);ctx.lineTo(-4,-29-bob);
      ctx.lineTo(0,-36-bob);ctx.lineTo(4,-29-bob);ctx.lineTo(10,-33-bob);ctx.lineTo(9,-22-bob);ctx.closePath();ctx.fill();
      line(ctx,[-9,-22-bob,9,-22-bob],'#b58835',2);
    }
    if(working){
      ctx.fillStyle=state.specialist==='rampwright'?'#e7b967':'#9daeb2';
      ctx.beginPath();ctx.roundRect(-11,-27-bob,22,5,2);ctx.fill();
      ctx.beginPath();ctx.roundRect(-8,-32-bob,16,7,2);ctx.fill();
      const beat=Math.sin((state.time || 0)*18 + (state.id||0));
      ctx.save();ctx.translate(13,-9-bob);ctx.rotate(-.25+beat*.48);
      line(ctx,[0,1,0,-15],'#6e6558',2.4);
      if(state.specialist==='rampwright'){
        ctx.fillStyle='#d7ab60';ctx.beginPath();ctx.roundRect(-6,-18,12,5,1.5);ctx.fill();
      } else {
        ctx.fillStyle='#7999a4';ctx.beginPath();ctx.moveTo(-5,-19);ctx.lineTo(5,-19);ctx.lineTo(0,-25);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  const API = { KEY, CATALOG, TONES, DEFAULT, newProfile, normalized, options, part,
    isUnlocked, progress, equip, record, load, save, draw };
  root.GraphlingAvatar = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
