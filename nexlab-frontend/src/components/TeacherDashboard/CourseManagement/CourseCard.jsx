import { BookOpen, ChevronRight, Users, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

const getSemesterNumber = (semester) => {
  const match = String(semester || '').match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getBreakdown = (students = []) => {
  const semesters = {};

  students.forEach((student) => {
    const semesterNumber = getSemesterNumber(student.semester);
    const semesterLabel = semesterNumber ? `Sem ${semesterNumber}` : 'Unset';
    semesters[semesterLabel] = (semesters[semesterLabel] || 0) + 1;
  });

  return Object.entries(semesters).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
};

function CourseCard({ course, onSelect }) {
  const breakdown = getBreakdown(course.students || []);
  const description = course.description?.trim();

  const handleCopyInvite = (e) => {
    e.stopPropagation();
    if (course.inviteCode) {
      navigator.clipboard.writeText(course.inviteCode);
      toast.success('Invite code copied!');
    }
  };

  return (
    <article
      onClick={() => onSelect?.(course._id)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111113] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20"
    >
      {/* Hover glow */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/0 blur-2xl transition-all duration-500 group-hover:bg-amber-500/10" />

      {/* Header */}
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-500/15">
          <BookOpen size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-white">{course.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300">{course.year}</span>
            <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300">Sem {course.semester}</span>
          </div>
        </div>
      </div>

      {description ? (
        <p className="mt-4 line-clamp-2 min-h-9 text-xs leading-relaxed text-white/45">{description}</p>
      ) : (
        <p className="mt-4 min-h-9 text-xs italic leading-relaxed text-white/25">No description added.</p>
      )}

      {/* Invite code */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Invite Code</p>
          <p className="text-sm font-mono font-semibold text-amber-400">{course.inviteCode || '—'}</p>
        </div>
        {course.inviteCode && (
          <button
            type="button"
            onClick={handleCopyInvite}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            aria-label="Copy invite code"
          >
            <Copy size={14} />
          </button>
        )}
      </div>

      {/* Students */}
      <div className="mt-4 flex items-center gap-2">
        <Users size={14} className="text-white/30" />
        <span className="text-xs text-white/50">{course.students?.length || 0} students</span>
        {breakdown.length > 0 && (
          <div className="ml-auto flex gap-1.5">
            {breakdown.slice(0, 3).map(([label, count]) => (
              <span key={label} className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">
                {label}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
        <span className="text-[11px] text-white/30">Click to manage</span>
        <ChevronRight size={16} className="text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-amber-400" />
      </div>
    </article>
  );
}

export default CourseCard;
