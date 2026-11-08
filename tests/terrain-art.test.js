const test = require('node:test');
const assert = require('node:assert/strict');
const Art = require('../src/terrain-art.js');
const {TYPE} = Art;
function terrain(type, width=7, height=5) { return Array.from({length:height},()=>Array(width).fill(type)); }
test('variation for one tile is deterministic across calls',()=>{
  const first=Art.recipe(TYPE.EARTH,6,14,59);
  assert.deepEqual(first,Art.recipe(TYPE.EARTH,6,14,59));
  assert.ok(Object.isFrozen(first));
});
test('neighbouring tiles and distinct terrain types have distinct details',()=>{
  const a=Art.recipe(TYPE.EARTH,6,14,59);
  const b=Art.recipe(TYPE.EARTH,7,14,59);
  const rock=Art.recipe(TYPE.ROCK,6,14,59);
  assert.notDeepEqual(a,b);
  assert.notDeepEqual(a,rock);
  const unique=new Set(Array.from({length:40},(_,i)=>JSON.stringify(Art.recipe(TYPE.EARTH,i%10,Math.floor(i/10),59))));
  assert.ok(unique.size>=37);
});
test('seeded hash values are finite and in [0,1)',()=>{
  for(let x=-9;x<=9;x++)for(let y=-9;y<=9;y++){
    const z=Art.hash(x,y,51);
    assert.ok(Number.isFinite(z)&&z>=0&&z<1);
    assert.equal(z,Art.hash(x,y,51));
  }
});
test('grass and exposed edge flags follow actual neighbouring terrain',()=>{
  const grid=terrain(TYPE.EARTH);
  assert.equal(Art.edgeMask(grid,3,3),0);
  grid[2][3]=TYPE.EMPTY;
  assert.equal(Art.edgeMask(grid,3,3),1);
  grid[3][2]=TYPE.EMPTY;
  grid[3][4]=TYPE.EMPTY;
  assert.equal(Art.edgeMask(grid,3,3),7);
  grid[4][3]=TYPE.EMPTY;
  assert.equal(Art.edgeMask(grid,3,3),15);
});
test('bedrock and spikes are retained as their own visual types',()=>{
  assert.equal(TYPE.EARTH,1);assert.equal(TYPE.ROCK,2);
  assert.equal(TYPE.BRIDGE,3);assert.equal(TYPE.SPIKE,4);
});
