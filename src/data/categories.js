import { categoryTaxonomy, visibleCategories } from "./categoryTaxonomy";

const legacyCategoryOverrides = {
  comedy: {
    id: "arts",
    label: "Arts & Comedy",
    icon: "art",
    colorClass: "bg-yellow-300",
    hex: "#FFC872",
  },
  art: {
    id: "arts",
    label: "Arts & Comedy",
    icon: "art",
    colorClass: "bg-yellow-300",
    hex: "#FFC872",
  },
  workshop: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-blue-300",
    hex: "#CFEADC",
  },
  career: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-emerald-200",
    hex: "#CFEADC",
  },
  student: {
    id: "learning",
    label: "Learning",
    icon: "workshop",
    colorClass: "bg-emerald-200",
    hex: "#CFEADC",
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
