// Pure geometry and kinematics for cycloidal drives. No DOM or WebGL here, so it is unit-testable.

/**
 * Outline of a cycloidal disc that meshes with `pins` ring pins (the disc has pins - 1 lobes).
 * Standard offset-epitrochoid form; requires eccentricity < pinCircleRadius / pins to avoid undercut.
 * @returns {Array<[number, number]>} closed outline, first point not repeated at the end
 */
export function profilePoints({ pins, pinCircleRadius, pinRadius, eccentricity }, samples = 720) {
  if (!Number.isInteger(pins) || pins < 3) throw new Error('profilePoints: pins must be an integer >= 3');
  if (!(eccentricity > 0) || eccentricity >= pinCircleRadius / pins) {
    throw new Error('profilePoints: eccentricity must be > 0 and < pinCircleRadius / pins');
  }
  const R = pinCircleRadius;
  const E = eccentricity;
  const N = pins;
  const points = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * 2 * Math.PI;
    const psi = Math.atan2(Math.sin((1 - N) * t), R / (E * N) - Math.cos((1 - N) * t));
    const x = R * Math.cos(t) - pinRadius * Math.cos(t + psi) - E * Math.cos(N * t);
    const y = -R * Math.sin(t) + pinRadius * Math.sin(t + psi) + E * Math.sin(N * t);
    points.push([x, y]);
  }
  return points;
}

function assertMeshes(stage) {
  if (stage.pins !== stage.lobes + 1) throw new Error('cycloid stage must satisfy pins = lobes + 1');
}

/** Disc rotation when its ring is fixed: one lobe backwards per input turn. */
export function discRotation(inputAngle, stage) {
  assertMeshes(stage);
  return (inputAngle * (stage.lobes - stage.pins)) / stage.lobes;
}

/**
 * Output-ring rotation of a compound drive: stage 1 ring fixed, both discs on one body, stage 2 ring is the output.
 * Meshing condition per stage in the eccentric frame: lobes * (disc - input) = pins * (ring - input).
 */
export function ringRotation(inputAngle, [first, second]) {
  assertMeshes(first);
  assertMeshes(second);
  return inputAngle * (1 - (second.lobes * first.pins) / (second.pins * first.lobes));
}

/**
 * Pose of the bonded disc pair and the output ring for an input-shaft angle.
 * Disc outlines from profilePoints() mesh when centred at e·(cos θ, sin θ) and turned by discAngle.
 */
export function assemblyPose(inputAngle, stages, eccentricity) {
  return {
    discCenter: [eccentricity * Math.cos(inputAngle), eccentricity * Math.sin(inputAngle)],
    discAngle: discRotation(inputAngle, stages[0]),
    outputAngle: ringRotation(inputAngle, stages),
  };
}

/** Input turns per output turn for a two-stage compound cycloidal drive. */
export function compoundRatio([first, second]) {
  assertMeshes(first);
  assertMeshes(second);
  const numerator = second.pins * first.lobes;
  const denominator = numerator - second.lobes * first.pins;
  if (denominator === 0) throw new Error('compoundRatio: identical stages give no output motion');
  return numerator / denominator;
}
