// Static plan-view drawing of the first stage, shown when WebGL is unavailable.
import { profilePoints } from './cycloid.js';
import { svg } from './dom.js';

export function drawFallback(stage, params) {
  const { stages, pinCircleRadius: R, pinRadius: r, eccentricity: e, ringOuterRadius: outer } = params;
  const pins = stages[0].pins;
  const points = profilePoints({ pins, pinCircleRadius: R, pinRadius: r, eccentricity: e }, 360);
  const root = svg('svg', { class: 'drive__fallback', viewBox: `${-outer - 2} ${-outer - 2} ${2 * outer + 4} ${2 * outer + 4}`, 'aria-hidden': 'true' });
  root.append(svg('circle', { cx: 0, cy: 0, r: outer }));
  for (let k = 0; k < pins; k += 1) {
    const angle = (2 * Math.PI * k) / pins;
    root.append(svg('circle', { cx: R * Math.cos(angle), cy: R * Math.sin(angle), r }));
  }
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + e).toFixed(2)} ${y.toFixed(2)}`).join(' ');
  root.append(svg('path', { d: `${d} Z` }), svg('circle', { cx: e, cy: 0, r: 9 }));
  stage.append(root);
}
