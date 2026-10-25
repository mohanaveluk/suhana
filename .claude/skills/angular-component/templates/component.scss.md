# Skeleton: stylesheet (`<name>.scss`)

```scss
:host { display: block; }

.list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px;
}

.item {
  all: unset; box-sizing: border-box; display: block; cursor: pointer;
  border-radius: 18px; overflow: hidden;
  background: #fff; border: 1px solid var(--suhana-rose-gold-lighter);
  box-shadow: 0 8px 24px var(--suhana-shadow);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover, &:focus-visible { transform: translateY(-4px); }
  &:focus-visible { outline: 3px solid var(--suhana-maroon); outline-offset: 3px; }

  &.sk {
    height: 240px; cursor: default;
    background: linear-gradient(100deg, #f1dfe2 30%, #fbf1f2 50%, #f1dfe2 70%) 0 0 / 220% 100%;
    animation: shimmer 1.4s linear infinite;
  }
}
@keyframes shimmer { to { background-position: -220% 0; } }

.state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 16px; text-align: center; color: var(--suhana-text-secondary);
  mat-icon { font-size: 38px; width: 38px; height: 38px; color: var(--suhana-rose-gold); }
}

@media (max-width: 640px) {
  .list { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .item { transition: none; }
  .item:hover, .item:focus-visible { transform: none; }
  .item.sk { animation: none; }
}
```
