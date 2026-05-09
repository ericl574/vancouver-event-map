export function filterEvents(events, selectedCategory, query) {
  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "free" && event.isFree) ||
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
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      normalizedQuery === "" || searchable.includes(normalizedQuery);

    return matchesCategory && matchesQuery && event.status === "approved";
  });
}