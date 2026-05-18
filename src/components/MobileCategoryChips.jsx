import CategoryIcon from "./CategoryIcon";
import { categories } from "../data/categories";

const navItems = [{ id: "all", label: "All", icon: "all" }, ...categories];

export default function MobileCategoryChips({ selectedCategory, onSelectCategory }) {
  return (
    <nav
      data-category-explore-toggle="true"
      className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-2"
      aria-label="Event categories"
    >
      {navItems.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            aria-pressed={isSelected}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              isSelected
                ? "border-pink-500 bg-pink-600 text-white shadow-sm"
                : "border-slate-200/80 bg-white/90 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white"
            }`}
          >
            <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />
            <span>{category.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
