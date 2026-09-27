import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

const PATHS = {
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  map: [
    'M8 11l7.9-4.4M8 13l7.9 4.4',
    'M6 9.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
    'M18 3.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
    'M18 16.3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
  ],
  plan: ['M5 3v18', 'M5 4h11l-2.2 3.5L16 11H5'],
  book: [
    'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z',
    'M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5',
  ],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  plus: ['M12 5v14M5 12h14'],
  arrow: ['M5 12h14M13 6l6 6-6 6'],
  back: ['M19 12H5M11 6l-6 6 6 6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  x: ['M6 6l12 12M18 6L6 18'],
  chevron: ['M9 6l6 6-6 6'],
  logout: ['M10 4H5v16h5M15 8l4 4-4 4M19 12H9'],
  external: ['M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'],
  upload: ['M12 16V4M7 9l5-5 5 5M4 20h16'],
  edit: ['M4 20h4L19 9l-4-4L4 16z'],
  link: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  ],
  note: ['M6 3h9l4 4v14H6z', 'M14 3v5h5M9 13h7M9 17h5'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 17v4M17 19h4'],
  inbox: ['M3 13l3-8h12l3 8v6H3z', 'M3 13h5l1.5 2.5h5L16 13h5'],
  diamond: ['M12 3l6 9-6 9-6-9z'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6M14 11v6'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'sf-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);

  protected readonly paths = computed(() => PATHS[this.name()]);
}
