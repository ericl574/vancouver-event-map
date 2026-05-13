import { musicGenres } from "../data/musicGenres";

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

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

  const searchText = getMusicSearchText(event);

  const matchedGenres = musicGenres
    .filter((genre) => genre.id !== "all")
    .filter((genre) =>
      genre.keywords.some((keyword) => searchText.includes(normalizeText(keyword)))
    );

  if (matchedGenres.length > 0) {
    return matchedGenres;
  }

  return [
    {
      id: "other",
      label: "Music",
      keywords: [],
    },
  ];
}

export function getPrimaryMusicGenre(event) {
  return inferMusicGenres(event)[0] ?? null;
}

export function matchesMusicGenre(event, selectedMusicGenre) {
  if (event.category !== "music") {
    return false;
  }

  if (!selectedMusicGenre || selectedMusicGenre === "all") {
    return true;
  }

  return inferMusicGenres(event).some((genre) => genre.id === selectedMusicGenre);
}
