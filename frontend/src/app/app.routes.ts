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
    path: '**',
    redirectTo: '',
  },
];
