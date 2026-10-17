import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roles, roleById, rankProjects, isRelevantPart } from '../site/js/fit.js';
import { projects, timeline, billOfMaterials } from '../site/js/content.js';

const projectIds = new Set(projects.map((project) => project.id));
const timelineIds = new Set(timeline.entries.map((entry) => entry.id));
const partNames = new Set(billOfMaterials.flatMap((group) => group.parts.map((part) => part.part)));

test('there are four roles, each with a pitch and three pieces of evidence', () => {
  assert.equal(roles.length, 4);
  for (const role of roles) {
    assert.match(role.id, /^[a-z]+$/);
    assert.ok(role.label.length > 3);
    assert.ok(role.pitch.length > 40);
    assert.equal(role.evidence.length, 3);
    assert.ok(role.subject.length > 5);
  }
});

test('every project a role references exists in the content', () => {
  for (const role of roles) {
    assert.ok(role.projects.length >= 3, `${role.id} lists at least three projects`);
    for (const id of role.projects) assert.ok(projectIds.has(id), `${role.id} references unknown project ${id}`);
  }
});

test('every timeline span a role references exists in the content', () => {
  for (const role of roles) {
    assert.ok(role.timeline.length >= 1);
    for (const id of role.timeline) assert.ok(timelineIds.has(id), `${role.id} references unknown span ${id}`);
  }
});

test('every skill a role marks exists in the bill of materials', () => {
  for (const role of roles) {
    assert.ok(role.parts.length >= 3);
    for (const name of role.parts) assert.ok(partNames.has(name), `${role.id} references unknown part "${name}"`);
  }
});

test('roleById returns the role or null', () => {
  assert.equal(roleById('robotics').label, 'Robotics software');
  assert.equal(roleById('nope'), null);
  assert.equal(roleById(undefined), null);
});

test('rankProjects returns project objects in the role order and skips unknown ids', () => {
  const role = { ...roleById('embedded'), projects: ['uv-robot', 'missing', 'pipe-robot'] };
  const ranked = rankProjects(role, projects);
  assert.deepEqual(ranked.map((project) => project.id), ['uv-robot', 'pipe-robot']);
});

test('isRelevantPart is true only for parts the role lists', () => {
  const role = roleById('vision');
  assert.equal(isRelevantPart(role, 'YOLO detectors'), true);
  assert.equal(isRelevantPart(role, 'Schematics, PCB layout'), false);
  assert.equal(isRelevantPart(null, 'YOLO detectors'), false);
});
