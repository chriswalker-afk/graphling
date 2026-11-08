/* Geometry hints must not reveal a student's chosen line or its outcome. */
const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/physics.js');
const G=require('../src/planning-guides.js');
test('default guides use the same fixed energy limit as actual specialists',()=>{
  const l=P.makeLevel(0),w=P.walker(10,15,0);
  const g=G.guides(l,w);
  assert.equal(P.ENERGY,10);
  assert.equal(G.DEFAULT_REACH,P.ENERGY);
  assert.equal(g.reachX,20);
  assert.ok(g.markers.length>0 && g.markers.length<=3);
});
test('guides respond to the level geometry, without plotting a mathematical curve',()=>{
  const l=P.makeLevel(2),w=P.walker(8,15,0);
  const hints=G.guides(l,w);
  assert.ok(hints.markers.some(a=>a.hazard));
  assert.ok(hints.markers.length<=3);
  for(const mark of hints.markers) {
    assert.equal(typeof mark.x,'number');
    assert.equal(typeof mark.y,'number');
    assert.equal(Object.hasOwn(mark,'slope'),false);
    assert.equal(Object.hasOwn(mark,'endpoint'),false);
  }
  const again=G.guides(l,w);
  assert.deepEqual(hints,again);
  l.grid[13][9]=P.TILE.EARTH;
  assert.notDeepEqual(G.guides(l,w),hints);
});
test('guides use facing direction and clamp the reachable x position',()=>{
  const l=P.makeLevel(0),w=P.walker(5,15,0);
  w.dir=-1;
  const g=G.guides(l,w);
  assert.equal(g.direction,-1);
  assert.equal(g.reachX,0);
  w.dir=1;
  assert.equal(G.guides(l,w).reachX,15);
});
