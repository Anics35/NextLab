import { toast } from 'react-hot-toast';
import { createCourse } from '../../../services/api';
import { DEFAULT_COURSE_FORM, cardClass } from '../constants';
import CourseForm from './CourseForm';
import CourseCard from './CourseCard';

function CoursesTab({ courses, coursesLoading, courseForm, setCourseForm, onSelectCourse, onRefresh }) {
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

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Courses</h2>
      <CourseForm
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        onSubmit={handleCreateCourse}
        submitText="Create Course"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {coursesLoading && <p className="text-gray-400">Loading courses...</p>}
        {!coursesLoading && courses.length === 0 && <p className="text-gray-400">No courses found.</p>}
        {courses.map((course) => (
          <CourseCard key={course._id} course={course} onSelect={onSelectCourse} />
        ))}
      </div>
    </section>
  );
}

export default CoursesTab;
