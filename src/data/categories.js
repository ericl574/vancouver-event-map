import { categoryTaxonomy, visibleCategories } from "./categoryTaxonomy";

const legacyCategoryOverrides = {
  comedy: {
    id: "arts",
    label: "Arts & Comedy",
    icon: "art",
    colorClass: "bg-orange-200",
    hex: "#FFD5C2",
  },
  art: {
    id: "arts",
    label: "Arts & Comedy",
    icon: "art",
    colorClass: "bg-orange-200",
    hex: "#FFD5C2",
  },
  workshop: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-blue-200",
    hex: "#B5D5F5",
  },
  career: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-blue-200",
    hex: "#B5D5F5",
  },
  student: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-blue-200",
    hex: "#B5D5F5",
  },
};

export const categories = visibleCategories.map((category) => ({
  id: category.id,
  label: category.label,
  icon: category.icon,
  colorClass: "bg-pink-500",
  hex: category.hex,
}));

export function getCategoryById(id) {
  const normalizedId = String(id ?? "").toLowerCase();

  const directCategory = categoryTaxonomy.find(
    (category) => category.id === normalizedId
  );

  if (directCategory) {
    return {
      id: directCategory.id,
      label: directCategory.label,
      icon: directCategory.icon,
      colorClass: "bg-pink-500",
      hex: directCategory.hex,
    };
  }

  if (legacyCategoryOverrides[normalizedId]) {
    return legacyCategoryOverrides[normalizedId];
  }

  const matchedCategory = categoryTaxonomy.find((category) =>
    category.legacyCategoryIds.includes(normalizedId)
  );

  if (matchedCategory) {
    return {
      id: matchedCategory.id,
      label: matchedCategory.label,
      icon: matchedCategory.icon,
      colorClass: "bg-pink-500",
      hex: matchedCategory.hex,
    };
  }

  return {
    id: "unknown",
    label: "Event",
    icon: "event",
    colorClass: "bg-slate-500",
    hex: "#64748b",
  };
}
