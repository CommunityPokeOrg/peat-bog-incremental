import { CHARTER, CHARTER_ROOT_ID, type CharterNodeDef } from '../game/charter';

export interface RadialNode {
  id: string;
  requires?: string;
}

export interface CharterPoint {
  x: number;
  y: number;
  depth: number;
  angle: number;
}

export interface CharterLayout {
  points: Record<string, CharterPoint>;
  edges: { from: string; to: string; crossWing?: boolean }[];
  width: number;
  height: number;
}

export const CHARTER_RING_GAP = 160;
export const CHARTER_PADDING = 90;
/** Growth factor applied to each successive Charter depth ring. */
export const CHARTER_RING_GROWTH = 1.08;
const CHARTER_NODE_SEPARATION = 78;

/** Return the radial distance for a node depth, widening deeper rings. */
export function charterRingRadius(depth: number): number {
  let radius = 0;
  for (let ring = 0; ring < depth; ring += 1) radius += CHARTER_RING_GAP * CHARTER_RING_GROWTH ** ring;
  return radius;
}

/**
 * Radial tree layout. The root sits at the centre; every leaf gets an equal
 * angular slot around the circle, each internal node takes the mean angle of
 * its leaves, and radius grows with depth. Works for any depth or fan-out
 * derived from `requires`, so new wings need no layout code.
 */
export function layoutRadial(nodes: RadialNode[], rootId: string): CharterLayout {
  const children = new Map<string, RadialNode[]>();
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

  const place = (node: RadialNode, depth: number): number => {
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

  const root = nodes.find((node) => node.id === rootId) ?? nodes[0];
  if (root) place(root, 0);
  for (const node of nodes) if (!depths.has(node.id)) place(node, 1);

  const nodesByDepth = new Map<number, string[]>();
  for (const [id, depth] of depths) {
    const atDepth = nodesByDepth.get(depth) ?? [];
    atDepth.push(id);
    nodesByDepth.set(depth, atDepth);
  }
  const ringRadii = new Map<number, number>();
  let previousRadius = 0;
  for (const depth of Array.from(nodesByDepth.keys()).sort((a, b) => a - b)) {
    const count = nodesByDepth.get(depth)?.length ?? 0;
    const required = count > 1
      ? (CHARTER_NODE_SEPARATION + 12) / (2 * Math.sin(Math.PI / count))
      : 0;
    const radius = depth === 0
      ? 0
      : Math.max(charterRingRadius(depth), required, previousRadius + CHARTER_NODE_SEPARATION + 12);
    ringRadii.set(depth, radius);
    previousRadius = radius;
  }
  const radius = Math.max(...ringRadii.values());
  const size = Math.ceil((radius * 2 + CHARTER_PADDING * 2) / 2) * 2;
  const centre = size / 2;

  const points: Record<string, CharterPoint> = {};
  for (const node of nodes) {
    const depth = depths.get(node.id) ?? 0;
    const siblings = nodesByDepth.get(depth) ?? [];
    const index = siblings.indexOf(node.id);
    const angle = siblings.length > 1
      ? -Math.PI / 2 + (Math.PI * 2 * index) / siblings.length
      : angles.get(node.id) ?? 0;
    const r = ringRadii.get(depth) ?? 0;
    points[node.id] = {
      x: Math.round(centre + Math.cos(angle) * r),
      y: Math.round(centre + Math.sin(angle) * r),
      depth,
      angle,
    };
  }

  const edges = nodes.flatMap((node) =>
    node.requires && points[node.requires]
      ? [{ from: node.requires, to: node.id }]
      : []);

  return { points, edges, width: size, height: size };
}

export function layoutCharter(nodes: CharterNodeDef[] = CHARTER): CharterLayout {
  const layout = layoutRadial(nodes, CHARTER_ROOT_ID);
  const crossEdges = nodes.flatMap((node) =>
    (node.requiresAny ?? [])
      .filter((id) => layout.points[id])
      .map((id) => ({ from: id, to: node.id, crossWing: true })));
  return { ...layout, edges: [...layout.edges, ...crossEdges] };
}
