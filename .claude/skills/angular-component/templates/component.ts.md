# Skeleton: presentational component (`<name>.ts`)

```ts
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MaterialModule } from '../../shared/modules/material.module';

@Component({
  selector: 'app-<name>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './<name>.html',
  styleUrl: './<name>.scss',
})
export class <Name>Component {
  // Data in, events out — the host owns loading and navigation.
  readonly items   = input<Item[]>([]);
  readonly loading = input(false);
  readonly error   = input(false);
  readonly select  = output<Item>();
  readonly retry   = output<void>();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly count = computed(() => this.items().length);

  protected pick(item: Item): void {
    this.selectedId.set(item.id);
    this.select.emit(item);
  }
}
```

## Page host that loads data (`<name>.ts`)

```ts
export class <Name>Component implements OnInit {
  private readonly api = inject(<ExistingService>);
  protected readonly items = signal<Item[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try { this.items.set(await this.api.getItems()); }
    catch { this.error.set(true); }
    finally { this.loading.set(false); }
  }
}
```

## Timer / listener inside a component (no leaks)

```ts
constructor() {
  effect(onCleanup => {
    this.active();                       // re-arm when this changes
    if (!this.playing() || this.held()) return;
    const t = setTimeout(() => this.step(1), 3000);
    onCleanup(() => clearTimeout(t));
  });
}
```
