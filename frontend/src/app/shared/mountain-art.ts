import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core'

const IMAGE_WIDTH = 1536
const IMAGE_HEIGHT = 1024
const PEAK_X = 0.7333
const PEAK_Y = 0.356

interface Placement {
  size: string
  position: string
  runeLeft: number
  runeTop: number
  runeHeight: number
}

@Component({
  selector: 'sf-mountain-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shade"></div>
    <div class="fog"></div>
    <div class="fog fog--far"></div>

    @if (rune() && placement(); as p) {
      <div class="beam" [style.left.px]="p.runeLeft" [style.height.px]="p.runeTop + 4"></div>
      <div
        class="halo"
        [style.left.px]="p.runeLeft"
        [style.top.px]="p.runeTop + p.runeHeight * 0.4"
        [style.width.px]="p.runeHeight * 0.9"
        [style.height.px]="p.runeHeight * 0.9"
      ></div>
      <svg
        class="rune"
        viewBox="0 0 120 400"
        [style.left.px]="p.runeLeft"
        [style.top.px]="p.runeTop"
        [style.height.px]="p.runeHeight"
        [style.width.px]="p.runeHeight * 0.3"
        aria-hidden="true"
      >
        <circle class="thin" cx="60" cy="160" r="54" />
        <circle class="thin" cx="60" cy="160" r="80" stroke-dasharray="2 7" />
        <path d="M60 6V392" />
        <path d="M60 40l7 12-7 12-7-12z" />
        <path d="M60 116l26 44-26 44-26-44z" />
        <path d="M60 142l11 18-11 18-11-18z" />
        <path d="M60 244L28 292M60 244l32 48M60 274l-20 30M60 274l20 30" />
        <path d="M60 350l6 10-6 10-6-10z" />
        <path class="thin" d="M44 100h32M40 222h40" />
      </svg>
    }

    <div class="content"><ng-content /></div>
  `,
  host: {
    '[style.background-size]': 'placement()?.size',
    '[style.background-position]': 'placement()?.position',
  },
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      isolation: isolate;
      background-color: var(--bg-side);
      background-image: url('/images/mountains.webp');
      background-repeat: no-repeat;
      background-size: cover;
      background-position: 70% 40%;
    }

    .shade {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background: var(--art-shade, linear-gradient(0deg, rgb(2 8 18 / 0.8), transparent 35%));
    }

    .fog {
      position: absolute;
      left: -30%;
      right: -30%;
      bottom: 8%;
      height: 42%;
      z-index: 1;
      pointer-events: none;
      opacity: 0.55;
      background:
        radial-gradient(40% 60% at 30% 50%, rgb(169 184 192 / 0.16), transparent 70%),
        radial-gradient(35% 55% at 72% 60%, rgb(169 184 192 / 0.12), transparent 70%);
      animation: drift 38s linear infinite alternate;
    }

    .fog--far {
      bottom: 22%;
      opacity: 0.35;
      animation-duration: 54s;
      animation-direction: alternate-reverse;
    }

    .beam,
    .halo,
    .rune {
      position: absolute;
      z-index: 2;
      pointer-events: none;
      transform: translateX(-50%);
    }

    .beam {
      top: 0;
      width: 2px;
      background: linear-gradient(180deg, transparent, rgb(245 217 138 / 0.35) 40%, rgb(245 217 138 / 0.75));
      filter: blur(1px);
    }

    .halo {
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: radial-gradient(circle, rgb(235 197 106 / 0.28), rgb(235 197 106 / 0.06) 45%, transparent 70%);
      animation: breathe 6s ease-in-out infinite;
    }

    .rune {
      overflow: visible;
      filter: drop-shadow(0 0 4px rgb(245 217 138 / 0.95)) drop-shadow(0 0 18px rgb(235 197 106 / 0.6))
        drop-shadow(0 0 46px rgb(201 163 61 / 0.45));
      animation: breathe 6s ease-in-out infinite;
    }

    .rune path,
    .rune circle {
      fill: none;
      stroke: var(--gold-bright);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .rune .thin {
      stroke-width: 1;
      opacity: 0.45;
    }

    .content {
      position: relative;
      z-index: 3;
      height: 100%;
    }

    @keyframes drift {
      from {
        transform: translateX(-6%);
      }
      to {
        transform: translateX(6%);
      }
    }

    @keyframes breathe {
      0%,
      100% {
        opacity: 0.82;
      }
      50% {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .fog,
      .halo,
      .rune {
        animation: none;
      }
    }
  `,
})
export class MountainArt {
  readonly focusX = input(0.6)
  readonly focusY = input(0.55)
  readonly rune = input(true)

  protected readonly placement = signal<Placement | null>(null)

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly destroyRef = inject(DestroyRef)

  constructor() {
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.measure())
      observer.observe(this.host.nativeElement)
      this.destroyRef.onDestroy(() => observer.disconnect())
      this.measure()
    })
  }

  private measure(): void {
    const width = this.host.nativeElement.clientWidth
    const height = this.host.nativeElement.clientHeight
    if (width === 0 || height === 0) return

    const scale = Math.max(width / IMAGE_WIDTH, height / IMAGE_HEIGHT) * 1.04
    const imageWidth = IMAGE_WIDTH * scale
    const imageHeight = IMAGE_HEIGHT * scale

    const offsetX = Math.min(0, Math.max(width - imageWidth, width * this.focusX() - PEAK_X * imageWidth))
    const offsetY = Math.min(0, Math.max(height - imageHeight, height * this.focusY() - PEAK_Y * imageHeight))

    const peakX = offsetX + PEAK_X * imageWidth
    const peakY = offsetY + PEAK_Y * imageHeight
    const runeHeight = Math.max(90, Math.min(height * 0.36, 300))

    this.placement.set({
      size: `${imageWidth}px ${imageHeight}px`,
      position: `${offsetX}px ${offsetY}px`,
      runeLeft: peakX,
      runeTop: peakY - runeHeight * 0.97,
      runeHeight,
    })
  }
}
