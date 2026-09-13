/**
 * Pan/zoom camera for the Charter canvas. Pure maths, no DOM: the sheet is
 * drawn with `transform: translate(x, y) scale(scale)`, so sheet point `p`
 * lands on canvas point `p * scale + (x, y)`.
 */
export interface CharterView {
  x: number;
  y: number;
  scale: number;
}

export const CHARTER_MIN_SCALE = 0.15;
export const CHARTER_MAX_SCALE = 2.5;
/** One zoom-button step (and one wheel notch). */
export const CHARTER_ZOOM_STEP = 1.25;
/** Pointer travel before a press counts as a drag rather than a click. */
export const CHARTER_DRAG_THRESHOLD_PX = 6;

export interface Size {
  width: number;
  height: number;
}

export const clampScale = (scale: number): number =>
  Math.min(CHARTER_MAX_SCALE, Math.max(CHARTER_MIN_SCALE, scale));

/** Centre sheet point `focus` in a viewport of `viewport` size at `scale`. */
export function centreOn(focus: { x: number; y: number }, viewport: Size, scale = 1): CharterView {
  const s = clampScale(scale);
  return {
    x: viewport.width / 2 - focus.x * s,
    y: viewport.height / 2 - focus.y * s,
    scale: s,
  };
}

export const panBy = (view: CharterView, dx: number, dy: number): CharterView => ({
  ...view,
  x: view.x + dx,
  y: view.y + dy,
});

/** Multiply the scale by `factor`, keeping canvas point `pivot` fixed on screen. */
export function zoomAt(view: CharterView, factor: number, pivot: { x: number; y: number }): CharterView {
  const scale = clampScale(view.scale * factor);
  const ratio = scale / view.scale;
  return {
    x: pivot.x - (pivot.x - view.x) * ratio,
    y: pivot.y - (pivot.y - view.y) * ratio,
    scale,
  };
}

/** Keep at least `margin` px of the sheet inside the viewport on every side. */
export function clampPan(view: CharterView, sheet: Size, viewport: Size, margin = 80): CharterView {
  const w = sheet.width * view.scale;
  const h = sheet.height * view.scale;
  return {
    ...view,
    x: Math.min(viewport.width - margin, Math.max(margin - w, view.x)),
    y: Math.min(viewport.height - margin, Math.max(margin - h, view.y)),
  };
}

/** Wheel delta → zoom factor. Trackpads emit many tiny deltas; notch mice ±100. */
export const wheelZoomFactor = (deltaY: number): number =>
  Math.exp(-Math.max(-100, Math.min(100, deltaY)) / 100 * Math.log(CHARTER_ZOOM_STEP));

export const toCss = (view: CharterView): string =>
  `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
