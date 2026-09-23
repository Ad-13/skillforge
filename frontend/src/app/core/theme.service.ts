import { Injectable, signal, effect, DOCUMENT, inject } from '@angular/core';

export type Theme = 'light' | 'dark';
export type ThemeChoice = Theme | 'system';

const STORAGE_KEY = 'skillforge:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly media =
    this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)') ?? null;

  private readonly system = signal<Theme>(this.media?.matches ? 'dark' : 'light');

  readonly choice = signal<ThemeChoice>(this.readStoredChoice());

  readonly resolved = signal<Theme>('dark');

  constructor() {
    this.media?.addEventListener('change', (event) =>
      this.system.set(event.matches ? 'dark' : 'light'),
    );

    effect(() => {
      const choice = this.choice();
      const resolved = choice === 'system' ? this.system() : choice;

      this.resolved.set(resolved);
      this.document.documentElement.dataset['theme'] = resolved;

      try {
        if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, choice);
      } catch {}
    });
  }

  next(): void {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    const index = order.indexOf(this.choice());
    this.choice.set(order[(index + 1) % order.length] as ThemeChoice);
  }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
  }

  private readStoredChoice(): ThemeChoice {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
