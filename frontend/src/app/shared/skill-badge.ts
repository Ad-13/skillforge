import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core'
import { hueFor, initialsFor } from './skill-identity'

@Component({
  selector: 'sf-skill-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ initials() }}`,
  host: {
    'aria-hidden': 'true',
    '[class.badge--xs]': "size() === 'xs'",
    '[class.badge--sm]': "size() === 'sm'",
    '[class.badge--md]': "size() === 'md'",
    '[class.badge--lg]': "size() === 'lg'",
    '[style.--hue]': 'hue()',
  },
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      border-radius: 50%;
      font-family: var(--font-body);
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--hue);
      background: radial-gradient(
        circle at 50% 35%,
        color-mix(in srgb, var(--hue) 24%, transparent),
        rgb(6 19 29 / 0.92) 72%
      );
      border: 1px solid color-mix(in srgb, var(--hue) 55%, transparent);
      box-shadow: 0 0 16px -4px color-mix(in srgb, var(--hue) 60%, transparent);
    }

    :host(.badge--xs) {
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.625rem;
    }

    :host(.badge--sm) {
      width: 2rem;
      height: 2rem;
      font-size: 0.75rem;
    }

    :host(.badge--md) {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 0.875rem;
    }

    :host(.badge--lg) {
      width: 3.25rem;
      height: 3.25rem;
      font-size: 1.0625rem;
    }
  `,
})
export class SkillBadge {
  readonly name = input.required<string>()
  readonly slug = input.required<string>()
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md')

  protected readonly initials = computed(() => initialsFor(this.name()))
  protected readonly hue = computed(() => hueFor(this.slug()))
}
