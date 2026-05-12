import CategoryIcon from "./CategoryIcon";
import { categories } from "../data/categories";

export default function CategoryChips({ selectedCategory, onSelectCategory }) {
  const selectedClass =
    "border-rose-300 bg-rose-50 text-rose-700 shadow-md";
  const unselectedClass =
    "border-slate-200 bg-white/95 text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  return (
    <nav
      className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-14 pb-1"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 56px, black calc(100% - 96px), transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 56px, black calc(100% - 96px), transparent 100%)",
      }}
      aria-label="Event categories"
    >
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        aria-pressed={selectedCategory === "all"}
        className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
          selectedCategory === "all" ? selectedClass : unselectedClass
        }`}
      >
        <CategoryIcon
          icon="all"
          className={`h-4 w-4 ${
            selectedCategory === "all" ? "text-rose-700" : "text-slate-500"
          }`}
        />
        <span>All</span>
      </button>

      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            aria-pressed={isSelected}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
              isSelected ? selectedClass : unselectedClass
            }`}
          >
            <CategoryIcon
              icon={category.icon}
              className={`h-4 w-4 ${
                isSelected ? "text-rose-700" : "text-slate-500"
              }`}
            />
            <span>{category.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
