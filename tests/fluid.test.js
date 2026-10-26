import test from 'node:test';
import assert from 'node:assert/strict';
import { FluidField } from '../dist/fluid-solver.js';

test('resting fluid remains still and transparent', () => {
  const fluid = new FluidField(48,32);
  for(let i=0;i<10;i++) assert.equal(fluid.step(1/60),0);
  assert.ok(fluid.u.every(value=>value===0));
});
test('pointer gestures transport dye, remain finite and fade out', () => {
  const fluid = new FluidField(64,40);
  fluid.splat(.4,.5,.03,.01,.6);
  const before=fluid.dye.slice();
  for(let i=0;i<30;i++) fluid.step(1/60);
  assert.ok(fluid.dye.some((value,index)=>Math.abs(value-before[index])>.01));
  for(let i=0;i<450;i++) fluid.step(1/60);
  assert.ok(Math.max(...fluid.dye)<.002);
  for(const field of [fluid.dye,fluid.u,fluid.v,fluid.tint]) assert.ok(field.every(Number.isFinite));
});
test('rapid gestures at every edge never overflow the simulation', () => {
  const fluid=new FluidField(48,32);
  for(let i=0;i<100;i++) {
    fluid.splat(i%2,(i%3)/2,i%2?100:-100,i%3?100:-100,.5);
    fluid.step(.5);
  }
  for(const field of [fluid.dye,fluid.u,fluid.v,fluid.tint]) assert.ok(field.every(Number.isFinite));
  fluid.clear(); assert.ok(fluid.dye.every(value=>value===0));
});
