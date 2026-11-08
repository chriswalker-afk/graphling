const test = require('node:test');
const assert = require('node:assert/strict');
const Avatar = require('../src/avatar.js');
const Physics = require('../src/physics.js');
test('starter outfit has free parts and valid tone',()=>{
  const p=Avatar.newProfile();
  for(const [category,id] of Object.entries(Avatar.DEFAULT)) {
    assert.equal(p.equipped[category],id);
    if(category!=='tone')assert.equal(Avatar.isUnlocked(p,category,id),true);
  }
});
test('locked cosmetic parts cannot be equipped early',()=>{
  const p=Avatar.newProfile();
  assert.equal(Avatar.equip(p,'feet','sneakers'),false);
  assert.equal(Avatar.equip(p,'hat','crown'),false);
  assert.equal(Avatar.equip(p,'feet','invalid'),false);
  assert.equal(Avatar.equip(p,'body','pear'),false);
});
test('rescuing and working unlocks modular parts independently',()=>{
  const p=Avatar.newProfile();
  assert.deepEqual(Avatar.record(p,'rescue').map(x=>x.id),['sneakers']);
  assert.equal(Avatar.equip(p,'feet','sneakers'),true);
  assert.deepEqual(Avatar.record(p,'build').map(x=>x.id),['boots']);
  assert.equal(Avatar.equip(p,'feet','boots'),true);
  assert.deepEqual(Avatar.record(p,'dig').map(x=>x.id),['sprout']);
  Avatar.record(p,'level',0);
  assert.deepEqual(Avatar.record(p,'level',0),[]);
  assert.deepEqual(Avatar.record(p,'level',1).map(x=>x.id),['crown']);
  assert.deepEqual(p.stats.levels,[0,1]);
  assert.equal(Avatar.equip(p,'hat','crown'),true);
});
test('milestone unlocks are each emitted once',()=>{
  const p=Avatar.newProfile();
  const ids=[];
  for(let i=0;i<12;i++)ids.push(...Avatar.record(p,'rescue').map(x=>x.id));
  assert.deepEqual(ids,['sneakers','pear','star','boxy']);
  assert.equal(Avatar.isUnlocked(p,'body','boxy'),true);
});
test('profile persistence normalizes malformed values and rejects forged locks',()=>{
  const saved={version:1,stats:{rescued:0,built:-4,dug:'1',levels:[0,0,1,-10,'3']},
    equipped:{body:'boxy',feet:'boots',antenna:'sprout',hat:'crown',tone:'peach'}};
  const p=Avatar.normalized(saved);
  assert.equal(p.equipped.body,'round');assert.equal(p.equipped.feet,'paws');
  assert.equal(p.equipped.hat,'crown');assert.equal(p.equipped.tone,'peach');
  assert.deepEqual(p.stats.levels,[0,1]);assert.equal(p.stats.built,0);
  assert.equal(p.stats.dug,0);
});
test('appearance never modifies the physical dimensions of walkers',()=>{
  const actor=Physics.walker(2,15,0),base=Avatar.newProfile();
  const prior={x:actor.x,y:actor.y,grounded:actor.grounded};
  Avatar.record(base,'rescue');Avatar.equip(base,'feet','sneakers');
  assert.deepEqual({x:actor.x,y:actor.y,grounded:actor.grounded},prior);
  assert.equal(Physics.BODY_RADIUS,.19);assert.equal(Physics.BODY_HEIGHT,.64);
});
