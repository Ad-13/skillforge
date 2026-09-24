import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core'
import { RUNES, strokeToPoints, type RuneName } from './runes'

@Component({
  selector: 'sf-rune',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 10 16"
      [attr.width]="width()"
      [attr.height]="height()"
      aria-hidden="true"
      focusable="false"
    >
      @for (points of strokes(); track $index) {
        <polyline [attr.points]="points" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: inherit;
    }

    polyline {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.25;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Rune {
  readonly name = input.required<RuneName>()
  readonly size = input(18)

  protected readonly height = computed(() => this.size())
  protected readonly width = computed(() => Math.round((this.size() / 16) * 10))

  protected readonly strokes = computed(() => RUNES[this.name()].strokes.map(strokeToPoints))
}
