export interface CurrentUser {
  id: string;
  sub: string;
  email: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  onboarded: boolean;
  createdAt: string;
}

export interface MeResponse {
  user: CurrentUser;
  peerAppUrl: string | null;
}

export type LearningLanguage = 'EN' | 'RU' | 'DE';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  source: string;
  learningLanguage: LearningLanguage;
  hasMap: boolean;
  hasRoadmap: boolean;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  highestCompletedStage: string | null;
  lastWorkedStage: string | null;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface SkillsResponse {
  skills: Skill[];
}

export interface SkillResponse {
  skill: Skill;
}

export type MapLens = 'FOUNDATION' | 'ANATOMY' | 'ECOSYSTEM';

export interface LensDescriptor {
  lens: MapLens;
  path: string;
  title: string;
  question: string;
}

export const LENSES: readonly LensDescriptor[] = [
  {
    lens: 'FOUNDATION',
    path: 'foundation',
    title: 'Foundation',
    question: 'What you need before this',
  },
  { lens: 'ANATOMY', path: 'anatomy', title: 'Anatomy', question: 'What this is made of' },
  {
    lens: 'ECOSYSTEM',
    path: 'ecosystem',
    title: 'Ecosystem',
    question: 'What surrounds it in practice',
  },
];

export type NodeRelation = 'PREREQUISITE' | 'CORE' | 'ECOSYSTEM' | 'RELATED';

export interface MapNode {
  id: string;
  label: string;
  slug: string;
  summary: string | null;
  relation: NodeRelation | null;
  origin: string;
  expanded: boolean;
  expandedAt: string | null;
  linkedSlug: string | null;
  children: MapNode[];
}

export interface SkillMap {
  lens: MapLens;
  generatedAt: string;
  generatedBy: string | null;
  root: MapNode | null;
  nodeCount: number;
}

export interface SkillMapResponse {
  map: SkillMap | null;
}

export interface ExpansionResponse {
  map: SkillMap;
  added: number;
  rejected: number;
}
