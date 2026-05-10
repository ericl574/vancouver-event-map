const TIME_RANGE_OPTIONS = [
  {
    id: "all",
    label: "Any time",
    description: "Show all upcoming events",
  },
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
];

export default function FilterPanel({
  isOpen,
  filters,
  onChange,
  onClose,
  onReset,
}) {
  if (!isOpen) return null;

  function updateTimeRange(timeRange) {
    onChange({
      ...filters,
      timeRange,
    });
  }

  return (
    <div className="absolute inset-0 z-[90]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        aria-label="Close filters"
      />

      <section className="absolute bottom-0 left-0 right-0 z-[91] rounded-t-[2rem] bg-white p-5 shadow-2xl lg:bottom-auto lg:left-auto lg:right-8 lg:top-28 lg:w-[360px] lg:rounded-[2rem]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Filter by time
            </h2>
            <p className="text-sm text-slate-500">
              Choose how soon events should happen
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-2">
          {TIME_RANGE_OPTIONS.map((option) => {
            const isSelected = filters.timeRange === option.id;

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

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Apply
          </button>
        </div>
      </section>
    </div>
  );
}