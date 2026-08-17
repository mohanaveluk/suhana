import { AfterViewInit, DestroyRef, Directive, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelect } from '@angular/material/select';

/**
 * Companion to the `.select-search-box` pattern: put an inline filter box inside
 * a `<mat-select>` panel and bind this directive to the current filter text.
 *
 *   <mat-select [appSelectSearch]="occupationSearch()"> …
 *
 * It does two things Material cannot know about on its own:
 *
 * 1. Highlights the first match as soon as the list is filtered, so Enter picks
 *    the obvious option without arrowing to it first.
 *
 * 2. Keeps the active option clear of the sticky search box. MatSelect scrolls
 *    via `panel.scrollTop = option.offsetTop`, and because the search box is the
 *    panel's first child in flow, that offset already includes the box's height
 *    — leaving the option pinned underneath it and the scrollbar short of the top.
 */
@Directive({
  selector: 'mat-select[appSelectSearch]',
})
export class SelectSearchDirective implements AfterViewInit {
  /** Current filter text. Changing it re-activates the first match. */
  readonly appSelectSearch = input<string>('');

  private readonly select = inject(MatSelect, { self: true });
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const term = this.appSelectSearch();
      if (!this.select.panelOpen) return;

      // Defer past this render so the filtered options exist and their
      // offsetTop values are measurable.
      setTimeout(() => {
        if (term.trim() && this.select.options.length) {
          this.keyManager?.setFirstItemActive?.();
        }
        this.keepActiveClearOfSearchBox();
      });
    });
  }

  ngAfterViewInit(): void {
    // Arrow navigation: correct the scroll position Material just set.
    this.keyManager?.change
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => setTimeout(() => this.keepActiveClearOfSearchBox()));
  }

  /**
   * MatSelect keeps its key manager private. Read through a guarded accessor so
   * a Material upgrade degrades to plain behaviour instead of throwing.
   */
  private get keyManager(): any {
    return (this.select as unknown as { _keyManager?: any })._keyManager;
  }

  private keepActiveClearOfSearchBox(): void {
    const panel = this.select.panel?.nativeElement as HTMLElement | undefined;
    const index: number = this.keyManager?.activeItemIndex ?? -1;
    if (!panel || index < 0) return;

    const host = this.select.options.toArray()[index]?._getHostElement?.() as HTMLElement | undefined;
    if (!host) return;

    const headerHeight =
      panel.querySelector<HTMLElement>('.select-search-box')?.offsetHeight ?? 0;

    // Option 0 resolves to scrollTop 0, so the panel reaches the very top.
    if (host.offsetTop - panel.scrollTop < headerHeight) {
      panel.scrollTop = Math.max(0, host.offsetTop - headerHeight);
    }
  }
}
