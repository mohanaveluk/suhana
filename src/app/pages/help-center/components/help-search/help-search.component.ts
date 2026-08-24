import { Component, ChangeDetectionStrategy, ElementRef, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { HelpCenterService } from '../../help-center.service';
import { HELP_TRENDING_SEARCHES, HelpSearchHit } from '../../help-center.model';

const RECENT_SEARCHES_KEY = 'suhana-help-recent-searches';
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-help-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './help-search.component.html',
  styleUrl: './help-search.component.scss',
})
export class HelpSearchComponent {
  private readonly svc = inject(HelpCenterService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Emitted when the visitor commits to a result — the container decides how to act on it. */
  readonly hitSelected = output<HelpSearchHit>();

  protected readonly query = signal('');
  protected readonly hits = signal<HelpSearchHit[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly panelOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly trending = HELP_TRENDING_SEARCHES;
  protected readonly recent = signal<string[]>(this.loadRecentSearches());

  private debounceHandle?: ReturnType<typeof setTimeout>;
  private searchToken = 0;

  protected onInput(value: string): void {
    this.query.set(value);
    this.panelOpen.set(true);
    this.activeIndex.set(-1);

    clearTimeout(this.debounceHandle);
    const trimmed = value.trim();
    if (!trimmed) {
      this.hits.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.debounceHandle = setTimeout(() => this.runSearch(trimmed), DEBOUNCE_MS);
  }

  private runSearch(query: string): void {
    const token = ++this.searchToken;
    this.svc.search(query).subscribe(hits => {
      if (token !== this.searchToken) return; // a newer keystroke superseded this request
      this.hits.set(hits);
      this.isSearching.set(false);
    });
  }

  protected onFocus(): void {
    this.panelOpen.set(true);
  }

  protected onBlur(): void {
    // Let a click on a panel option register before the panel closes.
    setTimeout(() => this.panelOpen.set(false), 150);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const list = this.hits();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.length) this.activeIndex.set((this.activeIndex() + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.length) this.activeIndex.set((this.activeIndex() - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      const active = list[this.activeIndex()];
      if (active) {
        event.preventDefault();
        this.selectHit(active);
      }
    } else if (event.key === 'Escape') {
      this.panelOpen.set(false);
      (this.host.nativeElement.querySelector('input') as HTMLInputElement | null)?.blur();
    }
  }

  protected selectHit(hit: HelpSearchHit): void {
    this.commitToRecent(this.query().trim() || hit.title);
    this.panelOpen.set(false);
    this.hitSelected.emit(hit);
  }

  protected selectChip(text: string): void {
    this.query.set(text);
    this.panelOpen.set(true);
    this.isSearching.set(true);
    this.runSearch(text);
  }

  protected clear(): void {
    this.query.set('');
    this.hits.set([]);
    this.isSearching.set(false);
  }

  protected clearRecent(): void {
    this.recent.set([]);
    this.persistRecentSearches([]);
  }

  /** Highlights the matched substring inside a result title/subtitle for scanability. */
  protected highlight(text: string): string {
    const q = this.query().trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return `${text.slice(0, idx)}<mark>${text.slice(idx, idx + q.length)}</mark>${text.slice(idx + q.length)}`;
  }

  private commitToRecent(term: string): void {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...this.recent().filter(r => r.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, MAX_RECENT_SEARCHES);
    this.recent.set(next);
    this.persistRecentSearches(next);
  }

  private loadRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }

  private persistRecentSearches(searches: string[]): void {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch {
      // Storage unavailable (private browsing, quota) — recent searches just won't persist.
    }
  }
}
