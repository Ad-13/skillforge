import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'SkillForge',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'skills/:slug',
    title: 'Skill map · SkillForge',
    loadComponent: () => import('./features/skill-map/skill-map-page').then((m) => m.SkillMapPage),
  },
  {
    path: 'skills/:slug/roadmap',
    title: 'Learning plan · SkillForge',
    loadComponent: () => import('./features/roadmap/roadmap-page').then((m) => m.RoadmapPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
