import {
  ChangeDetectionStrategy, Component, computed, effect, input, output, signal,
} from '@angular/core';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { UserProfile } from '../../../../models/user.model';
import { PersonalityTypeChipComponent } from '../../../../features/personality/components/personality-type-chip/personality-type-chip.component';
import { prefersReducedMotion, ringOffset, useFallbackImage } from '../../utils/motion.util';

const ROTATE_MS = 3000;
const MAX_RADIUS = 3; // cards visible on each side of the active one (desktop)

@Component({
  selector: 'app-profile-orbit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule, PersonalityTypeChipComponent],
  templateUrl: './profile-orbit.html',
  styleUrl: './profile-orbit.scss',
})
export class ProfileOrbitComponent {
  readonly profiles = input<UserProfile[]>([]);
  readonly loading  = input(false);
  readonly error    = input(false);
  readonly viewProfile = output<UserProfile>();
  readonly retry       = output<void>();

  protected readonly active  = signal(0);
  protected readonly playing = signal(!prefersReducedMotion());
  /** True while the pointer/focus is on the stage, a swipe is in progress, or the tab is hidden. */
  protected readonly held    = signal(false);
  /** Cards that wrapped around the ring this tick — they teleport instead of sweeping across the arc. */
  protected readonly jumping = signal<ReadonlySet<number>>(new Set());

  protected readonly reduced = prefersReducedMotion();
  protected readonly skeletons = [0, 1, 2, 3, 4];

  protected readonly count  = computed(() => this.profiles().length);
  protected readonly radius = computed(() => Math.min(MAX_RADIUS, Math.floor((this.count() - 1) / 2)));

  protected readonly cards = computed(() => {
    const list = this.profiles();
    const n = list.length;
    const r = this.radius();
    const a = this.active() % Math.max(n, 1);
    return list.map((profile, i) => {
      const off = ringOffset(i, a, n);
      const clamped = Math.max(-(r + 1), Math.min(r + 1, off));
      return { profile, i, off: clamped, depth: Math.abs(clamped), isActive: off === 0 };
    });
  });

  protected readonly current = computed(() => this.profiles()[this.active()] ?? null);

  constructor() {
    // One timeout per tick, re-armed whenever the active card, play state or hold state changes.
    // onCleanup clears it on destroy and whenever interaction pauses the loop — no stray timers.
    effect(onCleanup => {
      this.active();
      if (!this.playing() || this.held() || this.count() < 2) return;
      const t = setTimeout(() => this.step(1), ROTATE_MS);
      onCleanup(() => clearTimeout(t));
    });
    // Pause while the tab is hidden.
    effect(onCleanup => {
      if (typeof document === 'undefined') return;
      const onVis = () => this.held.set(document.hidden);
      document.addEventListener('visibilitychange', onVis);
      onCleanup(() => document.removeEventListener('visibilitychange', onVis));
    });
  }

  protected step(dir: 1 | -1): void {
    const n = this.count();
    if (n < 2) return;
    this.goTo((this.active() % n + dir + n) % n);
  }

  protected goTo(next: number): void {
    const n = this.count();
    const r = this.radius();
    const cur = this.active() % Math.max(n, 1);
    if (next === cur) return;
    const wrapped = new Set<number>();
    for (let i = 0; i < n; i++) {
      if (Math.abs(ringOffset(i, cur, n) - ringOffset(i, next, n)) > r + 1) wrapped.add(i);
    }
    this.jumping.set(wrapped);
    this.active.set(next);
    if (wrapped.size) setTimeout(() => this.jumping.set(new Set()), 60);
  }

  protected togglePlay(): void { this.playing.update(p => !p); }

  protected onCardClick(card: { profile: UserProfile; i: number; isActive: boolean }): void {
    if (card.isActive) this.viewProfile.emit(card.profile);
    else this.goTo(card.i);
  }

  // ── Input handling ──────────────────────────────────────────────────────
  private startX: number | null = null;

  protected onPointerDown(e: PointerEvent): void { this.startX = e.clientX; this.held.set(true); }
  protected onPointerUp(e: PointerEvent): void {
    if (this.startX !== null) {
      const dx = e.clientX - this.startX;
      if (Math.abs(dx) > 45) this.step(dx < 0 ? 1 : -1);
    }
    this.startX = null;
    if (e.pointerType !== 'mouse') this.held.set(false);
  }
  protected onPointerCancel(): void { this.startX = null; this.held.set(false); }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') { this.step(1);  e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { this.step(-1); e.preventDefault(); }
  }

  protected setHeld(v: boolean): void { this.held.set(v); }

  // ── Display helpers (no invented data — blanks stay blank) ───────────────
  protected photo(p: UserProfile): string {
    const photos = p.photos ?? [];
    return (photos.find(x => x.isPrimary) ?? photos[0])?.url || '/avatar-default.svg';
  }
  protected jobOf(p: UserProfile): string { return (p.occupation as Partial<UserProfile["occupation"]> | undefined)?.title ?? ""; }
  protected cityOf(p: UserProfile): string { return (p.location as Partial<UserProfile["location"]> | undefined)?.city ?? ""; }
  protected isVerified(p: UserProfile): boolean { return !!(p.isProfileVerified || p.photos?.some(x => x.isVerified)); }
  protected fullName(p: UserProfile): string { return [p.firstName, p.lastName].filter(Boolean).join(' '); }
  protected readonly onImgError = useFallbackImage;
}
