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
      exactDate: "",
    });
  }

  function updateExactDate(exactDate) {
    onChange({
      ...filters,
      timeRange: "all",
      exactDate,
    });
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[90]">
      <section
        data-filter-panel="true"
        className="pointer-events-auto absolute bottom-4 left-4 right-4 rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl lg:bottom-auto lg:left-auto lg:right-8 lg:top-36 lg:w-[380px]"
      >
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">Filter events</h2>
          <p className="text-sm text-slate-500">
            Results update instantly on the map
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Quick time range
              </h3>

              {(filters.timeRange !== "all" || filters.exactDate) && (
                <span className="rounded-full bg-pink-50 px-2 py-1 text-xs font-semibold text-pink-600">
                  Active
                </span>
              )}
            </div>

            <div className="grid gap-2">
              {TIME_RANGE_OPTIONS.map((option) => {
                const isSelected =
                  filters.timeRange === option.id && !filters.exactDate;

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

          <div
            className={`rounded-2xl border p-4 ${
              filters.exactDate
                ? "border-pink-300 bg-pink-50"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="mb-3">
              <h3
                className={`text-sm font-bold ${
                  filters.exactDate ? "text-pink-700" : "text-slate-900"
                }`}
              >
                Exact date
              </h3>
              <p
                className={`text-xs ${
                  filters.exactDate ? "text-pink-500" : "text-slate-500"
                }`}
              >
                Show events happening on one specific day
              </p>
            </div>

            <input
              type="date"
              value={filters.exactDate || ""}
              onChange={(event) => updateExactDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
