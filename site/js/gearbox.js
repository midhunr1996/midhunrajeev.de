// Live 3D line drawing of the Akbar compound cycloidal drive, built from its real design parameters.
// Drag spins and tilts the model; page scroll (and a slow idle) turns the input shaft.
import * as THREE from '../vendor/three.module.min.js';
import { profilePoints, assemblyPose, compoundRatio } from './cycloid.js';
import { svg } from './dom.js';

const IDLE_SPEED = 0.45; // input-shaft rad/s while idle
const SCROLL_GAIN = 0.03; // input-shaft rad per scrolled pixel
const SMOOTHING = 0.12; // fraction of the remaining angle closed per 60 Hz frame
const SPIN_DAMPING = 0.92;
const PITCH_LIMITS = [-1.45, -0.2];
const CAMERA_DISTANCE = 232;
const PIN_SEGMENTS = 28;
const CALLOUT_EPSILON_PX = 0.5;
const DRAW_DURATION_MS = 2400;
const DRAW_OVERLAP = 0.3; // share of the timeline each line takes to draw
const BORE_RADIUS = 9;
const SHAFT_RADIUS = 4;
const CRANK_LENGTH = 17;
const INITIAL_PITCH = -0.95;
const INITIAL_SPIN = 0.5;
// Exploded view: how far each assembly moves along the shaft axis (model units, mm).
const EXPLODE_OFFSETS = { fixed: -14, discs: 12, output: 28, input: 44 };
const EXPLODE_SMOOTHING = 0.08;

function cssColor(name) {
  return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#14365e');
}

function edgeLines(geometry, material, threshold = 20) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, threshold), material);
  geometry.dispose();
  return lines;
}

function circlePath(radius, PathType = THREE.Path) {
  const path = new PathType();
  path.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return path;
}

function extrude(shape, depth, z) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 96 });
  geometry.translate(0, 0, z);
  return geometry;
}

function ringHousing(outer, inner, depth, z, material) {
  const shape = circlePath(outer, THREE.Shape);
  shape.holes.push(circlePath(inner));
  return edgeLines(extrude(shape, depth, z), material);
}

// Pins are drawn as one circle on the stage's top face; drawing both caps made the view unreadable.
function pinCircle(count, radius, pinRadius, z, material) {
  const group = new THREE.Group();
  for (let k = 0; k < count; k += 1) {
    const angle = (2 * Math.PI * k) / count;
    const cx = radius * Math.cos(angle);
    const cy = radius * Math.sin(angle);
    // An explicitly closed Line (not LineLoop) so a partial draw range never adds a closing chord.
    const points = Array.from({ length: PIN_SEGMENTS + 1 }, (_, i) => {
      const a = (2 * Math.PI * i) / PIN_SEGMENTS;
      return new THREE.Vector3(cx + pinRadius * Math.cos(a), cy + pinRadius * Math.sin(a), z);
    });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
  return group;
}

function discBody(pins, params, depth, z, material) {
  const points = profilePoints({ pins, pinCircleRadius: params.pinCircleRadius, pinRadius: params.pinRadius, eccentricity: params.eccentricity }, 360);
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(circlePath(BORE_RADIUS));
  return edgeLines(extrude(shape, depth, z), material);
}

function cylinderAt(radius, z0, z1, x, material) {
  const geometry = new THREE.CylinderGeometry(radius, radius, z1 - z0, 48);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(x, 0, (z0 + z1) / 2);
  return edgeLines(geometry, material, 30);
}

function polyline(points, material) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), material);
}

function centreLines(length, z, material) {
  const group = new THREE.Group();
  for (const [ax, ay] of [[1, 0], [0, 1]]) {
    const line = polyline([[-ax * length, -ay * length, z], [ax * length, ay * length, z]], material);
    line.computeLineDistances();
    group.add(line);
  }
  return group;
}

function buildAssembly(params, materials) {
  const { stages, faceWidth: w, stageGap: gap, ringOuterRadius: outer, pinCircleRadius: R, pinRadius: r } = params;
  const z2 = w + gap;
  const top = z2 + w;
  const bore = R + 0.8;

  // The fixed lower stage is drawn faint so the output stage on top reads first.
  const fixed = new THREE.Group();
  fixed.add(ringHousing(outer, bore, w, 0, materials.faint), pinCircle(stages[0].pins, R, r, w, materials.faint));

  const discs = new THREE.Group();
  discs.add(discBody(stages[0].pins, params, w, 0, materials.faint), discBody(stages[1].pins, params, w, z2, materials.ink), cylinderAt(14, w, z2, 0, materials.faint));

  const output = new THREE.Group();
  output.add(ringHousing(outer, bore, w, z2, materials.ink), pinCircle(stages[1].pins, R, r, top, materials.ink));
  output.add(polyline([[outer, 0, top], [outer + 7, 0, top]], materials.mark));

  const input = new THREE.Group();
  input.add(cylinderAt(SHAFT_RADIUS, -12, top + 12, 0, materials.ink), cylinderAt(BORE_RADIUS - 0.4, -0.5, top + 0.5, params.eccentricity, materials.faint));
  input.add(polyline([[0, 0, top + 12], [CRANK_LENGTH, 0, top + 12], [CRANK_LENGTH, 0, top + 20]], materials.mark));

  const model = new THREE.Group();
  model.add(centreLines(outer + 14, -1, materials.chain), fixed, discs, output, input);
  model.position.z = -top / 2;
  return { model, fixed, discs, output, input, top };
}

function buildCallouts(parts, params) {
  const { stages, ringOuterRadius: outer, pinCircleRadius: R, faceWidth: w, stageGap: gap } = params;
  const top = parts.top;
  const at = (radius, angle, z) => new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), z);
  return [
    { label: `Fixed ring, ${stages[0].pins} pins`, side: 'left', y: 0.12, group: parts.fixed, point: at(outer, 2.6, w / 2) },
    { label: `Disc, ${stages[0].lobes} lobes`, side: 'left', y: 0.9, group: parts.discs, point: at(R - 3, 3.9, 0) },
    { label: `Input crank, e = ${params.eccentricity} mm`, side: 'right', y: 0.08, group: parts.input, point: new THREE.Vector3(CRANK_LENGTH, 0, top + 20) },
    { label: `Output ring, ${stages[1].pins} pins`, side: 'right', y: 0.26, group: parts.output, point: at(outer, 0.5, w + gap + w) },
    { label: `Disc, ${stages[1].lobes} lobes`, side: 'right', y: 0.92, group: parts.discs, point: at(R - 3, -0.9, w + gap + w) },
  ];
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Pen-plotter entrance: reveals every line of the model in assembly order, overlapping slightly.
function createPlotter(root, onDone) {
  const lines = [];
  root.traverse((object) => {
    if (object.isLine) lines.push({ object, total: object.geometry.attributes.position.count, pairs: object.isLineSegments });
  });
  let start = null;
  let done = false;

  function finish() {
    if (done) return;
    done = true;
    lines.forEach(({ object }) => object.geometry.setDrawRange(0, Infinity));
    onDone();
  }

  function update(now) {
    if (done) return true;
    start ??= now;
    const t = Math.min((now - start) / DRAW_DURATION_MS, 1);
    const progress = easeInOut(t);
    lines.forEach((line, i) => {
      const begin = (i / lines.length) * (1 - DRAW_OVERLAP);
      const local = THREE.MathUtils.clamp((progress - begin) / DRAW_OVERLAP, 0, 1);
      const count = Math.floor(local * line.total);
      line.object.geometry.setDrawRange(0, line.pairs ? count - (count % 2) : count);
    });
    if (t >= 1) finish();
    return done;
  }

  lines.forEach(({ object }) => object.geometry.setDrawRange(0, 0));
  return { update, finish, isDone: () => done };
}

function createCalloutLayer(layer, callouts) {
  layer.replaceChildren();
  return callouts.map((callout) => {
    const line = svg('line');
    const dot = svg('circle', { r: 2.5 });
    const text = svg('text', { 'text-anchor': callout.side === 'left' ? 'start' : 'end' });
    text.textContent = callout.label;
    layer.append(line, dot, text);
    return { ...callout, line, dot, text, width: 0 };
  });
}

export function mountGearbox(stage, params, { callouts: calloutLayer, onReadout, motionQuery }) {
  // Read live so turning on "reduce motion" mid-visit stops the idle spin without a reload.
  const reducedMotion = () => motionQuery?.matches ?? false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.prepend(renderer.domElement);

  const materials = {
    ink: new THREE.LineBasicMaterial({ color: cssColor('--ink') }),
    faint: new THREE.LineBasicMaterial({ color: cssColor('--ink-2'), transparent: true, opacity: 0.7 }),
    mark: new THREE.LineBasicMaterial({ color: cssColor('--redline') }),
    chain: new THREE.LineDashedMaterial({ color: cssColor('--ink-2'), dashSize: 9, gapSize: 2.5 }),
  };
  const parts = buildAssembly(params, materials);
  const ratio = compoundRatio(params.stages);

  const scene = new THREE.Scene();
  const pitchGroup = new THREE.Group();
  pitchGroup.rotation.x = INITIAL_PITCH;
  pitchGroup.add(parts.model);
  parts.model.rotation.z = INITIAL_SPIN;
  scene.add(pitchGroup);

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
  camera.position.set(0, 0, CAMERA_DISTANCE);

  const labels = createCalloutLayer(calloutLayer, buildCallouts(parts, params));
  const plotter = createPlotter(parts.model, () => calloutLayer.classList.add('is-ready'));
  if (reducedMotion()) plotter.finish();
  const anchor = new THREE.Vector3();
  let size = { width: 1, height: 1 };

  const motion = { idle: 0, theta: 0, spinVelocity: 0, dragging: false, last: performance.now(), lastReadout: 0, explode: 0, explodeTarget: 0 };
  let visible = true;
  let looping = false;

  // Label text and shelf lines only move on resize; per frame we update just the leader end and dot.
  function layoutLabels() {
    for (const label of labels) {
      label.width = label.text.getComputedTextLength?.() ?? label.label.length * 7;
      const left = label.side === 'left';
      const tx = left ? 6 : size.width - 6;
      const ty = label.y * size.height;
      label.text.setAttribute('x', tx);
      label.text.setAttribute('y', ty - 4);
      label.line.setAttribute('x1', left ? tx + label.width : tx - label.width);
      label.line.setAttribute('y1', ty);
      label.ax = Number.NaN;
    }
  }

  function resize() {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    size = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    calloutLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
    layoutLabels();
    kick();
  }

  function placeCallouts() {
    for (const label of labels) {
      anchor.copy(label.point).applyMatrix4(label.group.matrixWorld).project(camera);
      const ax = ((anchor.x + 1) / 2) * size.width;
      const ay = ((1 - anchor.y) / 2) * size.height;
      if (Math.abs(ax - label.ax) < CALLOUT_EPSILON_PX && Math.abs(ay - label.ay) < CALLOUT_EPSILON_PX) continue;
      label.ax = ax;
      label.ay = ay;
      label.line.setAttribute('x2', ax);
      label.line.setAttribute('y2', ay);
      label.dot.setAttribute('cx', ax);
      label.dot.setAttribute('cy', ay);
    }
  }

  function step(now) {
    const dt = Math.min((now - motion.last) / 1000, 0.05);
    motion.last = now;
    if (!reducedMotion() && !motion.dragging) motion.idle += dt * IDLE_SPEED;
    const target = motion.idle + window.scrollY * SCROLL_GAIN;
    const blend = 1 - Math.pow(1 - SMOOTHING, dt * 60);
    motion.theta += (target - motion.theta) * blend;
    const explodeBlend = reducedMotion() ? 1 : 1 - Math.pow(1 - EXPLODE_SMOOTHING, dt * 60);
    motion.explode += (motion.explodeTarget - motion.explode) * explodeBlend;
    parts.fixed.position.z = motion.explode * EXPLODE_OFFSETS.fixed;
    parts.output.position.z = motion.explode * EXPLODE_OFFSETS.output;
    parts.input.position.z = motion.explode * EXPLODE_OFFSETS.input;
    if (!motion.dragging) {
      parts.model.rotation.z += motion.spinVelocity;
      motion.spinVelocity *= SPIN_DAMPING;
    }
    const pose = assemblyPose(motion.theta, params.stages, params.eccentricity);
    parts.discs.position.set(pose.discCenter[0], pose.discCenter[1], motion.explode * EXPLODE_OFFSETS.discs);
    parts.discs.rotation.z = pose.discAngle;
    parts.output.rotation.z = pose.outputAngle;
    parts.input.rotation.z = motion.theta;
    return Math.abs(target - motion.theta) < 1e-3 && Math.abs(motion.spinVelocity) < 1e-4 && Math.abs(motion.explodeTarget - motion.explode) < 1e-3;
  }

  function frame(now) {
    const plotted = plotter.update(now);
    const settled = step(now) && plotted;
    renderer.render(scene, camera);
    if (plotted) placeCallouts();
    if (now - motion.lastReadout > 120) {
      motion.lastReadout = now;
      onReadout?.({ inputDeg: (motion.theta * 180) / Math.PI, outputDeg: (motion.theta * 180) / Math.PI / ratio });
    }
    const keepGoing = visible && !document.hidden && (!reducedMotion() || !settled || motion.dragging);
    looping = keepGoing;
    if (keepGoing) requestAnimationFrame(frame);
  }

  function kick() {
    if (looping || !visible || document.hidden) return;
    looping = true;
    motion.last = performance.now();
    requestAnimationFrame(frame);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    motion.dragging = true;
    motion.pointer = { x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
    kick();
  }

  function onPointerMove(event) {
    if (!motion.dragging) return;
    const dx = event.clientX - motion.pointer.x;
    const dy = event.clientY - motion.pointer.y;
    motion.pointer = { x: event.clientX, y: event.clientY };
    motion.spinVelocity = dx * 0.01;
    parts.model.rotation.z += motion.spinVelocity;
    pitchGroup.rotation.x = THREE.MathUtils.clamp(pitchGroup.rotation.x + dy * 0.006, ...PITCH_LIMITS);
  }

  function onPointerUp() {
    motion.dragging = false;
    kick();
  }

  function onKey(event) {
    const moves = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    parts.model.rotation.z += move[0];
    pitchGroup.rotation.x = THREE.MathUtils.clamp(pitchGroup.rotation.x + move[1], ...PITCH_LIMITS);
    kick();
  }

  function applyTheme() {
    materials.ink.color.copy(cssColor('--ink'));
    materials.faint.color.copy(cssColor('--ink-2'));
    materials.chain.color.copy(cssColor('--ink-2'));
    materials.mark.color.copy(cssColor('--redline'));
    kick();
  }

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('keydown', onKey);
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('themechange', applyTheme);
  motionQuery?.addEventListener('change', kick);
  document.fonts?.ready.then(layoutLabels);
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  }).observe(stage);

  function setExploded(flag) {
    motion.explodeTarget = flag ? 1 : 0;
    kick();
  }

  function resetView() {
    parts.model.rotation.z = INITIAL_SPIN;
    pitchGroup.rotation.x = INITIAL_PITCH;
    motion.spinVelocity = 0;
    motion.explodeTarget = 0;
    kick();
  }

  resize();
  return { ratio, setExploded, resetView, isExploded: () => motion.explodeTarget === 1 };
}
