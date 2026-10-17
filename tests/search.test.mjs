import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalise, projectMatches } from '../site/js/search.js';

const project = {
  title: 'TurtleBot3 person follower',
  summary: 'Follows the nearest person using YOLOv8, LiDAR and a behaviour tree on ROS 2.',
  tags: ['ROS 2 Humble', 'YOLOv8', 'py_trees', 'C++'],
};

test('normalise lower-cases and keeps only letters, digits, plus and hash', () => {
  assert.equal(normalise('  ROS 2  Humble!'), 'ros 2 humble');
  assert.equal(normalise('C++ / C#'), 'c++ c#');
});

test('normalise keeps letters outside ASCII', () => {
  assert.equal(normalise('Zürich Straße'), 'zürich straße');
});

test('an empty or blank query matches every project', () => {
  assert.equal(projectMatches(project, ''), true);
  assert.equal(projectMatches(project, '   '), true);
});

test('matches a tag regardless of case', () => {
  assert.equal(projectMatches(project, 'yolov8'), true);
  assert.equal(projectMatches(project, 'LIDAR'), true);
});

test('matches "ros2" against "ROS 2" by ignoring spaces', () => {
  assert.equal(projectMatches(project, 'ros2'), true);
});

test('every word in the query must match', () => {
  assert.equal(projectMatches(project, 'ros lidar'), true);
  assert.equal(projectMatches(project, 'ros stm32'), false);
});

test('matches C++ literally without matching every project that has a c', () => {
  assert.equal(projectMatches(project, 'c++'), true);
  assert.equal(projectMatches({ title: 'Gyroid heat exchanger', summary: 'CFD', tags: ['Ansys'] }, 'c++'), false);
});
