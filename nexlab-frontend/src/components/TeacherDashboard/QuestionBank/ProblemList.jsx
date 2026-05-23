import { LoaderCircle } from 'lucide-react';
import { difficultyBadgeClass } from '../constants';

function ProblemList({ problems, onEdit, onDelete, isDeletingId }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {problems.length === 0 && <p className="text-gray-400">No problems found.</p>}
      {problems.map((problem) => (
        <div key={problem._id} className="bg-[#0a0a0a] p-3 rounded-md flex flex-col gap-3 border border-gray-800">
          <div className="flex justify-between items-center gap-4">
            <span className="text-white">{problem.title || 'Untitled'}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>
              {problem.difficulty || 'Unknown'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(problem)}
              className="bg-[#ffa116] text-black px-3 py-1.5 rounded-md hover:bg-orange-500 text-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(problem)}
              disabled={isDeletingId === problem._id}
              className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500 disabled:opacity-50 text-sm inline-flex items-center gap-2"
            >
              {isDeletingId === problem._id ? <LoaderCircle size={14} className="animate-spin" /> : null}
              {isDeletingId === problem._id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProblemList;
