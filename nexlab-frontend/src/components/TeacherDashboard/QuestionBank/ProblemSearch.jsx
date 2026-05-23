import { Search } from 'lucide-react';
import { inputClass } from '../constants';

function ProblemSearch({ query, setQuery, difficultyFilter, setDifficultyFilter }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <label className="md:col-span-2 flex items-center gap-2 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2">
        <Search size={14} className="text-gray-400" />
        <input
          className="w-full bg-transparent outline-none text-white"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search problems"
        />
      </label>
      <select
        className={inputClass}
        value={difficultyFilter}
        onChange={(event) => setDifficultyFilter(event.target.value)}
      >
        <option value="all">All</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
  );
}

export default ProblemSearch;
