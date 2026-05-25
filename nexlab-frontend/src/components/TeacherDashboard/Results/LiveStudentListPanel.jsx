function LiveStudentListPanel({ liveStudents, recentSubmissionEvents = [], loading, isExamLiveWindow }) {
  const formatTime = (value) => {
    try {
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  };

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

        <div className="pt-2 border-t border-gray-800">
          <p className="mb-2 text-sm text-gray-400">Recent Submissions</p>
          {recentSubmissionEvents.length === 0 ? (
            <p className="text-gray-400">No submissions received yet.</p>
          ) : (
            recentSubmissionEvents.map((event) => (
              <div key={event.id} className="mb-2 rounded-md border border-gray-800 bg-[#111] p-3 last:mb-0">
                <p className="font-medium text-white">{event.studentName}</p>
                <p className="text-sm text-gray-300">{event.message}</p>
                <p className="text-xs text-gray-500">
                  {event.type} · {formatTime(event.time)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveStudentListPanel;