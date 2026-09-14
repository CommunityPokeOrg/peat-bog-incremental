import {
  RESEARCH,
  RESEARCH_BRANCHES,
  researchBranch,
  type ResearchBranch,
  type ResearchDef,
} from '../game/data';
import { layoutRadial, type CharterLayout, type RadialNode } from './charterLayout';

export const RESEARCH_SKY_ID = 'sky';

export interface ResearchLayout extends CharterLayout {
  crossLinks: { from: string; to: string }[];
}

const BRANCHES = Object.keys(RESEARCH_BRANCHES) as ResearchBranch[];

export function researchHubId(branch: ResearchBranch): string {
  return `hub:${branch}`;
}

function parentFor(research: ResearchDef): string {
  const branch = researchBranch(research.id);
  return (research.requires ?? []).find((id) => researchBranch(id) === branch) ?? researchHubId(branch);
}

export function layoutResearch(research: ResearchDef[] = RESEARCH): ResearchLayout {
  const hubs: RadialNode[] = BRANCHES.map((branch) => ({
    id: researchHubId(branch),
    requires: RESEARCH_SKY_ID,
  }));
  const treeResearch: RadialNode[] = research.map((item) => ({
    id: item.id,
    requires: parentFor(item),
  }));
  const layout = layoutRadial([
    { id: RESEARCH_SKY_ID },
    ...hubs,
    ...treeResearch,
  ], RESEARCH_SKY_ID);
  const crossLinks = research.flatMap((item) => {
    const parent = parentFor(item);
    return (item.requires ?? [])
      .filter((required) => required !== parent && layout.points[required])
      .map((required) => ({ from: required, to: item.id }));
  });
  return { ...layout, crossLinks };
}
