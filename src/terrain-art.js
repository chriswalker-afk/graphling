/* Graphlings terrain art: deterministic procedural decoration, independent of physics. */
(function (root) {
  'use strict';
  const SIZE = 32, DETAIL_SCALE = 2, CACHE_LIMIT = 1100;
  const TYPE = Object.freeze({ EMPTY: 0, EARTH: 1, ROCK: 2, BRIDGE: 3, SPIKE: 4 });

  function hash(x, y, salt = 0) {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function randomFor(x, y, type, seed = 0) {
    let state = (Math.imul(x + 128, 73856093) ^ Math.imul(y + 128, 19349663) ^ Math.imul(type + seed + 23, 83492791)) >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(state ^ (state >>> 15), 1 | state);
      n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smooth(v) { return v * v * (3 - 2 * v); }
  function noise(x, y, salt) {
    const ix = Math.floor(x), iy = Math.floor(y), sx = smooth(x - ix), sy = smooth(y - iy);
    const a = hash(ix, iy, salt), b = hash(ix + 1, iy, salt);
    const c = hash(ix, iy + 1, salt), d = hash(ix + 1, iy + 1, salt);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  function neighbour(grid, x, y) { return grid[y]?.[x] ?? TYPE.EMPTY; }
  function edgeMask(grid, x, y) {
    let mask = 0;
    if (neighbour(grid, x, y - 1) === TYPE.EMPTY) mask |= 1;
    if (neighbour(grid, x - 1, y) === TYPE.EMPTY) mask |= 2;
    if (neighbour(grid, x + 1, y) === TYPE.EMPTY) mask |= 4;
    if (neighbour(grid, x, y + 1) === TYPE.EMPTY) mask |= 8;
    return mask;
  }
  function recipe(type, x, y, seed = 0) {
    const r = randomFor(x, y, type, seed);
    return Object.freeze({ variant: Math.floor(r() * 5), inclusions: Math.floor(r() * 3),
      marks: 1 + Math.floor(r() * 3), rotation: r() * Math.PI * 2,
      tint: r(), motif: Math.floor(r() * 4) });
  }
  const TWO_PI = Math.PI * 2;
  function ellipse(ctx, x, y, rx, ry, color, angle = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TWO_PI); ctx.fill();
  }
  function poly(ctx, pts, color) {
    ctx.fillStyle = color;ctx.beginPath();ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();ctx.fill();
  }
  function grain(ctx, x, y, salt, light, dark) {
    for (let yy = 0; yy < SIZE; yy += 4) {
      for (let xx = 0; xx < SIZE; xx += 4) {
        const n = noise((x * SIZE + xx + 2) / 21, (y * SIZE + yy + 2) / 21, salt);
        if (n > .54) { ctx.globalAlpha = Math.min(.23, (n - .54) * .56); ctx.fillStyle = light; ctx.fillRect(xx, yy, 4.1, 4.1); }
        else if (n < .44) { ctx.globalAlpha = Math.min(.27, (.44 - n) * .67); ctx.fillStyle = dark; ctx.fillRect(xx, yy, 4.1, 4.1); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function rockChip(ctx, cx, cy, radius, shade) {
    poly(ctx, [[cx-radius,cy], [cx-radius*.47,cy-radius*.67], [cx+radius*.42,cy-radius*.52],
      [cx+radius,cy+radius*.16], [cx+radius*.33,cy+radius*.69], [cx-radius*.62,cy+radius*.5]], shade);
    ctx.strokeStyle = '#e0d0ad';ctx.lineWidth = .7;ctx.globalAlpha = .55;ctx.beginPath();
    ctx.moveTo(cx-radius*.75,cy-radius*.1);ctx.lineTo(cx-radius*.35,cy-radius*.52);
    ctx.lineTo(cx+radius*.37,cy-radius*.41);ctx.stroke();ctx.globalAlpha = 1;
  }
  function earth(ctx, x, y, flags, r, data) {
    ctx.fillStyle = ['#9b7659','#9b7253','#987255','#a07a5c','#9b7558'][data.variant];ctx.fillRect(0,0,SIZE,SIZE);
    grain(ctx,x,y,17,'#d4b390','#553d35');
    const inclusions = data.inclusions;
    for (let i=0; i<inclusions; i++) {
      const px = 3 + r()*26, py = 9 + r()*21, size = 1.5+r()*2.4;
      rockChip(ctx,px,py,size,['#807a69','#aa9073','#6b6e67','#a69078'][Math.floor(r()*4)]);
    }
    for(let i=0;i<data.marks+1;i++){
      const px=r()*SIZE,py=r()*SIZE;
      ellipse(ctx,px,py,.5+r()*1,.55+r()*1.1,r()>.43?'#ba9878':'#765643');
    }
    if(r()>.5){
      const px=5+r()*19,py=12+r()*15;
      ctx.strokeStyle='#5e4c3d';ctx.lineWidth=.95;ctx.globalAlpha=.7;ctx.beginPath();
      ctx.moveTo(px,py);ctx.quadraticCurveTo(px+3,py+3,px+3+r()*8,py+4+r()*3);ctx.stroke();ctx.globalAlpha=1;
    }
    if(flags&1){
      const top=ctx.createLinearGradient(0,0,0,10);top.addColorStop(0,'#587c53');top.addColorStop(.5,'#7f9e66');top.addColorStop(1,'#ac895f');
      ctx.fillStyle=top;ctx.fillRect(0,0,SIZE,7.7);ctx.fillStyle='#a4be7c';ctx.fillRect(0,0,SIZE,1.4);
      ctx.fillStyle='#614e38';ctx.globalAlpha=.23;ctx.fillRect(0,7,SIZE,3);ctx.globalAlpha=1;
      for(let k=0;k<4;k++){
        const px=r()*SIZE,h=2+r()*4;
        ctx.strokeStyle=r()>.4?'#537c4b':'#84a668';ctx.lineCap='round';ctx.lineWidth=.9+r()*.5;
        ctx.beginPath();ctx.moveTo(px,2.5);ctx.lineTo(px+(r()-.5)*3,-h);ctx.stroke();
      }
      if(r()>.65){ellipse(ctx,r()*SIZE,4,2.8,1.3,'#8fa86a');}
    }
    if(flags&2){ctx.fillStyle='#604733';ctx.globalAlpha=.37;ctx.fillRect(0,0,2.3,SIZE);ctx.globalAlpha=1;}
    if(flags&4){ctx.fillStyle='#d2a77e';ctx.globalAlpha=.3;ctx.fillRect(SIZE-1.5,0,1.5,SIZE);ctx.globalAlpha=1;}
  }
  function rock(ctx,x,y,flags,r,data){
    ctx.fillStyle=['#657a7c','#5e777b','#637477','#637d80','#697c7d'][data.variant];ctx.fillRect(0,0,SIZE,SIZE);
    grain(ctx,x,y,29,'#bdc9bf','#263f4c');
    // Faceted mineral plates with irregular borders, instead of repeated cell outlines.
    for(let i=0;i<2+data.motif%2;i++){
      const cx=3+r()*26, cy=3+r()*26, radius=6+r()*8;
      poly(ctx,[[cx-radius,cy+radius*.16],[cx-radius*.46,cy-radius*.73],
        [cx+radius*.4,cy-radius*.58],[cx+radius*.9,cy+radius*.16],
        [cx+radius*.12,cy+radius*.78]],r()>.5?'#819294':'#53696e');
      ctx.strokeStyle='#9ba9a5';ctx.lineWidth=.75;ctx.globalAlpha=.45;ctx.beginPath();
      ctx.moveTo(cx-radius*.46,cy-radius*.73);ctx.lineTo(cx+radius*.4,cy-radius*.58);ctx.stroke();ctx.globalAlpha=1;
    }
    const sx = 2+r()*22, sy=3+r()*22;
    ctx.strokeStyle='#334e58';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(sx,sy);ctx.lineTo(sx+3+r()*5,sy+4+r()*4);ctx.lineTo(sx+7+r()*9,sy+3+r()*9);ctx.stroke();
    ctx.strokeStyle='#a2ada6';ctx.lineWidth=.9;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(sx+1,sy-2);ctx.lineTo(sx+5,sy+2);ctx.stroke();ctx.globalAlpha=1;
    for(let i=0;i<data.marks;i++){
      const px=3+r()*26,py=3+r()*26;
      ellipse(ctx,px,py,.65+r()*.55,.55+r()*.7,r()>.8?'#bad5c3':'#3b5b61');
    }
    if(flags&1){
      ctx.fillStyle='#9db1ae';ctx.fillRect(0,0,SIZE,2.1);
      ctx.fillStyle='#3f5d63';ctx.globalAlpha=.45;ctx.fillRect(0,2.1,SIZE,3.5);ctx.globalAlpha=1;
      for(let i=0;i<2;i++){
        const px=r()*SIZE;poly(ctx,[[px,1.7],[px+3,-.2],[px+8,1.7]],'#becac3');
      }
    }
    if(flags&2){ctx.fillStyle='#2e4950';ctx.globalAlpha=.4;ctx.fillRect(0,0,1.8,SIZE);ctx.globalAlpha=1;}
    if(flags&4){ctx.fillStyle='#a5b2a7';ctx.globalAlpha=.36;ctx.fillRect(SIZE-1.5,0,1.5,SIZE);ctx.globalAlpha=1;}
  }
  function bridge(ctx,x,y,flags,r,data){
    const wood=['#a86e43','#a4754a','#a96f46','#a7754e','#b07b50'][data.variant];
    ctx.fillStyle='#785641';ctx.fillRect(0,0,SIZE,SIZE);
    ctx.fillStyle=wood;ctx.fillRect(3,9,26,23);
    ctx.fillStyle='#5c3f32';ctx.fillRect(0,18,SIZE,2.7);
    ctx.strokeStyle='#d2a16e';ctx.lineWidth=2.7;ctx.beginPath();
    if(data.motif===0){
      ctx.moveTo(5,29);ctx.lineTo(27,12);ctx.moveTo(27,29);ctx.lineTo(5,12);
    }else if(data.motif===1){
      ctx.moveTo(5,28);ctx.lineTo(26,12);ctx.moveTo(6,13);ctx.lineTo(6,29);
    }else if(data.motif===2){
      ctx.moveTo(6,29);ctx.lineTo(6,11);ctx.moveTo(25,29);ctx.lineTo(25,11);
    }else{
      ctx.moveTo(5,13);ctx.lineTo(26,29);ctx.moveTo(25,12);ctx.lineTo(25,29);
    }
    ctx.stroke();
    ctx.strokeStyle='#644430';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(2,11);ctx.lineTo(30,11);ctx.stroke();
    const top=ctx.createLinearGradient(0,0,0,10);
    top.addColorStop(0,['#f1c783','#eed09a','#f5cb8f','#f4cb83','#e9bd7d'][data.variant]);
    top.addColorStop(.5,'#d6a36a');top.addColorStop(1,wood);
    ctx.fillStyle=top;ctx.fillRect(0,0,SIZE,10);
    ctx.fillStyle='#765039';ctx.fillRect(0,9,SIZE,2);
    ctx.strokeStyle='#a27b51';ctx.lineWidth=.9;
    for(let i=0;i<data.inclusions+2;i++){
      const py=2+r()*5,px=r()*27;
      ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+3,py+(r()-.5)*2,px+5+r()*6,py);ctx.stroke();
    }
    if(data.variant===2||data.variant===4){
      const knotX=9+r()*14;
      ctx.strokeStyle='#8c633f';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(knotX,5,2.5,1.2,0,0,TWO_PI);ctx.stroke();
    }
    for(const px of [5,27]){
      ellipse(ctx,px,5,1.3,1.4,'#614b3e');ellipse(ctx,px-.2,4.5,.5,.5,'#f3d8a2');
    }
    if(data.variant%2===0){ctx.fillStyle='#755136';ctx.fillRect(13+r()*5,12,1.5,18);}
  }
  function spikes(ctx,x,y,flags,r,data){
    // Do not fill the whole cell: spikes must remain recognisable against the backdrop.
    ctx.fillStyle='#783e3d';ctx.fillRect(0,SIZE-6,SIZE,6);
    ctx.fillStyle='#c75b4d';ctx.fillRect(0,SIZE-6,SIZE,3);
    for(let i=0;i<3;i++){
      const left=i*10.7, tip=4 + r()*3, mid=left+5.35;
      poly(ctx,[[left,SIZE-6],[mid,tip],[left+10.7,SIZE-6]],'#a0b7b7');
      poly(ctx,[[left+1.2,SIZE-6],[mid,tip],[mid,SIZE-6]],'#e8eeee');
      ctx.strokeStyle='#4a707b';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(mid+.6,tip+4);ctx.lineTo(mid+4,SIZE-7);ctx.stroke();
    }
    ctx.fillStyle='#8f393a';ctx.fillRect(0,SIZE-3,SIZE,3);
    for(let i=0;i<3;i++){
      ellipse(ctx,5.3+i*10.7,SIZE-3,1.1,.9,'#f0bb78');
    }
    if(data.motif===0){ctx.fillStyle='#d08b56';ctx.fillRect(3,SIZE-5,3,1);}
  }
  function paintSprite(ctx,type,x,y,flags,seed=0){
    ctx.save();ctx.beginPath();ctx.rect(0,0,SIZE,SIZE);ctx.clip();
    const r=randomFor(x,y,type,seed), data=recipe(type,x,y,seed);
    if(type===TYPE.EARTH)earth(ctx,x,y,flags,r,data);
    else if(type===TYPE.ROCK)rock(ctx,x,y,flags,r,data);
    else if(type===TYPE.BRIDGE)bridge(ctx,x,y,flags,r,data);
    else if(type===TYPE.SPIKE)spikes(ctx,x,y,flags,r,data);
    ctx.restore();
  }
  function createRenderer(options={}){
    const seed=Number.isInteger(options.seed)?options.seed:59;
    const tileSize=options.tileSize || SIZE;
    const cache=new Map();
    function sprite(type,x,y,flags){
      const key=type+':'+x+':'+y+':'+flags;
      if(cache.has(key))return cache.get(key);
      const surface=document.createElement('canvas');surface.width=SIZE*DETAIL_SCALE;surface.height=SIZE*DETAIL_SCALE;
      const context=surface.getContext('2d');context.scale(DETAIL_SCALE,DETAIL_SCALE);
      paintSprite(context,type,x,y,flags,seed);
      if(cache.size>=CACHE_LIMIT)cache.clear();
      cache.set(key,surface);return surface;
    }
    return {
      draw(ctx,grid,x,y,type){
        if(type===TYPE.EMPTY)return;
        const flags=edgeMask(grid,x,y);
        ctx.drawImage(sprite(type,x,y,flags),x*tileSize,y*tileSize,tileSize,tileSize);
      },
      clear(){cache.clear();},
      get cacheSize(){return cache.size;}
    };
  }
  const API={TYPE,SIZE,hash,randomFor,edgeMask,recipe,paintSprite,createRenderer};
  root.GraphlingTerrainArt=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
