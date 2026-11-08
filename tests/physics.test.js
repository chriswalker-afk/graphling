/* Graphlings Pass B. Run: node --test tests/physics.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const { TILE } = P;
function empty() {
  const level = P.makeLevel(0);
  level.grid = P.createGrid(); level.paths = []; level.exit = {x:34,y:2};
  return level;
}
function floor(level, first=0, last=34, row=15) {
  for (let x=first; x<=last; x++) P.put(level.grid,x,row,TILE.EARTH);
}
function walk(level, who, seconds) {
  for(let i=0;i<Math.ceil(seconds*120)&&who.alive&&!who.rescued;i++)P.advance(level,who,1/120);
}
function finishJob(level, who) {
  for(let i=0;i<2000&&who.specialist&&who.alive;i++)P.advance(level,who,1/120);
}
test('three landscapes use distinct destructible/indestructible terrain and entrance coordinates',()=>{
  const bridge=P.makeLevel(0), earth=P.makeLevel(1), spikes=P.makeLevel(2);
  assert.deepEqual(bridge.entrance,{x:2,y:15});
  assert.equal(P.tileAt(bridge,12,15),TILE.EMPTY);
  assert.equal(P.tileAt(earth,13,14),TILE.EARTH);
  assert.equal(P.tileAt(earth,24,10),TILE.ROCK);
  assert.equal(P.tileAt(spikes,14,14),TILE.SPIKE);
  assert.equal(P.tileAt(spikes,22,13),TILE.ROCK);
  assert.equal(P.isSolid(TILE.SPIKE),false);
  assert.equal(P.isSolid(TILE.BRIDGE),true);
});
test('coefficient parsing accepts decimals and fractions, rejects invalid inputs',()=>{
  assert.equal(P.parseCoefficient(' -3/4 '),-.75);
  assert.equal(P.parseCoefficient('.25'),.25);
  assert.equal(P.parseCoefficient('1/0'),null);
  assert.equal(P.parseCoefficient('2+2'),null);
  assert.equal(P.parseCoefficient(''),null);
});
test('global line coordinates use entrance as origin and y up',()=>{
  const l=P.makeLevel(0);
  assert.equal(P.mathX(l,6),4);
  assert.equal(P.mathY(l,11),4);
  assert.equal(P.curveY(l,.5,2,6),11);
});
test('distant graph shrugs without consuming a specialist',()=>{
  const l=P.makeLevel(0), w=P.walker(4,15,0);
  const result=P.assignSpecialist(l,w,{kind:'rampwright',m:0,c:5});
  assert.equal(result.reason,'too-far');
  assert.equal(w.specialist,null);
  assert.ok(w.shrug>0);
  assert.equal(l.paths.length,0);
});
test('unwalkable gradients and over-steep joining ramps are rejected',()=>{
  const l=P.makeLevel(0),w=P.walker(4,15,0);
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:1.1,c:-2.2}).reason,'too-steep');
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:1,c:-1.7}).reason,'join-too-steep');
  assert.equal(w.specialist,null);
});
test('ordinary walker reverses at walls',()=>{
  const l=empty();floor(l);P.put(l.grid,6,14,TILE.ROCK);
  const w=P.walker(4,15,0);walk(l,w,1.5);assert.equal(w.dir,-1);assert.ok(w.alive);
});
test('spikes squish ordinary walkers',()=>{
  const l=empty();floor(l);P.put(l.grid,6,14,TILE.SPIKE);
  const w=P.walker(4,15,0);walk(l,w,1.5);assert.equal(w.death,'spikes');
});
test('short falls survive, long falls squish',()=>{
  const a=empty();floor(a,0,34,11);
  const w=P.walker(4,9,0);w.grounded=false;w.fallStart=9;
  walk(a,w,.6);assert.equal(w.y,11);assert.equal(w.grounded,true);assert.ok(w.alive);
  const b=empty();floor(b,0,34,13);
  const v=P.walker(4,7,1);v.grounded=false;v.fallStart=7;
  walk(b,v,.9);assert.equal(v.death,'fall');
});
test('falling through void loses a Graphling',()=>{
  const l=empty(),w=P.walker(4,5,0);w.grounded=false;w.fallStart=5;
  walk(l,w,2);assert.equal(w.death,'void');
});
test('ordinary walkers reach an exit',()=>{
  const l=empty();floor(l);l.exit={x:6,y:15};
  const w=P.walker(4,15,0);walk(l,w,1.3);assert.equal(w.rescued,true);
});
test('Rampwright builds a persistent bridge and returns to ordinary walking',()=>{
  const l=P.makeLevel(0),w=P.walker(10,15,0);
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:0,c:0}).ok,true);
  finishJob(l,w);
  assert.equal(w.specialist,null);
  assert.equal(w.lastAction.reason,'complete');
  assert.ok(Math.abs(w.x-20)<.04);
  assert.equal(P.supportAt(l,14,15),true);
  const follower=P.walker(10,15,1);
  walk(l,follower,4);
  assert.ok(follower.alive&&follower.x>17);
});
test('ordinary Graphlings can walk on rising straight-line construction',()=>{
  const l=empty();floor(l,0,7,15);
  const w=P.walker(5,15,0);
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:.5,c:-1.5}).ok,true);
  finishJob(l,w);assert.equal(w.lastAction.reason,'complete');
  const follower=P.walker(5,15,1);
  walk(l,follower,2.4);
  assert.ok(follower.alive&&follower.y<14);
});
test('left-facing Rampwright travels toward decreasing global x',()=>{
  const l=empty();floor(l);
  const w=P.walker(20,15,0);w.dir=-1;
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:0,c:0}).ok,true);
  finishJob(l,w);
  assert.ok(Math.abs(w.x-10)<.04);
});
test('Trencher excavates earth wall, leaves a floor, then becomes ordinary',()=>{
  const l=P.makeLevel(1),w=P.walker(11,15,0);
  assert.equal(P.assignSpecialist(l,w,{kind:'trencher',m:0,c:0}).ok,true);
  finishJob(l,w);
  assert.ok(w.x>17);
  assert.equal(P.tileAt(l,14,14),TILE.EMPTY);
  assert.equal(P.supportAt(l,14,15),true);
  assert.equal(w.specialist,null);
  const follower=P.walker(11,15,1);
  walk(l,follower,4);assert.ok(follower.x>18);
});
test('Trencher stops at indestructible bedrock without erasing it',()=>{
  const l=empty();floor(l);P.put(l.grid,6,14,TILE.ROCK);
  const w=P.walker(5,15,0);P.assignSpecialist(l,w,{kind:'trencher',m:0,c:0});
  finishJob(l,w);assert.equal(P.tileAt(l,6,14),TILE.ROCK);
  assert.equal(w.lastAction.reason,'bedrock');assert.ok(w.x<6);
});
test('Trencher cannot create an unsupported tunnel through air',()=>{
  const l=empty();floor(l,0,5);
  const w=P.walker(5,15,0);
  P.assignSpecialist(l,w,{kind:'trencher',m:0,c:0});
  finishJob(l,w);assert.ok(w.x<6);
  assert.equal(w.lastAction.reason,'unsupported');
});
test('Rampwright stops at solid obstacles; spikes squish assigned workers',()=>{
  const a=empty();floor(a);P.put(a.grid,6,14,TILE.EARTH);
  const builder=P.walker(5,15,0);P.assignSpecialist(a,builder,{kind:'rampwright',m:0,c:0});
  finishJob(a,builder);assert.equal(builder.lastAction.reason,'blocked');
  const b=empty();floor(b);P.put(b.grid,6,14,TILE.SPIKE);
  const other=P.walker(5,15,0);P.assignSpecialist(b,other,{kind:'rampwright',m:0,c:0});
  walk(b,other,1);assert.equal(other.death,'spikes');
});
test('every assigned specialist has an unchangeable ten-energy budget',()=>{
  const l=empty();floor(l);
  const w=P.walker(10,15,0);
  assert.equal(P.ENERGY,10);
  assert.equal(P.previewAction,undefined);
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:0,c:0,ticks:2,energy:99}).ok,true);
  assert.equal(w.specialist.energy,10);
  walk(l,w,1);assert.ok(w.specialist);
  assert.ok(w.specialist.travelled>2 && w.specialist.travelled<3);
  assert.ok(w.specialist.energy-w.specialist.travelled>7);
  finishJob(l,w);
  assert.equal(w.lastAction.reason,'complete');
  assert.ok(Math.abs(w.lastAction.travelled-10)<.04);
  assert.ok(Math.abs(w.x-20)<.04);
});
test('blocked worker forfeits remaining energy rather than continuing',()=>{
  const l=empty();floor(l);P.put(l.grid,6,14,TILE.ROCK);
  const w=P.walker(5,15,0);
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m:0,c:0}).ok,true);
  finishJob(l,w);
  assert.equal(w.lastAction.reason,'blocked');
  assert.ok(w.lastAction.travelled<2);
});
test('Spike Garden is solvable with one well-chosen mathematical ramp',()=>{
  const l=P.makeLevel(2),w=P.walker(8,15,0),m=3/10,c=-9/5;
  assert.equal(P.assignSpecialist(l,w,{kind:'rampwright',m,c}).ok,true);
  finishJob(l,w);assert.equal(w.lastAction.reason,'complete');
  assert.ok(Math.abs(w.y-12)<.02);
  walk(l,w,7);assert.equal(w.rescued,true);
  const follower=P.walker(8,15,1);walk(l,follower,14);
  assert.equal(follower.rescued,true);
});
