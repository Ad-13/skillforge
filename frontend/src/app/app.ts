import { Component, ChangeDetectionStrategy, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SessionStore } from './core/session.store';
import { ThemeService } from './core/theme.service';
import { Rune } from './shared/rune';
import { RuneLoader } from './shared/rune-loader';
import type { RuneName } from './shared/runes';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Rune, RuneLoader],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly session = inject(SessionStore);
  protected readonly theme = inject(ThemeService);

  protected readonly themeRune = computed<RuneName>(() => {
    switch (this.theme.choice()) {
      case 'light':
        return 'SOWILO';
      case 'dark':
        return 'ISA';
      default:
        return 'JERA';
    }
  });

  protected readonly themeLabel = computed(() => {
    const choice = this.theme.choice();
    return choice === 'system' ? 'Auto' : choice === 'light' ? 'Light' : 'Dark';
  });

  ngOnInit(): void {
    void this.session.load();
  }

  protected retry(): void {
    void this.session.load();
  }
}
