function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|live|tour|tickets|vancouver|bc|canada|with|presents|presenting|presented|featuring|pres|vol|presented|second|date|new|venue|moved|presents)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);

  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function jaccardSimilarity(leftValue, rightValue) {
  const leftTokens = new Set(tokenize(leftValue));
  const rightTokens = new Set(tokenize(rightValue));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;

  return union === 0 ? 0 : intersection / union;
}

function parseTimeToMinutes(value) {
  if (!value) return null;

  const [hourString, minuteString = "0"] = String(value).split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function getTimeScore(candidateTime, incomingTime) {
  const candidateMinutes = parseTimeToMinutes(candidateTime);
  const incomingMinutes = parseTimeToMinutes(incomingTime);

  if (candidateMinutes === null || incomingMinutes === null) {
    return 0;
  }

  const diff = Math.abs(candidateMinutes - incomingMinutes);

  if (diff === 0) return 20;
  if (diff <= 30) return 15;
  if (diff <= 60) return 10;

  return 0;
}

function getCoordinateScore(candidate, incoming) {
  const candidateLat = Number(candidate?.lat);
  const candidateLng = Number(candidate?.lng);
  const incomingLat = Number(incoming?.lat);
  const incomingLng = Number(incoming?.lng);

  if (
    !Number.isFinite(candidateLat) ||
    !Number.isFinite(candidateLng) ||
    !Number.isFinite(incomingLat) ||
    !Number.isFinite(incomingLng)
  ) {
    return 0;
  }

  const latDiff = Math.abs(candidateLat - incomingLat);
  const lngDiff = Math.abs(candidateLng - incomingLng);

  if (latDiff <= 0.0005 && lngDiff <= 0.0005) return 15;
  if (latDiff <= 0.002 && lngDiff <= 0.002) return 10;
  if (latDiff <= 0.005 && lngDiff <= 0.005) return 5;

  return 0;
}

export function normalizeDedupeText(value) {
  return normalizeText(value);
}

export function scoreEventMatch(candidate, incoming) {
  if (!candidate || !incoming) {
    return {
      score: 0,
      titleScore: 0,
      venueScore: 0,
      timeScore: 0,
      coordinateScore: 0,
      isStrongMatch: false,
    };
  }

  if (candidate.event_date !== incoming.event_date) {
    return {
      score: 0,
      titleScore: 0,
      venueScore: 0,
      timeScore: 0,
      coordinateScore: 0,
      isStrongMatch: false,
    };
  }

  const titleSimilarity = jaccardSimilarity(candidate.title, incoming.title);
  const venueSimilarity = jaccardSimilarity(candidate.venue, incoming.venue);

  const titleScore = Math.round(titleSimilarity * 45);
  const venueScore = Math.round(venueSimilarity * 20);
  const timeScore = getTimeScore(candidate.start_time, incoming.start_time);
  const coordinateScore = getCoordinateScore(candidate, incoming);

  const score = titleScore + venueScore + timeScore + coordinateScore;

  // Same-venue + artist-name overlap: catches "INJI" vs "INJI: tour name",
  // "Cristoph" vs "Playhouse Pres: Cristoph", etc.
  const sameVenueArtistMatch =
    venueScore >= 18 && titleScore >= 10 && score >= 55;

  return {
    score,
    titleScore,
    venueScore,
    timeScore,
    coordinateScore,
    isStrongMatch: (score >= 75 && titleScore >= 25) || sameVenueArtistMatch,
  };
}

export function findBestEventMatch(candidates, incoming) {
  let best = null;

  for (const candidate of candidates || []) {
    const result = scoreEventMatch(candidate, incoming);

    if (!best || result.score > best.score) {
      best = {
        ...result,
        event: candidate,
      };
    }
  }

  return best?.isStrongMatch ? best : null;
}
