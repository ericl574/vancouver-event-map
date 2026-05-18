import { musicGenres } from "../data/musicGenres";

export default function MusicGenreChips({
  selectedGenre,
  onSelectGenre,
  avoidLeftPanel = false,
}) {
  return (
    <section
      data-music-genre-panel="true"
      className={`mt-3 w-full max-w-[360px] overflow-hidden rounded-[2rem] border border-pink-100 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-pink-900/10 backdrop-blur-xl transition-all duration-300 ${
        avoidLeftPanel ? "lg:ml-[230px]" : ""
      }`}
    >
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">
          Music Discovery
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">
          Explore by genre
        </h2>
      </div>

      <div className="no-scrollbar max-h-[430px] space-y-2.5 overflow-y-auto pr-1">
        {musicGenres.map((genre) => {
          const isSelected = selectedGenre === genre.id;

          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => onSelectGenre(genre.id)}
              aria-pressed={isSelected}
              className={`group flex w-full items-center gap-3 rounded-3xl border p-2.5 text-left transition ${
                isSelected
                  ? "border-pink-300 bg-pink-50 shadow-lg shadow-pink-500/10"
                  : "border-slate-100 bg-white hover:border-pink-200 hover:bg-pink-50/70"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                  isSelected
                    ? "bg-pink-500 text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-pink-100 group-hover:text-pink-500"
                }`}
              >
                {isSelected ? "✓" : "‹"}
              </span>

              <img
                src={genre.imageUrl}
                alt=""
                className="h-16 w-20 shrink-0 rounded-2xl object-cover shadow-sm"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />

              <div className="hidden h-16 w-20 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl font-black text-pink-500 ring-1 ring-pink-100">
                ♪
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-black ${
                    isSelected ? "text-pink-600" : "text-slate-800"
                  }`}
                >
                  {genre.label}
                </p>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {genre.id === "all"
                    ? "Show every music event"
                    : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
