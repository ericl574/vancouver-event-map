import { musicGenres } from "../data/musicGenres";

export default function MusicGenreChips({ selectedGenre, onSelectGenre }) {
  return (
    <section
      data-music-genre-panel="true"
      className="mt-3 overflow-hidden rounded-[1.75rem] border border-pink-100 bg-white/95 p-3 text-slate-900 shadow-2xl shadow-pink-900/10 backdrop-blur-xl"
    >
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
          Music Discovery
        </p>
        <h2 className="text-lg font-black leading-tight text-slate-950">
          Explore by genre
        </h2>
      </div>

      <div
        className="no-scrollbar flex gap-2 overflow-x-auto pb-1 pr-16"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, black calc(100% - 72px), transparent 100%)",
          maskImage:
            "linear-gradient(to right, black 0%, black calc(100% - 72px), transparent 100%)",
        }}
      >
        {musicGenres.map((genre) => {
          const isSelected = selectedGenre === genre.id;

          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => onSelectGenre(genre.id)}
              aria-pressed={isSelected}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                isSelected
                  ? "border-pink-300 bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                  : "border-pink-100 bg-pink-50 text-slate-700 hover:border-pink-200 hover:bg-pink-100 hover:text-pink-700"
              }`}
            >
              {genre.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
