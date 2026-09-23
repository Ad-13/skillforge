import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { MeResponse, SkillLevel, SkillsResponse, SkillResponse } from './api.types';

@Injectable({ providedIn: 'root' })
export class SkillForgeApi {
  private readonly http = inject(HttpClient);
  private readonly options = { withCredentials: true } as const;

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>('/api/users/me', this.options);
  }

  listSkills(): Observable<SkillsResponse> {
    return this.http.get<SkillsResponse>('/api/skills', this.options);
  }

  addSkill(name: string, level: SkillLevel): Observable<SkillResponse> {
    return this.http.post<SkillResponse>('/api/skills', { name, level }, this.options);
  }

  removeSkill(id: string): Observable<void> {
    return this.http.delete<void>(`/api/skills/${id}`, this.options);
  }
}
