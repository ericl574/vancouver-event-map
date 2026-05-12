function getEventStartDate(event) {
  const eventDate =
    event.event_date ??
    event.eventDate ??
    event.rawEventDate ??
    null;

  const startTime =
    event.start_time ??
    event.rawStartTime ??
    event.startTimeRaw ??
    "00:00:00";

  if (!eventDate) return null;

  const dateString = String(eventDate).slice(0, 10);
  const timeString = String(startTime).slice(0, 8);

  const parsedDate = new Date(`${dateString}T${timeString}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function isUpcomingEvent(event) {
  const eventStartDate = getEventStartDate(event);

  if (!eventStartDate) {
    return false;
  }

  return eventStartDate.getTime() >= Date.now();
}

function getEventDateString(event) {
  const eventDate =
    event.event_date ??
    event.eventDate ??
    event.rawEventDate ??
    null;

  if (!eventDate) return "";

  return String(eventDate).slice(0, 10);
}

function getTimeRangeLimit(timeRange) {
  const oneDay = 24 * 60 * 60 * 1000;

  if (timeRange === "24h") return oneDay;
  if (timeRange === "3d") return 3 * oneDay;
  if (timeRange === "5d") return 5 * oneDay;
  if (timeRange === "1w") return 7 * oneDay;

  return null;
}

function matchesExactDate(event, exactDate) {
  if (!exactDate) {
    return true;
  }

  return getEventDateString(event) === exactDate;
}

function matchesTimeRange(event, timeRange) {
  if (!timeRange || timeRange === "all") {
    return true;
  }

  const eventStartDate = getEventStartDate(event);

  if (!eventStartDate) {
    return false;
  }

  const rangeLimit = getTimeRangeLimit(timeRange);

  if (!rangeLimit) {
    return true;
  }

  const nowTime = Date.now();
  const eventTime = eventStartDate.getTime();

  return eventTime >= nowTime && eventTime <= nowTime + rangeLimit;
}

function isFreeEvent(event) {
  const price = String(event.price ?? "").toLowerCase();

  return event.is_free === true || event.isFree === true || price === "free";
}

export function filterEvents(events, selectedCategory, query, filters = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "free" && isFreeEvent(event)) ||
      event.category === selectedCategory;

    const searchable = [
      event.title,
      event.category,
      event.venue,
      event.address,
      event.area,
      event.city,
      event.price,
      ...(event.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      normalizedQuery === "" || searchable.includes(normalizedQuery);

    const matchesStatus = !event.status || event.status === "approved";

    const matchesDate = matchesExactDate(event, filters.exactDate);

    const matchesTime = filters.exactDate
      ? true
      : matchesTimeRange(event, filters.timeRange);

    return (
      matchesCategory &&
      matchesQuery &&
      matchesStatus &&
      matchesDate &&
      matchesTime
    );
  });
}
export function calculateDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return null;

  const lat1 = Number(pointA.lat);
  const lng1 = Number(pointA.lng);
  const lat2 = Number(pointB.lat);
  const lng2 = Number(pointB.lng);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const degreesToRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function addDistanceFromPoint(events, referencePoint) {
  if (!referencePoint) {
    return events.map((event) => {
      const { distanceKm, ...eventWithoutDistance } = event;
      return eventWithoutDistance;
    });
  }

  return events
    .map((event) => ({
      ...event,
      distanceKm: calculateDistanceKm(referencePoint, event),
    }))
    .sort((a, b) => {
      const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
      const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;

      return distanceA - distanceB;
    });
}