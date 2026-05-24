import { LoaderCircle } from 'lucide-react';
import { inputClass } from '../constants';

function CourseForm({ courseForm, setCourseForm, onSubmit, isLoading, submitText = 'Create Course' }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
          placeholder="Course code"
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
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : null}
          {isLoading ? 'Creating...' : submitText}
        </button>
      </div>
      <textarea
        className={`${inputClass} resize-none mb-4`}
        rows={3}
        value={courseForm.description}
        onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))}
        placeholder="Course description"
      />
    </div>
  );
}

export default CourseForm;
