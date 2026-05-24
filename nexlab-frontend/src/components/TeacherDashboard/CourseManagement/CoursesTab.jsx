import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createCourse } from '../../../services/api';
import { DEFAULT_COURSE_FORM, cardClass } from '../constants';
import CourseForm from './CourseForm';
import CourseCard from './CourseCard';

function CoursesTab({ courses, coursesLoading, courseForm, setCourseForm, onSelectCourse, onRefresh }) {
  const [selectedYear, setSelectedYear] = useState('all');

  const handleCreateCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.courseCode.trim()) {
      toast.error('Course title and code are required.');
      return;
    }

    try {
      // Using isLoading state would be better, managing it here for simplicity
      await createCourse(courseForm);
      toast.success('Course created.');
      setCourseForm(DEFAULT_COURSE_FORM);
      await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Unable to create course.');
    }
  };

  const yearSet = new Set(courses.map(c => c.year));
  const years = Array.from(yearSet).sort((a, b) => b - a);
  
  const filteredCourses = selectedYear === 'all' 
    ? courses 
    : courses.filter(c => c.year === parseInt(selectedYear));

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Courses</h2>
      <CourseForm
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        onSubmit={handleCreateCourse}
        submitText="Create Course"
      />

      {years.length > 0 && (
        <div className="mb-4">
          <label className="text-sm text-gray-400 mr-3">Filter by Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[#1a1a1a] text-white border border-gray-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {coursesLoading && <p className="text-gray-400">Loading courses...</p>}
        {!coursesLoading && filteredCourses.length === 0 && <p className="text-gray-400">No courses found.</p>}
        {filteredCourses.map((course) => (
          <CourseCard key={course._id} course={course} onSelect={onSelectCourse} />
        ))}
      </div>
    </section>
  );
}

export default CoursesTab;
