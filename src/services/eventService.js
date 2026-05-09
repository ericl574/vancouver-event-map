import { supabase } from "../lib/supabaseClient";

function formatTime(timeValue) {
  if (!timeValue) return "";

  const [hourString, minuteString = "00"] = timeValue.split(":");
  const hour = Number(hourString);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minuteString} ${suffix}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T00:00:00`);

  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Temporary for fake map only.
// Later Leaflet will use lat/lng directly.
function addTemporaryMapPosition(event, index) {
  const positions = [
    { mapX: "50%", mapY: "47%" },
    { mapX: "43%", mapY: "57%" },
    { mapX: "54%", mapY: "43%" },
    { mapX: "55%", mapY: "60%" },
    { mapX: "21%", mapY: "67%" },
    { mapX: "62%", mapY: "38%" },
    { mapX: "47%", mapY: "70%" },
  ];

  return {
    ...event,
    ...positions[index % positions.length],
  };
}

function mapDatabaseEventToFrontendEvent(event, index) {
  return addTemporaryMapPosition(
    {
      id: event.id,
      title: event.title,
      category: event.category,
      venue: event.venue || "",
      address: event.address || "",
      area: event.area || "",
      city: event.city || "Vancouver",
      lat: event.lat,
      lng: event.lng,
      date: formatDate(event.event_date),
      startTime: formatTime(event.start_time),
      endTime: formatTime(event.end_time),
      price: event.price || "",
      isFree: Boolean(event.is_free),
      description: event.description || "",
      imageUrl: event.image_url || "",
      ticketUrl: event.ticket_url || "",
      sourceUrl: event.source_url || "",
      organizerName: event.organizer_name || "",
      tags: event.tags || [],
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    },
    index
  );
}

export async function getApprovedEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "approved")
    .order("event_date", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(mapDatabaseEventToFrontendEvent);
}