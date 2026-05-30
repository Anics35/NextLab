import { BookOpen, ChevronRight, UserRound } from 'lucide-react';

function CourseCard({ course, activeCourseId, onSelect }) {
  const isSelected = activeCourseId === course._id;

  return (
    <article
      onClick={() => onSelect?.(course)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        isSelected
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#141414] to-[#0e0e0e] shadow-lg shadow-amber-500/10'
          : 'border-white/[0.06] bg-[#111113] hover:border-white/[0.12] hover:bg-[#141416]'
      }`}
    >
      {/* Glow effect on hover */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/0 blur-2xl transition-all duration-500 group-hover:bg-amber-500/10" />

      {/* Course icon and title */}
      <div className="relative flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.05] text-white/50 group-hover:bg-amber-500/10 group-hover:text-amber-400'
        }`}>
          <BookOpen size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-white">{course.title}</h3>
          <p className="mt-0.5 text-xs text-white/35 font-mono">{course.courseCode}</p>
        </div>
      </div>

      {/* Teacher info */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
        <UserRound size={13} className="text-white/40" />
        <span className="truncate text-xs text-white/50">
          {course.teacherId?.name || course.teacherId?.email || 'Teacher'}
        </span>
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center justify-between">
        {isSelected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Selected
          </span>
        ) : (
          <span className="text-[11px] text-white/30">Click to open</span>
        )}
        <ChevronRight size={16} className={`transition-all duration-200 ${
          isSelected ? 'text-amber-400' : 'text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5'
        }`} />
      </div>
    </article>
  );
}

export default CourseCard;
