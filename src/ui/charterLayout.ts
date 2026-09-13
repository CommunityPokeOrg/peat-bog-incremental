import { CHARTER, CHARTER_ROOT_ID, type CharterNodeDef } from '../game/charter';

export interface CharterPoint {
  x: number;
  y: number;
  depth: number;
  angle: number;
}

export interface CharterLayout {
  points: Record<string, CharterPoint>;
  edges: { from: string; to: string }[];
  width: number;
  height: number;
}

export const CHARTER_RING_GAP = 120;
export const CHARTER_PADDING = 90;

/**
 * Radial tree layout. The root sits at the centre; every leaf gets an equal
 * angular slot around the circle, each internal node takes the mean angle of
 * its leaves, and radius grows with depth. Works for any depth or fan-out
 * derived from `requires`, so new wings need no layout code.
 */
export function layoutCharter(nodes: CharterNodeDef[] = CHARTER): CharterLayout {
  const children = new Map<string, CharterNodeDef[]>();
  for (const node of nodes) {
    if (!node.requires) continue;
    const list = children.get(node.requires) ?? [];
    list.push(node);
    children.set(node.requires, list);
  }

  const angles = new Map<string, number>();
  const depths = new Map<string, number>();
  const leafCount = nodes.filter((node) => !(children.get(node.id)?.length)).length;
  const slot = (Math.PI * 2) / Math.max(1, leafCount);
  let nextLeaf = 0;

  const place = (node: CharterNodeDef, depth: number): number => {
    depths.set(node.id, depth);
    const kids = children.get(node.id) ?? [];
    let angle: number;
    if (kids.length === 0) {
      angle = -Math.PI / 2 + slot * (nextLeaf + 0.5);
      nextLeaf += 1;
    } else {
      const kidAngles = kids.map((kid) => place(kid, depth + 1));
      angle = kidAngles.reduce((sum, a) => sum + a, 0) / kidAngles.length;
    }
    angles.set(node.id, angle);
    return angle;
  };

  const root = nodes.find((node) => node.id === CHARTER_ROOT_ID) ?? nodes[0];
  if (root) place(root, 0);
  for (const node of nodes) if (!depths.has(node.id)) place(node, 1);

  const maxDepth = Math.max(0, ...depths.values());
  const radius = maxDepth * CHARTER_RING_GAP;
  const size = radius * 2 + CHARTER_PADDING * 2;
  const centre = size / 2;

  const points: Record<string, CharterPoint> = {};
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    const angle = angles.get(node.id) ?? 0;
    const r = depth * CHARTER_RING_GAP;
    points[node.id] = {
      x: Math.round(centre + Math.cos(angle) * r),
      y: Math.round(centre + Math.sin(angle) * r),
      depth,
      angle,
    };
  }

  const edges = nodes
    .filter((node) => node.requires && points[node.requires])
    .map((node) => ({ from: node.requires as string, to: node.id }));

  return { points, edges, width: size, height: size };
}
