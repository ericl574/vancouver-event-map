import {
  categoryTaxonomy,
  getCategoryTaxonomyById,
  getCategoryTaxonomyForEvent,
} from "../data/categoryTaxonomy";

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function isFreeEvent(event) {
  const price = String(event.price ?? "").toLowerCase();

  return (
    event.is_free === true ||
    event.isFree === true ||
    price === "free" ||
    price.includes("free entry")
  );
}

export function getEventSearchText(event) {
  return [
    event.title,
    event.description,
    event.category,
    event.venue,
    event.area,
    event.city,
    event.organizerName,
    event.price,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function categoryMatchesEvent(event, selectedCategory) {
  if (!selectedCategory || selectedCategory === "all") {
    return true;
  }

  if (selectedCategory === "free") {
    return isFreeEvent(event);
  }

  const category = getCategoryTaxonomyById(selectedCategory);

  if (!category) {
    return event.category === selectedCategory;
  }

  const eventCategory = normalizeText(event.category);

  return category.legacyCategoryIds.includes(eventCategory);
}

export function inferEventSubcategories(event) {
  const category = getCategoryTaxonomyForEvent(event);

  if (!category || category.id === "free") {
    return [];
  }

  const searchText = getEventSearchText(event);

  const matchedSubcategories = category.subcategories
    .filter((subcategory) => subcategory.id !== "all")
    .filter((subcategory) =>
      subcategory.keywords.some((keyword) =>
        searchText.includes(normalizeText(keyword))
      )
    );

  if (matchedSubcategories.length > 0) {
    return matchedSubcategories;
  }

  return [
    {
      id: "other",
      label: category.shortLabel || category.label,
      keywords: [],
    },
  ];
}

export function matchesEventSubcategory(
  event,
  selectedCategory,
  selectedSubcategory
) {
  if (
    !selectedCategory ||
    selectedCategory === "all" ||
    !selectedSubcategory ||
    selectedSubcategory === "all" ||
    selectedCategory === "free"
  ) {
    return true;
  }

  if (!categoryMatchesEvent(event, selectedCategory)) {
    return false;
  }

  return inferEventSubcategories(event).some(
    (subcategory) => subcategory.id === selectedSubcategory
  );
}

export function categoryHasExplorePanel(categoryId) {
  const category = getCategoryTaxonomyById(categoryId);

  return Boolean(category && category.id !== "free" && category.subcategories.length > 1);
}

export { categoryTaxonomy };
