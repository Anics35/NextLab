import { Activity, Radio } from 'lucide-react';

function LiveStudentListPanel({ liveStudents, recentSubmissionEvents = [], loading, isExamLiveWindow }) {
  const formatTime = (value) => {
    try {
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Radio size={14} className="text-emerald-400" />
        <p className="text-sm font-semibold text-white/70">Live Activity</p>
        {isExamLiveWindow && liveStudents.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {liveStudents.length} active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {!loading && !isExamLiveWindow && (
          <p className="py-8 text-center text-xs text-white/30">Live tracking available while exam is running.</p>
        )}

        {!loading && isExamLiveWindow && liveStudents.length === 0 && (
          <p className="py-6 text-center text-xs text-white/30">No students currently attempting.</p>
        )}

        {liveStudents.map((student) => (
          <div key={student._id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-medium text-white">{student.name}</p>
            </div>
            <p className="mt-1 ml-4 text-[11px] text-white/35">
              {student.rollNumber} · Working on: <span className="text-white/50">{student.currentProblemLabel}</span>
            </p>
          </div>
        ))}

        {/* Recent Submissions */}
        {recentSubmissionEvents.length > 0 && (
          <div className="mt-3 border-t border-white/[0.04] pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Activity size={12} className="text-white/30" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Recent Events</p>
            </div>
            {recentSubmissionEvents.map((event) => (
              <div key={event.id} className="mb-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white/70">{event.studentName}</p>
                  <p className="text-[10px] text-white/25">{formatTime(event.time)}</p>
                </div>
                <p className="text-[11px] text-white/40">{event.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveStudentListPanel;
