export async function shareEvent(event) {
  if (!event) return { ok: false, message: "No event selected." };

  const eventUrl = `${window.location.origin}/?event=${event.id}`;

  const shareText = `${event.title}
${event.venue} · ${event.area}
${event.date} · ${event.startTime}
${event.price}`;

  const shareData = {
    title: event.title,
    text: shareText,
    url: eventUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return { ok: true, message: "Shared!" };
    }

    await navigator.clipboard.writeText(`${shareText}\n${eventUrl}`);
    return { ok: true, message: "Copied link!" };
  } catch (error) {
    if (error.name === "AbortError") {
      return { ok: false, message: "" };
    }

    console.error("Share failed:", error);
    return { ok: false, message: "Could not share this event." };
  }
}