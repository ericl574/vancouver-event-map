const TIME_RANGE_OPTIONS = [
  {
    id: "24h",
    label: "Next 24 hours",
    description: "Events starting within 1 day",
  },
  {
    id: "3d",
    label: "Next 3 days",
    description: "Events starting within 3 days",
  },
  {
    id: "5d",
    label: "Next 5 days",
    description: "Events starting within 5 days",
  },
  {
    id: "1w",
    label: "Next 1 week",
    description: "Events starting within 7 days",
  },
  {
    id: "30d",
    label: "Next 30 days",
    description: "Default map view",
  },
  {
    id: "3m",
    label: "Next 3 months",
    description: "Plan ahead without crowding the map",
  },
  {
    id: "6m",
    label: "Next 6 months",
    description: "Show longer-term concerts and major events",
  },
  {
    id: "1y",
    label: "Next year",
    description: "Events up to 1 year ahead",
  },
  {
    id: "all",
    label: "All upcoming",
    description: "Show every stored upcoming event",
  },
];

export default function FilterPanel({ isOpen, filters, onChange, onClose }) {
  if (!isOpen) return null;

  function updateTimeRange(timeRange) {
    onChange({
      ...filters,
      timeRange,
      startDate: "",
      endDate: "",
    });
  }

  function updateDateRange(field, value) {
    onChange({
      ...filters,
      timeRange: "all",
      [field]: value,
    });
  }

  const hasCustomDateRange = Boolean(filters.startDate || filters.endDate);

  function resetToDefaultFilters() {
    onChange({
      ...filters,
      timeRange: "30d",
      startDate: "",
      endDate: "",
    });
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]">
      <section
        data-filter-panel="true"
        className="pointer-events-auto absolute bottom-4 left-4 right-4 flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden overflow-x-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl lg:bottom-auto lg:left-auto lg:right-8 lg:top-36 lg:max-h-[calc(100vh-10.25rem)] lg:w-[380px] lg:max-w-[380px]"
      >
        <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Filter events</h2>
            <p className="text-sm text-slate-500">
              Results update instantly on the map
            </p>
          </div>

          <button
            type="button"
            onClick={resetToDefaultFilters}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-pink-50 hover:text-pink-600"
          >
            Reset default
          </button>
        </div>

        <div className="no-scrollbar min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pb-3 pr-1">
          <div
            className={`rounded-2xl border p-4 ${
              hasCustomDateRange
                ? "border-pink-300 bg-pink-50"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="mb-3">
              <h3
                className={`text-sm font-bold ${
                  hasCustomDateRange ? "text-pink-700" : "text-slate-900"
                }`}
              >
                Custom date range
              </h3>
              <p
                className={`text-xs ${
                  hasCustomDateRange ? "text-pink-500" : "text-slate-500"
                }`}
              >
                Show events between selected dates
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Start date
                </span>
                <input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(event) =>
                    updateDateRange("startDate", event.target.value)
                  }
                  className="block w-full min-w-0 max-w-full box-border rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  End date
                </span>
                <input
                  type="date"
                  value={filters.endDate || ""}
                  min={filters.startDate || undefined}
                  onChange={(event) =>
                    updateDateRange("endDate", event.target.value)
                  }
                  className="block w-full min-w-0 max-w-full box-border rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Quick time range
              </h3>

              {(filters.timeRange !== "all" || hasCustomDateRange) && (
                <span className="rounded-full bg-pink-50 px-2 py-1 text-xs font-semibold text-pink-600">
                  Active
                </span>
              )}
            </div>

            <div className="grid gap-2">
              {TIME_RANGE_OPTIONS.map((option) => {
                const isSelected =
                  filters.timeRange === option.id && !hasCustomDateRange;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateTimeRange(option.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-pink-300 bg-pink-50 text-pink-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-bold">{option.label}</div>
                    <div
                      className={`mt-0.5 text-xs ${
                        isSelected ? "text-pink-500" : "text-slate-500"
                      }`}
                    >
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
