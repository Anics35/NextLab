import { LoaderCircle, Plus } from 'lucide-react';
import CourseCard from './CourseCard';

function CourseGrid({ courses, activeCourseId, onSelectCourse, isLoading }) {
  return (
    <>
      {isLoading ? (
        <div style={styles.emptyState}>
          <LoaderCircle size={28} color="#ffa116" className="animate-spin" />
          <p>Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div style={styles.emptyState}>
          <Plus size={28} color="#666" />
          <p>No courses yet. Join one using an invite code.</p>
        </div>
      ) : (
        <div style={styles.courseGrid}>
          {courses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              activeCourseId={activeCourseId}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      )}
    </>
  );
}

const styles = {
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#888',
    textAlign: 'center'
  },
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
    overflowY: 'auto',
    paddingRight: '4px'
  }
};

export default CourseGrid;
