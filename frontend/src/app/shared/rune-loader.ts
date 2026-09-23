import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Rune } from './rune';
import { LOADER_RUNES } from './runes';

@Component({
  selector: 'sf-rune-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Rune],
  template: `
    <div class="row" role="status" [attr.aria-label]="label()">
      @for (rune of runes; track rune) {
        <sf-rune [name]="rune" [size]="size()" />
      }
    </div>
    @if (label()) {
      <p class="caption">{{ label() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .row {
      display: inline-flex;
      align-items: flex-end;
      gap: var(--space-3);
      color: var(--ink-faint);
    }

    sf-rune {
      /* Each rune's own highlight colour. Overridden per position below so the
         wave shifts hue as it travels rather than flashing one flat cyan. */
      --pulse: var(--accent-bright);
      animation: rune-sweep var(--dur-sweep) var(--ease-out) infinite;
    }

    sf-rune:nth-child(1) {
      animation-delay: 0ms;
    }
    sf-rune:nth-child(2) {
      animation-delay: 120ms;
      --pulse: var(--aurora-1);
    }
    sf-rune:nth-child(3) {
      animation-delay: 240ms;
    }
    sf-rune:nth-child(4) {
      animation-delay: 360ms;
      --pulse: var(--aurora-2);
    }
    sf-rune:nth-child(5) {
      animation-delay: 480ms;
    }

    /* Idle for most of the cycle, lit for a moment. The long tail is what
       makes it read as one light passing rather than five blinking lamps. */
    @keyframes rune-sweep {
      0%,
      45%,
      100% {
        color: var(--ink-faint);
        filter: none;
        transform: none;
      }
      18% {
        color: var(--pulse);
        filter: drop-shadow(0 0 7px var(--pulse));
        transform: translateY(-3px);
      }
    }

    .caption {
      font-family: var(--font-display);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink-faint);
    }

    /* Without this the page would offer a permanently frozen row of glyphs and
       no sign that anything is happening. A quiet opacity pulse says "working"
       without any movement at all. */
    @media (prefers-reduced-motion: reduce) {
      sf-rune {
        animation: none;
      }
      .row {
        animation: reduced-breathe 1.6s ease-in-out infinite alternate;
      }
      @keyframes reduced-breathe {
        from {
          opacity: 0.45;
        }
        to {
          opacity: 1;
        }
      }
    }
  `,
})
export class RuneLoader {
  readonly size = input(22);
  readonly label = input('');

  protected readonly runes = LOADER_RUNES;
}
