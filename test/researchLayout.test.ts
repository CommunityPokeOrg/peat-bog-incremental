import { describe, expect, it } from 'vitest';
import { RESEARCH, RESEARCH_BRANCHES, researchBranch } from '../src/game/data';
import { layoutResearch, researchHubId, RESEARCH_SKY_ID } from '../src/ui/researchLayout';

describe('research constellation layout', () => {
  const layout = layoutResearch();

  it('places every research item and all branch hubs', () => {
    for (const research of RESEARCH) expect(layout.points[research.id]).toBeDefined();
    for (const branch of Object.keys(RESEARCH_BRANCHES)) {
      const point = layout.points[researchHubId(branch as keyof typeof RESEARCH_BRANCHES)];
      expect(point).toBeDefined();
      expect(point.depth).toBe(1);
    }
    expect(layout.points[RESEARCH_SKY_ID].depth).toBe(0);
  });

  it('uses one tree parent and preserves extra prerequisites as cross-links', () => {
    const original = RESEARCH.find((item) => item.id === 'thermal-docket')!;
    const multi = {
      ...original,
      requires: ['thermal-modelling', 'broth-distillation'],
    };
    const custom = layoutResearch([
      ...RESEARCH.filter((item) => item.id !== original.id),
      multi,
    ]);
    const branch = researchBranch(multi.id);
    const parent = multi.requires?.find((id) => researchBranch(id) === branch);
    expect(custom.crossLinks.filter((link) => link.to === multi.id)).toHaveLength(
      (multi.requires?.length ?? 0) - (parent ? 1 : 0),
    );
  });

  it('does not place two points at the same coordinates', () => {
    const points = Object.values(layout.points);
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        expect(points[i].x !== points[j].x || points[i].y !== points[j].y).toBe(true);
      }
    }
  });
});
