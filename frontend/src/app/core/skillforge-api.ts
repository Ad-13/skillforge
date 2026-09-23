import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  ExpansionResponse,
  MeResponse,
  SkillMapResponse,
  SkillResponse,
  SkillsResponse,
} from './api.types';

@Injectable({ providedIn: 'root' })
export class SkillForgeApi {
  private readonly http = inject(HttpClient);
  private readonly options = { withCredentials: true } as const;

  me(): Promise<MeResponse> {
    return firstValueFrom(this.http.get<MeResponse>('/api/users/me', this.options));
  }

  listSkills(): Promise<SkillsResponse> {
    return firstValueFrom(this.http.get<SkillsResponse>('/api/skills', this.options));
  }

  addSkill(name: string): Promise<SkillResponse> {
    return firstValueFrom(this.http.post<SkillResponse>('/api/skills', { name }, this.options));
  }

  removeSkill(slug: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/skills/${slug}`, this.options));
  }

  getMap(slug: string, lens: string): Promise<SkillMapResponse> {
    return firstValueFrom(
      this.http.get<SkillMapResponse>(`/api/skills/${slug}/maps/${lens}`, this.options),
    );
  }

  generateMap(slug: string, lens: string): Promise<SkillMapResponse> {
    return firstValueFrom(
      this.http.post<SkillMapResponse>(`/api/skills/${slug}/maps/${lens}`, {}, this.options),
    );
  }

  expandNode(slug: string, lens: string, nodeId: string): Promise<ExpansionResponse> {
    return firstValueFrom(
      this.http.post<ExpansionResponse>(
        `/api/skills/${slug}/maps/${lens}/nodes/${nodeId}/expand`,
        {},
        this.options,
      ),
    );
  }
}

export const describeHttpError = (error: unknown): string => {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    if (body && typeof body.message === 'string') return body.message;

    if (error.status === 0) return 'Cannot reach the server. Is it running?';
    if (error.status === 401) return 'Your session has expired. Sign in again.';
    if (error.status === 404) return 'Not found.';
    return `Request failed (${error.status})`;
  }

  return 'Request failed';
};

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && error.status === 401;
