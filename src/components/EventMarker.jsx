import { getCategoryById } from "../data/categories";

export default function EventMarker({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/80 ${
        category.colorClass
      } ${isSelected ? "scale-125 ring-4 ring-white/80" : ""}`}
      style={{ left: event.mapX, top: event.mapY }}
      aria-label={`Open ${event.title}`}
      title={event.title}
    >
      <span className="h-2 w-2 rounded-full bg-white" />
    </button>
  );
}