/** True when the visitor asked the OS/browser for reduced motion. Safe during SSR/tests. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Shortest signed distance from `active` to `index` on a ring of `size` slots. */
export function ringOffset(index: number, active: number, size: number): number {
  let d = (index - active) % size;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

/** Swallow a broken image once and show the app's default avatar instead. */
export function useFallbackImage(event: Event, fallback = '/avatar-default.svg'): void {
  const img = event.target as HTMLImageElement;
  if (!img.src.endsWith(fallback)) img.src = fallback;
}
