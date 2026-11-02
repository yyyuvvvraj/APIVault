type SearchFormProps = {
  initialQuery?: string;
  compact?: boolean;
};

export function SearchForm({ initialQuery = "", compact = false }: SearchFormProps) {
  return (
    <form action="/apis" method="get" role="search" className={`flex w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5 ${compact ? "max-w-2xl" : "max-w-3xl"}`}>
      <label htmlFor={compact ? "catalogue-search-compact" : "catalogue-search"} className="sr-only">Search the API catalogue</label>
      <input
        id={compact ? "catalogue-search-compact" : "catalogue-search"}
        name="q"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search APIs, providers, or capabilities..."
        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:px-4"
      />
      <button type="submit" className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
        Search
      </button>
    </form>
  );
}
