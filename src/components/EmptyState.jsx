export default function EmptyState({
  title = "No events found",
  message = "Try another category, search term, or date filter.",
}) {
  return (
    <div className="absolute left-1/2 top-1/2 z-30 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white/95 p-5 text-center shadow-xl backdrop-blur">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}