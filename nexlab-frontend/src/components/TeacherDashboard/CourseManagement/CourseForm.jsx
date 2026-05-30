import { LoaderCircle, Plus } from 'lucide-react';
import { inputClass } from '../constants';

function CourseForm({ courseForm, setCourseForm, onSubmit, isLoading, submitText = 'Create Course' }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <input
          className={inputClass}
          value={courseForm.title}
          onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Course title"
        />
        <input
          className={inputClass}
          value={courseForm.courseCode}
          onChange={(event) => setCourseForm((prev) => ({ ...prev, courseCode: event.target.value.toUpperCase() }))}
          placeholder="Course code (e.g. CS101)"
        />
        <select
          className={inputClass}
          value={courseForm.year}
          onChange={(event) => setCourseForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={courseForm.semester}
          onChange={(event) => setCourseForm((prev) => ({ ...prev, semester: Number(event.target.value) }))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <option key={sem} value={sem}>
              Semester {sem}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className={`${inputClass} resize-none mb-4`}
        rows={3}
        value={courseForm.description}
        onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))}
        placeholder="Course description (optional)"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 disabled:opacity-50"
      >
        {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
        {isLoading ? 'Creating...' : submitText}
      </button>
    </div>
  );
}

export default CourseForm;
