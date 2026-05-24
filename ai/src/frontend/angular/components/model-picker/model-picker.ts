import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  effect,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { NgClass } from "@angular/common";
import { useTimers } from "@absolutejs/absolute/angular";
import {
  FILTER_CLOSE_MS,
  MODAL_CLOSE_MS,
  SEARCH_FOCUS_DELAY_MS,
} from "../../../constants";
import {
  PROVIDERS,
  filterModels,
  type ProviderKey,
  type ModelDef,
  type ModelCapability,
} from "../../../models";
import { FilterPopoverComponent } from "../filter-popover/filter-popover";
import { ModelListItemComponent } from "../model-list-item/model-list-item";

const PROVIDER_LOGO_PATH = "/assets/svg/providers";

@Component({
  imports: [NgClass, FilterPopoverComponent, ModelListItemComponent],
  selector: "app-model-picker",
  standalone: true,
  templateUrl: "./model-picker.html",
})
export class ModelPickerComponent {
  @Input() currentModelId = "";
  @Input() set open(val: boolean) {
    if (val && !this.visible()) {
      this.visible.set(true);
      this.closing.set(false);
      this.timers.setTimeout(
        () => this.searchInput?.nativeElement?.focus(),
        SEARCH_FOCUS_DELAY_MS,
      );
    }
    if (!val && this.visible() && !this.closing()) {
      this.search.set("");
    }
  }
  @Output() close = new EventEmitter<void>();
  @Output() selectModelEvent = new EventEmitter<ModelDef>();

  @ViewChild("searchInput") searchInput?: ElementRef<HTMLInputElement>;

  providers = PROVIDERS;
  logoPath = PROVIDER_LOGO_PATH;

  search = signal("");
  providerFilter = signal<ProviderKey | undefined>(undefined);
  showLegacy = signal(false);
  capFilters = signal<ModelCapability[]>([]);
  filterOpen = signal(false);
  filterClosing = signal(false);
  visible = signal(false);
  closing = signal(false);

  private readonly timers = useTimers();

  private escHandler = (evt: KeyboardEvent) => {
    if (evt.key === "Escape") this.handleClose();
  };

  private visibleEffect = effect(() => {
    if (typeof window === "undefined") return;
    if (this.visible()) {
      window.addEventListener("keydown", this.escHandler);
    } else {
      window.removeEventListener("keydown", this.escHandler);
    }
  });

  ngOnDestroy() {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", this.escHandler);
  }

  groupedEntries() {
    const models = filterModels(
      this.search(),
      this.providerFilter(),
      this.showLegacy(),
      this.capFilters().length > 0 ? this.capFilters() : undefined,
    );

    const grouped = new Map<string, ModelDef[]>();
    for (const model of models) {
      const existing = grouped.get(model.provider) ?? [];
      existing.push(model);
      grouped.set(model.provider, existing);
    }

    return Array.from(grouped.entries()).map(([providerId, provModels]) => {
      const prov = PROVIDERS.find((p) => p.id === providerId);

      return {
        models: provModels,
        providerId,
        providerName: prov?.name ?? providerId,
      };
    });
  }

  closeFilter() {
    this.filterClosing.set(true);
    this.timers.setTimeout(() => {
      this.filterClosing.set(false);
      this.filterOpen.set(false);
    }, FILTER_CLOSE_MS);
  }

  toggleFilter(evt: Event) {
    evt.stopPropagation();
    if (this.filterOpen()) {
      this.closeFilter();
    } else {
      this.filterOpen.set(true);
      this.filterClosing.set(false);
    }
  }

  toggleCap(cap: ModelCapability) {
    const prev = this.capFilters();
    this.capFilters.set(
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  }

  handleClose() {
    this.closing.set(true);
    this.filterOpen.set(false);
    this.filterClosing.set(false);
    this.timers.setTimeout(() => {
      this.closing.set(false);
      this.visible.set(false);
      this.close.emit();
    }, MODAL_CLOSE_MS);
  }

  selectModel(model: ModelDef) {
    this.selectModelEvent.emit(model);
    this.handleClose();
  }
}
