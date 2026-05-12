import { IconSearch, IconSliders, IconX } from "./Icons";

export default function SearchBar({
  query,
  onQueryChange,
  onFilterClick,
  onSearchSubmit,
  isSearchingLocation = false,
  activeFilterSummary,
}) {
  function handleSubmit(event) {
    event.preventDefault();

    if (!query.trim()) return;

    onSearchSubmit?.(query);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-xl backdrop-blur"
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        <IconSearch className="h-5 w-5 text-slate-500" />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search events, venues, or enter an address..."
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          aria-label="Search events or address"
        />

        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="rounded-full p-1 hover:bg-slate-100"
            aria-label="Clear search"
            title="Clear search"
          >
            <IconX className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      {query.trim() && (
        <button
          type="submit"
          disabled={isSearchingLocation}
          className="hidden rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:block"
          title="Pin this as a reference location"
        >
          {isSearchingLocation ? "Searching..." : "Near"}
        </button>
      )}

      {activeFilterSummary && (
        <button
          type="button"
          onClick={onFilterClick}
          className="hidden max-w-[260px] shrink-0 rounded-2xl border border-pink-300 bg-pink-50 px-4 py-2 text-left transition hover:border-pink-400 hover:bg-pink-100 sm:block"
          aria-label={`Toggle time filters: ${activeFilterSummary.label}`}
          data-filter-toggle="true"
        >
          <div className="truncate text-sm font-bold text-pink-700">
            {activeFilterSummary.label}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-pink-500">
            {activeFilterSummary.description}
          </div>
        </button>
      )}

      <button
        type="button"
        onClick={onFilterClick}
        className="rounded-xl bg-slate-100 p-3 transition hover:bg-slate-200"
        aria-label="Toggle time filters"
        title="Toggle time filters"
      >
        <IconSliders className="h-5 w-5 text-slate-700" />
      </button>
    </form>
  );
}
