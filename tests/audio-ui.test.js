import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('nasheed can play without a visible player panel or native audio controls', async () => {
  const page=await readFile('dist/index.html','utf8');
  assert.doesNotMatch(page, /id="nasheedPlayer"/);
  const element=page.match(/<audio\b[^>]*id="nasheedAudio"[^>]*>/)?.[0];
  assert.ok(element, 'background audio exists');
  assert.doesNotMatch(element, /\bcontrols\b/);
  assert.match(element, /\bloop\b/);
  assert.match(page, /id="soundToggle"/);
  assert.match(page, /id="settingsSound"/);
});
