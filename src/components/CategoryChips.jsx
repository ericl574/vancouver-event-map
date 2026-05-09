import { categories } from "../data/categories";
import {
  IconAll,
  IconMusic,
  IconFestival,
  IconComedy,
  IconArt,
  IconFood,
  IconWorkshop,
  IconCareer,
  IconStudent,
  IconNightlife,
  IconFree,
  IconEvent,
} from "./Icons";

const categoryIconMap = {
  music: IconMusic,
  festival: IconFestival,
  comedy: IconComedy,
  art: IconArt,
  food: IconFood,
  workshop: IconWorkshop,
  career: IconCareer,
  student: IconStudent,
  nightlife: IconNightlife,
  free: IconFree,
  event: IconEvent,
};

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
        <IconAll
          className={`h-4 w-4 ${
            selectedCategory === "all" ? "text-rose-700" : "text-slate-500"
          }`}
        />
        <span>All</span>
      </button>

      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const Icon = categoryIconMap[category.icon] ?? IconEvent;

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
            <Icon
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