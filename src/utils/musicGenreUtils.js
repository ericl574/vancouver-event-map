import { inferEventSubcategories, matchesEventSubcategory } from "./categoryTaxonomyUtils";

export function getMusicSearchText(event) {
  return [
    event.title,
    event.description,
    event.category,
    event.venue,
    event.area,
    event.city,
    event.organizerName,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function inferMusicGenres(event) {
  if (event.category !== "music") {
    return [];
  }

  return inferEventSubcategories(event);
}

export function getPrimaryMusicGenre(event) {
  return inferMusicGenres(event)[0] ?? null;
}

export function matchesMusicGenre(event, selectedMusicGenre) {
  return matchesEventSubcategory(event, "music", selectedMusicGenre);
}
