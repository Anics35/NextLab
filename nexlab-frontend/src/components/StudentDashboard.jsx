import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpen, LoaderCircle, Plus, UserRound } from 'lucide-react';
import { getMyCourses, joinCourse } from '../services/api';

function StudentDashboard({ activeCourseId, onSelectCourse }) {
  const [inviteCode, setInviteCode] = useState('');
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getMyCourses();
      setCourses(data.courses || []);
    } catch (error) {
      setCourses([]);
      toast.error(error.message || 'Unable to load your courses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const handleJoinCourse = async (event) => {
    event.preventDefault();
    const trimmedCode = inviteCode.trim();

    if (!trimmedCode) {
      toast.error('Enter a course invite code.');
      return;
    }

    setIsJoining(true);

    try {
      await joinCourse(trimmedCode);
      toast.success('Course joined successfully.');
      setInviteCode('');
      await loadCourses();
    } catch (error) {
      toast.error(error.message || 'Unable to join course.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>My Courses</h2>
          <p style={styles.subtitle}>Join a course with an invite code and open its exams.</p>
        </div>
      </div>

      <form onSubmit={handleJoinCourse} style={styles.joinForm}>
        <input
          type="text"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          placeholder="Enter Course Invite Code"
          style={styles.input}
        />
        <button type="submit" disabled={isJoining} style={styles.joinButton}>
          {isJoining ? 'Joining...' : 'Join Course'}
        </button>
      </form>

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
            <article
              key={course._id}
              style={{
                ...styles.courseCard,
                borderColor: activeCourseId === course._id ? '#ffa116' : '#2f2f2f'
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

              <button
                type="button"
                onClick={() => onSelectCourse?.(course)}
                style={styles.openButton}
              >
                {activeCourseId === course._id ? 'Selected' : 'Open Course'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  panel: {
    backgroundColor: '#181818',
    border: '1px solid #2c2c2c',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    padding: '18px',
    minHeight: 0
  },
  header: {
    marginBottom: '18px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 800
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#9ca3af',
    fontSize: '13px'
  },
  joinForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '18px'
  },
  input: {
    flex: 1,
    backgroundColor: '#101010',
    border: '1px solid #2f2f2f',
    color: '#fff',
    borderRadius: '10px',
    padding: '12px 14px',
    outline: 'none'
  },
  joinButton: {
    backgroundColor: '#ffa116',
    color: '#101010',
    border: 'none',
    borderRadius: '10px',
    padding: '0 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
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
  },
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
    fontSize: '16px'
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

export default StudentDashboard;
