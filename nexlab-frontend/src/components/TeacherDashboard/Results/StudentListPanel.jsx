function StudentListPanel({
  studentRows,
  selectedSubmissionId,
  onSelectStudent,
  submissionsLoading,
  onViewProctorAlerts
}) {
  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
      <p className="mb-4">Students</p>
      <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
        {submissionsLoading && <p className="text-gray-400">Loading...</p>}
        {!submissionsLoading && studentRows.length === 0 && <p className="text-gray-400">No submissions found.</p>}
        {studentRows.map((student) => (
          <div key={student._id} className="bg-[#111] border border-gray-800 rounded-md p-3">
            <button
              type="button"
              onClick={() => onSelectStudent(student._id)}
              className={`w-full text-left pb-2 border-b border-gray-700 mb-2 ${
                selectedSubmissionId === student._id ? 'border-[#ffa116]' : ''
              }`}
            >
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-gray-400">
                {student.rollNumber} · Semester {student.semester}
              </p>
              <p className="text-sm text-gray-300">Score {student.totalScore.toFixed(2)}</p>
            </button>
            <button
              type="button"
              onClick={() =>
                onViewProctorAlerts({ id: student.studentId, name: student.name, examId: student.examId })
              }
              className="w-full bg-[#ffa116] text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-orange-500 transition-colors"
            >
              View Proctor Alerts
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentListPanel;
