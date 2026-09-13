import { describe, expect, it } from 'vitest';
import { CHARTER, CHARTER_ROOT_ID } from '../src/game/charter';
import { charterRingRadius, layoutCharter } from '../src/ui/charterLayout';

describe('charter radial layout', () => {
  const layout = layoutCharter();

  it('places the root at the centre and every node on its depth ring', () => {
    const root = layout.points[CHARTER_ROOT_ID];
    expect(root.depth).toBe(0);
    expect(root.x).toBe(layout.width / 2);
    for (const node of CHARTER) {
      const p = layout.points[node.id];
      const parent = node.requires ? layout.points[node.requires] : undefined;
      expect(p.depth).toBe(parent ? parent.depth + 1 : 0);
      const r = Math.hypot(p.x - root.x, p.y - root.y);
      expect(r).toBeGreaterThanOrEqual(charterRingRadius(p.depth) - 1);
    }
  });

  it('keeps every node apart and inside the canvas sheet', () => {
    const ids = CHARTER.map((node) => node.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = layout.points[ids[i]];
        const b = layout.points[ids[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(78);
      }
    }
    for (const point of Object.values(layout.points)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(layout.width);
      expect(point.y).toBeLessThanOrEqual(layout.height);
    }
  });

  it('emits edges for mandatory and alternate requirements', () => {
    const required = CHARTER.filter((node) => node.requires).length;
    const alternates = CHARTER.reduce((sum, node) => sum + (node.requiresAny?.length ?? 0), 0);
    expect(layout.edges).toHaveLength(required + alternates);
    expect(layout.edges.filter((edge) => edge.crossWing)).toHaveLength(alternates);
  });
});
