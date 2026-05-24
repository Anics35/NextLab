import { LoaderCircle } from 'lucide-react';
import { cardClass, inputClass } from '../constants';

function CourseDetail({
  selectedCourseDetail,
  courseDetailLoading,
  isEditingCourse,
  setIsEditingCourse,
  courseEditForm,
  setCourseEditForm,
  onSave,
  onClose,
  isSaving
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <section className={`${cardClass} mb-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold">Course Students</h2>
          <p className="text-sm text-gray-400">View enrolled students and edit course details.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setIsEditingCourse((prev) => !prev)}
            className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500"
          >
            {isEditingCourse ? 'Close Edit' : 'Edit Course'}
          </button>
        </div>
      </div>

      {courseDetailLoading ? (
        <p className="text-gray-400">Loading course details...</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4">
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Course title</p>
              <h3 className="text-xl font-semibold text-white">{selectedCourseDetail?.title}</h3>
              <p className="text-sm text-gray-400 mt-3">Course code</p>
              <p className="text-[#ffa116] font-semibold">{selectedCourseDetail?.courseCode}</p>
              <p className="text-sm text-gray-400 mt-3">Year</p>
              <p className="text-blue-400 font-semibold">{selectedCourseDetail?.year || '-'}</p>
              <p className="text-sm text-gray-400 mt-3">Semester</p>
              <p className="text-purple-400 font-semibold">{selectedCourseDetail?.semester ? `Semester ${selectedCourseDetail.semester}` : '-'}</p>
              <p className="text-sm text-gray-400 mt-3">Invite code</p>
              <p className="text-green-400 font-semibold">{selectedCourseDetail?.inviteCode || '-'}</p>
              <p className="text-sm text-gray-400 mt-3">Students enrolled</p>
              <p className="text-white font-semibold">{selectedCourseDetail?.students?.length || 0}</p>
            </div>

            {isEditingCourse && (
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Edit Course</h3>
                <input
                  className={inputClass}
                  value={courseEditForm.title}
                  onChange={(event) => setCourseEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Course title"
                />
                <input
                  className={inputClass}
                  value={courseEditForm.courseCode}
                  onChange={(event) => setCourseEditForm((prev) => ({ ...prev, courseCode: event.target.value.toUpperCase() }))}
                  placeholder="Course code"
                />
                <select
                  className={inputClass}
                  value={courseEditForm.year}
                  onChange={(event) => setCourseEditForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={courseEditForm.semester}
                  onChange={(event) => setCourseEditForm((prev) => ({ ...prev, semester: Number(event.target.value) }))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={4}
                  value={courseEditForm.description}
                  onChange={(event) => setCourseEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Course description"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : null}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCourse(false)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Student List</h3>
            <div className="space-y-3 max-h-130 overflow-y-auto pr-1">
              {(selectedCourseDetail?.students || []).length === 0 ? (
                <p className="text-gray-400">No students have joined this course yet.</p>
              ) : (
                selectedCourseDetail.students.map((student) => (
                  <div key={student._id} className="rounded-lg border border-gray-800 bg-[#111] p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{student.name || 'Student'}</p>
                      <p className="text-sm text-gray-400">Roll No: {student.rollNumber || '-'}</p>
                      <p className="text-sm text-gray-400">Semester: {student.semester || '-'}</p>
                    </div>
                    <span className="text-xs rounded-full bg-white/5 border border-white/10 px-2 py-1 text-gray-300">{student.email || 'No email'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CourseDetail;
