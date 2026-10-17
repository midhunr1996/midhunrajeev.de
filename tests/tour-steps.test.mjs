import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tourSteps } from '../site/js/tour-steps.js';

const html = readFileSync(fileURLToPath(new URL('../site/index.html', import.meta.url)), 'utf8');

test('the tour has between five and eight stops, each with a short note', () => {
  assert.ok(tourSteps.length >= 5 && tourSteps.length <= 8);
  for (const step of tourSteps) {
    assert.ok(step.title.length > 3);
    assert.ok(step.text.length > 20 && step.text.length <= 220, `${step.target} note fits in a card`);
  }
});

test('every tour stop targets an element id that exists in index.html', () => {
  for (const step of tourSteps) {
    assert.ok(html.includes(`id="${step.target}"`), `index.html has an element with id "${step.target}"`);
  }
});

test('optional actions reference known projects or spans by id shape', () => {
  for (const step of tourSteps) {
    if (step.project) assert.match(step.project, /^[a-z0-9-]+$/);
    if (step.timeline) assert.match(step.timeline, /^[a-z]+$/);
  }
});
