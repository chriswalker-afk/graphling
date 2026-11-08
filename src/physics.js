/* Graphlings Pass A: tile-based deterministic physics, dependency-free. */
(function (root) {
  "use strict";
  const TILE = { EMPTY: 0, EARTH: 1, ROCK: 2, BRIDGE: 3, SPIKE: 4 };
  const WIDTH = 35, HEIGHT = 18;
  const SPEED = 2.15, GRAVITY = 25, TERMINAL = 18, SAFE_FALL = 4;
  const BODY_RADIUS = 0.19, BODY_HEIGHT = 0.64;
  const SOLID = new Set([TILE.EARTH, TILE.ROCK, TILE.BRIDGE]);
  function createGrid() { return Array.from({length:HEIGHT}, () => Array(WIDTH).fill(TILE.EMPTY)); }
  function put(grid,x,y,type) { if(x>=0&&x<WIDTH&&y>=0&&y<HEIGHT) grid[y][x]=type; }
  function fill(grid,x0,x1,y0,y1,type){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)put(grid,x,y,type);}
  function makeLevel(index) {
    const grid=createGrid();
    fill(grid,0,WIDTH-1,15,17,TILE.EARTH);
    fill(grid,0,WIDTH-1,17,17,TILE.ROCK);
    if(index===0) {
      fill(grid,11,17,15,17,TILE.EMPTY);
      fill(grid,11,17,17,17,TILE.ROCK);
      fill(grid,21,23,12,14,TILE.ROCK);
    } else if(index===1) {
      fill(grid,11,18,14,14,TILE.SPIKE);
      fill(grid,23,25,13,14,TILE.ROCK);
    } else {
      fill(grid,10,18,12,17,TILE.EMPTY);
      fill(grid,10,18,17,17,TILE.ROCK);
      fill(grid,10,18,16,16,TILE.EARTH);
      fill(grid,22,25,13,14,TILE.ROCK);
    }
    return {grid,entrance:{x:2,y:15},exit:{x:32,y:15},count:12,target:8,name:["First steps","Spike garden","The long drop"][index]||"First steps"};
  }
  function tileAt(level,x,y) {
    const ix=Math.floor(x),iy=Math.floor(y);
    if(ix<0||ix>=WIDTH||iy<0) return TILE.EMPTY;
    if(iy>=HEIGHT) return TILE.EMPTY;
    return level.grid[iy][ix];
  }
  function isSolid(v){return SOLID.has(v);}
  function supportAt(level,x,feet){
    // A solid cell immediately below feet supports a walker. No spikes support weight.
    const row=Math.floor(feet+0.035);
    return isSolid(tileAt(level,x,row));
  }
  function wallAt(level,x,feet){
    const lower=Math.floor(feet-0.08),upper=Math.floor(feet-BODY_HEIGHT+0.1);
    return isSolid(tileAt(level,x,lower))||isSolid(tileAt(level,x,upper));
  }
  function hazardous(level,x,feet){
    const left=Math.floor(x-BODY_RADIUS),right=Math.floor(x+BODY_RADIUS);
    const top=Math.floor(feet-BODY_HEIGHT),bottom=Math.floor(feet-0.05);
    for(let yy=top;yy<=bottom;yy++)for(let xx=left;xx<=right;xx++){
      if(tileAt(level,xx+0.01,yy+0.01)===TILE.SPIKE &&
        feet>yy+0.17 && feet-BODY_HEIGHT<yy+0.9) return true;
    }
    return false;
  }
  function walker(x,y,id){return{id,x,y,dir:1,vy:0,grounded:true,fallStart:y,alive:true,rescued:false,death:null,deathTime:0,phase:id*.73};}
  function outcome(w,reason) {w.alive=false;w.death=reason;w.deathTime=0;return reason;}
  function advance(level,w,dt){
    if(!w.alive||w.rescued)return null;
    // Frame substepping also protects against tunnelling through thin hazards/walls.
    const n=Math.max(1,Math.ceil(dt/0.012));
    for(let step=0;step<n;step++) {
      const h=dt/n;
      if(w.grounded) {
        if(!supportAt(level,w.x,w.y)) {w.grounded=false;w.vy=0;w.fallStart=w.y;}
      }
      const nx=w.x+w.dir*SPEED*h;
      if(wallAt(level,nx+w.dir*BODY_RADIUS,w.y)){
        w.dir*=-1;
      } else {
        w.x=nx;
      }
      if(w.grounded&&!supportAt(level,w.x,w.y)){
        w.grounded=false;w.vy=0;w.fallStart=w.y;
      }
      if(!w.grounded){
        const prevY=w.y;
        w.vy=Math.min(TERMINAL,w.vy+GRAVITY*h);
        const nextY=w.y+w.vy*h;
        const col=Math.floor(w.x);
        let landed=false;
        for(let row=Math.floor(prevY+0.001);row<=Math.floor(nextY+0.001);row++){
          if(row>=prevY-0.001&&isSolid(tileAt(level,col+0.01,row))&&nextY>=row){
            w.y=row;landed=true;break;
          }
        }
        if(landed){
          w.grounded=true;w.vy=0;
          if(w.y-w.fallStart>SAFE_FALL+0.001)return outcome(w,"fall");
        } else w.y=nextY;
      }
      if(hazardous(level,w.x,w.y))return outcome(w,"spikes");
      if(w.y>HEIGHT+1||w.x<-.4||w.x>WIDTH+.4)return outcome(w,"void");
      if(w.grounded&&Math.abs(w.x-level.exit.x)<0.43&&Math.abs(w.y-level.exit.y)<0.25){w.rescued=true;return"rescue";}
    }
    return null;
  }
  const API={TILE,WIDTH,HEIGHT,SPEED,GRAVITY,SAFE_FALL,BODY_HEIGHT,BODY_RADIUS,createGrid,makeLevel,tileAt,isSolid,supportAt,hazardous,walker,advance,put};
  root.GraphlingPhysics=API;
  if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(typeof globalThis!=="undefined"?globalThis:this);
