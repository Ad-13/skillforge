import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core'

interface Mote {
  x: number
  y: number
  r: number
  vy: number
  phase: number
  gold: boolean
}

@Component({
  selector: 'sf-starfield',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }

    canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class Starfield {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas')
  private readonly destroyRef = inject(DestroyRef)

  constructor() {
    afterNextRender(() => this.start())
  }

  private start(): void {
    const canvas = this.canvas().nativeElement
    const context = canvas.getContext('2d')
    if (!context) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let motes: Mote[] = []
    let frame = 0
    let width = 0
    let height = 0

    const size = (): void => {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const count = Math.round(Math.min(70, width / 22))
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.4,
        vy: 0.06 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.72,
      }))
    }

    const draw = (time: number, move: boolean): void => {
      context.clearRect(0, 0, width, height)

      for (const mote of motes) {
        if (move) {
          mote.y -= mote.vy
          mote.x += Math.sin(time / 2600 + mote.phase) * 0.18
          if (mote.y < -10) {
            mote.y = height + 10
            mote.x = Math.random() * width
          }
        }

        const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time / 900 + mote.phase * 3))
        const colour = mote.gold ? '245, 217, 138' : '97, 213, 232'

        context.fillStyle = `rgba(${colour}, ${alpha * 0.18})`
        context.beginPath()
        context.arc(mote.x, mote.y, mote.r * 4, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = `rgba(${colour}, ${alpha})`
        context.beginPath()
        context.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2)
        context.fill()
      }
    }

    const loop = (time: number): void => {
      draw(time, true)
      frame = document.hidden || reduced.matches ? 0 : requestAnimationFrame(loop)
    }

    const resume = (): void => {
      if (reduced.matches) {
        cancelAnimationFrame(frame)
        frame = 0
        draw(0, false)
        return
      }
      if (frame === 0 && !document.hidden) frame = requestAnimationFrame(loop)
    }

    let resizeTimer = 0
    const onResize = (): void => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        size()
        if (reduced.matches) draw(0, false)
      }, 150)
    }

    size()
    resume()

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', resume)
    reduced.addEventListener('change', resume)

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', resume)
      reduced.removeEventListener('change', resume)
    })
  }
}
