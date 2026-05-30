import { Shield, Users } from 'lucide-react';

function StudentListPanel({
  studentRows,
  selectedSubmissionId,
  onSelectStudent,
  submissionsLoading,
  onViewProctorAlerts
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Users size={14} className="text-amber-400" />
        <p className="text-sm font-semibold text-white/70">Submissions</p>
        {studentRows.length > 0 && (
          <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/40">{studentRows.length}</span>
        )}
      </div>
      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {submissionsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        )}
        {!submissionsLoading && studentRows.length === 0 && (
          <p className="py-8 text-center text-xs text-white/30">No submissions yet.</p>
        )}
        {studentRows.map((student) => {
          const isSelected = selectedSubmissionId === student._id;
          return (
            <div
              key={student._id}
              className={`rounded-xl border p-3 transition-all duration-150 ${
                isSelected
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectStudent(student._id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate">{student.name}</p>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    student.totalScore > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-white/40'
                  }`}>
                    {student.totalScore.toFixed(1)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {student.rollNumber} · Sem {student.semester}
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  onViewProctorAlerts({ id: student.studentId, name: student.name, examId: student.examId })
                }
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70"
              >
                <Shield size={10} />
                Proctor Alerts
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StudentListPanel;
