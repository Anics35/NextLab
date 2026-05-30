import { BookOpen, LoaderCircle, Plus } from 'lucide-react';
import CourseCard from './CourseCard';

function CourseGrid({ courses, activeCourseId, onSelectCourse, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <LoaderCircle size={32} className="relative animate-spin text-amber-400" />
        </div>
        <p className="text-sm text-white/40">Loading your courses...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.08] bg-[#0c0c0e] py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <BookOpen size={28} className="text-white/20" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/50">No courses yet</p>
          <p className="mt-1 text-xs text-white/30">Join your first course using an invite code above</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-400">
          <Plus size={12} />
          Use invite code to get started
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard
          key={course._id}
          course={course}
          activeCourseId={activeCourseId}
          onSelect={onSelectCourse}
        />
      ))}
    </div>
  );
}

export default CourseGrid;
