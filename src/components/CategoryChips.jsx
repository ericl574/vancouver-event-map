import { categories } from "../data/categories";

export default function CategoryChips({ selectedCategory, onSelectCategory }) {
  return (
    <nav
      className="mt-3 flex gap-2 overflow-x-auto pb-1"
      aria-label="Event categories"
    >
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm ${
          selectedCategory === "all"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700"
        }`}
      >
        All
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelectCategory(category.id)}
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm ${
            selectedCategory === category.id
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${category.colorClass}`} />
          {category.label}
        </button>
      ))}
    </nav>
  );
}