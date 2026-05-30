import { Code2, Edit3, LoaderCircle, Palette, Trash2 } from 'lucide-react';
import { difficultyBadgeClass } from '../constants';

function ProblemList({ problems, onEdit, onDelete, isDeletingId }) {
  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-[#0c0c0e] py-14">
        <Code2 size={28} className="text-white/15" />
        <p className="text-sm text-white/30">No problems found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {problems.map((problem) => (
        <article
          key={problem._id}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-4 transition-all duration-200 hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-white truncate flex-1">{problem.title || 'Untitled'}</h4>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>
                {problem.difficulty || '?'}
              </span>
            </div>
          </div>

          {/* Type badge */}
          <div className="mb-3">
            {problem.problemType === 'design' ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                <Palette size={10} />
                Design
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <Code2 size={10} />
                Testcase
              </span>
            )}
          </div>

          {/* Description preview */}
          {problem.description && (
            <p className="mb-4 text-xs text-white/35 line-clamp-2">{problem.description}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-white/[0.04] pt-3">
            <button
              type="button"
              onClick={() => onEdit(problem)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(problem)}
              disabled={isDeletingId === problem._id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {isDeletingId === problem._id ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {isDeletingId === problem._id ? '...' : 'Delete'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default ProblemList;
