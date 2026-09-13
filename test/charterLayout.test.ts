import { describe, expect, it } from 'vitest';
import { CHARTER, CHARTER_ROOT_ID } from '../src/game/charter';
import { CHARTER_RING_GAP, layoutCharter } from '../src/ui/charterLayout';

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
      expect(r).toBeCloseTo(p.depth * CHARTER_RING_GAP, 0);
    }
  });

  it('fans branch heads out in different directions and keeps nodes apart', () => {
    const heads = CHARTER.filter((node) => node.requires === CHARTER_ROOT_ID);
    expect(heads.length).toBeGreaterThanOrEqual(3);
    const angles = heads.map((node) => layout.points[node.id].angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1) {
      expect(angles[i] - angles[i - 1]).toBeGreaterThan(Math.PI / 4);
    }
    const ids = CHARTER.map((node) => node.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = layout.points[ids[i]];
        const b = layout.points[ids[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(60);
      }
    }
  });

  it('emits one edge per requirement', () => {
    expect(layout.edges).toHaveLength(CHARTER.filter((node) => node.requires).length);
  });
});
