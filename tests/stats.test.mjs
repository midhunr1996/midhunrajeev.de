import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../site/js/stats.js';
import { projects, profile } from '../site/js/content.js';

const byId = (stats, id) => stats.find((stat) => stat.id === id);

test('computeStats returns four figures with integer values and labels', () => {
  const stats = computeStats({ projects, profile });
  assert.equal(stats.length, 4);
  for (const stat of stats) {
    assert.ok(Number.isInteger(stat.value), `${stat.id} is an integer`);
    assert.ok(stat.label.length > 3);
  }
});

test('the project count comes from the content, not a constant', () => {
  const stats = computeStats({ projects: projects.slice(0, 3), profile });
  assert.equal(byId(stats, 'projects').value, 3);
});

test('the hardware count is the number of robotics and embedded projects', () => {
  const stats = computeStats({ projects, profile });
  assert.equal(byId(stats, 'hardware').value, projects.filter((project) => project.group === 'robotics').length);
});

test('years and the calibration cut come from the profile', () => {
  const stats = computeStats({ projects, profile: { ...profile, yearsHandsOn: 7, calibrationCut: 60 } });
  assert.equal(byId(stats, 'years').value, 7);
  assert.equal(byId(stats, 'years').suffix, '+');
  assert.equal(byId(stats, 'calibration').value, 60);
  assert.equal(byId(stats, 'calibration').suffix, '%');
});
