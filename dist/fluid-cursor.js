import { FluidField } from './fluid-solver.js';

const canvas = document.querySelector('#fluidCanvas');
const toggle = document.querySelector('#fluidToggle');
const context = canvas.getContext('2d', { alpha: true });
const finePointer = matchMedia('(any-pointer: fine)');
let enabled = true, motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let eco = innerWidth < 761, field, pixels, frame = 0, lastTime = 0;
let lastPoint = null, queue = [], frameCount = 0;

function available() { return context && enabled && motion && !document.hidden; }
function stop() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0; lastPoint = null; queue = [];
  field?.clear(); context?.clearRect(0,0,canvas.width,canvas.height);
  canvas.dataset.active = 'false';
}
function resize() {
  stop();
  const size = eco ? 96 : 144;
  const aspect = innerWidth / Math.max(innerHeight,1);
  canvas.width = Math.round(aspect >= 1 ? size : size * aspect);
  canvas.height = Math.round(aspect >= 1 ? size / aspect : size);
  canvas.width = Math.max(32,canvas.width); canvas.height = Math.max(32,canvas.height);
  field = new FluidField(canvas.width,canvas.height);
  pixels = context?.createImageData(canvas.width,canvas.height);
}
function draw(time) {
  frame = 0;
  if (!available()) { stop(); return; }
  const interval = eco ? 1000/30 : 1000/60;
  if (lastTime && time-lastTime < interval-1) { frame=requestAnimationFrame(draw); return; }
  const dt=lastTime ? (time-lastTime)/1000 : 1/60; lastTime=time;
  const started=performance.now();
  for(const point of queue) field.splat(...point);
  queue=[];
  const peak=field.step(dt,eco ? 6 : 10);
  const rgba=pixels.data;
  for(let i=0;i<field.dye.length;i++) {
    const k=i*4, color=field.tint[i];
    rgba[k]=162-90*color; rgba[k+1]=104+90*color; rgba[k+2]=250;
    rgba[k+3]=Math.round(Math.min(.64,field.dye[i]*.42)*255);
  }
  context.putImageData(pixels,0,0);
  canvas.dataset.active='true';
  if (++frameCount%15===0) {
    canvas.dataset.frames=String(frameCount); canvas.dataset.renderMs=(performance.now()-started).toFixed(1);
  }
  if (peak<.006) { stop(); return; }
  frame=requestAnimationFrame(draw);
}
function start() { if(!frame&&available()) { frame=requestAnimationFrame(draw); } }
function move(event) {
  if (!available() || (event.pointerType==='mouse'&&!finePointer.matches)) return;
  const x=event.clientX/innerWidth,y=event.clientY/innerHeight,time=performance.now();
  const previous=lastPoint && time-lastPoint.time<180 ? lastPoint : {x,y};
  const dx=x-previous.x,dy=y-previous.y;
  const steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(dx*field.width,dy*field.height)/2)));
  const hue=(Math.sin(time*.0003)+1)*.5;
  for(let i=1;i<=steps;i++) queue.push([previous.x+dx*i/steps,previous.y+dy*i/steps,dx/steps,dy/steps,hue]);
  if(queue.length>32) queue=queue.slice(-32);
  lastPoint={x,y,time}; start();
}
resize();
if(!context) { toggle.disabled=true; toggle.setAttribute('aria-checked','false'); }
window.addEventListener('pointermove',move,{passive:true});
window.addEventListener('pointerdown',move,{passive:true});
window.addEventListener('pointerout',event=>{if(!event.relatedTarget)lastPoint=null;},{passive:true});
window.addEventListener('pointercancel',()=>{lastPoint=null;},{passive:true});
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
document.addEventListener('studio:motion',event=>{
  motion=event.detail; toggle.disabled=!motion || !context;
  toggle.setAttribute('aria-checked',String(enabled&&motion&&!!context));
  if(!motion)stop();
});
document.addEventListener('studio:quality',event=>{eco=event.detail==='eco';resize();});
toggle.addEventListener('click',()=>{
  enabled=!enabled; toggle.setAttribute('aria-checked',String(enabled));
  if(!enabled)stop();
});
toggle.disabled=!motion || !context;
toggle.setAttribute('aria-checked',String(enabled&&motion&&!!context));
