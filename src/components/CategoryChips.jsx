import { categories } from "../data/categories";

export default function CategoryChips({ selectedCategory, onSelectCategory }) {
  const selectedClass =
    "border-rose-300 bg-rose-50 text-rose-700 shadow-md";
  const unselectedClass =
    "border-slate-200 bg-white/95 text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  return (
    <nav
      className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
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
        <span>✨</span>
        <span>All</span>
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelectCategory(category.id)}
          aria-pressed={selectedCategory === category.id}
          className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
            selectedCategory === category.id ? selectedClass : unselectedClass
          }`}
        >
          <span className="text-base leading-none">
            {category.icon}
          </span>
          <span>{category.label}</span>
        </button>
      ))}
    </nav>
  );
}