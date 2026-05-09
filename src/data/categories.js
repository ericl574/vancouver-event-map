export const categories = [
  { id: "music", label: "Music", colorClass: "bg-blue-500" },
  { id: "festival", label: "Festival", colorClass: "bg-pink-500" },
  { id: "comedy", label: "Comedy", colorClass: "bg-yellow-500" },
  { id: "art", label: "Art", colorClass: "bg-purple-500" },
  { id: "food", label: "Food", colorClass: "bg-orange-500" },
  { id: "workshop", label: "Workshop", colorClass: "bg-green-500" },
  { id: "career", label: "Career", colorClass: "bg-cyan-500" },
  { id: "student", label: "Student", colorClass: "bg-indigo-500" },
  { id: "nightlife", label: "Nightlife", colorClass: "bg-red-500" },
  { id: "free", label: "Free Events", colorClass: "bg-emerald-500" },
];

export function getCategoryById(categoryId) {
  return categories.find((category) => category.id === categoryId) || categories[0];
}