import { LoaderCircle, CheckCircle2 } from 'lucide-react';
import { inputClass } from '../constants';

function ResultsHeader({
  selectedCourseId,
  setSelectedCourseId,
  selectedExamId,
  setSelectedExamId,
  courses,
  courseExams,
  showMarksImmediately,
  onToggleResultVisibility,
  onFinalizeMarks,
  isLoading
}) {
  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select
          className={inputClass}
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={selectedExamId}
          onChange={(event) => setSelectedExamId(event.target.value)}
        >
          <option value="">Select exam</option>
          {courseExams.map((exam) => (
            <option key={exam._id} value={exam._id}>
              {exam.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => onToggleResultVisibility(!showMarksImmediately)}
          disabled={isLoading || !selectedExamId}
          className={`${
            showMarksImmediately ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'
          } text-white px-4 py-2 rounded-md disabled:opacity-50`}
        >
          {showMarksImmediately ? 'Results Visible' : 'Results Hidden'}
        </button>
        <button
          type="button"
          onClick={onFinalizeMarks}
          disabled={isLoading || !selectedExamId}
          className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {isLoading ? 'Saving...' : 'Finalize Marks'}
        </button>
      </div>
    </>
  );
}

export default ResultsHeader;
