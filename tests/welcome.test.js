import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWelcome } from '../dist/welcome.js';

function screen() {
  const dialog = new EventTarget();
  dialog.open = true;
  dialog.close = () => { dialog.open = false; };
  dialog.showModal = () => { dialog.open = true; };
  const audioButton = new EventTarget(), silentButton = new EventTarget();
  const choices = [];
  mountWelcome({dialog, audioButton, silentButton, onChoice: audio => choices.push(audio)});
  return {dialog, audioButton, silentButton, choices};
}
test('the welcome screen waits for an explicit choice', () => {
  const {dialog, choices} = screen();
  assert.equal(dialog.open, true);
  assert.deepEqual(choices, []);
  const escape = new Event('cancel', {cancelable:true});
  dialog.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(dialog.open, true);
});
test('audio entry closes the welcome screen and requests playback synchronously', () => {
  const {dialog, audioButton, choices} = screen();
  audioButton.dispatchEvent(new Event('click'));
  assert.deepEqual(choices, [true]);
  assert.equal(dialog.open, false);
});
test('silent entry never requests audio and cannot be changed by a second welcome click', () => {
  const {dialog, audioButton, silentButton, choices} = screen();
  silentButton.dispatchEvent(new Event('click'));
  audioButton.dispatchEvent(new Event('click'));
  assert.deepEqual(choices, [false]);
  assert.equal(dialog.open, false);
});
test('Escape is blocked at keydown even if a browser close request cannot be cancelled', () => {
  const {dialog, choices} = screen();
  const key = new Event('keydown', {cancelable:true});
  Object.defineProperty(key, 'key', {value:'Escape'});
  dialog.dispatchEvent(key);
  assert.equal(key.defaultPrevented, true);
  assert.equal(dialog.open, true);
  assert.deepEqual(choices, []);
});
