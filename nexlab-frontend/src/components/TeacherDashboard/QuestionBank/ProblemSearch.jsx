import { Search } from 'lucide-react';

function ProblemSearch({ query, setQuery, difficultyFilter, setDifficultyFilter, totalCount, filteredCount }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search problems..."
        />
      </div>
      <select
        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-amber-500/40"
        value={difficultyFilter}
        onChange={(event) => setDifficultyFilter(event.target.value)}
      >
        <option value="all">All Difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
      <span className="text-xs text-white/30">
        {filteredCount !== undefined ? `${filteredCount} of ${totalCount}` : ''}
      </span>
    </div>
  );
}

export default ProblemSearch;
