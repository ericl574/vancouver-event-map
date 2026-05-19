import { useEffect, useRef, useState } from "react";
import { IconSearch, IconSliders, IconX } from "./Icons";
import { fetchAddressSuggestions } from "../services/geocodingService";

export default function SearchBar({
  query,
  onQueryChange,
  onFilterClick,
  onSearchSubmit,
  onSelectSuggestion,
  isSearchingLocation = false,
  activeFilterSummary,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchAddressSuggestions(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  function handleSuggestionSelect(suggestion) {
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    onSelectSuggestion?.(suggestion);
  }

  function handleKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    onSearchSubmit?.(query);
  }

  function handleClear() {
    onQueryChange("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl bg-white/97 p-2 shadow-xl shadow-slate-900/10 backdrop-blur ring-1 ring-slate-200/60"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <IconSearch className="h-4.5 w-4.5 shrink-0 text-slate-400" />

          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search events or places"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Search events or address"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 hover:bg-slate-100"
              aria-label="Clear search"
            >
              <IconX className="h-4 w-4 text-slate-400" />
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
            {isSearchingLocation ? "..." : "Near"}
          </button>
        )}

        {activeFilterSummary && (
          <button
            type="button"
            onClick={onFilterClick}
            className="hidden max-w-[200px] shrink-0 rounded-xl border border-pink-300 bg-pink-50 px-3 py-1.5 text-left transition hover:border-pink-400 hover:bg-pink-100"
            aria-label={`Toggle time filters: ${activeFilterSummary.label}`}
            data-filter-toggle="true"
          >
            <div className="truncate text-xs font-bold text-pink-700">
              {activeFilterSummary.label}
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={onFilterClick}
          className="rounded-xl bg-slate-100 p-2.5 transition hover:bg-slate-200"
          aria-label="Toggle time filters"
          data-filter-toggle="true"
        >
          <IconSliders className="h-4.5 w-4.5 text-slate-600" />
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleSuggestionSelect(suggestion);
              }}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                index === highlightedIndex ? "bg-pink-50" : "hover:bg-slate-50"
              } ${index > 0 ? "border-t border-slate-100" : ""}`}
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {suggestion.shortLabel}
                </div>
                {suggestion.label !== suggestion.shortLabel && (
                  <div className="mt-0.5 truncate text-xs text-slate-400">
                    {suggestion.label}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
