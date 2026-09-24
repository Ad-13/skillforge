import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import type {
  CreateSkillResponse,
  ExpansionResponse,
  CreateResourceInput,
  ForgeResourcesResponse,
  ForgeResponse,
  ForgeStepResourcesResponse,
  ImportNoteInput,
  ImportSkillsResponse,
  ResourceResponse,
  ResourcesResponse,
  StageResourcesResponse,
  StepWorkspaceResponse,
  UpdateResourceInput,
  RoadmapResponse,
  MeResponse,
  PromoteResponse,
  SkillMapResponse,
  SkillResponse,
  SkillsResponse,
} from './api.types'

@Injectable({ providedIn: 'root' })
export class SkillForgeApi {
  private readonly http = inject(HttpClient)
  private readonly options = { withCredentials: true } as const

  me(): Promise<MeResponse> {
    return firstValueFrom(this.http.get<MeResponse>('/api/users/me', this.options))
  }

  listSkills(): Promise<SkillsResponse> {
    return firstValueFrom(this.http.get<SkillsResponse>('/api/skills', this.options))
  }

  addSkill(name: string): Promise<CreateSkillResponse> {
    return firstValueFrom(
      this.http.post<CreateSkillResponse>('/api/skills', { name }, this.options),
    )
  }

  removeSkill(slug: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/skills/${slug}`, this.options))
  }

  getMap(slug: string, lens: string): Promise<SkillMapResponse> {
    return firstValueFrom(
      this.http.get<SkillMapResponse>(`/api/skills/${slug}/maps/${lens}`, this.options),
    )
  }

  generateMap(slug: string, lens: string): Promise<SkillMapResponse> {
    return firstValueFrom(
      this.http.post<SkillMapResponse>(`/api/skills/${slug}/maps/${lens}`, {}, this.options),
    )
  }

  getRoadmap(slug: string): Promise<RoadmapResponse> {
    return firstValueFrom(
      this.http.get<RoadmapResponse>(`/api/skills/${slug}/roadmap`, this.options),
    )
  }

  forgeRoadmap(slug: string): Promise<ForgeResponse> {
    return firstValueFrom(
      this.http.post<ForgeResponse>(`/api/skills/${slug}/roadmap`, {}, this.options),
    )
  }

  setStepComplete(slug: string, stepId: string, complete: boolean): Promise<RoadmapResponse> {
    return firstValueFrom(
      this.http.patch<RoadmapResponse>(
        `/api/skills/${slug}/roadmap/steps/${stepId}`,
        { complete },
        this.options,
      ),
    )
  }

  expandNode(slug: string, lens: string, nodeId: string): Promise<ExpansionResponse> {
    return firstValueFrom(
      this.http.post<ExpansionResponse>(
        `/api/skills/${slug}/maps/${lens}/nodes/${nodeId}/expand`,
        {},
        this.options,
      ),
    )
  }

  importSkills(skills: readonly string[]): Promise<ImportSkillsResponse> {
    return firstValueFrom(
      this.http.post<ImportSkillsResponse>(
        '/api/skills/import',
        { skills },
        this.options,
      ),
    )
  }

  getResources(slug: string): Promise<ResourcesResponse> {
    return firstValueFrom(
      this.http.get<ResourcesResponse>(`/api/skills/${slug}/resources`, this.options),
    )
  }

  getStageResources(slug: string, stageId: string): Promise<StageResourcesResponse> {
    return firstValueFrom(
      this.http.get<StageResourcesResponse>(
        `/api/skills/${slug}/resources/stages/${stageId}`,
        this.options,
      ),
    )
  }

  getStepResources(slug: string, stepId: string): Promise<StepWorkspaceResponse> {
    return firstValueFrom(
      this.http.get<StepWorkspaceResponse>(
        `/api/skills/${slug}/resources/steps/${stepId}`,
        this.options,
      ),
    )
  }

  forgeStepResources(slug: string, stepId: string): Promise<ForgeStepResourcesResponse> {
    return firstValueFrom(
      this.http.post<ForgeStepResourcesResponse>(
        `/api/skills/${slug}/resources/steps/${stepId}`,
        {},
        this.options,
      ),
    )
  }

  createResource(slug: string, input: CreateResourceInput): Promise<ResourceResponse> {
    return firstValueFrom(
      this.http.post<ResourceResponse>(`/api/skills/${slug}/resources`, input, this.options),
    )
  }

  importNote(slug: string, input: ImportNoteInput): Promise<ResourceResponse> {
    return firstValueFrom(
      this.http.post<ResourceResponse>(
        `/api/skills/${slug}/resources/import`,
        input,
        this.options,
      ),
    )
  }

  updateResource(
    slug: string,
    resourceId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceResponse> {
    return firstValueFrom(
      this.http.patch<ResourceResponse>(
        `/api/skills/${slug}/resources/${resourceId}`,
        input,
        this.options,
      ),
    )
  }

  forgeStageResources(slug: string, stageId: string): Promise<ForgeResourcesResponse> {
    return firstValueFrom(
      this.http.post<ForgeResourcesResponse>(
        `/api/skills/${slug}/resources/stages/${stageId}`,
        {},
        this.options,
      ),
    )
  }

  deleteResource(slug: string, resourceId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`/api/skills/${slug}/resources/${resourceId}`, this.options),
    )
  }

  promoteNode(slug: string, lens: string, nodeId: string): Promise<PromoteResponse> {
    return firstValueFrom(
      this.http.post<PromoteResponse>(
        `/api/skills/${slug}/maps/${lens}/nodes/${nodeId}/promote`,
        {},
        this.options,
      ),
    )
  }
}

export const describeHttpError = (error: unknown): string => {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null
    if (body && typeof body.message === 'string') return body.message

    if (error.status === 0) return 'Cannot reach the server. Is it running?'
    if (error.status === 401) return 'Your session has expired. Sign in again.'
    if (error.status === 404) return 'Not found.'
    return `Request failed (${error.status})`
  }

  return 'Request failed'
}

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && error.status === 401
