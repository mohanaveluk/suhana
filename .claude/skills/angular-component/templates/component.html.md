# Skeleton: template with all required states (`<name>.html`)

```html
@if (loading()) {
  <div class="list" aria-busy="true" aria-label="Loading items">
    @for (s of [0, 1, 2, 3]; track s) { <div class="item sk"></div> }
  </div>
} @else if (error()) {
  <div class="state" role="alert">
    <mat-icon aria-hidden="true">cloud_off</mat-icon>
    <p>We couldn't load this right now.</p>
    <button mat-stroked-button type="button" (click)="retry.emit()">Try again</button>
  </div>
} @else if (count() === 0) {
  <div class="state">
    <mat-icon aria-hidden="true">inbox</mat-icon>
    <p>Nothing here yet.</p>
  </div>
} @else {
  <ul class="list">
    @for (item of items(); track item.id) {
      <li>
        <button type="button" class="item" (click)="pick(item)"
                [attr.aria-label]="'Open ' + item.name">
          <img [src]="item.photoUrl || '/avatar-default.svg'" alt="" loading="lazy" decoding="async"
               (error)="onImgError($event)" />
          <strong>{{ item.name }}</strong>
          @if (item.city) { <span>{{ item.city }}</span> }
        </button>
      </li>
    }
  </ul>
}
```

Notes
- Image fallback helper: `useFallbackImage` in `pages/home-v2/utils/motion.util.ts` (copy or promote to `shared/utils/` if reused outside home-v2).
- Optional fields: `@if` them, never print `undefined`.
