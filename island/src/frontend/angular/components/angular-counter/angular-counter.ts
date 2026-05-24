import "@angular/compiler";
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  signal,
} from "@angular/core";
import { IslandStore, useSubscription } from "@absolutejs/absolute/angular";
import { counterIslandStore } from "../../../islands/counterStore";

// This is a loose Angular ISLAND, JIT-compiled at render time (note the
// `@angular/compiler` import). JIT can't load an external `templateUrl` without
// `resolveComponentResources()`, so an island component must use an inline
// template — the one exception to the example's folder/templateUrl convention.
@Component({
  selector: "abs-angular-counter",
  standalone: true,
  template: `
    <div class="island-card island-card-angular">
      <div class="island-header">
        <img alt="Angular" height="20" src="/assets/svg/angular.svg" />
        <span>{{ label }}</span>
      </div>
      <strong>Local: {{ count() }}</strong>
      <strong>Shared: {{ sharedCount() }}</strong>
      <button (click)="increment()" type="button">Increment Angular</button>
      <button (click)="incrementShared()" type="button">
        Increment Shared
      </button>
    </div>
  `,
})
class AngularCounterImpl implements OnInit {
  static __absoluteProps = {
    initialCount: 0,
    label: "",
  };

  readonly changeDetectorRef = inject(ChangeDetectorRef);
  readonly destroyRef = inject(DestroyRef);
  readonly islandStore = inject(IslandStore);
  readonly incrementSharedAction = this.islandStore.get(
    counterIslandStore,
    (state) => state.incrementShared,
  );
  @Input() initialCount = 0;
  @Input() label = "";
  readonly count = signal(this.initialCount);
  readonly sharedCount = signal(0);

  ngOnInit() {
    this.count.set(this.initialCount);
    // useSubscription auto-tears down on destroy — no manual Subscription or
    // ngOnDestroy needed. Pass the captured DestroyRef since ngOnInit is not an
    // injection context.
    useSubscription(
      this.islandStore.select(
        counterIslandStore,
        (state) => state.sharedCount,
      ),
      (value) => {
        this.sharedCount.set(Number(value));
        this.changeDetectorRef.detectChanges();
      },
      this.destroyRef,
    );
  }

  increment() {
    this.count.update((value) => value + 1);
  }

  incrementShared() {
    this.incrementSharedAction();
  }
}

export const AngularCounter = AngularCounterImpl;
