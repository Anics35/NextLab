import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';
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
    <section className="flex flex-col gap-6 p-2">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a] p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={20} className="text-amber-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-amber-400/80">Student Dashboard</span>
            </div>
            <h2 className="text-2xl font-bold text-white">My Courses</h2>
            <p className="mt-1 text-sm text-white/50">Join a course with an invite code and access your exams.</p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
              <span className="text-2xl font-bold text-white">{courses.length}</span>
              <span className="text-[11px] text-white/40 mt-0.5">Courses</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
              <BookOpen size={20} className="text-indigo-400 mb-1" />
              <span className="text-[11px] text-white/40">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Join Course Section */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Join a New Course</span>
        </div>
        <JoinCourseForm
          inviteCode={inviteCode}
          setInviteCode={setInviteCode}
          onSubmit={handleJoinCourse}
          isLoading={isJoining}
        />
      </div>

      {/* Course Grid */}
      <CourseGrid
        courses={courses}
        activeCourseId={activeCourseId}
        onSelectCourse={onSelectCourse}
        isLoading={isLoading}
      />
    </section>
  );
}

export default StudentDashboard;
