import { BookOpen, UserRound } from 'lucide-react';

function CourseCard({ course, activeCourseId, onSelect }) {
  const isSelected = activeCourseId === course._id;

  return (
    <article
      style={{
        ...styles.courseCard,
        borderColor: isSelected ? '#ffa116' : '#2f2f2f'
      }}
    >
      <div style={styles.courseCardHead}>
        <div style={styles.courseIcon}>
          <BookOpen size={18} />
        </div>
        <div>
          <h3 style={styles.courseTitle}>{course.title}</h3>
          <p style={styles.courseCode}>{course.courseCode}</p>
        </div>
      </div>

      <div style={styles.teacherRow}>
        <UserRound size={14} color="#9ca3af" />
        <span>{course.teacherId?.name || course.teacherId?.email || 'Teacher unavailable'}</span>
      </div>

      <button type="button" onClick={() => onSelect?.(course)} style={styles.openButton}>
        {isSelected ? 'Selected' : 'Open Course'}
      </button>
    </article>
  );
}

const styles = {
  courseCard: {
    backgroundColor: '#101010',
    border: '1px solid #2f2f2f',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  courseCardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  courseIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#201806',
    color: '#ffa116',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  courseTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#fff'
  },
  courseCode: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: '#888'
  },
  teacherRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#cbd5e1',
    fontSize: '13px'
  },
  openButton: {
    marginTop: 'auto',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: 600
  }
};

export default CourseCard;
