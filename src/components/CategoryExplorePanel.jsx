import { getCategoryTaxonomyById } from "../data/categoryTaxonomy";

function CategoryImageCard({ subcategory, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subcategory.id)}
      aria-pressed={isSelected}
      className={`group relative min-h-[132px] overflow-hidden rounded-[1.7rem] border text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
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
      className={`mt-3 w-full overflow-hidden rounded-[2rem] border border-pink-100 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-pink-900/10 backdrop-blur-xl transition-all duration-300 sm:p-5 lg:max-w-[calc(100vw-3rem)] ${
        avoidLeftPanel ? "lg:ml-[230px] lg:max-w-[calc(100vw-32rem)]" : ""
      }`}
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">
            {category.eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">
            {category.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Pick a popular type or discover more specific event styles.
          </p>
        </div>

        {allOption && (
          <button
            type="button"
            onClick={() => onSelectSubcategory("all")}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
              selectedSubcategory === "all"
                ? "border-pink-300 bg-pink-50 text-pink-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
            }`}
          >
            <span>{category.allLabel || allOption.label}</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      <div className="no-scrollbar max-h-[460px] overflow-y-auto pt-5">
        {popularSubcategories.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                Popular
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
              <h3 className="text-2xl font-black leading-none text-slate-950">
                Discover
                <br />
                more
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
