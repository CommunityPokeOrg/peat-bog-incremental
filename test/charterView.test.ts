import { describe, expect, it } from 'vitest';
import {
  CHARTER_MAX_SCALE,
  CHARTER_MIN_SCALE,
  centreOn,
  clampPan,
  panBy,
  wheelZoomFactor,
  zoomAt,
} from '../src/ui/charterView';

const viewport = { width: 400, height: 300 };

describe('charter view camera', () => {
  it('centres a sheet point in the viewport', () => {
    const view = centreOn({ x: 500, y: 500 }, viewport, 1);
    expect(view).toEqual({ x: -300, y: -350, scale: 1 });
    const half = centreOn({ x: 500, y: 500 }, viewport, 0.5);
    expect(500 * half.scale + half.x).toBe(200);
    expect(500 * half.scale + half.y).toBe(150);
  });

  it('zooms about the pivot so the point under the cursor stays put', () => {
    const view = { x: -300, y: -350, scale: 1 };
    const pivot = { x: 120, y: 40 };
    const sheetPoint = { x: (pivot.x - view.x) / view.scale, y: (pivot.y - view.y) / view.scale };
    const zoomed = zoomAt(view, 2, pivot);
    expect(zoomed.scale).toBe(2);
    expect(sheetPoint.x * zoomed.scale + zoomed.x).toBeCloseTo(pivot.x);
    expect(sheetPoint.y * zoomed.scale + zoomed.y).toBeCloseTo(pivot.y);
  });

  it('clamps scale to the zoom bounds', () => {
    const view = { x: 0, y: 0, scale: 1 };
    expect(zoomAt(view, 100, { x: 0, y: 0 }).scale).toBe(CHARTER_MAX_SCALE);
    expect(zoomAt(view, 0.001, { x: 0, y: 0 }).scale).toBe(CHARTER_MIN_SCALE);
  });

  it('keeps a margin of sheet inside the viewport when panning', () => {
    const sheet = { width: 1000, height: 1000 };
    const far = panBy({ x: 0, y: 0, scale: 1 }, 5000, -5000);
    const clamped = clampPan(far, sheet, viewport, 80);
    expect(clamped.x).toBe(viewport.width - 80);
    expect(clamped.y).toBe(80 - sheet.height);
  });

  it('maps wheel deltas to symmetric zoom factors', () => {
    expect(wheelZoomFactor(-100) * wheelZoomFactor(100)).toBeCloseTo(1);
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(3)).toBeLessThan(1);
    expect(wheelZoomFactor(3)).toBeGreaterThan(0.99);
  });
});
