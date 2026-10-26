import * as THREE from './assets/three.module.js';

// A small perspective renderer for devices where a WebGL context is unavailable.
// It projects the same meshes and camera, so orbiting, scrolling and lighting
// remain real three-dimensional interactions in the fallback experience.
export class SoftwareRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('Canvas rendering is unavailable.');
    this.isSoftwareRenderer = true;
    this.shadowMap = {};
    this.toneMappingExposure = 1;
    this.pixelRatio = 1;
    this.projection = new THREE.Matrix4();
    this.mvp = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();
    this.normalMatrix = new THREE.Matrix3();
    this.normal = new THREE.Vector3();
    this.edge1 = new THREE.Vector3();
    this.edge2 = new THREE.Vector3();
    this.light = new THREE.Vector3(-.3, .8, .5).normalize();
    this.color = new THREE.Color();
    this.cache = new WeakMap();
  }
  setPixelRatio(ratio) { this.pixelRatio = Math.min(ratio, 1.25); if (this.width) this.setSize(this.width, this.height); }
  setSize(width, height) {
    this.width = width; this.height = height;
    this.canvas.width = Math.round(width * this.pixelRatio);
    this.canvas.height = Math.round(height * this.pixelRatio);
    this.canvas.style.width = width + 'px'; this.canvas.style.height = height + 'px';
  }
  render(scene, camera) {
    const ctx = this.context, width = this.width, height = this.height;
    const ratio = this.pixelRatio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#' + scene.background.getHexString(); ctx.fillRect(0, 0, width, height);
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projection);
    const triangles = [], particles = [];
    const hw = width / 2, hh = height / 2;
    scene.traverse(object => {
      if (!object.visible) return;
      if (object.isPoints) {
        const position = object.geometry.attributes.position;
        this.mvp.multiplyMatrices(this.projection, object.matrixWorld);
        const e = this.mvp.elements;
        for (let i = 0; i < position.count; i++) {
          const x=position.getX(i), y=position.getY(i), z=position.getZ(i), w=e[3]*x+e[7]*y+e[11]*z+e[15];
          if(w<.1)continue;
          particles.push([(e[0]*x+e[4]*y+e[8]*z+e[12])/w*hw+hw,-(e[1]*x+e[5]*y+e[9]*z+e[13])/w*hh+hh,Math.max(.6,7/w)]);
        }
        return;
      }
      if (!object.isMesh || !this.frustum.intersectsObject(object)) return;
      const geometry=object.geometry, position=geometry.attributes.position;
      let projected=this.cache.get(geometry);
      if(!projected || projected.length!==position.count*4){projected=new Float32Array(position.count*4);this.cache.set(geometry,projected);}
      this.mvp.multiplyMatrices(this.projection,object.matrixWorld);
      this.normalMatrix.getNormalMatrix(object.matrixWorld);
      const e=this.mvp.elements;
      for(let i=0;i<position.count;i++){
        const x=position.getX(i),y=position.getY(i),z=position.getZ(i),w=e[3]*x+e[7]*y+e[11]*z+e[15],p=i*4;
        projected[p]=(e[0]*x+e[4]*y+e[8]*z+e[12])/w*hw+hw;
        projected[p+1]=-(e[1]*x+e[5]*y+e[9]*z+e[13])/w*hh+hh;
        projected[p+2]=(e[2]*x+e[6]*y+e[10]*z+e[14])/w;
        projected[p+3]=w;
      }
      const index=geometry.index, count=index?index.count:position.count;
      const material=Array.isArray(object.material)?object.material[0]:object.material;
      if(!material || !material.visible || material.opacity===0)return;
      for(let i=0;i<count;i+=3){
        const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;
        const a=ia*4,b=ib*4,c=ic*4;
        if(projected[a+3]<.1||projected[b+3]<.1||projected[c+3]<.1)continue;
        const ax=projected[a],ay=projected[a+1],bx=projected[b],by=projected[b+1],cx=projected[c],cy=projected[c+1];
        if((ax<0&&bx<0&&cx<0)||(ax>width&&bx>width&&cx>width)||(ay<0&&by<0&&cy<0)||(ay>height&&by>height&&cy>height))continue;
        const cross=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
        if(Math.abs(cross)<.03 || (cross>=0 && material.side!==THREE.DoubleSide))continue;
        this.edge1.set(position.getX(ib)-position.getX(ia),position.getY(ib)-position.getY(ia),position.getZ(ib)-position.getZ(ia));
        this.edge2.set(position.getX(ic)-position.getX(ia),position.getY(ic)-position.getY(ia),position.getZ(ic)-position.getZ(ia));
        this.normal.crossVectors(this.edge1,this.edge2).applyMatrix3(this.normalMatrix).normalize();
        const light=material.isMeshBasicMaterial?1:(.26+.58*Math.max(0,this.normal.dot(this.light)))*this.toneMappingExposure;
        this.color.copy(material.color||new THREE.Color('#fff')).multiplyScalar(light);
        if(material.emissive){const amount=(material.emissiveIntensity||1)*.5;this.color.r+=material.emissive.r*amount;this.color.g+=material.emissive.g*amount;this.color.b+=material.emissive.b*amount;}
        const color='#'+this.color.getHexString();
        const uv=geometry.attributes.uv;
        const image=material.map?.source?.data;
        const texture=image&&uv&&((image.width&&image.height)||image.naturalWidth)?{image,uv:[uv.getX(ia),1-uv.getY(ia),uv.getX(ib),1-uv.getY(ib),uv.getX(ic),1-uv.getY(ic)]}:null;
        triangles.push({p:[ax,ay,bx,by,cx,cy],z:(projected[a+2]+projected[b+2]+projected[c+2])/3,color,opacity:material.opacity,texture,light});
      }
    });
    triangles.sort((a,b)=>b.z-a.z);
    for(const face of triangles){
      const p=face.p;ctx.globalAlpha=face.opacity;
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.lineTo(p[4],p[5]);ctx.closePath();
      if(face.texture){
        this.drawTexture(face,ratio);
      }else{
        ctx.fillStyle=face.color;ctx.fill();
        if(face.opacity>.95){ctx.strokeStyle=face.color;ctx.lineWidth=.45;ctx.stroke();}
      }
    }
    ctx.globalAlpha=.35;ctx.fillStyle='#dcc8ed';
    for(const [x,y,r] of particles){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    const vignette=ctx.createRadialGradient(hw,hh,Math.min(width,height)*.12,hw,hh,Math.max(width,height)*.68);
    vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(7,3,15,.6)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  }
  drawTexture(face,ratio){
    const ctx=this.context,p=face.p,{image,uv}=face.texture;
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const u0=uv[0]*iw,v0=uv[1]*ih,u1=uv[2]*iw,v1=uv[3]*ih,u2=uv[4]*iw,v2=uv[5]*ih;
    const denominator=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(denominator)<.001)return;
    const a=(p[0]*(v1-v2)+p[2]*(v2-v0)+p[4]*(v0-v1))/denominator;
    const b=(p[1]*(v1-v2)+p[3]*(v2-v0)+p[5]*(v0-v1))/denominator;
    const c=(p[0]*(u2-u1)+p[2]*(u0-u2)+p[4]*(u1-u0))/denominator;
    const d=(p[1]*(u2-u1)+p[3]*(u0-u2)+p[5]*(u1-u0))/denominator;
    const e=(p[0]*(u1*v2-u2*v1)+p[2]*(u2*v0-u0*v2)+p[4]*(u0*v1-u1*v0))/denominator;
    const f=(p[1]*(u1*v2-u2*v1)+p[3]*(u2*v0-u0*v2)+p[5]*(u0*v1-u1*v0))/denominator;
    ctx.save();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
    if(face.light<.8){ctx.fillStyle=`rgba(14,5,25,${Math.min(.6,.8-face.light)})`;ctx.fill();}
  }
}
