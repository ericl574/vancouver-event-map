import { useEffect, useRef } from "react";
import CategoryIcon from "./CategoryIcon";
import { categories } from "../data/categories";

const navItems = [
  { id: "all", label: "All", icon: "all" },
  ...categories.filter((c) => c.id !== "free"),
];

// Duplicate for seamless infinite loop
const loopedItems = [...navItems, ...navItems];

export default function MobileCategoryChips({ selectedCategory, onSelectCategory }) {
  const navRef = useRef(null);
  const posRef = useRef(0);
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const SPEED = 0.5; // px per tick
    const TICK_MS = 20;

    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      posRef.current += SPEED;

      // Seamless loop: reset when we've scrolled through the first copy
      const half = nav.scrollWidth / 2;
      if (posRef.current >= half) {
        posRef.current -= half;
      }

      nav.scrollLeft = posRef.current;
    }, TICK_MS);

    function pauseScroll() {
      isPausedRef.current = true;
      // Normalise position so resume continues from the right spot
      const half = nav.scrollWidth / 2;
      posRef.current = nav.scrollLeft % (half || 1);
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 2500);
    }

    nav.addEventListener("touchstart", pauseScroll, { passive: true });
    nav.addEventListener("mousedown", pauseScroll);
    nav.addEventListener("wheel", pauseScroll, { passive: true });

    return () => {
      clearInterval(interval);
      clearTimeout(resumeTimerRef.current);
      nav.removeEventListener("touchstart", pauseScroll);
      nav.removeEventListener("mousedown", pauseScroll);
      nav.removeEventListener("wheel", pauseScroll);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      data-category-explore-toggle="true"
      className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2"
      aria-label="Event categories"
    >
      {loopedItems.map((category, index) => {
        const isSelected = selectedCategory === category.id;
        return (
          <button
            key={`${category.id}-${index}`}
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
