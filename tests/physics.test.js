/* Run with: node --test tests/physics.test.js */
const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/physics.js');
function clearLevel(){const level=P.makeLevel(0);level.grid=P.createGrid();level.exit={x:33,y:4};return level;}
function run(level,w,seconds){for(let i=0;i<Math.ceil(seconds*120)&&w.alive&&!w.rescued;i++)P.advance(level,w,1/120);}
test('level has fixed entrance origin and independent terrain types',()=>{
 const l=P.makeLevel(1);
 assert.deepEqual(l.entrance,{x:2,y:15});
 assert.equal(P.tileAt(l,12,14),P.TILE.SPIKE);
 assert.equal(P.tileAt(l,23,13),P.TILE.ROCK);
 assert.equal(P.isSolid(P.TILE.EARTH),true);
 assert.equal(P.isSolid(P.TILE.ROCK),true);
 assert.equal(P.isSolid(P.TILE.BRIDGE),true);
 assert.equal(P.isSolid(P.TILE.SPIKE),false);
});
test('walkers turn around at a rock wall',()=>{
 const l=clearLevel();
 for(let x=0;x<20;x++)P.put(l.grid,x,10,P.TILE.EARTH);
 P.put(l.grid,6,9,P.TILE.ROCK);
 const w=P.walker(4,10,0);
 run(l,w,2);
 assert.equal(w.alive,true);
 assert.equal(w.dir,-1);
});
test('spikes cause an immediate squish',()=>{
 const l=clearLevel();
 for(let x=0;x<20;x++)P.put(l.grid,x,10,P.TILE.EARTH);
 P.put(l.grid,6,9,P.TILE.SPIKE);
 const w=P.walker(4,10,0);run(l,w,2);
 assert.equal(w.alive,false);assert.equal(w.death,'spikes');
});
test('short falls are survivable',()=>{
 const l=clearLevel();
 for(let x=0;x<20;x++)P.put(l.grid,x,9,P.TILE.EARTH);
 const w=P.walker(4,7,0);w.grounded=false;w.fallStart=7;
 run(l,w,.5);assert.equal(w.alive,true);assert.equal(w.grounded,true);assert.equal(w.y,9);
});
test('falls greater than four tiles cause a squish',()=>{
 const l=clearLevel();
 for(let x=0;x<20;x++)P.put(l.grid,x,11,P.TILE.EARTH);
 const w=P.walker(4,5,0);w.grounded=false;w.fallStart=5;
 run(l,w,1);assert.equal(w.alive,false);assert.equal(w.death,'fall');
});
test('falling into empty space beyond the world loses the Graphling',()=>{
 const l=clearLevel();const w=P.walker(4,5,0);w.grounded=false;w.fallStart=5;
 run(l,w,2);assert.equal(w.alive,false);assert.equal(w.death,'void');
});
test('arriving at the exit rescues a walking Graphling',()=>{
 const l=clearLevel();for(let x=0;x<20;x++)P.put(l.grid,x,10,P.TILE.EARTH);
 l.exit={x:6,y:10};const w=P.walker(4,10,0);run(l,w,2);
 assert.equal(w.rescued,true);assert.equal(w.alive,true);
});
