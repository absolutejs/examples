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
import {
  FILTER_CLOSE_MS,
  MODAL_CLOSE_MS,
  SEARCH_FOCUS_DELAY_MS,
} from "../../constants";
import {
  PROVIDERS,
  filterModels,
  type ProviderKey,
  type ModelDef,
  type ModelCapability,
} from "../../models";
import { FilterPopoverComponent } from "./filter-popover.component";
import { ModelListItemComponent } from "./model-list-item.component";

const PROVIDER_LOGO_PATH = "/assets/svg/providers";

@Component({
  imports: [NgClass, FilterPopoverComponent, ModelListItemComponent],
  selector: "app-model-picker",
  standalone: true,
  template: `
    @if (visible()) {
      <div class="picker-overlay" (click)="handleClose()"></div>
      <div
        class="picker-modal"
        [ngClass]="{ closing: closing() }"
        (click)="filterOpen() ? closeFilter() : null"
      >
        <div class="picker-layout">
          <!-- Provider sidebar -->
          <div class="picker-providers">
            <button
              class="picker-prov-btn"
              [ngClass]="{ active: !providerFilter() }"
              (click)="providerFilter.set(undefined)"
              title="All providers"
              type="button"
            >
              <svg
                fill="none"
                height="16"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="16"
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
            </button>
            @for (prov of providers; track prov.id) {
              <button
                class="picker-prov-btn"
                [ngClass]="{ active: providerFilter() === prov.id }"
                (click)="
                  providerFilter.set(
                    providerFilter() === prov.id ? undefined : prov.id
                  )
                "
                [title]="prov.name"
                type="button"
              >
                <img
                  [alt]="prov.name"
                  class="picker-prov-logo"
                  height="18"
                  [src]="logoPath + '/' + prov.id + '.svg'"
                  width="18"
                />
              </button>
            }
          </div>

          <!-- Main area -->
          <div class="picker-main">
            <!-- Search bar -->
            <div class="picker-search">
              <svg
                fill="none"
                height="15"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="15"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
              <input
                #searchInput
                class="picker-search-input"
                (input)="search.set(searchInput.value)"
                placeholder="Search models..."
                [value]="search()"
              />
              <div class="picker-filter-wrap">
                <button
                  class="picker-filter-btn"
                  [ngClass]="{ 'has-filters': capFilters().length > 0 }"
                  (click)="toggleFilter($event)"
                  title="Filter by capabilities"
                  type="button"
                >
                  <svg
                    fill="none"
                    height="15"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="15"
                  >
                    <line x1="4" x2="4" y1="21" y2="14" />
                    <line x1="4" x2="4" y1="10" y2="3" />
                    <line x1="12" x2="12" y1="21" y2="12" />
                    <line x1="12" x2="12" y1="8" y2="3" />
                    <line x1="20" x2="20" y1="21" y2="16" />
                    <line x1="20" x2="20" y1="12" y2="3" />
                    <line x1="1" x2="7" y1="14" y2="14" />
                    <line x1="9" x2="15" y1="8" y2="8" />
                    <line x1="17" x2="23" y1="16" y2="16" />
                  </svg>
                  @if (capFilters().length > 0) {
                    <span class="filter-count">{{ capFilters().length }}</span>
                  }
                </button>
                @if (filterOpen()) {
                  <app-filter-popover
                    [capFilters]="capFilters()"
                    [closing]="filterClosing()"
                    [showLegacy]="showLegacy()"
                    (toggleCap)="toggleCap($event)"
                    (toggleLegacy)="showLegacy.set(!showLegacy())"
                  />
                }
              </div>
            </div>

            <!-- Model list -->
            <div class="picker-list">
              @if (groupedEntries().length === 0) {
                <div class="picker-empty">No models match your search</div>
              }
              @for (entry of groupedEntries(); track entry.providerId) {
                <div>
                  @if (!providerFilter()) {
                    <div class="picker-section-header">
                      {{ entry.providerName }}
                    </div>
                  }
                  @for (model of entry.models; track model.id) {
                    <app-model-list-item
                      [model]="model"
                      [selected]="model.id === currentModelId"
                      [providerLogoPath]="logoPath"
                      (select)="selectModel(model)"
                    />
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModelPickerComponent {
  @Input() currentModelId = "";
  @Input() set open(val: boolean) {
    if (val && !this.visible()) {
      this.visible.set(true);
      this.closing.set(false);
      setTimeout(
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
    setTimeout(() => {
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
    setTimeout(() => {
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
