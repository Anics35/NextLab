import { useState } from 'react';
import { ArrowLeft, Edit3, LoaderCircle, Save, Trash2, X } from 'lucide-react';
import { cardClass, inputClass } from '../constants';

function CourseDetail({
  selectedCourseDetail,
  courseDetailLoading,
  isEditingCourse,
  setIsEditingCourse,
  courseEditForm,
  setCourseEditForm,
  onSave,
  onDelete,
  onClose,
  onRemoveStudent,
  isSaving,
  isDeleting,
  isRemovingStudent
}) {
  const [confirmRemoveStudent, setConfirmRemoveStudent] = useState(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{selectedCourseDetail?.title || 'Course Details'}</h2>
            <p className="text-sm text-white/40">Manage students and course settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingCourse((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <Edit3 size={14} />
            {isEditingCourse ? 'Close Edit' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {courseDetailLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.3fr]">
          {/* Course Info */}
          <div className="space-y-4">
            <div className={cardClass}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Course Code</p>
                  <p className="text-sm font-semibold text-amber-400 font-mono">{selectedCourseDetail?.courseCode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Year</p>
                  <p className="text-sm font-semibold text-indigo-400">{selectedCourseDetail?.year || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Semester</p>
                  <p className="text-sm font-semibold text-purple-400">{selectedCourseDetail?.semester ? `Semester ${selectedCourseDetail.semester}` : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Invite Code</p>
                  <p className="text-sm font-semibold text-emerald-400 font-mono">{selectedCourseDetail?.inviteCode || '-'}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Students Enrolled</p>
                <p className="text-2xl font-bold text-white">{selectedCourseDetail?.students?.length || 0}</p>
              </div>
            </div>

            {/* Edit Form */}
            {isEditingCourse && (
              <div className={cardClass}>
                <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Edit Course</h3>
                <div className="space-y-3">
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
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className={inputClass}
                      value={courseEditForm.year}
                      onChange={(event) => setCourseEditForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      className={inputClass}
                      value={courseEditForm.semester}
                      onChange={(event) => setCourseEditForm((prev) => ({ ...prev, semester: Number(event.target.value) }))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={courseEditForm.description}
                    onChange={(event) => setCourseEditForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Course description"
                  />
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCourse(false)}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student List */}
          <div className={cardClass}>
            <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Student List</h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {(selectedCourseDetail?.students || []).length === 0 ? (
                <p className="py-8 text-center text-sm text-white/30">No students have joined this course yet.</p>
              ) : (
                selectedCourseDetail.students.map((student) => (
                  <div key={student._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{student.name || 'Student'}</p>
                      <p className="text-xs text-white/40">Roll: {student.rollNumber || '-'} · Sem: {student.semester || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">{student.email || ''}</span>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveStudent({ studentId: student._id, studentName: student.name })}
                        disabled={isRemovingStudent}
                        className="rounded-lg p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        aria-label="Remove student"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Student Confirmation Modal */}
      {confirmRemoveStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Remove Student</h3>
            <p className="mt-2 text-sm text-white/60">
              Remove <span className="font-semibold text-white">{confirmRemoveStudent.studentName}</span> from this course?
            </p>
            <p className="mt-2 text-xs text-white/30">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemoveStudent(null)}
                disabled={isRemovingStudent}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveStudent(selectedCourseDetail._id, confirmRemoveStudent.studentId);
                  setConfirmRemoveStudent(null);
                }}
                disabled={isRemovingStudent}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isRemovingStudent && <LoaderCircle size={16} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CourseDetail;
