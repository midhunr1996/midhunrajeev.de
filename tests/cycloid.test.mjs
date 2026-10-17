import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  profilePoints,
  discRotation,
  ringRotation,
  compoundRatio,
  assemblyPose,
} from '../site/js/cycloid.js';

const STAGE = { pins: 10, pinCircleRadius: 30, pinRadius: 3, eccentricity: 1.2 };
const TWO_STAGE = [
  { lobes: 9, pins: 10 },
  { lobes: 8, pins: 9 },
];
// Midhun's "Akbar" compound drive: 12-lobe disc in a fixed 13-pin ring, 11-lobe disc in a 12-pin output ring.
const AKBAR = [
  { lobes: 12, pins: 13 },
  { lobes: 11, pins: 12 },
];
const AKBAR_GEOMETRY = { pinCircleRadius: 30, pinRadius: 3.5, eccentricity: 1.27 };

// Smallest gap between the posed disc outline and any ring pin surface (negative means overlap).
function clearance(profile, pose, pins, ringAngle) {
  const [cx, cy] = pose.discCenter;
  const c = Math.cos(pose.discAngle);
  const s = Math.sin(pose.discAngle);
  let min = Infinity;
  for (let k = 0; k < pins; k += 1) {
    const a = (2 * Math.PI * k) / pins + ringAngle;
    const px = AKBAR_GEOMETRY.pinCircleRadius * Math.cos(a);
    const py = AKBAR_GEOMETRY.pinCircleRadius * Math.sin(a);
    for (const [x, y] of profile) {
      const gap = Math.hypot(cx + x * c - y * s - px, cy + x * s + y * c - py) - AKBAR_GEOMETRY.pinRadius;
      min = Math.min(min, gap);
    }
  }
  return min;
}

test('the Akbar drive reduces 144:1', () => {
  assert.equal(compoundRatio(AKBAR), 144);
});

test('both Akbar discs mesh with their rings at any input angle', () => {
  const discOne = profilePoints({ pins: 13, ...AKBAR_GEOMETRY }, 1500);
  const discTwo = profilePoints({ pins: 12, ...AKBAR_GEOMETRY }, 1500);
  for (const input of [0, 0.4, 1.3, 2.9, 4.4, 17.2, 300]) {
    const pose = assemblyPose(input, AKBAR, AKBAR_GEOMETRY.eccentricity);
    const fixed = clearance(discOne, pose, 13, 0);
    const output = clearance(discTwo, pose, 12, pose.outputAngle);
    for (const gap of [fixed, output]) {
      assert.ok(gap > -1e-3, `pins overlap the disc by ${-gap} at input ${input}`);
      assert.ok(gap < 1e-2, `disc lost contact (gap ${gap}) at input ${input}`);
    }
  }
});

test('a 9/10 + 8/9 compound cycloidal drive reduces 81:1', () => {
  assert.equal(compoundRatio(TWO_STAGE), 81);
});

test('the disc turns backwards by 1/lobes of a turn per input turn', () => {
  const turn = 2 * Math.PI;
  assert.ok(Math.abs(discRotation(turn, TWO_STAGE[0]) - -turn / 9) < 1e-12);
});

test('the output ring turns 1/81 of the input angle in the same direction', () => {
  const input = 81 * 2 * Math.PI;
  const output = ringRotation(input, TWO_STAGE);
  assert.ok(Math.abs(output - 2 * Math.PI) < 1e-9, `output was ${output}`);
});

test('compoundRatio rejects stages that cannot mesh', () => {
  assert.throws(() => compoundRatio([{ lobes: 9, pins: 12 }, { lobes: 8, pins: 9 }]), /pins = lobes \+ 1/);
  assert.throws(() => compoundRatio([{ lobes: 9, pins: 10 }, { lobes: 9, pins: 10 }]), /identical/);
});

test('profilePoints returns a finite closed outline', () => {
  const points = profilePoints(STAGE, 720);
  assert.equal(points.length, 720);
  for (const [x, y] of points) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
});

test('the profile stays inside the pin circle and has pins - 1 lobes', () => {
  const points = profilePoints(STAGE, 2000);
  const radii = points.map(([x, y]) => Math.hypot(x, y));
  const outer = STAGE.pinCircleRadius - STAGE.pinRadius + STAGE.eccentricity;
  const inner = STAGE.pinCircleRadius - STAGE.pinRadius - STAGE.eccentricity;
  for (const r of radii) {
    assert.ok(r <= outer + 1e-6 && r >= inner - 1e-6, `radius ${r} outside [${inner}, ${outer}]`);
  }
  let peaks = 0;
  for (let i = 0; i < radii.length; i += 1) {
    const prev = radii[(i - 1 + radii.length) % radii.length];
    const next = radii[(i + 1) % radii.length];
    if (radii[i] > prev && radii[i] >= next) peaks += 1;
  }
  assert.equal(peaks, STAGE.pins - 1);
});

test('profilePoints validates its inputs', () => {
  assert.throws(() => profilePoints({ ...STAGE, pins: 2 }), /pins/);
  assert.throws(() => profilePoints({ ...STAGE, eccentricity: 0 }), /eccentricity/);
});
