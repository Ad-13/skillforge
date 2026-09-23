import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { marked } from 'marked';

@Component({
  selector: 'sf-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<div class="md" [innerHTML]="html()"></div>`,
  styleUrl: './markdown.css',
})
export class Markdown {
  readonly source = input<string>('');

  protected readonly html = computed(() => {
    const text = this.source();
    if (!text) return '';
    return marked.parse(text, { async: false, gfm: true, breaks: false }) as string;
  });
}
