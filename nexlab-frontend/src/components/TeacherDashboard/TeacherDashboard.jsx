import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAuthToken, getStoredUser, logout } from '../../services/authService';
import { getMyCourses, getCourseExams, getCourseById, createExam, deleteCourse, updateCourse, removeStudentFromCourse } from '../../services/api';
import { getProblems } from '../../services/codeService';
import { initSocket, socket } from '../../services/socket';
import AppLayout from '../layout/AppLayout';
import ProctorAlerts from '../ProctorAlerts';
import { TABS, DEFAULT_EXAM_FORM, DEFAULT_PROBLEM_FORM, DEFAULT_COURSE_FORM } from './constants';
import CoursesTab from './CourseManagement/CoursesTab';
import CourseDetail from './CourseManagement/CourseDetail';
import QuestionBankTab from './QuestionBank/QuestionBankTab';
import ExamsTab from './ExamsTab';
import NotificationsTab from './NotificationsTab';
import ResultsTab from './Results/ResultsTab';

const RESULT_BASE_HASH = '#/teacher/results';

const isResultHash = () => window.location.hash.startsWith(RESULT_BASE_HASH);

const getResultHashValue = (key) => {
  const parts = (window.location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const index = parts.indexOf(key);
  return index > -1 ? decodeURIComponent(parts[index + 1] || '') : '';
};

function TeacherDashboard() {
  // User
  const [user, setUser] = useState(null);

  // Tab Management
  // Tab Management - restore from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    if (isResultHash()) return 'results';
    const saved = localStorage.getItem('nextlab_teacher_active_tab');
    return saved || 'courses';
  });

  // Courses
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(() => getResultHashValue('course'));
  const [courseForm, setCourseForm] = useState(DEFAULT_COURSE_FORM);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseEditForm, setCourseEditForm] = useState(DEFAULT_COURSE_FORM);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(null);

  // Problems
  const [problems, setProblems] = useState([]);
  const [query, setQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [problemForm, setProblemForm] = useState(DEFAULT_PROBLEM_FORM);
  const [editingProblemId, setEditingProblemId] = useState('');
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [isSavingProblem, setIsSavingProblem] = useState(false);
  const [isDeletingProblemId, setIsDeletingProblemId] = useState('');

  // Exams
  const [courseExams, setCourseExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(() => getResultHashValue('exam'));
  const [examForm, setExamForm] = useState(DEFAULT_EXAM_FORM);
  const [selectedProblemMap, setSelectedProblemMap] = useState({});

  // Results
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [studentAttempt, setStudentAttempt] = useState(null);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [showMarksImmediately, setShowMarksImmediately] = useState(true);
  const [isFinalizingMarks, setIsFinalizingMarks] = useState(false);
  const [proctorAlerts, setProctorAlerts] = useState([]);
  const [isProctorAlertsOpen, setIsProctorAlertsOpen] = useState(false);
  const [selectedProctorStudent, setSelectedProctorStudent] = useState(null);
  const [teacherInput, setTeacherInput] = useState('');
  const [teacherOutput, setTeacherOutput] = useState('');
  const [isTeacherRunning, setIsTeacherRunning] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);

  // Load user info on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  // Load workspace
    // Persist active tab to localStorage
    useEffect(() => {
      localStorage.setItem('nextlab_teacher_active_tab', activeTab);
    }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      if (isResultHash()) {
        setActiveTab('results');
        return;
      }
      setActiveTab((prev) => (prev === 'results' ? 'courses' : prev));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'results') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${RESULT_BASE_HASH}`);
      return;
    }

    if (isResultHash()) {
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };
  // Centralized logout handler to clear all cached state
  const handleLogout = useCallback(() => {
    logout();
    localStorage.removeItem('nextlab_teacher_active_tab');
  }, []);

  // Load workspace

  const loadWorkspace = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const [courseData, problemData] = await Promise.all([getMyCourses(), getProblems()]);
      const nextCourses = courseData.courses || [];
      setCourses(nextCourses);
      setProblems(problemData || []);
      const nextCourse = getResultHashValue('course') || nextCourses[0]?._id || '';
      setSelectedCourseId((prev) => prev || nextCourse);
      setExamForm((prev) => ({ ...prev, courseId: prev.courseId || nextCourse }));
      return nextCourses;
    } catch (error) {
      toast.error(error.message || 'Unable to load workspace.');
      return [];
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const loadCourseExams = useCallback(async (courseId) => {
    if (!courseId) {
      setCourseExams([]);
      setSelectedExamId('');
      return;
    }
    setCourseExams([]);
    setSelectedExamId('');
    try {
      const data = await getCourseExams(courseId);
      const exams = data.exams || [];
      setCourseExams(exams);
      setSelectedExamId((prev) => (exams.some((exam) => exam._id === prev) ? prev : exams[0]?._id || ''));
    } catch (error) {
      toast.error(error.message || 'Unable to load exams.');
    }
  }, []);

  const loadCourseDetail = useCallback(async (courseId) => {
    if (!courseId) {
      setSelectedCourseDetail(null);
      setIsEditingCourse(false);
      setIsDeletingCourse(false);
      return;
    }

    setCourseDetailLoading(true);
    try {
      const data = await getCourseById(courseId);
      const course = data.course || null;
      setSelectedCourseDetail(course);
      setCourseEditForm({
        title: course?.title || '',
        description: course?.description || '',
        courseCode: course?.courseCode || '',
        year: course?.year || new Date().getFullYear(),
        semester: course?.semester || 1
      });
      setIsEditingCourse(false);
    } catch (error) {
      toast.error(error.message || 'Unable to load course details.');
    } finally {
      setCourseDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadWorkspace]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCourseExams(selectedCourseId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedCourseId, loadCourseExams]);

  // Socket listeners
  useEffect(() => {
    initSocket(getAuthToken());
    const onProctorAlert = (event) => {
      setProctorAlerts((prev) => [event, ...prev].slice(0, 50));
      toast.error(`Alert: ${event?.studentName || 'Student'} - ${event?.type || 'violation'}`);
    };
    socket?.on('proctor_alert', onProctorAlert);
    return () => socket?.off('proctor_alert', onProctorAlert);
  }, []);

  const handleOpenCourseDetail = async (courseId) => {
    setSelectedCourseId(courseId);
    setActiveTab('courses');
    await loadCourseDetail(courseId);
  };

  const closeCourseDetail = () => {
    setSelectedCourseDetail(null);
    setIsEditingCourse(false);
    setIsDeletingCourse(false);
  };

  const handleRemoveStudent = async (courseId, studentId) => {
    setIsRemovingStudent(true);
    try {
      const response = await removeStudentFromCourse(courseId, studentId);
      const updatedCourse = response.course || null;
      if (updatedCourse) {
        setSelectedCourseDetail(updatedCourse);
        setCourses((prev) =>
          prev.map((course) => (course._id === updatedCourse._id ? { ...course, ...updatedCourse } : course))
        );
      }
      toast.success('Student removed from course.');
    } catch (error) {
      toast.error(error.message || 'Unable to remove student from course.');
    } finally {
      setIsRemovingStudent(false);
    }
  };

  const sidebar = (
    <>
      <div className="mb-4">
        <p className="text-lg font-semibold">NextLab</p>
        <p className="text-xs text-gray-400">Teacher Dashboard</p>
      </div>
      <div className="flex flex-col gap-4 mb-4">
        {TABS.map((tab) => {
          const label = tab === 'question-bank' ? 'Question Bank' : tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleSelectTab(tab)}
              className={`text-left rounded-md px-3 py-2 border ${
                activeTab === tab
                  ? 'bg-[#ffa116] text-black border-[#ffa116]'
                  : 'bg-[#111] text-white border-gray-800 hover:bg-[#1a1a1a]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <AppLayout sidebar={sidebar} user={user} onLogout={handleLogout}>
      {activeTab === 'courses' &&
        (selectedCourseDetail ? (
          <CourseDetail
            selectedCourseDetail={selectedCourseDetail}
            courseDetailLoading={courseDetailLoading}
            isEditingCourse={isEditingCourse}
            setIsEditingCourse={setIsEditingCourse}
            courseEditForm={courseEditForm}
            setCourseEditForm={setCourseEditForm}
            onSave={async () => {
              setIsSavingCourse(true);
              try {
                const response = await updateCourse(selectedCourseDetail._id, {
                  title: courseEditForm.title.trim(),
                  description: courseEditForm.description,
                  courseCode: courseEditForm.courseCode,
                  year: courseEditForm.year,
                  semester: courseEditForm.semester
                });
                const updatedCourse = response.course || null;
                if (updatedCourse) {
                  setSelectedCourseDetail(updatedCourse);
                  setCourseEditForm({
                    title: updatedCourse.title || '',
                    description: updatedCourse.description || '',
                    courseCode: updatedCourse.courseCode || '',
                    year: updatedCourse.year || new Date().getFullYear(),
                    semester: updatedCourse.semester || 1
                  });
                  setCourses((prev) =>
                    prev.map((course) => (course._id === updatedCourse._id ? { ...course, ...updatedCourse } : course))
                  );
                }
                setIsEditingCourse(false);
                toast.success('Course updated.');
              } catch (error) {
                toast.error(error.message || 'Unable to update course.');
              } finally {
                setIsSavingCourse(false);
              }
            }}
            onDelete={async () => {
              if (!selectedCourseDetail?._id) {
                return;
              }
              setConfirmDeleteCourse(selectedCourseDetail);
            }}
            onRemoveStudent={handleRemoveStudent}
            onClose={closeCourseDetail}
            isSaving={isSavingCourse}
            isDeleting={isDeletingCourse}
            isRemovingStudent={isRemovingStudent}
          />
        ) : (
          <CoursesTab
            courses={courses}
            coursesLoading={coursesLoading}
            courseForm={courseForm}
            setCourseForm={setCourseForm}
            onSelectCourse={handleOpenCourseDetail}
            onRefresh={loadWorkspace}
          />
        ))}

      {activeTab === 'question-bank' && (
        <QuestionBankTab
          problems={problems}
          query={query}
          setQuery={setQuery}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          problemForm={problemForm}
          setProblemForm={setProblemForm}
          editingProblemId={editingProblemId}
          setEditingProblemId={setEditingProblemId}
          isCreatingProblem={isCreatingProblem}
          setIsCreatingProblem={setIsCreatingProblem}
          isSavingProblem={isSavingProblem}
          setIsSavingProblem={setIsSavingProblem}
          isDeletingProblemId={isDeletingProblemId}
          setIsDeletingProblemId={setIsDeletingProblemId}
          onRefresh={loadWorkspace}
        />
      )}

      {activeTab === 'exams' && (
        <ExamsTab
          courses={courses}
          problems={problems}
          examForm={examForm}
          setExamForm={setExamForm}
          selectedProblemMap={selectedProblemMap}
          setSelectedProblemMap={setSelectedProblemMap}
          onPublish={async (payload) => {
            const response = await createExam(payload);
            const createdExamId = response?.exam?._id || '';
            const createdCourseId = payload?.courseId || examForm.courseId;

            setSelectedCourseId(createdCourseId);
            await loadCourseExams(createdCourseId);
            if (createdExamId) {
              setSelectedExamId(createdExamId);
            }
            handleSelectTab('results');

            if (createdCourseId && createdExamId) {
              window.location.hash = `#/teacher/results/course/${encodeURIComponent(createdCourseId)}/exam/${encodeURIComponent(createdExamId)}`;
            } else if (createdCourseId) {
              window.location.hash = `#/teacher/results/course/${encodeURIComponent(createdCourseId)}`;
            }
          }}
        />
      )}

      {activeTab === 'notifications' && <NotificationsTab user={user} courses={courses} />}

      {activeTab === 'results' && (
        <ResultsTab
          courses={courses}
          courseExams={courseExams}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          selectedExamId={selectedExamId}
          setSelectedExamId={setSelectedExamId}
          submissions={submissions}
          setSubmissions={setSubmissions}
          setSubmissionsLoading={setSubmissionsLoading}
          submissionsLoading={submissionsLoading}
          showMarksImmediately={showMarksImmediately}
          setShowMarksImmediately={setShowMarksImmediately}
          isFinalizingMarks={isFinalizingMarks}
          setIsFinalizingMarks={setIsFinalizingMarks}
          proctorAlerts={proctorAlerts}
          selectedProctorStudent={selectedProctorStudent}
          setSelectedProctorStudent={setSelectedProctorStudent}
          isProctorAlertsOpen={isProctorAlertsOpen}
          setIsProctorAlertsOpen={setIsProctorAlertsOpen}
          selectedSubmissionId={selectedSubmissionId}
          setSelectedSubmissionId={setSelectedSubmissionId}
          selectedSubmission={selectedSubmission}
          setSelectedSubmission={setSelectedSubmission}
          studentAttempt={studentAttempt}
          setStudentAttempt={setStudentAttempt}
          attemptLoading={attemptLoading}
          setAttemptLoading={setAttemptLoading}
          activeProblemIndex={activeProblemIndex}
          setActiveProblemIndex={setActiveProblemIndex}
          scoreDrafts={scoreDrafts}
          setScoreDrafts={setScoreDrafts}
          teacherInput={teacherInput}
          setTeacherInput={setTeacherInput}
          teacherOutput={teacherOutput}
          setTeacherOutput={setTeacherOutput}
          isTeacherRunning={isTeacherRunning}
          setIsTeacherRunning={setIsTeacherRunning}
          isCodeModalOpen={isCodeModalOpen}
          setIsCodeModalOpen={setIsCodeModalOpen}
          onRefreshCourseExams={() => loadCourseExams(selectedCourseId)}
        />
      )}

      <ProctorAlerts
        examId={selectedProctorStudent?.examId}
        studentId={selectedProctorStudent?.id}
        studentName={selectedProctorStudent?.name}
        isOpen={isProctorAlertsOpen}
        onClose={() => setIsProctorAlertsOpen(false)}
      />

      {/* Delete Course Confirmation Modal */}
      {confirmDeleteCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-gray-800 bg-[#0a0a0a] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Delete Course</h3>
            <p className="mt-2 text-gray-300">
              Are you sure you want to delete <span className="font-semibold">{confirmDeleteCourse.title}</span>?
            </p>
            <p className="mt-3 text-sm text-gray-400">This will also remove all related exams and submissions. This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteCourse(null)}
                disabled={isDeletingCourse}
                className="rounded-md border border-gray-700 bg-gray-900/50 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingCourse(true);
                  try {
                    await deleteCourse(confirmDeleteCourse._id);
                    setExamForm((prev) => ({ ...prev, courseId: '' }));
                    const nextCourses = await loadWorkspace();
                    const remainingCourses = Array.isArray(nextCourses) ? nextCourses : [];
                    const nextSelectedCourseId = remainingCourses[0]?._id || '';
                    setSelectedCourseId(nextSelectedCourseId);
                    setSelectedCourseDetail(null);
                    setCourseEditForm(DEFAULT_COURSE_FORM);
                    setConfirmDeleteCourse(null);
                    toast.success('Course deleted.');
                  } catch (error) {
                    toast.error(error.message || 'Unable to delete course.');
                  } finally {
                    setIsDeletingCourse(false);
                  }
                }}
                disabled={isDeletingCourse}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingCourse && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default TeacherDashboard;
