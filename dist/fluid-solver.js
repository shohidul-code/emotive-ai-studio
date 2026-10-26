/** Bounded, incompressible 2D dye field. No dependencies or GPU requirement. */
export class FluidField {
  constructor(width, height) {
    this.width = width; this.height = height;
    const n = width * height;
    for (const key of ['u','v','u0','v0','dye','dye0','tint','tint0','pressure','nextPressure','divergence','curl']) this[key] = new Float32Array(n);
  }
  clear() {
    for (const value of Object.values(this)) if (value instanceof Float32Array) value.fill(0);
  }
  sample(field, x, y) {
    const w = this.width;
    x = Math.max(0, Math.min(w - 1.001, x)); y = Math.max(0, Math.min(this.height - 1.001, y));
    const ix = Math.floor(x), iy = Math.floor(y), a = x - ix, b = y - iy, i = ix + iy * w;
    return (field[i] * (1-a) + field[i+1] * a) * (1-b) + (field[i+w] * (1-a) + field[i+w+1] * a) * b;
  }
  splat(x, y, dx, dy, hue = .5) {
    const w = this.width, h = this.height, radius = 3.4;
    x *= w; y *= h;
    dx = Math.max(-90, Math.min(90, dx * w)); dy = Math.max(-90, Math.min(90, dy * h));
    for (let py = Math.max(1, Math.floor(y-9)); py < Math.min(h-1,y+9); py++) {
      for (let px = Math.max(1, Math.floor(x-9)); px < Math.min(w-1,x+9); px++) {
        const i = px + py*w, rx = px-x, ry = py-y;
        const g = Math.exp(-(rx*rx+ry*ry)/(radius*radius));
        // Counter-rotating eddies keep slow gestures as expressive as fast ones.
        this.u[i] += g * (dx * 6 - ry * 2.5);
        this.v[i] += g * (dy * 6 + rx * 2.5);
        const added = g * .7, total = this.dye[i] + added;
        this.tint[i] = (this.tint[i]*this.dye[i] + hue*added) / Math.max(total,.001);
        this.dye[i] = Math.min(2, total);
      }
    }
  }
  step(dt, iterations = 10) {
    dt = Math.min(.035, Math.max(.001, dt));
    const {width:w,height:h,u,v,u0,v0,dye,dye0,tint,tint0,curl,divergence} = this;
    u0.set(u); v0.set(v);
    for (let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=x+y*w, sx=x-dt*u0[i], sy=y-dt*v0[i];
      u[i]=this.sample(u0,sx,sy)*Math.exp(-dt*1.4);
      v[i]=this.sample(v0,sx,sy)*Math.exp(-dt*1.4);
    }
    for (let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=x+y*w; curl[i]=.5*(v[i+1]-v[i-1]-u[i+w]+u[i-w]);
    }
    for (let y=2;y<h-2;y++) for(let x=2;x<w-2;x++) {
      const i=x+y*w, cx=Math.abs(curl[i+1])-Math.abs(curl[i-1]), cy=Math.abs(curl[i+w])-Math.abs(curl[i-w]);
      const len=Math.hypot(cx,cy)+.0001, force=dt*8*curl[i];
      u[i]=Math.max(-180,Math.min(180,u[i]+cy/len*force));
      v[i]=Math.max(-180,Math.min(180,v[i]-cx/len*force));
    }
    for (let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=x+y*w; divergence[i]=.5*(u[i+1]-u[i-1]+v[i+w]-v[i-w]);
    }
    this.pressure.fill(0); this.nextPressure.fill(0);
    for(let k=0;k<iterations;k++) {
      const p=this.pressure, q=this.nextPressure;
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
        const i=x+y*w; q[i]=(p[i-1]+p[i+1]+p[i-w]+p[i+w]-divergence[i])*.25;
      }
      this.pressure=q; this.nextPressure=p;
    }
    const p=this.pressure;
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=x+y*w; u[i]-=.5*(p[i+1]-p[i-1]); v[i]-=.5*(p[i+w]-p[i-w]);
    }
    dye0.set(dye); tint0.set(tint);
    const decay=Math.exp(-dt*1.55);
    let peak=0;
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=x+y*w,sx=x-dt*u[i],sy=y-dt*v[i];
      dye[i]=this.sample(dye0,sx,sy)*decay;
      tint[i]=this.sample(tint0,sx,sy);
      peak=Math.max(peak,dye[i]);
    }
    return peak;
  }
}
