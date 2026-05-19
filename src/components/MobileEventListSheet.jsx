import { useEffect, useRef, useState } from "react";
import EventCard from "./EventCard";

const SHEET_STATES = ["peek", "mid", "full"];

function getBaseTransform(state) {
  if (state === "full") return "translateY(0px)";
  if (state === "mid") return "translateY(calc(100% - 45dvh))";
  return "translateY(calc(100% - 5rem - env(safe-area-inset-bottom, 0px)))";
}

export default function MobileEventListSheet({
  events,
  selectedEvent,
  onSelectEvent,
  title,
  subtitle,
  onShowAllEvents,
  isHidden = false,
  authSession,
}) {
  const [sheetState, setSheetState] = useState("peek");
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const itemRefs = useRef(new Map());
  const dragRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const prevHiddenRef = useRef(isHidden);

  // When event is selected: collapse to peek (sheet slides behind preview card).
  // When event is dismissed: return to mid so the list is comfortably visible.
  useEffect(() => {
    const wasHidden = prevHiddenRef.current;
    prevHiddenRef.current = isHidden;

    if (isHidden) {
      setSheetState("peek");
    } else if (wasHidden) {
      setSheetState("mid");
    }
  }, [isHidden]);

  useEffect(() => {
    if (sheetState === "peek" || !selectedEvent?.id) return;
    const el = itemRefs.current.get(String(selectedEvent.id));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sheetState, selectedEvent]);

  function handleSelectEvent(event) {
    onSelectEvent(event);
    // Sheet hides automatically when selectedEvent is set (isHidden becomes true)
  }

  // --- Drag handlers ---

  function onHandlePointerDown(e) {
    if (e.button && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, state: sheetState };
    hasDraggedRef.current = false;
    setDragY(0);
    setIsDragging(false);
  }

  function onHandlePointerMove(e) {
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startY;
    if (Math.abs(delta) > 8) {
      hasDraggedRef.current = true;
      setIsDragging(true);
    }
    if (hasDraggedRef.current) setDragY(delta);
  }

  function onHandlePointerUp(e) {
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startY;
    const startState = dragRef.current.state;
    dragRef.current = null;
    setIsDragging(false);
    setDragY(0);

    // If not a real drag, let onClick handle the tap
    if (!hasDraggedRef.current) return;

    const idx = SHEET_STATES.indexOf(startState);
    if (delta < -50) {
      setSheetState(SHEET_STATES[Math.min(idx + 1, SHEET_STATES.length - 1)]);
    } else if (delta > 50) {
      setSheetState(SHEET_STATES[Math.max(idx - 1, 0)]);
    }
  }

  // Tap on handle (not a drag) cycles peek ↔ full
  function onHandleClick(e) {
    if (hasDraggedRef.current) return;
    setSheetState((prev) => (prev === "full" ? "peek" : "full"));
  }

  const baseTransform = isHidden
    ? "translateY(100%)"
    : getBaseTransform(sheetState);
  const liveTransform =
    isDragging && dragY !== 0
      ? `${baseTransform} translateY(${dragY}px)`
      : baseTransform;

  const isExpanded = sheetState !== "peek";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl shadow-slate-900/20 will-change-transform lg:hidden"
      style={{
        maxHeight: "calc(100dvh - 10rem)",
        transform: liveTransform,
        transition: isDragging ? "none" : "transform 0.3s ease-out",
      }}
      aria-hidden={isHidden}
    >
      {/* Drag handle + collapsed summary — pointer events for drag, onClick for tap */}
      <div
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onClick={onHandleClick}
        className="flex w-full shrink-0 cursor-grab select-none touch-none flex-col items-center px-4 pt-3 text-left"
        style={{
          paddingBottom: !isExpanded
            ? "calc(0.75rem + env(safe-area-inset-bottom, 0px))"
            : "0.75rem",
        }}
      >
        <div className="mb-2.5 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {title || "Events"}
            </p>
            <p className="text-xs text-slate-500">
              {subtitle ?? `${events.length} events found`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onShowAllEvents && isExpanded && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onShowAllEvents();
                  setSheetState("peek");
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Show all
              </button>
            )}
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 shrink-0 border-t border-slate-100" />

      {/* Scrollable event list */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] space-y-2.5">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No events found.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              ref={(node) => {
                const id = String(event.id);
                if (node) itemRefs.current.set(id, node);
                else itemRefs.current.delete(id);
              }}
            >
              <EventCard
                event={event}
                isSelected={String(selectedEvent?.id) === String(event.id)}
                onClick={handleSelectEvent}
                authSession={authSession}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
