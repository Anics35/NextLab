function LiveStudentListPanel({ liveStudents, loading, isExamLiveWindow }) {
  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
      <p className="mb-4">Live Students</p>
      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
        {loading && <p className="text-gray-400">Loading...</p>}
        {!loading && !isExamLiveWindow && <p className="text-gray-400">Live tracking is available only while the exam is running.</p>}
        {!loading && isExamLiveWindow && liveStudents.length === 0 && <p className="text-gray-400">No students are currently attempting this exam.</p>}
        {liveStudents.map((student) => (
          <div key={student._id} className="bg-[#111] border border-gray-800 rounded-md p-3">
            <p className="font-medium text-white">{student.name}</p>
            <p className="text-sm text-gray-400">
              {student.rollNumber} · Semester {student.semester}
            </p>
            <p className="text-sm text-gray-300">
              Attempting: {student.currentProblemLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveStudentListPanel;