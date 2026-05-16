import { getCategoryTaxonomyById } from "../data/categoryTaxonomy";

function SubcategoryButton({ subcategory, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subcategory.id)}
      aria-pressed={isSelected}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
        isSelected
          ? "border-pink-300 bg-pink-50 text-pink-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50/70 hover:text-pink-700"
      }`}
    >
      <span className="min-w-0 whitespace-normal leading-snug">{subcategory.label}</span>

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

  const heroImageUrl =
    allOption?.imageUrl || selectableSubcategories[0]?.imageUrl || "";

  return (
    <section
      data-category-explore-panel="true"
      className={`relative w-full overflow-hidden border-b border-slate-200 bg-gradient-to-r from-white/0 via-white/90 to-white/95 px-6 py-5 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 ${
        avoidLeftPanel
          ? "lg:ml-[390px] lg:w-[calc(100%-390px)]"
          : ""
      }`}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl gap-5 lg:grid-cols-[300px_1fr]">
        <button
          type="button"
          onClick={() => onSelectSubcategory("all")}
          aria-pressed={selectedSubcategory === "all"}
          className={`group relative min-h-[132px] overflow-hidden rounded-[1.5rem] border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
            selectedSubcategory === "all"
              ? "border-pink-300 ring-4 ring-pink-100"
              : "border-white/70 hover:border-pink-200"
          }`}
        >
          {heroImageUrl && (
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/10" />

          <div className="relative flex h-full min-h-[132px] flex-col justify-end p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">
              {category.shortLabel || category.label}
            </p>

            <h2 className="mt-1 text-2xl font-black leading-tight text-white drop-shadow">
              {category.allLabel || allOption?.label || category.label}
            </h2>

          </div>
        </button>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Explore by type
            </h3>

            <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
              Choose one to narrow the map
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {selectableSubcategories.map((subcategory) => (
              <SubcategoryButton
                key={subcategory.id}
                subcategory={subcategory}
                isSelected={selectedSubcategory === subcategory.id}
                onSelect={onSelectSubcategory}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
