import { useEffect, useState } from "react";
import { getCurrentSession, isCurrentUserAdmin, signOutAdmin } from "../services/authService";
import { getPendingEvents, updateEventStatus } from "../services/eventService";
import { getCategoryById } from "../data/categories";

export default function AdminReviewPage() {
  const [events, setEvents] = useState([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionEventId, setActionEventId] = useState("");

  useEffect(() => {
    async function initializeAdminPage() {
      try {
        setIsCheckingAuth(true);
        setErrorMessage("");

        const session = await getCurrentSession();

        if (!session) {
          window.location.href = "/admin/login";
          return;
        }

        const isAdmin = await isCurrentUserAdmin();

        if (!isAdmin) {
          await signOutAdmin();
          window.location.href = "/admin/login";
          return;
        }

        await loadPendingEvents();
      } catch (error) {
        console.error("Failed to initialize admin page:", error);
        setErrorMessage("Could not load admin page.");
      } finally {
        setIsCheckingAuth(false);
      }
    }

    initializeAdminPage();
  }, []);

  async function loadPendingEvents() {
    setIsLoadingEvents(true);

    try {
      const pendingEvents = await getPendingEvents();
      setEvents(pendingEvents);
    } catch (error) {
      console.error("Failed to load pending events:", error);
      setErrorMessage("Could not load pending events.");
    } finally {
      setIsLoadingEvents(false);
    }
  }

  async function handleStatusUpdate(eventId, status) {
    try {
      setActionEventId(eventId);
      setErrorMessage("");

      await updateEventStatus(eventId, status);

      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );
    } catch (error) {
      console.error(`Failed to update event to ${status}:`, error);
      setErrorMessage(`Could not mark event as ${status}.`);
    } finally {
      setActionEventId("");
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    window.location.href = "/admin/login";
  }

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        <p className="rounded-2xl bg-white px-5 py-4 font-medium shadow-lg">
          Checking admin access...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Vancouver Event Map
            </p>
            <h1 className="mt-1 text-2xl font-bold">Admin Review</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review pending imported events before publishing them to the public map.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Public map
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 rounded-3xl bg-white shadow-lg">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Pending events</h2>
            <p className="text-sm text-slate-500">
              {isLoadingEvents ? "Loading..." : `${events.length} event(s) waiting for review`}
            </p>
          </div>

          {events.length === 0 && !isLoadingEvents ? (
            <div className="px-5 py-12 text-center text-slate-500">
              No pending events right now.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((event) => {
                const category = getCategoryById(event.category);
                const isWorking = actionEventId === event.id;

                return (
                  <article
                    key={event.id}
                    className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: category.hex }}
                        >
                          {category.label}
                        </span>

                        {event.isFree && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Free
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-bold">{event.title}</h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {event.date} {event.startTime ? `• ${event.startTime}` : ""}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {event.venue || "Unknown venue"}
                        {event.address ? ` • ${event.address}` : ""}
                      </p>

                      <p className="mt-2 max-w-3xl text-sm text-slate-500">
                        {event.description || "No description provided."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        {event.ticketUrl && (
                          <a
                            href={event.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            Ticket/source
                          </a>
                        )}

                        <span className="text-slate-500">{event.price}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 md:flex-col">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleStatusUpdate(event.id, "approved")}
                        className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleStatusUpdate(event.id, "rejected")}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
