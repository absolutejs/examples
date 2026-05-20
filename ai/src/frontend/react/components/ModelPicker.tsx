import { useState, useRef, useEffect, type RefObject } from "react";
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
import { FilterPopover } from "./FilterPopover";
import { ModelListItem } from "./ModelListItem";

type ModelPickerProps = {
  currentModelId: string;
  onClose: () => void;
  onSelect: (model: ModelDef) => void;
  open: boolean;
};

const PROVIDER_LOGO_PATH = "/assets/svg/providers";

export const ModelPicker = ({
  currentModelId,
  onClose,
  onSelect,
  open,
}: ModelPickerProps) => {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<ProviderKey | undefined>(
    undefined,
  );
  const [showLegacy, setShowLegacy] = useState(false);
  const [capFilters, setCapFilters] = useState<ModelCapability[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterClosing, setFilterClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const closeFilter = () => {
    setFilterClosing(true);
    setTimeout(() => {
      setFilterClosing(false);
      setFilterOpen(false);
    }, FILTER_CLOSE_MS);
  };

  const toggleFilter = () => {
    if (filterOpen) {
      closeFilter();
    } else {
      setFilterOpen(true);
      setFilterClosing(false);
    }
  };

  const toggleCap = (cap: ModelCapability) => {
    setCapFilters((prev) =>
      prev.includes(cap) ? prev.filter((cur) => cur !== cap) : [...prev, cap],
    );
  };

  const handleClose = () => {
    setClosing(true);
    setFilterOpen(false);
    setFilterClosing(false);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, MODAL_CLOSE_MS);
  };

  useEffect(() => {
    if (open && !visible) {
      setVisible(true);
      setClosing(false);
      setTimeout(() => searchRef.current?.focus(), SEARCH_FOCUS_DELAY_MS);
    }

    if (!open && visible && !closing) {
      setSearch("");
    }
  }, [open, visible, closing]);

  useEffect(() => {
    const handleKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        handleClose();
      }
    };

    if (visible) {
      window.addEventListener("keydown", handleKey);
    }

    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const models = filterModels(
    search,
    providerFilter,
    showLegacy,
    capFilters.length > 0 ? capFilters : undefined,
  );

  const grouped = new Map<string, ModelDef[]>();

  for (const model of models) {
    const existing = grouped.get(model.provider) ?? [];
    existing.push(model);
    grouped.set(model.provider, existing);
  }

  return (
    <>
      <div className="picker-overlay" onClick={handleClose} />
      <div
        className={`picker-modal ${closing ? "closing" : ""}`}
        onClick={() => {
          if (filterOpen) closeFilter();
        }}
      >
        <PickerLayout
          capFilters={capFilters}
          currentModelId={currentModelId}
          filterClosing={filterClosing}
          filterOpen={filterOpen}
          grouped={grouped}
          handleClose={handleClose}
          onSearch={setSearch}
          onSelect={onSelect}
          onToggleCap={toggleCap}
          onToggleFilter={toggleFilter}
          onToggleLegacy={() => setShowLegacy(!showLegacy)}
          providerFilter={providerFilter}
          search={search}
          searchRef={searchRef}
          setProviderFilter={setProviderFilter}
          showLegacy={showLegacy}
        />
      </div>
    </>
  );
};

type PickerLayoutProps = {
  capFilters: ModelCapability[];
  currentModelId: string;
  filterClosing: boolean;
  filterOpen: boolean;
  grouped: Map<string, ModelDef[]>;
  handleClose: () => void;
  onSearch: (query: string) => void;
  onSelect: (model: ModelDef) => void;
  onToggleCap: (cap: ModelCapability) => void;
  onToggleFilter: () => void;
  onToggleLegacy: () => void;
  providerFilter: ProviderKey | undefined;
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  setProviderFilter: (id: ProviderKey | undefined) => void;
  showLegacy: boolean;
};

const PickerLayout = ({
  capFilters,
  currentModelId,
  filterClosing,
  filterOpen,
  grouped,
  handleClose,
  onSearch,
  onSelect,
  onToggleCap,
  onToggleFilter,
  onToggleLegacy,
  providerFilter,
  search,
  searchRef,
  setProviderFilter,
  showLegacy,
}: PickerLayoutProps) => (
  <div className="picker-layout">
    <PickerProviders
      onSelect={setProviderFilter}
      providerFilter={providerFilter}
    />
    <div className="picker-main">
      <PickerSearch
        capFilters={capFilters}
        filterClosing={filterClosing}
        filterOpen={filterOpen}
        onSearch={onSearch}
        onToggleCap={onToggleCap}
        onToggleFilter={onToggleFilter}
        onToggleLegacy={onToggleLegacy}
        search={search}
        searchRef={searchRef}
        showLegacy={showLegacy}
      />
      <PickerList
        currentModelId={currentModelId}
        grouped={grouped}
        handleClose={handleClose}
        onSelect={onSelect}
        providerFilter={providerFilter}
      />
    </div>
  </div>
);

type PickerListProps = {
  currentModelId: string;
  grouped: Map<string, ModelDef[]>;
  handleClose: () => void;
  onSelect: (model: ModelDef) => void;
  providerFilter: ProviderKey | undefined;
};

const PickerList = ({
  currentModelId,
  grouped,
  handleClose,
  onSelect,
  providerFilter,
}: PickerListProps) => (
  <div className="picker-list">
    {grouped.size === 0 && (
      <div className="picker-empty">No models match your search</div>
    )}
    {Array.from(grouped.entries()).map(([providerId, provModels]) => {
      const prov = PROVIDERS.find((prv) => prv.id === providerId);

      return (
        <div key={providerId}>
          {!providerFilter && (
            <div className="picker-section-header">
              {prov?.name ?? providerId}
            </div>
          )}
          {provModels.map((model) => (
            <ModelListItem
              key={model.id}
              model={model}
              onClick={() => {
                onSelect(model);
                handleClose();
              }}
              providerLogoPath={PROVIDER_LOGO_PATH}
              selected={model.id === currentModelId}
            />
          ))}
        </div>
      );
    })}
  </div>
);

type PickerProvidersProps = {
  onSelect: (id: ProviderKey | undefined) => void;
  providerFilter: ProviderKey | undefined;
};

const PickerProviders = ({
  onSelect,
  providerFilter,
}: PickerProvidersProps) => (
  <div className="picker-providers">
    <button
      className={`picker-prov-btn ${!providerFilter ? "active" : ""}`}
      onClick={() => onSelect(undefined)}
      title="All providers"
      type="button"
    >
      <svg
        fill="none"
        height="16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="16"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
    {PROVIDERS.map((prov) => (
      <button
        className={`picker-prov-btn ${providerFilter === prov.id ? "active" : ""}`}
        key={prov.id}
        onClick={() =>
          onSelect(providerFilter === prov.id ? undefined : prov.id)
        }
        title={prov.name}
        type="button"
      >
        <img
          alt={prov.name}
          className="picker-prov-logo"
          height="18"
          src={`${PROVIDER_LOGO_PATH}/${prov.id}.svg`}
          width="18"
        />
      </button>
    ))}
  </div>
);

type PickerSearchProps = {
  capFilters: ModelCapability[];
  filterClosing: boolean;
  filterOpen: boolean;
  onSearch: (query: string) => void;
  onToggleCap: (cap: ModelCapability) => void;
  onToggleFilter: () => void;
  onToggleLegacy: () => void;
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  showLegacy: boolean;
};

const PickerSearch = ({
  capFilters,
  filterClosing,
  filterOpen,
  onSearch,
  onToggleCap,
  onToggleFilter,
  onToggleLegacy,
  search,
  searchRef,
  showLegacy,
}: PickerSearchProps) => (
  <div className="picker-search">
    <svg
      fill="none"
      height="15"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="15"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
    <input
      className="picker-search-input"
      onChange={(evt) => onSearch(evt.target.value)}
      placeholder="Search models..."
      ref={searchRef}
      value={search}
    />
    <div className="picker-filter-wrap">
      <button
        className={`picker-filter-btn ${capFilters.length > 0 ? "has-filters" : ""}`}
        onClick={onToggleFilter}
        title="Filter by capabilities"
        type="button"
      >
        <svg
          fill="none"
          height="15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
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
        {capFilters.length > 0 && (
          <span className="filter-count">{capFilters.length}</span>
        )}
      </button>
      {filterOpen && (
        <FilterPopover
          capFilters={capFilters}
          closing={filterClosing}
          onToggleCap={onToggleCap}
          onToggleLegacy={onToggleLegacy}
          showLegacy={showLegacy}
        />
      )}
    </div>
  </div>
);
