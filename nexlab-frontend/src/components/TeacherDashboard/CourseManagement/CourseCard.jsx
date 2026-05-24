const getSemesterNumber = (semester) => {
  const match = String(semester || '').match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getYearLabel = (semester) => {
  const semesterNumber = getSemesterNumber(semester);
  if (!semesterNumber) return 'Year not set';
  return `Year ${Math.ceil(semesterNumber / 2)}`;
};

const getBreakdown = (students = []) => {
  const semesters = {};
  const years = {};

  students.forEach((student) => {
    const semesterNumber = getSemesterNumber(student.semester);
    const semesterLabel = semesterNumber ? `Semester ${semesterNumber}` : 'Semester not set';
    const yearLabel = getYearLabel(student.semester);

    semesters[semesterLabel] = (semesters[semesterLabel] || 0) + 1;
    years[yearLabel] = (years[yearLabel] || 0) + 1;
  });

  return {
    semesters: Object.entries(semesters).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
    years: Object.entries(years).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  };
};

function CourseCard({ course, onSelect }) {
  const breakdown = getBreakdown(course.students || []);

  return (
    <article className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
      <p className="text-white font-semibold mb-2">{course.title}</p>
      <div className="flex gap-2 mb-4">
        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">{course.year}</span>
        <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded">Sem {course.semester}</span>
      </div>
      <p className="text-sm text-gray-400">Invite code</p>
      <p className="text-[#ffa116] mb-4">{course.inviteCode || '-'}</p>
      <p className="text-sm text-gray-400 mb-4">Students: {course.students?.length || 0}</p>

      <div className="mb-4 space-y-3">
        <div>
          <p className="mb-2 text-xs uppercase text-gray-500">Semester breakdown</p>
          <div className="flex flex-wrap gap-2">
            {breakdown.semesters.length === 0 ? (
              <span className="text-xs text-gray-500">No students</span>
            ) : (
              breakdown.semesters.map(([label, count]) => (
                <span key={label} className="rounded-full border border-gray-800 bg-[#111] px-2 py-1 text-xs text-gray-300">
                  {label}: {count}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase text-gray-500">Year breakdown</p>
          <div className="flex flex-wrap gap-2">
            {breakdown.years.length === 0 ? (
              <span className="text-xs text-gray-500">No students</span>
            ) : (
              breakdown.years.map(([label, count]) => (
                <span key={label} className="rounded-full border border-gray-800 bg-[#111] px-2 py-1 text-xs text-gray-300">
                  {label}: {count}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500"
        onClick={() => onSelect?.(course._id)}
      >
        Select
      </button>
    </article>
  );
}

export default CourseCard;
