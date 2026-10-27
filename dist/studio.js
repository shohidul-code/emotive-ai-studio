import * as THREE from './assets/three.module.js';
import { SoftwareRenderer } from './software-renderer.js';

const canvas = document.querySelector('#studioCanvas');
const wrap = document.querySelector('#sceneWrap');
const body = document.body;

try {
  createStudio();
} catch (error) {
  body.dataset.renderer = 'fallback';
  canvas.hidden = true;
  console.warn('The 3D studio is unavailable on this device.', error.message);
}

function createStudio() {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  const renderer = gl ? new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: false }) : new SoftwareRenderer(canvas);
  const software = renderer.isSoftwareRenderer;
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 761 ? 1.25 : 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10091c');
  scene.fog = new THREE.Fog('#10091c', 19, 46);
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 90);
  const room = new THREE.Group();
  scene.add(room);
  const textureLoader = new THREE.TextureLoader();
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  let immersive = false;
  let lightMode = false;
  let progress = 0;
  let smoothedProgress = 0;
  let yaw = 0, targetYaw = 0, pitch = 0, targetPitch = 0, zoom = 0;
  const pointer = new THREE.Vector2();
  const softPointer = new THREE.Vector2();
  let dragging = false;
  let previousX = 0, previousY = 0;
  const materials = {};
  function mat(name, color, roughness = .65, metalness = .03) {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials[name] = material;
    return material;
  }
  const wallMat = mat('wall', '#291d37', .86);
  const panelMat = mat('panel', '#21152d', .8);
  const floorMat = mat('floor', '#21152f', .32, .18);
  const shelfMat = mat('shelf', '#38233e', .48, .08);
  const tableMat = mat('table', '#594352', .42, .06);
  const chairMat = mat('chair', '#463347', .68, .03);
  const legMat = mat('legs', '#17131d', .4, .6);
  const couchMat = mat('couch', '#403847', .65);
  const ceramicMat = mat('ceramic', '#a396ac', .6, .06);
  const darkCeramic = mat('darkCeramic', '#554267', .35, .22);
  const chromeMat = mat('chrome', '#81748f', .18, .85);
  const leafMat = mat('leaf', '#4b5b4c', .9);
  const brassMat = mat('brass', '#827057', .3, .7);
  const laptopMat = mat('laptop', '#777080', .28, .8);
  const blackMat = mat('black', '#121019', .3, .35);
  const bookColors = ['#615169','#a39a9b','#79677d','#4f465d','#a08d9d'];

  function mesh(geometry, material, parent = room) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, material, x, y, z, parent = room) {
    const object = mesh(new THREE.BoxGeometry(w, h, d), material, parent);
    object.position.set(x, y, z);
    return object;
  }
  function cylinder(rt, rb, h, material, x, y, z, parent = room, segments = 32) {
    const object = mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material, parent);
    object.position.set(x, y, z);
    return object;
  }
  function sphere(radius, material, x, y, z, parent = room) {
    const object = mesh(new THREE.SphereGeometry(radius, software ? 10 : 32, software ? 7 : 24), material, parent);
    object.position.set(x, y, z);
    return object;
  }
  function roundedShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function roundedBlock(w, h, d, r, material, parent = room) {
    const geometry = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth: d, bevelEnabled: !software, bevelThickness: .025, bevelSize: .025, bevelSegments: 3, curveSegments: software ? 3 : 12, steps: 1 });
    geometry.translate(0, 0, -d / 2);
    return mesh(geometry, material, parent);
  }

  // The architecture: a complete, shaded studio rather than a flat hero image.
  const floor = mesh(new THREE.PlaneGeometry(50, 45), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -.035, 2);
  floor.castShadow = false;
  const backWall=box(36, 8, .3, wallMat, 0, 4, -8.3);
  // Smaller wall faces keep the depth-sorted fallback behind wall artwork.
  if(software){backWall.geometry.dispose();backWall.geometry=new THREE.BoxGeometry(36,8,.3,24,8,1);}
  box(.3, 8, 24, wallMat, -15.5, 4, 2);
  box(.3, 8, 24, wallMat, 15.5, 4, 2);
  box(36, .2, 26, panelMat, 0, 7.7, 3);
  box(36, .13, .12, shelfMat, 0, .08, -8.1);
  for (let x = -14; x < 16; x += 2.8) box(.025, 7.5, .055, panelMat, x, 3.8, -8.1);
  for (let z = -7; z < 10; z += 1.15) box(32, .12, .075, panelMat, 0, 7.35, z);
  const stripMat = new THREE.MeshBasicMaterial({ color: '#be8cff' });
  box(9, .025, .035, stripMat, 3.5, 6.9, -7.8);

  // Rounded alcove and floating shelves, populated with individual objects.
  const alcoveShape = new THREE.Shape();
  alcoveShape.moveTo(-4.9, 0); alcoveShape.lineTo(4.9, 0); alcoveShape.lineTo(4.9, 2.65);
  alcoveShape.bezierCurveTo(4.9, 6, -4.9, 6, -4.9, 2.65); alcoveShape.lineTo(-4.9, 0);
  const alcove = mesh(new THREE.ExtrudeGeometry(alcoveShape, { depth: .08, bevelEnabled: false }), panelMat);
  alcove.position.set(-7.6, .2, -8.0);
  for (const [index, y] of [1.1, 2.3, 3.5].entries()) {
    const shelf = roundedBlock(index === 2 ? 8.3 : 9.8, .12, .95, .06, shelfMat);
    shelf.position.set(-7.6, y, -7.1);
  }

  function vase(x, y, z, scale, material = ceramicMat, parent = room) {
    const points = [[.0,0],[.22,0],[.25,.06],[.24,.38],[.14,.62],[.11,.68],[.11,.96],[.07,.97]].map(([a,b]) => new THREE.Vector2(a*scale,b*scale));
    const object = mesh(new THREE.LatheGeometry(points, software ? 12 : 32), material, parent);
    object.position.set(x,y,z);
    return object;
  }
  vase(-10.9, 2.38, -7.2, .7);
  vase(-5.5, 2.38, -7.1, .48, darkCeramic);
  vase(-8.4, 1.18, -7.0, .75, darkCeramic);
  sphere(.32, chromeMat, -6.5, 1.48, -7.0);
  const faceted = mesh(new THREE.IcosahedronGeometry(.33, 0), ceramicMat);
  faceted.position.set(-6.8,3.9,-7.1);
  const bubbles = new THREE.Group(); room.add(bubbles); bubbles.position.set(-10.5,3.68,-7.0);
  for(let x=0;x<3;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++) sphere(.095,ceramicMat,x*.18,y*.18,z*.18,bubbles);
  for(let i=0;i<5;i++) {
    const bookMat = new THREE.MeshStandardMaterial({ color: bookColors[i], roughness:.9 });
    const book = box(.18,.52+(i%3)*.08,.45,bookMat,-9.8+i*.2,1.42,-7.1);
    book.rotation.z = i === 4 ? -.18 : 0;
  }

  // Central meeting table, softly bevelled, with four substantial legs.
  const table = new THREE.Group(); room.add(table); table.position.set(.15,0,-1.25); table.rotation.y = -.12;
  const top = roundedBlock(5.1,2.45,.17,.3,tableMat,table);
  top.rotation.x = -Math.PI/2; top.position.y = 1.55;
  for(const x of [-1.65,1.65])for(const z of [-.63,.63]) cylinder(.24,.27,1.46,tableMat,x,.73,z,table);

  function chair(x,z,angle) {
    const group = new THREE.Group(); table.add(group); group.position.set(x,0,z); group.rotation.y=angle;
    const seat = roundedBlock(.63,.63,.13,.13,chairMat,group); seat.rotation.x=-Math.PI/2;seat.position.y=.79;
    const back = roundedBlock(.64,.71,.13,.14,chairMat,group);back.position.set(0,1.16,.28);back.rotation.x=-.12;
    for(const lx of [-.23,.23])for(const lz of [-.23,.23]){
      const leg=cylinder(.018,.026,.75,legMat,lx,.38,lz,group,10);leg.rotation.z=lx*.12;leg.rotation.x=-lz*.12;
    }
    return group;
  }
  chair(-1.5,1.8,0);chair(.1,1.8,0);chair(1.65,1.8,0);
  chair(-1.5,-1.75,Math.PI);chair(.1,-1.75,Math.PI);chair(1.65,-1.75,Math.PI);

  const laptop = new THREE.Group(); table.add(laptop);laptop.position.set(-1.35,1.66,-.1);laptop.rotation.y=.28;
  box(.93,.04,.66,laptopMat,0,.015,0,laptop);
  box(.76,.005,.35,blackMat,0,.04,-.02,laptop);
  box(.28,.006,.17,laptopMat,0,.043,.22,laptop);
  const screenHinge = new THREE.Group();laptop.add(screenHinge);screenHinge.position.set(0,.04,-.3);screenHinge.rotation.x=-.15;
  const screenBody=roundedBlock(.93,.62,.035,.035,laptopMat,screenHinge);screenBody.position.y=.31;
  const screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=320;
  const ctx=screenCanvas.getContext('2d');
  const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
  const screenMaterial=new THREE.MeshBasicMaterial({map:screenTexture});
  const screen=mesh(new THREE.PlaneGeometry(.85,.54),screenMaterial,screenHinge);screen.position.set(0,.31,.022);
  const screenNodes=Array.from({length:17},(_,i)=>({x:40+(i*91)%430,y:75+(i*53)%205}));
  function drawScreen(t) {
    const gradient=ctx.createLinearGradient(0,0,512,320);gradient.addColorStop(0,'#120b25');gradient.addColorStop(1,'#5f2595');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,320);ctx.fillStyle='#e5d8f5';ctx.font='15px monospace';ctx.fillText('EMOTIVE / INTELLIGENCE',24,32);
    for(let i=0;i<screenNodes.length;i++){
      const n=screenNodes[i];ctx.strokeStyle='rgba(195,145,255,.25)';ctx.lineWidth=1;
      for(let j=i+1;j<screenNodes.length;j++)if(Math.hypot(n.x-screenNodes[j].x,n.y-screenNodes[j].y)<125){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(screenNodes[j].x,screenNodes[j].y);ctx.stroke();}
      const r=2.3+Math.sin(t+i)*1.2;ctx.fillStyle=i%4===0?'#fff':'#b875ff';ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#bda0d8';ctx.font='10px monospace';ctx.fillText('A HUMAN TOUCH.',24,300);screenTexture.needsUpdate=true;
  }
  drawScreen(0);
  const tableBubbles = new THREE.Group();table.add(tableBubbles);tableBubbles.position.set(.4,1.7,-.3);
  for(let x=0;x<3;x++)for(let y=0;y<3;y++)for(let z=0;z<2;z++)sphere(.073,ceramicMat,x*.14,y*.14,z*.14,tableBubbles);
  vase(1.4,1.66,-.25,.52,darkCeramic,table);
  for(let i=0;i<5;i++) {
    const stem=cylinder(.007,.007,.62,leafMat,1.4+(i-2)*.02,2.27,-.25+(i%2)*.035,table,6);
    stem.rotation.z=(i-2)*.12;
    const leaf=mesh(new THREE.SphereGeometry(.1,12,8),leafMat,table);leaf.scale.set(.4,1.5,.15);leaf.position.set(1.4+(i-2)*.09,2.45+Math.sin(i)*.12,-.25);leaf.rotation.z=(i-2)*.5;
  }
  cylinder(.11,.09,.18,ceramicMat,-.7,1.75,.6,table);
  const cupHandle=mesh(new THREE.TorusGeometry(.067,.018,8,16),ceramicMat,table);cupHandle.position.set(-.57,1.77,.6);

  // Lounge and sculptural AI letters give the room a second focal point.
  const couch = new THREE.Group();room.add(couch);couch.position.set(7.8,0,-6.2);
  for(let i=0;i<3;i++) {
    const cushion=roundedBlock(1.08,.9,.28,.15,couchMat,couch);cushion.rotation.x=-Math.PI/2;cushion.position.set((i-1)*1.1,.55,0);
    const back=roundedBlock(1.08,.69,.25,.14,couchMat,couch);back.position.set((i-1)*1.1,.95,-.43);back.rotation.x=.08;
  }
  for(const x of [-1.85,1.85]) {const arm=roundedBlock(.3,.62,.96,.14,couchMat,couch);arm.position.set(x,.8,0);}
  for(const x of [-1.5,1.5])for(const z of [-.3,.3])cylinder(.025,.025,.4,legMat,x,.2,z,couch,12);

  const sculpture = new THREE.Group();room.add(sculpture);sculpture.position.set(4.0,.15,-6.5);sculpture.rotation.y=-.25;
  const aShape = new THREE.Shape();aShape.moveTo(-.6,0);aShape.lineTo(-.17,1.35);aShape.lineTo(.17,1.35);aShape.lineTo(.65,0);aShape.lineTo(.3,0);aShape.lineTo(.19,.36);aShape.lineTo(-.18,.36);aShape.lineTo(-.29,0);aShape.closePath();
  const hole = new THREE.Path();hole.moveTo(-.12,.6);hole.lineTo(.12,.6);hole.lineTo(0,1.01);hole.closePath();aShape.holes.push(hole);
  mesh(new THREE.ExtrudeGeometry(aShape,{depth:.23,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025}),chromeMat,sculpture);
  box(.22,1.3,.23,chromeMat,1.0,.67,.12,sculpture);
  const arch=mesh(new THREE.TorusGeometry(.65,.19,24,64,Math.PI),darkCeramic);arch.position.set(1.65,.2,-5.8);
  const orbMaterial=new THREE.MeshStandardMaterial({color:'#9b6ac2',metalness:.65,roughness:.22,emissive:'#4a126f',emissiveIntensity:.15});
  const orb=sphere(.61,orbMaterial,2.9,.79,-6.2);
  const orbRing=mesh(new THREE.TorusGeometry(.85,.012,8,80),brassMat);orbRing.position.copy(orb.position);orbRing.rotation.set(.3,.6,.1);
  const lowTable=cylinder(.6,.6,.09,shelfMat,6.7,.45,-3.8);cylinder(.055,.12,.4,legMat,6.7,.2,-3.8);
  vase(6.7,.51,-3.8,.43,ceramicMat);

  // Hang the founder portrait above the AI sculpture on the right wall.
  box(4.65,3.18,.1,blackMat,4.5,4.3,-8.0);
  const photoMat=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false});
  const photo=mesh(new THREE.PlaneGeometry(4.4,2.93),photoMat);photo.position.set(4.5,4.3,-7.94);
  textureLoader.load('/assets/portrait-presence.png', texture=>{texture.colorSpace=THREE.SRGBColorSpace;photoMat.map=texture;photoMat.needsUpdate=true;});
  const posterCanvas=document.createElement('canvas');posterCanvas.width=320;posterCanvas.height=480;const posterCtx=posterCanvas.getContext('2d');
  posterCtx.fillStyle='#c7b4da';posterCtx.fillRect(0,0,320,480);posterCtx.fillStyle='#39214f';posterCtx.font='70px Georgia';posterCtx.fillText('what',28,150);posterCtx.font='italic 115px Georgia';posterCtx.fillText('if?',36,275);posterCtx.font='13px monospace';posterCtx.fillText('THINK LIKE A HUMAN.',28,410);
  const posterTexture=new THREE.CanvasTexture(posterCanvas);posterTexture.colorSpace=THREE.SRGBColorSpace;
  box(1.15,1.65,.07,brassMat,11.15,3.35,-8.0);
  const poster=mesh(new THREE.PlaneGeometry(1.05,1.55),new THREE.MeshStandardMaterial({map:posterTexture,roughness:.9}));poster.position.set(11.15,3.35,-7.95);

  const wallLogoCanvas=document.createElement('canvas');wallLogoCanvas.width=1024;wallLogoCanvas.height=384;const logoCtx=wallLogoCanvas.getContext('2d');
  logoCtx.clearRect(0,0,1024,384);logoCtx.font='184px Georgia';logoCtx.textBaseline='middle';
  const wordmarkLeft=(1024-logoCtx.measureText('əmotive').width)/2;
  logoCtx.fillStyle='#eee2ff';logoCtx.fillText('əmoti',wordmarkLeft,200);
  logoCtx.fillStyle='#a86bff';logoCtx.fillText('ve',wordmarkLeft+logoCtx.measureText('əmoti').width,200);
  const logoTexture=new THREE.CanvasTexture(wallLogoCanvas);logoTexture.colorSpace=THREE.SRGBColorSpace;
  const logo=mesh(new THREE.PlaneGeometry(4.4,1.65),new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,toneMapped:false}));logo.position.set(.5,4.5,-7.7);

  const ambient = new THREE.HemisphereLight('#ceb8f1','#251130',1.25);scene.add(ambient);
  const key = new THREE.DirectionalLight('#dfcdf2',2.6);key.position.set(-2,8,6);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.normalBias=.035;key.shadow.bias=-.0002;scene.add(key);
  const purpleLight=new THREE.PointLight('#a54dff',50,20,2);purpleLight.position.set(4.2,4.5,-4.5);scene.add(purpleLight);
  const tableLight=new THREE.PointLight('#c79ac9',28,13,2);tableLight.position.set(-.5,5,-.5);scene.add(tableLight);
  const shelfLight=new THREE.PointLight('#a57bcc',18,12,2);shelfLight.position.set(-7,4.5,-4);scene.add(shelfLight);
  const backLight=new THREE.PointLight('#7949bc',17,15,2);backLight.position.set(10,3,-4);scene.add(backLight);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=256;glowCanvas.height=128;
  const glowCtx=glowCanvas.getContext('2d');const glowGradient=glowCtx.createRadialGradient(128,64,0,128,64,125);glowGradient.addColorStop(0,'rgba(169,103,255,.75)');glowGradient.addColorStop(1,'rgba(169,103,255,0)');glowCtx.fillStyle=glowGradient;glowCtx.fillRect(0,0,256,128);
  const glowMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,opacity:.18,depthWrite:false});
  const glow=mesh(new THREE.PlaneGeometry(14,3),glowMat);glow.position.set(2,6.3,-8.05);glow.castShadow=false;glow.receiveShadow=false;

  const dustPositions=new Float32Array(75*3);
  for(let i=0;i<75;i++){dustPositions[i*3]=Math.sin(i*128.37)*14;dustPositions[i*3+1]=.6+((i*1.79)%5);dustPositions[i*3+2]=-7+((i*3.21)%13);}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#d1b2ed',size:.017,transparent:true,opacity:.35,sizeAttenuation:true,depthWrite:false}));scene.add(dust);

  const positions=[new THREE.Vector3(0,3.8,13.6),new THREE.Vector3(-4.5,3.1,9.3),new THREE.Vector3(5.2,3.2,10.2),new THREE.Vector3(.8,2.8,7.5),new THREE.Vector3(.8,2.8,7.5)];
  const targets=[new THREE.Vector3(0,1.75,-3.2),new THREE.Vector3(-4.2,2.0,-5.6),new THREE.Vector3(1.5,1.6,-3.5),new THREE.Vector3(3.7,1.9,-6.5),new THREE.Vector3(3.7,1.9,-6.5)];
  const desiredPosition=new THREE.Vector3();const desiredTarget=new THREE.Vector3();const currentTarget=new THREE.Vector3().copy(targets[0]);
  camera.position.copy(positions[0]);
  const raycaster=new THREE.Raycaster();
  const clock=new THREE.Clock();
  let frameCount=0,lastFrame=0,lastScreen=0;

  window.addEventListener('pointermove', event=>{
    pointer.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);
    if(dragging && immersive){targetYaw-= (event.clientX-previousX)*.004;targetPitch+=(event.clientY-previousY)*.0025;targetYaw=THREE.MathUtils.clamp(targetYaw,-1.1,1.1);targetPitch=THREE.MathUtils.clamp(targetPitch,-.3,.35);}
    previousX=event.clientX;previousY=event.clientY;
    const hint=document.querySelector('#cursorHint');
    if(immersive && event.pointerType==='mouse' && !event.target.closest('button,a')){hint.style.left=event.clientX+'px';hint.style.top=event.clientY+'px';hint.style.opacity='.75';}else hint.style.opacity='0';
  },{passive:true});
  window.addEventListener('pointerdown',event=>{
    if(!immersive || event.target.closest('button,a,input,select'))return;
    dragging=true;previousX=event.clientX;previousY=event.clientY;
  });
  window.addEventListener('pointerup',()=>{dragging=false;});
  window.addEventListener('pointercancel',()=>{dragging=false;});
  window.addEventListener('wheel',event=>{
    if(!immersive)return;event.preventDefault();zoom=THREE.MathUtils.clamp(zoom+event.deltaY*.005,-3,4);
  },{passive:false});
  window.addEventListener('keydown',event=>{
    if(!immersive)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();
    if(event.key==='ArrowLeft')targetYaw-=.12;if(event.key==='ArrowRight')targetYaw+=.12;if(event.key==='ArrowUp')targetPitch-=.07;if(event.key==='ArrowDown')targetPitch+=.07;
    targetYaw=THREE.MathUtils.clamp(targetYaw,-1.1,1.1);targetPitch=THREE.MathUtils.clamp(targetPitch,-.3,.35);
  });
  document.addEventListener('studio:scroll',event=>{progress=event.detail.progress;visible=event.detail.visible;});
  document.addEventListener('studio:motion',event=>{motion=event.detail;});
  document.addEventListener('studio:immersive',event=>{immersive=event.detail;visible=true;if(immersive){progress=0;smoothedProgress=0;}});
  document.addEventListener('studio:reset',()=>{targetYaw=0;targetPitch=0;zoom=0;});
  document.addEventListener('studio:quality',event=>{
    renderer.setPixelRatio(event.detail==='eco'?1:Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=event.detail!=='eco';
    wrap.dataset.quality=event.detail;
  });
  document.addEventListener('studio:theme',event=>{
    lightMode=event.detail;
    scene.background.set(lightMode?'#c5b6d3':'#10091c');scene.fog.color.set(lightMode?'#c5b6d3':'#10091c');
    wallMat.color.set(lightMode?'#b4a1c4':'#291d37');panelMat.color.set(lightMode?'#a88ebc':'#21152d');floorMat.color.set(lightMode?'#a996ba':'#21152f');
    shelfMat.color.set(lightMode?'#9b7fa9':'#38233e');tableMat.color.set(lightMode?'#ae98ac':'#594352');chairMat.color.set(lightMode?'#827189':'#463347');couchMat.color.set(lightMode?'#c0b0cc':'#403847');
    ambient.intensity=lightMode?2:1.25;key.intensity=lightMode?3.6:2.6;purpleLight.intensity=lightMode?18:50;
    renderer.toneMappingExposure=lightMode?1.2:1.05;
  });
  function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<761?56:48;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  window.addEventListener('resize',resize,{passive:true});resize();

  function render(time){
    requestAnimationFrame(render);
    if(document.hidden || body.classList.contains('awaiting-entry') || (!visible&&!immersive))return;
    const eco=wrap.dataset.quality==='eco' || (innerWidth<761 && !wrap.dataset.quality);
    if((eco || software) && time-lastFrame<(software ? 40 : 31))return;
    const delta=Math.min((time-lastFrame)/1000,.06)||.016;lastFrame=time;
    const t=clock.getElapsedTime();
    smoothedProgress=THREE.MathUtils.lerp(smoothedProgress,immersive?0:progress,1-Math.exp(-delta*3.4));
    const index=Math.min(3,Math.floor(smoothedProgress));const fraction=THREE.MathUtils.smoothstep(smoothedProgress-index,0,1);
    desiredPosition.lerpVectors(positions[index],positions[index+1],fraction);desiredTarget.lerpVectors(targets[index],targets[index+1],fraction);
    softPointer.lerp(pointer,motion?.035:1);
    yaw=THREE.MathUtils.lerp(yaw,immersive?targetYaw:0,.06);pitch=THREE.MathUtils.lerp(pitch,immersive?targetPitch:0,.06);
    if(innerWidth<761){desiredPosition.z+=3;desiredPosition.x*=.5;desiredTarget.x=desiredTarget.x*.45+1.4*Math.max(0,1-smoothedProgress);}
    if(motion && !immersive){desiredPosition.x+=softPointer.x*.5;desiredPosition.y+=softPointer.y*.17;}
    if(immersive){
      const radius=13.6+zoom;desiredPosition.set(Math.sin(yaw)*radius,3.8+pitch*7,Math.cos(yaw)*radius);desiredTarget.set(Math.sin(yaw)*2,1.75+pitch*2,-3.2);
    }
    const smoothing=motion||immersive?1-Math.exp(-delta*5):1;camera.position.lerp(desiredPosition,smoothing);currentTarget.lerp(desiredTarget,smoothing);camera.lookAt(currentTarget);
    if(motion){orbRing.rotation.y=t*.18;orb.position.y=.79+Math.sin(t*.65)*.035;dust.rotation.y=Math.sin(t*.025)*.03;}
    raycaster.setFromCamera(pointer,camera);const hovered=immersive&&raycaster.intersectObject(orb).length>0;orbMaterial.emissiveIntensity=hovered?.6:.15;
    if(motion && time-lastScreen>130){drawScreen(t);lastScreen=time;}
    const renderStart=performance.now();renderer.render(scene,camera);frameCount++;
    if(frameCount===1){wrap.dataset.ready='true';body.dataset.renderer=software?'software':'webgl';}
    if(frameCount%5===0){canvas.dataset.frames=String(frameCount);canvas.dataset.renderMs=(performance.now()-renderStart).toFixed(1);canvas.dataset.view=`${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;}
  }
  requestAnimationFrame(render);
}
