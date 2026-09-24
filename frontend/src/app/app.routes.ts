import type { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'SkillForge',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'roadmap',
    title: 'Adding your skills · SkillForge',
    loadComponent: () =>
      import('./features/handover/handover-page').then((m) => m.HandoverPage),
  },
  {
    path: 'skills/:slug',
    title: 'Skill map · SkillForge',
    loadComponent: () =>
      import('./features/skill-map/skill-map-page').then((m) => m.SkillMapPage),
  },
  {
    path: 'skills/:slug/roadmap',
    title: 'Learning plan · SkillForge',
    loadComponent: () =>
      import('./features/roadmap/roadmap-page').then((m) => m.RoadmapPage),
  },
  {
    path: 'skills/:slug/resources',
    title: 'Resources · SkillForge',
    loadComponent: () =>
      import('./features/resources/resources-page').then((m) => m.ResourcesPage),
  },
  {
    path: 'skills/:slug/stages/:stageId/resources',
    title: 'Stage resources · SkillForge',
    loadComponent: () =>
      import('./features/resources/stage-resources-page').then((m) => m.StageResourcesPage),
  },
  {
    path: 'skills/:slug/steps/:stepId/resources',
    title: 'Step resources · SkillForge',
    loadComponent: () =>
      import('./features/resources/step-resources-page').then((m) => m.StepResourcesPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
]
