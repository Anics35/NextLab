import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Filter, Plus, BookOpen } from 'lucide-react';
import { createCourse } from '../../../services/api';
import { DEFAULT_COURSE_FORM, cardClass } from '../constants';
import CourseForm from './CourseForm';
import CourseCard from './CourseCard';

function CoursesTab({ courses, coursesLoading, courseForm, setCourseForm, onSelectCourse, onRefresh }) {
  const [selectedYear, setSelectedYear] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.courseCode.trim()) {
      toast.error('Course title and code are required.');
      return;
    }

    try {
      await createCourse(courseForm);
      toast.success('Course created.');
      setCourseForm(DEFAULT_COURSE_FORM);
      setShowCreateForm(false);
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
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Courses</h2>
          <p className="mt-1 text-sm text-white/40">Manage your courses and enrolled students.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110"
        >
          <Plus size={16} />
          New Course
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={cardClass}>
          <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Create New Course</h3>
          <CourseForm
            courseForm={courseForm}
            setCourseForm={setCourseForm}
            onSubmit={handleCreateCourse}
            submitText="Create Course"
          />
        </div>
      )}

      {/* Filter */}
      {years.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-white/30" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-all focus:border-amber-500/40"
          >
            <option value="all">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span className="text-xs text-white/30">{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Course Grid */}
      {coursesLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-sm text-white/40">Loading courses...</p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-[#0c0c0e] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <BookOpen size={24} className="text-white/20" />
          </div>
          <p className="text-sm text-white/40">No courses found. Create your first course to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course._id} course={course} onSelect={onSelectCourse} />
          ))}
        </div>
      )}
    </section>
  );
}

export default CoursesTab;
