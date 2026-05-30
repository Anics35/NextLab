import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, ChevronDown, Download, FileSpreadsheet, FileText, LogOut, Shield, Trash2, Users } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import {
  deleteAdminCourse,
  deleteAdminExam,
  deleteAdminUser,
  downloadAdminReports,
  downloadAdminExamReportPdf,
  downloadAdminExamReportXlsx,
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

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'exams', label: 'Exams', icon: FileText }
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('nextlab_admin_tab') || 'users';
  });
  const [selectedExamCourseId, setSelectedExamCourseId] = useState(() => {
    return localStorage.getItem('nextlab_admin_exam_course') || null;
  });
  const [summary, setSummary] = useState({});
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [downloadingExamId, setDownloadingExamId] = useState(null);

  // Persist tab and selected course
  useEffect(() => {
    localStorage.setItem('nextlab_admin_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedExamCourseId) {
      localStorage.setItem('nextlab_admin_exam_course', selectedExamCourseId);
    }
  }, [selectedExamCourseId]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, usersData, coursesData, examsData] = await Promise.all([
        getAdminSummary(),
        getAdminUsers(),
        getAdminCourses(),
        getAdminExams()
      ]);
      setSummary(summaryData.summary || {});
      setUsers(usersData.users || []);
      setCourses(coursesData.courses || []);
      setExams(examsData.exams || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAdminData(); }, [loadAdminData]);

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const teachers = useMemo(() => users.filter((u) => u.role === 'teacher'), [users]);
  const studentsBySemester = useMemo(() => {
    const grouped = students.reduce((acc, s) => {
      const sem = String(s.semester || 'Not set').trim() || 'Not set';
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push(s);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => {
      const an = Number(a), bn = Number(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.localeCompare(b);
    });
  }, [students]);

  const years = useMemo(() => Array.from(new Set(courses.map((c) => c.year).filter(Boolean))).sort((a, b) => a - b), [courses]);
  const semestersForYear = (year) => Array.from(new Set(courses.filter((c) => c.year === year).map((c) => c.semester).filter(Boolean))).sort((a, b) => a - b);

  useEffect(() => {
    if (!filterYear) { setFilterSemester(''); return; }
    const sems = semestersForYear(filterYear);
    setFilterSemester(sems.length ? sems[0] : '');
  }, [filterYear]);

  const filteredCourses = courses.filter((c) => {
    if (filterYear && String(c.year) !== String(filterYear)) return false;
    if (filterSemester && String(c.semester) !== String(filterSemester)) return false;
    return true;
  });

  const selectedExamCourse = useMemo(() => {
    if (!courses.length) return null;
    return courses.find((c) => c._id === selectedExamCourseId) || courses[0];
  }, [courses, selectedExamCourseId]);

  const selectedCourseExams = useMemo(() => {
    if (!selectedExamCourse?._id) return [];
    return exams.filter((e) => String(e.courseId?._id || e.courseId) === String(selectedExamCourse._id));
  }, [exams, selectedExamCourse]);

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.role} ${user.name || user.email}?`)) return;
    try {
      await deleteAdminUser(user._id);
      setUsers((prev) => prev.filter((i) => i._id !== user._id));
      toast.success('User deleted.');
      void loadAdminData();
    } catch (error) { toast.error(error.message || 'Unable to delete user.'); }
  };

  const handleViewActivity = async (user) => {
    try {
      const response = await getAdminUserActivity(user._id);
      setSelectedActivity(response);
    } catch (error) { toast.error(error.message || 'Unable to load activity.'); }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete course ${course.title}?`)) return;
    try {
      await deleteAdminCourse(course._id);
      setCourses((prev) => prev.filter((i) => i._id !== course._id));
      toast.success('Course deleted.');
      void loadAdminData();
    } catch (error) { toast.error(error.message || 'Unable to delete course.'); }
  };

  const handleOpenCourseExams = (course) => {
    setSelectedExamCourseId(course._id);
    setActiveTab('exams');
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Delete exam ${exam.title}?`)) return;
    try {
      await deleteAdminExam(exam._id);
      setExams((prev) => prev.filter((i) => i._id !== exam._id));
      toast.success('Exam deleted.');
      void loadAdminData();
    } catch (error) { toast.error(error.message || 'Unable to delete exam.'); }
  };

  const handleDownloadReport = async (examId, format) => {
    setDownloadingExamId(examId);
    try {
      const blob = format === 'xlsx'
        ? await downloadAdminExamReportXlsx(examId)
        : await downloadAdminExamReportPdf(examId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-report-${examId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded.`);
    } catch (error) { toast.error(error.message || 'Unable to download report.'); }
    finally { setDownloadingExamId(null); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070707]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-black shadow-lg shadow-amber-500/20">NL</div>
            <div>
              <p className="text-sm font-bold text-white">NextLab</p>
              <p className="text-[11px] text-white/40">Admin Panel</p>
            </div>
          </div>
          <button type="button" onClick={() => { localStorage.removeItem('nextlab_admin_tab'); localStorage.removeItem('nextlab_admin_exam_course'); logout(); }} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20">
            <LogOut size={14} />Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[240px] shrink-0 border-r border-white/[0.06] bg-[#0a0a0a] px-3 py-5 min-h-[calc(100vh-64px)]">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">Manage</p>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive ? 'bg-amber-500/15 text-amber-400' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                  }`}>
                  <Icon size={16} className={isActive ? 'text-amber-400' : 'text-white/30 group-hover:text-white/60'} />
                  {tab.label}
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </nav>

          {/* Stats */}
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Platform</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-white/50">Users</span><span className="font-semibold text-white">{summary.users ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Courses</span><span className="font-semibold text-white">{summary.courses ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Exams</span><span className="font-semibold text-white">{summary.exams ?? 0}</span></div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && !loading && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Users</h2>
                  <p className="mt-1 text-sm text-white/40">Manage students and teachers on the platform.</p>
                </div>
                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Students */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Students ({students.length})</h3>
                    {studentsBySemester.map(([sem, semStudents]) => (
                      <div key={sem} className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/50">Semester {sem}</span>
                          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/35">{semStudents.length}</span>
                        </div>
                        <div className="space-y-2">
                          {semStudents.map((user) => (
                            <div key={user._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user.name || 'Student'}</p>
                                <p className="text-[11px] text-white/35">{user.email} · Roll: {user.rollNumber || '-'}</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button type="button" onClick={() => handleViewActivity(user)} className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-1.5 text-indigo-400 hover:bg-indigo-500/20"><Activity size={12} /></button>
                                <button type="button" onClick={() => handleDeleteUser(user)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {studentsBySemester.length === 0 && <p className="text-sm text-white/30">No students found.</p>}
                  </div>

                  {/* Teachers */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Teachers ({teachers.length})</h3>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4 space-y-2">
                      {teachers.map((user) => (
                        <div key={user._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name || 'Teacher'}</p>
                            <p className="text-[11px] text-white/35">{user.email}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={() => handleViewActivity(user)} className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-1.5 text-indigo-400 hover:bg-indigo-500/20"><Activity size={12} /></button>
                            <button type="button" onClick={() => handleDeleteUser(user)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                      {teachers.length === 0 && <p className="text-sm text-white/30">No teachers found.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COURSES TAB */}
            {activeTab === 'courses' && !loading && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Courses</h2>
                  <p className="mt-1 text-sm text-white/40">View and manage all courses on the platform.</p>
                </div>
                {/* Filters */}
                <div className="flex items-center gap-3">
                  <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40">
                    <option value="">All Years</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40">
                    <option value="">All Semesters</option>
                    {filterYear ? semestersForYear(Number(filterYear)).map((s) => <option key={s} value={s}>Sem {s}</option>) : null}
                  </select>
                  <span className="text-xs text-white/30">{filteredCourses.length} courses</span>
                </div>
                {/* Course List */}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCourses.map((course) => (
                    <article key={course._id} className="group rounded-2xl border border-white/[0.06] bg-[#111113] p-5 transition-all hover:border-white/[0.1]">
                      <p className="text-sm font-semibold text-white">{course.title}</p>
                      <p className="mt-1 text-xs text-white/35">{course.courseCode} · {course.year} · Sem {course.semester}</p>
                      <p className="mt-2 text-[11px] text-white/30">Teacher: {course.teacherId?.name || '?'} · {course.students?.length || 0} students</p>
                      <div className="mt-4 flex gap-2 border-t border-white/[0.04] pt-3">
                        <button type="button" onClick={() => handleOpenCourseExams(course)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-medium text-indigo-300 hover:bg-indigo-500/20">
                          <FileText size={10} />Exams
                        </button>
                        <button type="button" onClick={() => handleDeleteCourse(course)} className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20">
                          <Trash2 size={10} />Delete
                        </button>
                      </div>
                    </article>
                  ))}
                  {filteredCourses.length === 0 && <p className="text-sm text-white/30">No courses found.</p>}
                </div>
              </div>
            )}

            {/* EXAMS TAB */}
            {activeTab === 'exams' && !loading && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Exams</h2>
                  <p className="mt-1 text-sm text-white/40">View exams by course. Download finalized reports.</p>
                </div>
                <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
                  {/* Course Selector */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-1">Select Course</p>
                    {courses.map((course) => {
                      const active = selectedExamCourse?._id === course._id;
                      const count = exams.filter((e) => String(e.courseId?._id || e.courseId) === String(course._id)).length;
                      return (
                        <button key={course._id} type="button" onClick={() => setSelectedExamCourseId(course._id)}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            active ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/[0.06] bg-[#111113] hover:border-white/[0.1]'
                          }`}>
                          <p className="text-sm font-medium text-white">{course.title}</p>
                          <p className="mt-0.5 text-[11px] text-white/35">{course.courseCode} · {count} exam{count !== 1 ? 's' : ''}</p>
                        </button>
                      );
                    })}
                    {courses.length === 0 && <p className="text-xs text-white/30">No courses.</p>}
                  </div>

                  {/* Exam List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white/70">{selectedExamCourse?.title || 'Select a course'}</h3>
                      <span className="text-xs text-white/30">{selectedCourseExams.length} exam{selectedCourseExams.length !== 1 ? 's' : ''}</span>
                    </div>
                    {selectedCourseExams.map((exam) => {
                      const isFinalized = exam.marksFinalized === true;
                      const isDownloading = downloadingExamId === exam._id;
                      return (
                        <article key={exam._id} className="rounded-2xl border border-white/[0.06] bg-[#111113] p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{exam.title}</p>
                              <p className="mt-1 text-[11px] text-white/35">
                                {exam.problems?.length || 0} problems · Status: {exam.status || 'draft'}
                                {exam.endTime ? ` · Ended: ${new Date(exam.endTime).toLocaleString()}` : ''}
                              </p>
                              {isFinalized && (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                  ✓ Marks Finalized
                                </span>
                              )}
                            </div>
                            <button type="button" onClick={() => handleDeleteExam(exam)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Download Report Buttons — visible when marks are finalized */}
                          {isFinalized && (
                            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-3">
                              <span className="text-[10px] text-white/30 mr-auto">Download Report:</span>
                              <button type="button" onClick={() => handleDownloadReport(exam._id, 'pdf')} disabled={isDownloading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/[0.06] disabled:opacity-40">
                                <Download size={11} /> PDF
                              </button>
                              <button type="button" onClick={() => handleDownloadReport(exam._id, 'xlsx')} disabled={isDownloading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/[0.06] disabled:opacity-40">
                                <FileSpreadsheet size={11} /> Excel
                              </button>
                            </div>
                          )}
                          {!isFinalized && (
                            <div className="mt-4 border-t border-white/[0.04] pt-3">
                              <p className="text-[11px] text-amber-400/70">⏳ Marks not finalized yet. Report will be available after the teacher finalizes scores.</p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {selectedCourseExams.length === 0 && <p className="py-8 text-center text-sm text-white/30">No exams for this course.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Activity Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedActivity.user?.name || 'Account Activity'}</h2>
                <p className="text-xs text-white/40">{selectedActivity.user?.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedActivity(null)} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.06]">Close</button>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Exams</p>
              <p className="text-xl font-bold text-white">{(selectedActivity.exams || selectedActivity.activity?.attempts || []).length}</p>
            </div>
            <div className="space-y-2">
              {selectedActivity.exams ? (
                selectedActivity.exams.map((exam) => (
                  <div key={exam._id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <p className="text-sm font-medium text-white">{exam.title}</p>
                    <p className="text-[11px] text-white/35">{exam.courseId?.title || ''} · {exam.startTime ? new Date(exam.startTime).toLocaleString() : ''}</p>
                  </div>
                ))
              ) : (selectedActivity.activity?.attempts || []).map((attempt) => (
                <div key={attempt._id || attempt.examId} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-sm font-medium text-white">{attempt.examId?.title || attempt.title || 'Exam'}</p>
                  <p className="text-[11px] text-white/35">Taken: {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : (attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : '')}</p>
                </div>
              ))}
              {(!selectedActivity.exams && !(selectedActivity.activity?.attempts || []).length) && <p className="text-sm text-white/30">No exams found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
