import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core'
import { provideHttpClient, withFetch } from '@angular/common/http'
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideZonelessChangeDetection(),

    provideHttpClient(withFetch()),

    provideRouter(
      routes,

      withComponentInputBinding(),

      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
  ],
}
