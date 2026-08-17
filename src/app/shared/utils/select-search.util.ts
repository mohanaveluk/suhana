/**
 * Keys that must still reach mat-select while an inline search box inside its
 * panel has focus.
 *
 * Home/End are deliberately excluded: mat-select would jump to the first/last
 * option, but in a text box those keys belong to caret movement.
 */
const SELECT_NAV_KEYS = new Set([
  'ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab',
]);

/**
 * Keydown handler for a `.select-search-box` input rendered inside a
 * `<mat-select>` panel.
 *
 * The panel element binds `(keydown)="_handleKeydown($event)"`, so every
 * keystroke in the search box also reaches mat-select. Letting characters
 * through means its typeahead hijacks the highlighted option and Space selects
 * one; blanket-stopping everything (the previous approach) also killed arrow
 * navigation and Enter.
 *
 * So: swallow ordinary characters, pass navigation keys through.
 */
export function onSelectSearchKeydown(event: KeyboardEvent): void {
  if (!SELECT_NAV_KEYS.has(event.key)) {
    event.stopPropagation();
  }
}
