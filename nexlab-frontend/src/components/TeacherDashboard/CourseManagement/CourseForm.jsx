import { LoaderCircle } from 'lucide-react';
import { inputClass } from '../constants';

function CourseForm({ courseForm, setCourseForm, onSubmit, isLoading, submitText = 'Create Course' }) {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
