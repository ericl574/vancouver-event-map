import { IconLocate } from "./Icons";

export default function LocationButton({ onClick, isLocating }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocating}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Use my current location"
      title="Use my current location"
    >
      {isLocating ? (
        <span className="text-lg font-bold">…</span>
      ) : (
        <IconLocate className="h-5 w-5" />
      )}
    </button>
  );
}