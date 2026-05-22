import { getCategoryTaxonomyById } from "../data/categoryTaxonomy";

function SubcategoryChip({ subcategory, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subcategory.id)}
      aria-pressed={isSelected}
      className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition active:scale-[0.97] ${
        isSelected
          ? "border-pink-300 bg-pink-50 text-pink-700 shadow-sm"
          : "border-white/60 bg-white/80 text-slate-700 hover:border-pink-200 hover:bg-pink-50/90 hover:text-pink-600"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${
          isSelected ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        {isSelected ? "✓" : "·"}
      </span>
      <span className="min-w-0 truncate">{subcategory.label}</span>
    </button>
  );
}

export default function CategoryExplorePanel({
  selectedCategory,
  selectedSubcategory,
  onSelectSubcategory,
  onClose,
}) {
  const category = getCategoryTaxonomyById(selectedCategory);

  if (!category) return null;

  const allOption =
    category.subcategories.find((s) => s.id === "all") ??
    category.subcategories[0];

  const selectableSubcategories = category.subcategories.filter(
    (s) => s.id !== "all"
  );

  const heroImageUrl =
    allOption?.imageUrl || selectableSubcategories[0]?.imageUrl || "";

  return (
    <section
      data-category-explore-panel="true"
      className="relative flex max-h-[52dvh] w-full flex-col overflow-hidden border-b border-white/20 shadow-xl shadow-slate-900/10 transition-all duration-300 lg:max-h-none lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-white/20 lg:shadow-2xl lg:shadow-slate-900/14"
    >
      {/* Blurred hero image stretched as panel background */}
      {heroImageUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={heroImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 backdrop-blur-2xl" />
          <div className="absolute inset-0 bg-white/40" />
        </div>
      )}

      {/* Inner scrollable wrapper */}
      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto">
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] lg:gap-5 lg:px-6 lg:py-5">

          {/* Hero photo card */}
          <div
            className="group relative overflow-hidden lg:min-h-[120px] lg:rounded-[1.5rem] lg:border lg:border-white/70 lg:shadow-sm"
          >
            {heroImageUrl && (
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/10" />

            <div className="relative flex min-h-[84px] flex-col justify-end p-4 lg:min-h-[120px] lg:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-300 lg:text-xs">
                {category.shortLabel || category.label}
              </p>

              <h2 className="mt-0.5 text-base font-black leading-tight text-white drop-shadow lg:mt-1 lg:text-2xl">
                {category.allLabel || allOption?.label || category.label}
              </h2>
            </div>
          </div>

          {/* Subcategory chips */}
          <div className="px-4 py-3 lg:min-w-0 lg:px-0 lg:py-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                Explore by type
              </h3>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-xs text-slate-500 transition hover:bg-white hover:text-slate-800 lg:hidden"
                  aria-label="Close explore panel"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {selectableSubcategories.map((subcategory) => (
                <SubcategoryChip
                  key={subcategory.id}
                  subcategory={subcategory}
                  isSelected={selectedSubcategory === subcategory.id}
                  onSelect={onSelectSubcategory}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
