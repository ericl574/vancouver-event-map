import { getCategoryTaxonomyById } from "../data/categoryTaxonomy";

function CategoryImageCard({ subcategory, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subcategory.id)}
      aria-pressed={isSelected}
      className={`group relative min-h-[112px] overflow-hidden rounded-2xl border text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[126px] ${
        isSelected
          ? "border-pink-300 ring-4 ring-pink-100"
          : "border-white/70 hover:border-pink-200"
      }`}
    >
      <img
        src={subcategory.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

      {isSelected && (
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-black text-white shadow-lg">
          ✓
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-base font-black leading-tight text-white drop-shadow">
          {subcategory.label}
        </p>
        {subcategory.description && (
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/80">
            {subcategory.description}
          </p>
        )}
      </div>
    </button>
  );
}

function DiscoverButton({ subcategory, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subcategory.id)}
      aria-pressed={isSelected}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
        isSelected
          ? "border-pink-300 bg-pink-50 text-pink-700 shadow-sm"
          : "border-slate-200 bg-white/90 text-slate-700 hover:border-pink-200 hover:bg-pink-50/70 hover:text-pink-700"
      }`}
    >
      <span className="truncate">{subcategory.label}</span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
          isSelected ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        {isSelected ? "✓" : "›"}
      </span>
    </button>
  );
}

export default function CategoryExplorePanel({
  selectedCategory,
  selectedSubcategory,
  onSelectSubcategory,
  avoidLeftPanel = false,
}) {
  const category = getCategoryTaxonomyById(selectedCategory);

  if (!category) return null;

  const allOption =
    category.subcategories.find((subcategory) => subcategory.id === "all") ??
    category.subcategories[0];

  const selectableSubcategories = category.subcategories.filter(
    (subcategory) => subcategory.id !== "all"
  );

  const popularSubcategories = selectableSubcategories.slice(0, 5);
  const discoverMoreSubcategories = selectableSubcategories.slice(5);

  return (
    <section
      data-category-explore-panel="true"
      className="w-full overflow-hidden border-b border-slate-200 bg-white/95 px-6 py-5 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300"
    >
      <div className="no-scrollbar mx-auto max-h-[min(54vh,500px)] max-w-7xl overflow-y-auto pt-1">
        {popularSubcategories.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                Popular
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {popularSubcategories.map((subcategory) => (
                <CategoryImageCard
                  key={subcategory.id}
                  subcategory={subcategory}
                  isSelected={selectedSubcategory === subcategory.id}
                  onSelect={onSelectSubcategory}
                />
              ))}
            </div>
          </div>
        )}

        {discoverMoreSubcategories.length > 0 && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[180px_1fr]">
            <div>
              <h3 className="text-xl font-black leading-tight text-slate-950">
                Discover more
              </h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Narrow the map by a more specific event type.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {discoverMoreSubcategories.map((subcategory) => (
                <DiscoverButton
                  key={subcategory.id}
                  subcategory={subcategory}
                  isSelected={selectedSubcategory === subcategory.id}
                  onSelect={onSelectSubcategory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
