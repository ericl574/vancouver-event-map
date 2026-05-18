import CategoryIcon from "./CategoryIcon";
import { categories } from "../data/categories";

export default function TopNavigation({
  selectedCategory,
  onSelectCategory,
  authSession,
  isCheckingUserSession = false,
  isAccountMenuOpen,
  onToggleAccountMenu,
  onSignOut,
  savedEventsCount = 0,
  userInitial = "U",
}) {
  const navItems = [
    {
      id: "all",
      label: "All",
      icon: "all",
    },
    ...categories,
  ];

  return (
    <div className="w-full border-b border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-none items-center gap-4 px-4 lg:h-16 lg:gap-5 lg:px-5">
        <a
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition hover:opacity-80 lg:gap-3"
          aria-label="Go to VanEvent home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-sm font-black text-white shadow-md shadow-pink-900/20 lg:h-9 lg:w-9 lg:text-base">
            V
          </span>

          <div className="leading-none">
            <p className="text-base font-black tracking-tight text-slate-950 lg:text-lg">
              VanEvent
            </p>
            <p className="mt-0.5 hidden text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 sm:block">
              Vancouver Events
            </p>
          </div>
        </a>

        <div className="hidden h-8 w-px shrink-0 bg-slate-200 lg:block" />

        <nav
          data-category-explore-toggle="true"
          className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex"
          aria-label="Main event categories"
        >
          {navItems.map((category) => {
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                aria-pressed={isSelected}
                className={`flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-bold transition ${
                  isSelected
                    ? "text-pink-600"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <CategoryIcon
                  icon={category.icon}
                  className={`h-4 w-4 ${
                    isSelected ? "text-pink-600" : "text-slate-500"
                  }`}
                />
                <span>{category.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile spacer pushes account button to the right */}
        <div className="flex-1 lg:hidden" />

        <div className="relative shrink-0">
          {authSession?.user ? (
            <>
              <button
                type="button"
                onClick={onToggleAccountMenu}
                className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                aria-label="Open account menu"
                title={authSession.user.email}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-xs font-black text-white">
                  {userInitial}
                </span>
                <span className="hidden max-w-[150px] truncate lg:inline">
                  My Account
                </span>
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white text-slate-800 shadow-2xl shadow-slate-900/20">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {authSession.user.email}
                    </p>
                  </div>

                  <a
                    href="/favorites"
                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-pink-50"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Favorite List
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Search and manage saved events
                      </p>
                    </div>

                    <span className="rounded-full bg-pink-50 px-2 py-1 text-[11px] font-bold text-pink-600">
                      {savedEventsCount}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50 hover:text-pink-600"
                  >
                    Log out
                  </button>
                </div>
              )}
            </>
          ) : (
            <a
              href="/login"
              className="flex h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-pink-600"
            >
              {isCheckingUserSession ? "Checking..." : "Log in"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
