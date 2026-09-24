export interface CurrentUser {
  id: string
  sub: string
  email: string | null
  displayName: string | null
  pictureUrl: string | null
  onboarded: boolean
  createdAt: string
}

export interface MeResponse {
  user: CurrentUser
  peerAppUrl: string | null
}

export type LearningLanguage = 'EN' | 'RU' | 'DE'

export interface Skill {
  id: string
  name: string
  slug: string
  source: string
  learningLanguage: LearningLanguage
  hasMap: boolean
  kind: SkillKind
  mapLenses: MapLens[]
  hasRoadmap: boolean
  progress: number
  totalSteps: number
  completedSteps: number
  highestCompletedStage: string | null
  lastWorkedStage: string | null
  nextStep: { title: string; stageTitle: string } | null
  lastActivityAt: string | null
  createdAt: string
}

export interface SkillsResponse {
  skills: Skill[]
}

export interface ImportSkillsResponse {
  skills: Skill[]
}

export type SkillKind = 'TECHNOLOGY' | 'FIELD' | 'CONCEPT'

export type CreateSkillResponse =
  | { status: 'created'; skill: Skill }
  | { status: 'suggestion'; suggestion: { name: string; reason: string } }

export interface SkillResponse {
  skill: Skill
}

export type MapLens = 'FOUNDATION' | 'ANATOMY' | 'ECOSYSTEM'

export interface LensDescriptor {
  lens: MapLens
  path: string
  title: string
  question: string
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
]

export type NodeRelation = 'PREREQUISITE' | 'CORE' | 'ECOSYSTEM' | 'RELATED'

export interface MapNode {
  id: string
  label: string
  slug: string
  summary: string | null
  relation: NodeRelation | null
  origin: string
  expanded: boolean
  expandedAt: string | null
  linked: LinkedSkill | null
  children: MapNode[]
}

export interface LinkedSkill {
  slug: string
  name: string
  hasRoadmap: boolean
  progress: number
  totalSteps: number
  completedSteps: number
}

export interface SkillMap {
  lens: MapLens
  generatedAt: string
  generatedBy: string | null
  root: MapNode | null
  nodeCount: number
}

export interface SkillMapResponse {
  map: SkillMap | null
}

export interface PromoteResponse {
  map: SkillMap
  skillSlug: string
  alsoLinked: number
}

export interface ExpansionResponse {
  map: SkillMap
  added: number
  rejected: number
}

export interface RoadmapStep {
  id: string
  position: number
  title: string
  summary: string | null
  completedAt: string | null
  complete: boolean
}

export interface RoadmapStage {
  id: string
  position: number
  title: string
  rationale: string | null
  complete: boolean
  steps: RoadmapStep[]
}

export interface Roadmap {
  generatedAt: string
  generatedBy: string | null
  language: string
  stages: RoadmapStage[]
  progress: number
  totalSteps: number
  completedSteps: number
  highestCompletedStage: string | null
  lastWorkedStage: string | null
}

export interface RoadmapResponse {
  roadmap: Roadmap | null
}

export interface Resource {
  id: string
  kind: ResourceKind
  title: string
  url: string | null
  searchQuery: string | null
  sourceType: ResourceSourceType | null
  content: string | null
  origin: string
  createdAt: string
  updatedAt: string
}

export type ResourceKind = 'LINK' | 'NOTE'

export type ResourceSourceType = 'DOCS' | 'ARTICLE' | 'VIDEO' | 'REPO' | 'COURSE'

export interface ResourceStep {
  id: string
  position: number
  title: string
  summary: string | null
  complete: boolean
  resources: Resource[]
}

export interface ResourceStage {
  id: string
  position: number
  title: string
  rationale: string | null
  covered: number
  steps: ResourceStep[]
}

export interface SkillResources {
  hasRoadmap: boolean
  stages: ResourceStage[]
  general: Resource[]
  total: number
}

export interface ResourcesResponse {
  resources: SkillResources
}

export interface StageResourcesResponse {
  stage: ResourceStage
}

export interface StepWorkspace {
  skillName: string
  skillSlug: string
  stage: { id: string; position: number; title: string; rationale: string | null }
  step: { id: string; position: number; title: string; summary: string | null; complete: boolean }
  previousStepId: string | null
  nextStepId: string | null
  links: Resource[]
  notes: Resource[]
}

export interface StepWorkspaceResponse {
  step: StepWorkspace
}

export interface ForgeStepResourcesResponse {
  step: StepWorkspace
  added: number
}

export interface ResourceResponse {
  resource: Resource
}

export type CreateResourceInput =
  | { kind: 'LINK'; stepId: string | null; title: string; url: string; sourceType: ResourceSourceType }
  | { kind: 'NOTE'; stepId: string | null; title: string; content: string }

export interface ImportNoteInput {
  stepId: string | null
  filename: string
  content: string
  title?: string
}

export interface UpdateResourceInput {
  title?: string
  url?: string | null
  sourceType?: ResourceSourceType
  content?: string
}

export interface ForgeResourcesResponse {
  resources: SkillResources
  added: number
}

export interface ForgeResponse {
  roadmap: Roadmap
  added: string[]
}
