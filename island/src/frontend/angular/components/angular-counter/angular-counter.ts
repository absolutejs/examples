import "@angular/compiler";
import {
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from "@angular/core";
import { Subscription } from "rxjs";
import { IslandStore } from "@absolutejs/absolute/angular";
import { counterIslandStore } from "../../../islands/counterStore";

@Component({
  selector: "abs-angular-counter",
  standalone: true,
  templateUrl: "./angular-counter.html",
})
class AngularCounterImpl implements OnDestroy, OnInit {
  static __absoluteProps = {
    initialCount: 0,
    label: "",
  };

  readonly changeDetectorRef = inject(ChangeDetectorRef);
  readonly islandStore = inject(IslandStore);
  readonly incrementSharedAction = this.islandStore.get(
    counterIslandStore,
    (state) => state.incrementShared,
  );
  subscription = new Subscription();
  @Input() initialCount = 0;
  @Input() label = "";
  readonly count = signal(this.initialCount);
  readonly sharedCount = signal(0);

  ngOnInit() {
    this.count.set(this.initialCount);
    this.subscription.add(
      this.islandStore
        .select(counterIslandStore, (state) => state.sharedCount)
        .subscribe((value) => {
          this.sharedCount.set(Number(value));
          this.changeDetectorRef.detectChanges();
        }),
    );
  }

  increment() {
    this.count.update((value) => value + 1);
  }

  incrementShared() {
    this.incrementSharedAction();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

export const AngularCounter = AngularCounterImpl;
