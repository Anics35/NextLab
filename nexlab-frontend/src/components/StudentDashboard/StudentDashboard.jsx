import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getMyCourses, joinCourse } from '../../services/api';
import JoinCourseForm from './JoinCourseForm';
import CourseGrid from './CourseGrid';

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

  const handleJoinCourse = async (code) => {
    const trimmedCode = code.trim();

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

      <JoinCourseForm
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        onSubmit={handleJoinCourse}
        isLoading={isJoining}
      />

      <CourseGrid
        courses={courses}
        activeCourseId={activeCourseId}
        onSelectCourse={onSelectCourse}
        isLoading={isLoading}
      />
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
    fontWeight: 800,
    color: '#fff'
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#9ca3af',
    fontSize: '13px'
  }
};

export default StudentDashboard;
