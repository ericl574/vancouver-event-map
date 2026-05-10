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

function getTimeRangeLimit(timeRange) {
  const oneDay = 24 * 60 * 60 * 1000;

  if (timeRange === "24h") return oneDay;
  if (timeRange === "3d") return 3 * oneDay;
  if (timeRange === "5d") return 5 * oneDay;
  if (timeRange === "1w") return 7 * oneDay;

  return null;
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

    const matchesTime = matchesTimeRange(event, filters.timeRange);

    return matchesCategory && matchesQuery && matchesStatus && matchesTime;
  });
}