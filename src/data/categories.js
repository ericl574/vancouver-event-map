export const categories = [
  {
    id: "music",
    label: "Music",
    colorClass: "bg-blue-500",
    hex: "#3b82f6",
  },
  {
    id: "festival",
    label: "Festival",
    colorClass: "bg-pink-500",
    hex: "#ec4899",
  },
  {
    id: "comedy",
    label: "Comedy",
    colorClass: "bg-yellow-500",
    hex: "#eab308",
  },
  {
    id: "art",
    label: "Art / Exhibition",
    colorClass: "bg-purple-500",
    hex: "#a855f7",
  },
  {
    id: "food",
    label: "Food / Market",
    colorClass: "bg-orange-500",
    hex: "#f97316",
  },
  {
    id: "workshop",
    label: "Workshop",
    colorClass: "bg-emerald-500",
    hex: "#10b981",
  },
  {
    id: "career",
    label: "Career / Networking",
    colorClass: "bg-cyan-500",
    hex: "#06b6d4",
  },
  {
    id: "student",
    label: "Student",
    colorClass: "bg-indigo-500",
    hex: "#6366f1",
  },
  {
    id: "nightlife",
    label: "Nightlife",
    colorClass: "bg-fuchsia-500",
    hex: "#d946ef",
  },
  {
    id: "free",
    label: "Free Events",
    colorClass: "bg-green-500",
    hex: "#22c55e",
  },
];

export function getCategoryById(id) {
  return categories.find((category) => category.id === id) ?? {
    id: "unknown",
    label: "Event",
    colorClass: "bg-slate-500",
    hex: "#64748b",
  };
}