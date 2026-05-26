import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, BookOpen, FileText, LogOut, Shield, Trash2, UserX, Users } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import {
  deleteAdminCourse,
  deleteAdminExam,
  deleteAdminUser,
  downloadAdminReports,
  getAdminActivityLogs,
  getAdminAnalytics,
  getAdminCourses,
  getAdminExams,
  getAdminProctorLogs,
  getAdminReports,
  getAdminSummary,
  getAdminSubmissions,
  getAdminUserActivity,
  getAdminUsers,
  setAdminUserDisabled
} from '../../services/api';
import { logout } from '../../services/authService';

const tabs = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'exams', label: 'Exams', icon: FileText }
];

// Only show the primary top-level stats the user requested
const statLabels = {
  users: 'Users',
  courses: 'Courses',
  exams: 'Exams'
};

// StatusBadge removed — Archived/Hidden UI not required.

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedExamCourseId, setSelectedExamCourseId] = useState(null);
  const [summary, setSummary] = useState({});
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [proctorLogs, setProctorLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        summaryData,
        usersData,
        coursesData,
        examsData,
        analyticsData,
        proctorData,
        activityData,
        submissionsData,
        reportsData
      ] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminCourses(),
        getAdminExams(),
        getAdminAnalytics(),
        getAdminProctorLogs(),
        getAdminActivityLogs(),
        getAdminSubmissions(),
        getAdminReports()
      ]);

      setSummary(summaryData.summary || {});
      setUsers(usersData.users || []);
      setCourses(coursesData.courses || []);
      setExams(examsData.exams || []);
      setAnalytics(analyticsData.analytics || {});
      setProctorLogs(proctorData.events || []);
      setActivityLogs(activityData.events || []);
      setSubmissions(submissionsData.submissions || []);
      setReports(reportsData.reports || null);
    } catch (error) {
      toast.error(error.message || 'Unable to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const students = useMemo(() => users.filter((user) => user.role === 'student'), [users]);
  const teachers = useMemo(() => users.filter((user) => user.role === 'teacher'), [users]);
  const studentsBySemester = useMemo(() => {
    const grouped = students.reduce((acc, student) => {
      const semester = String(student.semester || 'Not set').trim() || 'Not set';
      if (!acc[semester]) acc[semester] = [];
      acc[semester].push(student);
      return acc;
    }, {});

    return Object.entries(grouped).sort(([left], [right]) => {
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber;
      }
      return left.localeCompare(right);
    });
  }, [students]);
  const selectedExamCourse = useMemo(() => {
    if (!courses.length) return null;
    return courses.find((course) => course._id === selectedExamCourseId) || courses[0];
  }, [courses, selectedExamCourseId]);
  const selectedCourseExams = useMemo(() => {
    if (!selectedExamCourse?._id) return [];
    return exams.filter((exam) => String(exam.courseId?._id || exam.courseId) === String(selectedExamCourse._id));
  }, [exams, selectedExamCourse]);

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.role} ${user.name || user.email}?`)) return;
    try {
      await deleteAdminUser(user._id);
      setUsers((prev) => prev.filter((item) => item._id !== user._id));
      toast.success('User deleted.');
      void loadAdminData();
    } catch (error) {
      toast.error(error.message || 'Unable to delete user.');
    }
  };

  const handleDisableUser = async (user) => {
    try {
      const response = await setAdminUserDisabled(user._id, !user.disabled);
      setUsers((prev) => prev.map((item) => (item._id === user._id ? response.user : item)));
      toast.success(response.user?.disabled ? 'Account disabled.' : 'Account enabled.');
    } catch (error) {
      toast.error(error.message || 'Unable to update account.');
    }
  };

  const handleViewActivity = async (user) => {
    try {
      const response = await getAdminUserActivity(user._id);
      setSelectedActivity(response);
    } catch (error) {
      toast.error(error.message || 'Unable to load account activity.');
    }
  };

  const handleDownloadReports = async () => {
    try {
      const blob = await downloadAdminReports();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'nexlab-admin-report.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      toast.error(error.message || 'Unable to download report.');
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete course ${course.title}?`)) return;
    try {
      await deleteAdminCourse(course._id);
      setCourses((prev) => prev.filter((item) => item._id !== course._id));
      toast.success('Course deleted.');
      void loadAdminData();
    } catch (error) {
      toast.error(error.message || 'Unable to delete course.');
    }
  };

  const handleOpenCourseExams = (course) => {
    setSelectedExamCourseId(course._id);
    setActiveTab('exams');
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Delete exam ${exam.title}?`)) return;
    try {
      await deleteAdminExam(exam._id);
      setExams((prev) => prev.filter((item) => item._id !== exam._id));
      toast.success('Exam deleted.');
      void loadAdminData();
    } catch (error) {
      toast.error(error.message || 'Unable to delete exam.');
    }
  };
  

  const renderUsers = (items, roleLabel) => (
    <div className="grid gap-3">
      {items.map((user) => (
        <article key={user._id} className="rounded-lg border border-white/10 bg-[#101010] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{user.name || roleLabel}</p>
              <p className="text-sm text-white/60">{user.email}</p>
              <p className="mt-1 text-xs text-white/50">{user.rollNumber ? `Roll ${user.rollNumber}` : roleLabel} {user.semester ? `- Semester ${user.semester}` : ''}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* No active/disabled badge shown per user request; only Activity and Delete */}
              <button type="button" onClick={() => handleViewActivity(user)} className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 hover:bg-blue-500/20">
                <Activity size={14} />Activity
              </button>
              <button type="button" onClick={() => handleDeleteUser(user)} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                <Trash2 size={14} />Delete
              </button>
            </div>
          </div>
        </article>
      ))}
      {items.length === 0 && <p className="text-sm text-white/50">No {roleLabel.toLowerCase()} accounts found.</p>}
    </div>
  );

  // derive unique years and semesters for filters
  const years = Array.from(new Set(courses.map((c) => c.year).filter(Boolean))).sort((a, b) => a - b);
  const semestersForYear = (year) => Array.from(new Set(courses.filter((c) => c.year === year).map((c) => c.semester).filter(Boolean))).sort((a, b) => a - b);

  // filter state
  const [filterYear, setFilterYear] = useState(years.length ? years[0] : '');
  const [filterSemester, setFilterSemester] = useState('');

  // update semester options when year changes
  useEffect(() => {
    if (!filterYear) {
      setFilterSemester('');
      return;
    }
    const semList = semestersForYear(filterYear);
    setFilterSemester(semList.length ? semList[0] : '');
  }, [filterYear]);

  const filteredCourses = courses.filter((c) => {
    if (filterYear && String(c.year) !== String(filterYear)) return false;
    if (filterSemester && String(c.semester) !== String(filterSemester)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <Toaster position="top-right" />
      <header className="border-b border-white/10 bg-[#0b0b0b] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-black"><Shield size={20} /></div>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-white/50">Platform Supervisor</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20">
            <LogOut size={16} />Logout
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-white/10 bg-[#090909] p-4 lg:border-b-0 lg:border-r">
          <nav className="grid gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-amber-500 text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={16} />{tab.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
            <p>Admin = Platform Supervisor</p>
            <p>Teacher = Academic Controller</p>
            <p>Student = Exam Participant</p>
          </div>
        </aside>

        <section className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {Object.entries(statLabels).map(([key, label]) => (
              <div key={key} className="rounded-lg border border-white/10 bg-[#101010] p-3">
                <p className="text-xs text-white/50">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{summary[key] ?? 0}</p>
              </div>
            ))}
          </div>

          {loading && <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">Loading dashboard...</div>}

          {activeTab === 'users' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Students</h2>
                <div className="space-y-4">
                  {studentsBySemester.map(([semester, semesterStudents]) => (
                    <div key={semester} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-white">Semester {semester}</h3>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/50">{semesterStudents.length} students</span>
                      </div>
                      {renderUsers(semesterStudents, 'Student')}
                    </div>
                  ))}
                  {studentsBySemester.length === 0 && <p className="text-sm text-white/50">No student accounts found.</p>}
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Teachers</h2>
                {renderUsers(teachers, 'Teacher')}
              </section>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm text-white/60">Year:</label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="rounded-md bg-[#0b0b0b] border border-white/10 px-3 py-2 text-sm text-white/80">
                  <option value="">All</option>
                  {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
                <label className="text-sm text-white/60">Semester:</label>
                <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="rounded-md bg-[#0b0b0b] border border-white/10 px-3 py-2 text-sm text-white/80">
                  <option value="">All</option>
                  {filterYear ? semestersForYear(filterYear).map((s) => (<option key={s} value={s}>{s}</option>)) : null}
                </select>
              </div>

              {filteredCourses.map((course) => (
                <article key={course._id} className="rounded-lg border border-white/10 bg-[#101010] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{course.title}</p>
                      <p className="text-sm text-white/60">{course.courseCode} - {course.year} - Semester {course.semester}</p>
                      <p className="mt-1 text-xs text-white/50">Teacher: {course.teacherId?.name || 'Unknown'} - Students: {course.students?.length || 0}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => handleOpenCourseExams(course)} className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 hover:bg-blue-500/20">
                        <FileText size={14} />View Exams
                      </button>
                      <button type="button" onClick={() => handleDeleteCourse(course)} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                        <Trash2 size={14} />Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {courses.length === 0 && <p className="text-sm text-white/50">No courses found.</p>}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Courses</h2>
                <div className="grid gap-2">
                  {filteredCourses.map((course) => {
                    const active = selectedExamCourse?._id === course._id;
                    const count = exams.filter((exam) => String(exam.courseId?._id || exam.courseId) === String(course._id)).length;
                    return (
                      <button
                        key={course._id}
                        type="button"
                        onClick={() => setSelectedExamCourseId(course._id)}
                        className={`rounded-lg border p-3 text-left ${active ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-[#101010] hover:bg-white/[0.06]'}`}
                      >
                        <p className="text-sm font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-xs text-white/50">{course.courseCode} - {count} exams</p>
                      </button>
                    );
                  })}
                  {courses.length === 0 && <p className="text-sm text-white/50">No courses found.</p>}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedExamCourse?.title || 'Course Exams'}</h2>
                    <p className="text-sm text-white/50">{selectedExamCourse?.courseCode || 'Select a course to view exams.'}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/50">{selectedCourseExams.length} exams</span>
                </div>
                <div className="grid gap-3">
                  {selectedCourseExams.map((exam) => (
                    <article key={exam._id} className="rounded-lg border border-white/10 bg-[#101010] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{exam.title}</p>
                          <p className="text-sm text-white/60">{exam.status}</p>
                          <p className="mt-1 text-xs text-white/50">Problems: {exam.problems?.length || 0} - Ends: {exam.endTime ? new Date(exam.endTime).toLocaleString() : '-'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => handleDeleteExam(exam)} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">
                            <Trash2 size={14} />Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {selectedCourseExams.length === 0 && <p className="text-sm text-white/50">No exams found for this course.</p>}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 size={18} />Analytics</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(analytics).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-white/10 bg-[#101010] p-3">
                      <p className="text-xs capitalize text-white/50">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <h2 className="pt-3 text-lg font-semibold">Reports</h2>
                <div className="rounded-lg border border-white/10 bg-[#101010] p-3 text-sm text-white/70">
                  <p>Latest exams: {reports?.latestExams?.length || 0}</p>
                  <p>Latest courses: {reports?.latestCourses?.length || 0}</p>
                  <p>Recent warnings: {reports?.latestWarnings?.length || 0}</p>
                  <button type="button" onClick={handleDownloadReports} className="mt-3 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-black hover:bg-amber-400">
                    Download CSV
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Proctor Logs</h2>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {proctorLogs.map((event) => (
                    <div key={event._id} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                      <p className="font-medium text-amber-200">{event.type}</p>
                      <p className="text-xs text-white/60">{event.message || event.meta?.studentEmail || 'Warning'} - {new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {proctorLogs.length === 0 && <p className="text-sm text-white/50">No proctor warnings found.</p>}
                </div>

                <h2 className="pt-3 text-lg font-semibold">Submissions</h2>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {submissions.map((submission) => (
                    <div key={submission._id} className="rounded-lg border border-white/10 bg-[#101010] p-3 text-sm">
                      <p className="font-medium text-white">{submission.examId?.title || 'Exam submission'}</p>
                      <p className="text-xs text-white/60">{submission.userId?.name || submission.userId?.email || 'Student'} - {new Date(submission.updatedAt || submission.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {submissions.length === 0 && <p className="text-sm text-white/50">No submissions found.</p>}
                </div>

                <h2 className="pt-3 text-lg font-semibold">Activity Logs</h2>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {activityLogs.map((event) => (
                    <div key={event._id} className="rounded-lg border border-white/10 bg-[#101010] p-3 text-sm">
                      <p className="font-medium text-white">{event.type}</p>
                      <p className="text-xs text-white/60">{event.studentId} - {event.severity} - {new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {activityLogs.length === 0 && <p className="text-sm text-white/50">No activity logs found.</p>}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-[#0b0b0b] p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedActivity.user?.name || 'Account Activity'}</h2>
                <p className="text-sm text-white/50">{selectedActivity.user?.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedActivity(null)} className="rounded-md border border-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/10">Close</button>
            </div>
            {/* Show exams for teacher or student's exam attempts */}
            <div className="grid gap-3 md:grid-cols-1">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-white/50">Exams</p>
                <p className="text-xl font-semibold">{(selectedActivity.exams || selectedActivity.activity?.attempts || []).length || 0}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selectedActivity.exams ? (
                // teacher: list exams conducted by teacher
                selectedActivity.exams.map((exam) => (
                  <div key={exam._id} className="rounded-lg border border-white/10 bg-[#101010] p-3 text-sm">
                    <p className="font-medium text-white">{exam.title}</p>
                    <p className="text-xs text-white/60">{exam.courseId?.title || exam.courseId || ''} - {exam.startTime ? new Date(exam.startTime).toLocaleString() : ''}</p>
                  </div>
                ))
              ) : (selectedActivity.activity?.attempts || []).map((attempt) => (
                // student: list attempts/exams given
                <div key={attempt._id || attempt.examId} className="rounded-lg border border-white/10 bg-[#101010] p-3 text-sm">
                  <p className="font-medium text-white">{attempt.examId?.title || attempt.title || attempt.exam || 'Exam'}</p>
                  <p className="text-xs text-white/60">Taken: {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : (attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : '')}</p>
                </div>
              ))}

              {(!selectedActivity.exams && !(selectedActivity.activity?.attempts || []).length) && <p className="text-sm text-white/50">No exams found for this account.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
