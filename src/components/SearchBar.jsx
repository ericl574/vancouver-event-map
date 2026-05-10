import { IconSearch, IconSliders, IconX } from "./Icons";

export default function SearchBar({ query, onQueryChange, onFilterClick }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-xl backdrop-blur">
      <div className="flex flex-1 items-center gap-2 px-3">
        <IconSearch className="h-5 w-5 text-slate-500" />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search events, venues, neighborhoods..."
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          aria-label="Search events"
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

      <button
        type="button"
        onClick={onFilterClick}
        className="rounded-xl bg-slate-100 p-3 transition hover:bg-slate-200"
        aria-label="Open time filters"
        title="Open time filters"
      >
        <IconSliders className="h-5 w-5 text-slate-700" />
      </button>
    </div>
  );
}