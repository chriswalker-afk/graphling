/* Graphlings Pass A interactive world lab */
(() => {
"use strict";
const P=globalThis.GraphlingPhysics;
const canvas=document.getElementById("world"),ctx=canvas.getContext("2d");
const U=32,W=P.WIDTH*U,H=P.HEIGHT*U;
canvas.width=W;canvas.height=H;
const els={level:document.getElementById("level"),reset:document.getElementById("reset"),restore:document.getElementById("restore"),pause:document.getElementById("pause"),step:document.getElementById("step"),speed:document.getElementById("speed"),grid:document.getElementById("grid"),message:document.getElementById("message"),rescued:document.getElementById("rescued"),lost:document.getElementById("lost"),active:document.getElementById("active"),remaining:document.getElementById("remaining"),target:document.getElementById("target")};
let level,walkers,spawned,spawnClock,rescued,lost,paused=false,speed=1,elapsed=0,finished=false;
let brush="earth",painting=false,particles=[],squishes=[],last=performance.now(),accumulator=0;
const TILE_NAMES={empty:P.TILE.EMPTY,earth:P.TILE.EARTH,rock:P.TILE.ROCK,bridge:P.TILE.BRIDGE,spike:P.TILE.SPIKE};
const r=(a,b)=>a+Math.random()*(b-a);
function restart(){
 level=P.makeLevel(Number(els.level.value));walkers=[];spawned=0;spawnClock=.45;rescued=0;lost=0;elapsed=0;particles=[];squishes=[];finished=false;paused=false;accumulator=0;
 els.message.textContent="Watch the Graphlings explore the landscape.";sync();
}
function sync(){
 els.rescued.textContent=rescued;els.lost.textContent=lost;els.active.textContent=walkers.filter(w=>w.alive&&!w.rescued).length;
 els.remaining.textContent=level.count-spawned;els.target.textContent=level.target;els.pause.textContent=paused?"Play":"Pause";els.pause.setAttribute("aria-pressed",String(paused));
}
function setPaused(value){paused=value;sync();}
function particle(x,y,color,count=9){
 for(let i=0;i<count;i++)particles.push({x,y,vx:r(-2.3,2.3),vy:r(-4,-.7),life:r(.25,.75),max:.75,color});
}
function step(dt){
 if(finished)return;
 elapsed+=dt;spawnClock-=dt;
 if(spawned<level.count&&spawnClock<=0){walkers.push(P.walker(level.entrance.x+.2,level.entrance.y,spawned));spawned++;spawnClock+=1.25;}
 for(const w of walkers){
  const event=P.advance(level,w,dt);
  if(event==="rescue"){rescued++;particle(w.x,w.y-.4,"#6eba96",15);}
  else if(event){lost++;squishes.push({x:w.x,y:Math.min(w.y,P.HEIGHT-.5),t:0,reason:event});particle(w.x,w.y-.3,"#aec9ce",12);}
 }
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=10*dt;p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const s of squishes)s.t+=dt;
 squishes=squishes.filter(s=>s.t<.85);
 const active=walkers.some(w=>w.alive&&!w.rescued);
 if(spawned>=level.count&&!active){finished=true;paused=true;els.message.textContent=rescued>=level.target?"Target met! Nice navigation.":"No Graphlings remain. Edit the terrain and try again."; }
 sync();
}
function drawCloud(x,y,s){
 ctx.fillStyle="#e8f4f1";ctx.beginPath();ctx.ellipse(x,y,40*s,14*s,0,0,Math.PI*2);ctx.ellipse(x+17*s,y-9*s,21*s,16*s,0,0,Math.PI*2);ctx.ellipse(x-16*s,y-5*s,22*s,14*s,0,0,Math.PI*2);ctx.fill();
}
function drawTile(x,y,type) {
 const px=x*U,py=y*U;
 if(type===P.TILE.EARTH){
  ctx.fillStyle="#ae8767";ctx.fillRect(px,py,U,U);
  ctx.fillStyle="#9c765a";ctx.fillRect(px,py+5,U,U-5);
  ctx.fillStyle="#c79e73";ctx.fillRect(px+5,py+13,6,3);ctx.fillRect(px+21,py+24,5,3);
  if(!P.isSolid(P.tileAt(level,x+.1,y-.1))) {ctx.fillStyle="#86ad80";ctx.fillRect(px,py,U,5);ctx.fillStyle="#b1cb8b";ctx.fillRect(px,py,U,2);}
 }else if(type===P.TILE.ROCK){
  ctx.fillStyle="#637980";ctx.fillRect(px,py,U,U);
  ctx.strokeStyle="#86969b";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+3,py+13);ctx.lineTo(px+15,py+7);ctx.lineTo(px+29,py+14);ctx.moveTo(px+12,py+29);ctx.lineTo(px+22,py+18);ctx.stroke();
 }else if(type===P.TILE.BRIDGE){
  ctx.fillStyle="#9e653f";ctx.fillRect(px,py+3,U,8);ctx.fillStyle="#e0ae67";ctx.fillRect(px,py,U,5);
  ctx.strokeStyle="#694a34";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+6,py+1);ctx.lineTo(px+6,py+10);ctx.moveTo(px+25,py+1);ctx.lineTo(px+25,py+10);ctx.stroke();
 }else if(type===P.TILE.SPIKE){
  ctx.fillStyle="#bd4c46";ctx.fillRect(px,py+U-6,U,6);ctx.fillStyle="#d6dfe0";
  for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(px+k*11,py+U-6);ctx.lineTo(px+k*11+5.5,py+7);ctx.lineTo(px+k*11+11,py+U-6);ctx.fill();}
  ctx.fillStyle="#9a3234";ctx.fillRect(px,py+U-4,U,4);
 }
}
function drawCreature(w){
 const x=w.x*U,y=w.y*U,hop=w.grounded?Math.sin(elapsed*16+w.phase)*1.2:0;
 ctx.save();ctx.translate(x,y+hop);
 ctx.strokeStyle="#405b59";ctx.lineWidth=2.2;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(-6,-4);ctx.lineTo(-6,0);ctx.moveTo(5,-4);ctx.lineTo(6,0);ctx.stroke();
 ctx.fillStyle=["#84cfb4","#f0c17b","#92c8de","#cdb8ee"][w.id%4];
 ctx.beginPath();ctx.ellipse(0,-12,11,12,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#4d7b73";ctx.lineWidth=1.2;ctx.stroke();
 ctx.beginPath();ctx.moveTo(-6,-22);ctx.lineTo(-9,-28);ctx.moveTo(6,-22);ctx.lineTo(9,-28);ctx.stroke();
 ctx.fillStyle="#263a42";ctx.beginPath();ctx.arc(w.dir*4-3,-14,1.5,0,Math.PI*2);ctx.arc(w.dir*4+3,-14,1.5,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(w.dir*4,-9,2,0,Math.PI);ctx.stroke();
 ctx.restore();
}
function drawGateway(x,y,isExit){
 const cx=x*U,cy=y*U;
 ctx.save();ctx.translate(cx,cy);
 ctx.fillStyle=isExit?"#547e73":"#526d82";ctx.fillRect(-16,-55,32,55);
 ctx.fillStyle=isExit?"#d6f4ad":"#dbf2ed";ctx.beginPath();ctx.roundRect(-10,-47,20,47,[11,11,0,0]);ctx.fill();
 ctx.fillStyle=isExit?"#3f7b65":"#427c89";ctx.beginPath();ctx.roundRect(-7,-42,14,42,[8,8,0,0]);ctx.fill();
 ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(isExit?"EXIT":"IN",0,-62);ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#bfdedc");sky.addColorStop(1,"#e6ead4");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 drawCloud(120,100,1);drawCloud(550,83,.7);drawCloud(900,137,1.1);
 ctx.fillStyle="#a9c2b3";ctx.beginPath();ctx.moveTo(0,390);ctx.quadraticCurveTo(170,250,330,380);ctx.quadraticCurveTo(550,300,720,390);ctx.quadraticCurveTo(900,260,1120,390);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 ctx.fillStyle="#8cb6a3";ctx.beginPath();ctx.moveTo(0,440);ctx.quadraticCurveTo(200,350,400,445);ctx.quadraticCurveTo(700,350,880,430);ctx.quadraticCurveTo(980,395,W,440);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 for(let y=0;y<P.HEIGHT;y++)for(let x=0;x<P.WIDTH;x++){const type=level.grid[y][x];if(type!==P.TILE.EMPTY)drawTile(x,y,type);}
 if(els.grid.checked){
  ctx.strokeStyle="#356d7145";ctx.lineWidth=.65;
  for(let x=0;x<=P.WIDTH;x++){ctx.beginPath();ctx.moveTo(x*U,0);ctx.lineTo(x*U,H);ctx.stroke();}
  for(let y=0;y<=P.HEIGHT;y++){ctx.beginPath();ctx.moveTo(0,y*U);ctx.lineTo(W,y*U);ctx.stroke();}
  ctx.fillStyle="#286366";ctx.font="11px system-ui";ctx.fillText("(0,0)",level.entrance.x*U+10,level.entrance.y*U-7);
 }
 drawGateway(level.entrance.x,level.entrance.y,false);drawGateway(level.exit.x,level.exit.y,true);
 for(const w of walkers)if(w.alive&&!w.rescued)drawCreature(w);
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x*U,p.y*U,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 for(const s of squishes){
  const x=s.x*U,y=s.y*U;
  ctx.globalAlpha=Math.max(0,1-s.t/.85);ctx.fillStyle="#9cc1c8";
  ctx.beginPath();ctx.ellipse(x,y-3,Math.min(16,7+s.t*30),Math.max(2,7-s.t*6),0,0,Math.PI*2);ctx.fill();
  if(s.t<.5){ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.fillStyle="#4a656a";ctx.fillText("squish!",x,y-20-s.t*18);}
  ctx.globalAlpha=1;
 }
 if(paused){ctx.fillStyle="#172f3444";ctx.fillRect(0,0,W,35);ctx.fillStyle="#fff";ctx.textAlign="left";ctx.font="bold 15px system-ui";ctx.fillText(finished?"LEVEL COMPLETE":"PAUSED · EDIT THE TERRAIN",12,23);}
}
function loop(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(!paused){accumulator+=dt*speed;let frames=0;while(accumulator>=1/120&&frames<20){step(1/120);accumulator-=1/120;frames++;}}
 draw();requestAnimationFrame(loop);
}
function pointerCell(event){
 const rect=canvas.getBoundingClientRect();return{x:Math.floor((event.clientX-rect.left)/rect.width*P.WIDTH),y:Math.floor((event.clientY-rect.top)/rect.height*P.HEIGHT)};
}
function paint(event){
 if(!painting)return;
 const {x,y}=pointerCell(event);
 if(x<0||x>=P.WIDTH||y<0||y>=P.HEIGHT)return;
 if((Math.abs(x-level.entrance.x)<2&&y>=12&&y<=15)||(Math.abs(x-level.exit.x)<2&&y>=12&&y<=15))return;
 P.put(level.grid,x,y,TILE_NAMES[brush]);
}
canvas.addEventListener("pointerdown",e=>{painting=true;setPaused(true);canvas.setPointerCapture(e.pointerId);paint(e);});
canvas.addEventListener("pointermove",paint);
canvas.addEventListener("pointerup",()=>painting=false);
canvas.addEventListener("pointercancel",()=>painting=false);
els.reset.addEventListener("click",restart);els.restore.addEventListener("click",restart);els.level.addEventListener("change",restart);
els.pause.addEventListener("click",()=>setPaused(!paused));
els.step.addEventListener("click",()=>{setPaused(true);for(let i=0;i<12;i++)step(1/120);});
els.speed.addEventListener("change",()=>speed=Number(els.speed.value));
document.querySelectorAll('input[name="brush"]').forEach(e=>e.addEventListener("change",()=>{if(e.checked)brush=e.value;}));
document.addEventListener("keydown",e=>{if(e.code==="Space"&&!["SELECT","INPUT","BUTTON"].includes(document.activeElement.tagName)){e.preventDefault();setPaused(!paused);}});
restart();requestAnimationFrame(loop);
})();
