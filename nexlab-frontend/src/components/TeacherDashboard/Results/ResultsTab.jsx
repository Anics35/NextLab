import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ChevronDown, Download, Eye, EyeOff, FileSpreadsheet, LoaderCircle, X, Share2 } from 'lucide-react';
import { updateExam, getStudentAttempt, getSubmissionsByExam, overrideSubmissionScore, getExamAnalytics, deleteExam, downloadExamReportPdf, downloadExamReportXlsx } from '../../../services/api';
import { getAuthToken } from '../../../services/authService';
import LiveStudentListPanel from './LiveStudentListPanel';
import StudentListPanel from './StudentListPanel';
import SubmissionReview from './SubmissionReview';
import ExamPublishPanel from './ExamPublishPanel';
import { initSocket, socket } from '../../../services/socket';

const RESULT_BASE_HASH = '#/teacher/results';

const getResultRoute = () => {
  const hash = window.location.hash || '';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  if (parts[0] !== 'teacher' || parts[1] !== 'results') {
    return { page: 'courses', courseId: '', examId: '' };
  }

  const courseIndex = parts.indexOf('course');
  const examIndex = parts.indexOf('exam');

  return {
    page: examIndex > -1 ? 'students' : courseIndex > -1 ? 'exams' : 'courses',
    courseId: courseIndex > -1 ? decodeURIComponent(parts[courseIndex + 1] || '') : '',
    examId: examIndex > -1 ? decodeURIComponent(parts[examIndex + 1] || '') : ''
  };
};

const setResultHash = (hash) => {
  if (window.location.hash === hash) return;
  window.location.hash = hash;
};

function ResultsTab({
  courses,
  courseExams,
  selectedCourseId,
  setSelectedCourseId,
  selectedExamId,
  setSelectedExamId,
  submissions,
  setSubmissions,
  setSubmissionsLoading,
  submissionsLoading,
  showMarksImmediately,
  setShowMarksImmediately,
  isFinalizingMarks,
  setIsFinalizingMarks,
  proctorAlerts,
  setSelectedProctorStudent,
  setIsProctorAlertsOpen,
  selectedSubmissionId,
  setSelectedSubmissionId,
  selectedSubmission,
  setSelectedSubmission,
  studentAttempt,
  setStudentAttempt,
  attemptLoading,
  setAttemptLoading,
  activeProblemIndex,
  setActiveProblemIndex,
  scoreDrafts,
  setScoreDrafts,
  teacherInput,
  setTeacherInput,
  teacherOutput,
  setTeacherOutput,
  isTeacherRunning,
  setIsTeacherRunning,
  isCodeModalOpen,
  setIsCodeModalOpen,
  onProctorAlertsOpen,
  onRefreshCourseExams
}) {
  const [route, setRoute] = useState(getResultRoute);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [recentSubmissionEvents, setRecentSubmissionEvents] = useState([]);
  const [pendingExamAction, setPendingExamAction] = useState(null);
  const [examStatusOverride, setExamStatusOverride] = useState(null);
  const [examTimeOverride, setExamTimeOverride] = useState(null);
  const [isExamActionHovered, setIsExamActionHovered] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const teacherServerOffsetRef = useRef(0);
  const reportMenuRef = useRef(null);

  useEffect(() => {
    if (!window.location.hash.startsWith(RESULT_BASE_HASH)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${RESULT_BASE_HASH}`);
      setRoute(getResultRoute());
    }

    const handleHashChange = () => setRoute(getResultRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (route.courseId && route.courseId !== selectedCourseId) {
      setSelectedCourseId(route.courseId);
    }
    if (route.examId && route.examId !== selectedExamId) {
      setSelectedExamId(route.examId);
    }
  }, [route.courseId, route.examId, selectedCourseId, selectedExamId, setSelectedCourseId, setSelectedExamId]);

  useEffect(() => {
    setExamStatusOverride(null);
  }, [route.examId]);

  useEffect(() => {
    setRecentSubmissionEvents([]);
  }, [route.examId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!reportMenuRef.current?.contains(event.target)) {
        setIsReportMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedCourse = useMemo(
    () => courses.find((item) => item._id === (route.courseId || selectedCourseId)) || null,
    [courses, route.courseId, selectedCourseId]
  );

  const selectedExam = useMemo(
    () => courseExams.find((item) => item._id === (route.examId || selectedExamId)) || null,
    [courseExams, route.examId, selectedExamId]
  );

  const displayedExam = useMemo(
    () => {
      if (!selectedExam) return null;
      const base = { ...selectedExam, status: examStatusOverride || selectedExam.status };
      if (examTimeOverride) {
        return { ...base, ...examTimeOverride };
      }
      return base;
    },
    [examStatusOverride, examTimeOverride, selectedExam]
  );

  const isExamLiveWindow = useMemo(() => {
    if (displayedExam?.status !== 'ongoing') {
      return false;
    }

    if (!displayedExam?.startTime || !displayedExam?.endTime) {
      return false;
    }

    const startTime = new Date(displayedExam.startTime).getTime();
    const endTime = new Date(displayedExam.endTime).getTime();
    const now = Date.now();

    return Number.isFinite(startTime) && Number.isFinite(endTime) && now >= startTime && now <= endTime;
  }, [displayedExam]);

  const isExamEnded = displayedExam?.status === 'ended';
  const isExamRunning = displayedExam?.status === 'ongoing';

  useEffect(() => {
    if (displayedExam?.serverTime) {
      teacherServerOffsetRef.current = new Date(displayedExam.serverTime).getTime() - Date.now();
      return;
    }

    teacherServerOffsetRef.current = 0;
  }, [displayedExam?.serverTime]);

  const teacherTimerInfo = useMemo(() => {
    if (!isExamRunning || !displayedExam?.startTime || !displayedExam?.endTime) {
      return null;
    }

    const now = timerNow + (teacherServerOffsetRef.current || 0);
    const startTime = new Date(displayedExam.startTime).getTime();
    const endTime = new Date(displayedExam.endTime).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return null;
    }

    if (now < startTime) {
      return { status: 'waiting', label: 'Waiting to start' };
    }

    const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return {
      status: remainingSeconds <= 300 ? 'critical' : remainingSeconds <= 900 ? 'warning' : 'ongoing',
      label: `${remainingSeconds} sec`,
      compactClock: [hours.toString().padStart(2, '0'), minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')].join(':')
    };
  }, [displayedExam, isExamRunning, timerNow]);

  useEffect(() => {
    if (!isExamRunning) return undefined;

    setTimerNow(Date.now());
    const intervalId = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isExamRunning, displayedExam?.startTime, displayedExam?.endTime, displayedExam?.serverTime]);

  const loadSubmissions = useCallback(
    async (examId) => {
      if (!examId) {
        setSubmissions([]);
        return;
      }
      setSubmissionsLoading(true);
      try {
        const data = await getSubmissionsByExam(examId, 500);
        setSubmissions(data.submissions || []);
      } catch (error) {
        toast.error(error.message || 'Unable to load submissions.');
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [setSubmissions, setSubmissionsLoading]
  );

  const loadAnalytics = useCallback(
    async (examId) => {
      if (!examId) {
        setAnalytics(null);
        return;
      }

      setAnalyticsLoading(true);
      try {
        const data = await getExamAnalytics(examId);
        setAnalytics(data.analytics || null);
      } catch (error) {
        toast.error(error.message || 'Unable to load live students.');
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (route.page !== 'students') return;
    void loadSubmissions(route.examId);
  }, [route.page, route.examId, loadSubmissions]);

  useEffect(() => {
    if (route.page !== 'students') {
      return undefined;
    }

    const activeSocket = socket || initSocket(getAuthToken());
    const handleSubmissionEvent = (event) => {
      const eventExamId = String(event?.meta?.examId || event?.examId || '');
      if (!route.examId || eventExamId !== String(route.examId)) {
        return;
      }

      setRecentSubmissionEvents((prev) => [
        {
          id: `${eventExamId}-${event?.studentId || event?.meta?.studentId || event?.studentName || 'student'}-${event?.createdAt || event?.time || Date.now()}`,
          studentName: event?.meta?.studentName || event?.studentName || 'Student',
          type: event?.type || 'submission',
          time: event?.createdAt || event?.time || new Date().toISOString(),
          message: event?.message || 'Submission received'
        },
        ...prev
      ].slice(0, 8));

      void loadSubmissions(route.examId);
      if (isExamLiveWindow) {
        void loadAnalytics(route.examId);
      }
    };

    activeSocket.on('submission_event', handleSubmissionEvent);
    return () => activeSocket.off('submission_event', handleSubmissionEvent);
  }, [route.page, route.examId, loadAnalytics, loadSubmissions, isExamLiveWindow]);

  useEffect(() => {
    if (route.page !== 'students' || !route.examId || !isExamLiveWindow) {
      setAnalytics(null);
      return undefined;
    }

    void loadAnalytics(route.examId);
    const intervalId = window.setInterval(() => {
      void loadAnalytics(route.examId);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isExamLiveWindow, route.page, route.examId, loadAnalytics]);

  useEffect(() => {
    if (!selectedExam) return;
    setShowMarksImmediately(
      Boolean(
        selectedExam.showResultsImmediately === true ||
          selectedExam.resultVisibility === 'immediate' ||
          selectedExam.resultsVisible === true
      )
    );
  }, [selectedExam, setShowMarksImmediately]);

  const studentRows = useMemo(
    () =>
      submissions
        .map((submission) => ({
          ...submission,
          studentId: submission.userId?._id,
          name: submission.userId?.name || 'Student',
          rollNumber: submission.userId?.rollNumber || '-',
          semester: submission.userId?.semester || '-',
          examId: route.examId || selectedExamId,
          totalScore: (submission.problems || []).reduce((sum, problem) => sum + Number(problem.score || 0), 0)
        }))
        .sort((a, b) => b.totalScore - a.totalScore),
    [submissions, route.examId, selectedExamId]
  );

  const liveStudents = useMemo(() => {
    const students = analytics?.students || [];
    const problemTitles = new Map(
      (selectedExam?.problems || []).map((problem, index) => [String(problem.problemId?._id || problem.problemId), problem.problemId?.title || `Problem ${index + 1}`])
    );

    return students
      .filter((student) => student.status === 'ongoing')
      .map((student) => ({
        _id: student.student?._id || student.student?.id || `${student.student?.name || 'student'}-${student.currentProblemIndex}`,
        name: student.student?.name || 'Student',
        rollNumber: student.student?.rollNumber || '-',
        semester: student.student?.semester || '-',
        currentProblemLabel: problemTitles.get(String(selectedExam?.problems?.[Math.max(0, Number(student.currentProblemIndex || 0))]?.problemId?._id || selectedExam?.problems?.[Math.max(0, Number(student.currentProblemIndex || 0))]?.problemId)) || `Problem ${Number(student.currentProblemIndex || 0) + 1}`
      }));
  }, [analytics?.students, selectedExam]);

  const selectedStudent = useMemo(
    () => studentRows.find((item) => item._id === selectedSubmissionId) || null,
    [selectedSubmissionId, studentRows]
  );

  const reviewProblems = selectedSubmission?.problems || [];
  const selectedProblem = reviewProblems[activeProblemIndex] || null;

  useEffect(() => {
    if (!selectedSubmission || reviewProblems.length === 0) return;
    if (activeProblemIndex > reviewProblems.length - 1) {
      setActiveProblemIndex(0);
    }
  }, [activeProblemIndex, reviewProblems, selectedSubmission, setActiveProblemIndex]);

  useEffect(() => {
    if (route.page !== 'students' || !route.examId || !selectedStudent?.studentId) {
      setStudentAttempt(null);
      return;
    }
    const run = async () => {
      setAttemptLoading(true);
      try {
        const data = await getStudentAttempt(route.examId, selectedStudent.studentId);
        setStudentAttempt(data.attempt || null);
      } catch {
        setStudentAttempt(null);
      } finally {
        setAttemptLoading(false);
      }
    };
    void run();
  }, [route.page, route.examId, selectedStudent, setStudentAttempt, setAttemptLoading]);

  useEffect(() => {
    if (!selectedSubmissionId) return;
    const initialSubmission = submissions.find((item) => item._id === selectedSubmissionId) || null;
    setSelectedSubmission(initialSubmission);
    setActiveProblemIndex(0);
  }, [selectedSubmissionId, submissions, setSelectedSubmission, setActiveProblemIndex]);

  useEffect(() => {
    if (examStatusOverride && selectedExam?.status === examStatusOverride) {
      setExamStatusOverride(null);
      setExamTimeOverride(null);
    }
  }, [examStatusOverride, selectedExam?.status]);

  useEffect(() => {
    if (!selectedProblem) {
      setTeacherInput('');
      setTeacherOutput('');
      setIsCodeModalOpen(false);
      return;
    }
    setTeacherInput(selectedProblem.input || '');
    setTeacherOutput(selectedProblem.output || '');
  }, [selectedProblem, setTeacherInput, setTeacherOutput, setIsCodeModalOpen]);

  useEffect(() => {
    setSelectedSubmissionId('');
    setSelectedSubmission(null);
    setStudentAttempt(null);
    setActiveProblemIndex(0);
  }, [route.examId, setSelectedSubmissionId, setSelectedSubmission, setStudentAttempt, setActiveProblemIndex]);

  const handleToggleResultVisibility = async (visible) => {
    if (!route.examId) {
      toast.error('Select an exam first.');
      return;
    }

    setIsFinalizingMarks(true);
    try {
      await updateExam(route.examId, {
        showResultsImmediately: visible,
        resultVisibility: visible ? 'immediate' : 'manual',
        resultsVisible: visible
      });
      setShowMarksImmediately(visible);
      toast.success(visible ? 'Results are visible to students.' : 'Results are hidden from students.');
    } catch (error) {
      toast.error(error.message || 'Unable to update result visibility.');
    } finally {
      setIsFinalizingMarks(false);
    }
  };

  const handleFinalizeMarks = async () => {
    if (!route.examId) return;
    setIsFinalizingMarks(true);
    try {
      await updateExam(route.examId, {
        marksFinalized: true,
        showResultsImmediately: true,
        resultVisibility: 'immediate',
        resultsVisible: true
      });
      setShowMarksImmediately(true);
      toast.success('Marks finalized.');
      await loadSubmissions(route.examId);
    } catch (error) {
      toast.error(error.message || 'Finalize endpoint unavailable for this exam state.');
    } finally {
      setIsFinalizingMarks(false);
    }
  };

  const runExamAction = async (action) => {
    if (!route.examId || !selectedExam) return;

    setIsFinalizingMarks(true);
    try {
      if (action === 'start') {
        // Immediately reflect the exam as started in the UI and set a startTime
        // override to the current time so the timer begins without waiting for
        // the server round-trip.
        const nowIso = new Date().toISOString();
        setExamStatusOverride('ongoing');
        setExamTimeOverride({ startTime: nowIso, endTime: selectedExam.endTime });
        await updateExam(route.examId, { status: 'ongoing' });
        // server response will update selectedExam via onRefreshCourseExams
        // and the effect above will clear the overrides when synced.
        toast.success('Exam started.');
      } else if (action === 'stop') {
        // Immediately reflect the exam as ended in the UI and set endTime override
        const nowIso = new Date().toISOString();
        setExamStatusOverride('ended');
        setExamTimeOverride({ endTime: nowIso });
        await updateExam(route.examId, { status: 'ended' });
        toast.success('Exam ended.');
      }
      await onRefreshCourseExams?.();
    } catch (error) {
      toast.error(error.message || `Unable to ${action} exam.`);
    } finally {
      setIsFinalizingMarks(false);
    }
  };

  const handleStartExam = () => setPendingExamAction('start');

  const handleStopExam = () => setPendingExamAction('stop');

  const handleOverrideScore = async (submissionId, problemId) => {
    const draftKey = `${submissionId}_${problemId}`;
    const fallbackScore =
      selectedProblem && String(selectedProblem.problemId?._id || selectedProblem.problemId) === String(problemId)
        ? selectedProblem.score
        : 0;
    const nextScore = Number(scoreDrafts[draftKey] ?? fallbackScore ?? 0);

    if (!Number.isFinite(nextScore) || nextScore < 0) {
      toast.error('Enter a valid score.');
      return;
    }

    try {
      await overrideSubmissionScore(submissionId, problemId, nextScore);
      toast.success('Score updated.');
      await loadSubmissions(route.examId);
      if (selectedSubmission?._id === submissionId) {
        setSelectedSubmission((prev) =>
          prev
            ? {
                ...prev,
                problems: prev.problems.map((problem) =>
                  String(problem.problemId?._id || problem.problemId) === String(problemId)
                    ? { ...problem, score: nextScore, manualOverride: true }
                    : problem
                )
              }
            : prev
        );
      }
    } catch (error) {
      toast.error(error.message || 'Unable to update score.');
    }
  };

  const handleDownloadExamReport = useCallback(async (format) => {
    if (!route.examId) {
      toast.error('Select an exam first.');
      return;
    }

    setIsDownloadingReport(true);
    try {
      const blob = format === 'xlsx' ? await downloadExamReportXlsx(route.examId) : await downloadExamReportPdf(route.examId);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `nextlab-exam-report-${route.examId}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success(format === 'xlsx' ? 'Spreadsheet downloaded.' : 'PDF downloaded.');
    } catch (error) {
      toast.error(error.message || 'Unable to download exam report.');
    } finally {
      setIsDownloadingReport(false);
    }
  }, [route.examId]);

  const openCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setResultHash(`${RESULT_BASE_HASH}/course/${encodeURIComponent(courseId)}`);
  };

  const openExam = (examId) => {
    setSelectedExamId(examId);
    setResultHash(`${RESULT_BASE_HASH}/course/${encodeURIComponent(route.courseId || selectedCourseId)}/exam/${encodeURIComponent(examId)}`);
  };

  const goToCourses = () => setResultHash(RESULT_BASE_HASH);
  const goToExams = () => setResultHash(`${RESULT_BASE_HASH}/course/${encodeURIComponent(route.courseId || selectedCourseId)}`);

  return (
    <section className="space-y-6">
      {route.page === 'courses' ? (
        <>
          <div>
            <h2 className="text-xl font-bold text-white">Results</h2>
            <p className="mt-1 text-sm text-white/40">Select a course to view exam results.</p>
          </div>
          {courses.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/30">No courses found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <button
                  key={course._id}
                  type="button"
                  onClick={() => openCourse(course._id)}
                  className="group rounded-2xl border border-white/[0.06] bg-[#111113] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/20 hover:shadow-lg hover:shadow-black/20"
                >
                  <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{course.title}</p>
                  <p className="mt-1 text-xs text-white/35 font-mono">{course.courseCode || 'No code'}</p>
                  {course.description && <p className="mt-3 line-clamp-2 text-sm text-white/40">{course.description}</p>}
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {route.page === 'exams' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={goToCourses} className="mb-2 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Courses
              </button>
              <h2 className="text-xl font-bold text-white">{selectedCourse?.title || 'Course Exams'}</h2>
              <p className="mt-1 text-sm text-white/40">Select an exam to view submissions and results.</p>
            </div>
          </div>
          {courseExams.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/30">No exams found for this course.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courseExams.map((exam) => (
                <div key={exam._id} className="relative group">
                  <button
                    type="button"
                    onClick={() => openExam(exam._id)}
                    className="w-full text-left rounded-2xl border border-white/[0.06] bg-[#111113] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/20 hover:shadow-lg hover:shadow-black/20"
                  >
                    <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{exam.title}</p>
                    <p className="mt-2 text-xs text-white/35">{exam.problems?.length || 0} problems · {exam.totalDuration || exam.duration || 0} min</p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDeleteExam(exam);
                      setShowDeleteConfirm(true);
                    }}
                    aria-label="Delete exam"
                    className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-transparent text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {route.page === 'students' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={goToExams} className="mb-2 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Exams
              </button>
              <h2 className="text-xl font-bold text-white">{selectedExam?.title || 'Exam Students'}</h2>
              <p className="mt-1 text-sm text-white/40">{selectedCourse?.title || 'Selected course'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isExamRunning ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsExamActionHovered(true)}
                  onMouseLeave={() => setIsExamActionHovered(false)}
                >
                  {isExamActionHovered ? (
                    <button
                      type="button"
                      onClick={handleStopExam}
                      disabled={isFinalizingMarks || !route.examId}
                      className="inline-flex min-w-30 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {isFinalizingMarks ? <LoaderCircle size={14} className="animate-spin" /> : null}
                      Stop Exam
                    </button>
                  ) : (
                    <div className="inline-flex min-w-30 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
                      <span className="uppercase tracking-[0.22em] text-[10px] text-red-300/80">Timer</span>
                      <span className="tabular-nums">{teacherTimerInfo?.label || '-- sec'}</span>
                      {teacherTimerInfo?.compactClock ? <span className="text-xs text-red-200/70">{teacherTimerInfo.compactClock}</span> : null}
                    </div>
                  )}
                </div>
              ) : isExamEnded ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white/40">
                  Exam Ended
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={isFinalizingMarks || !route.examId}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isFinalizingMarks ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  Start Exam
                </button>
              )}
              <button
                type="button"
                onClick={() => handleToggleResultVisibility(!showMarksImmediately)}
                disabled={isFinalizingMarks || !route.examId}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm disabled:opacity-50 transition-colors ${
                  showMarksImmediately ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06]'
                }`}
              >
                {showMarksImmediately ? <Eye size={14} /> : <EyeOff size={14} />}
                {showMarksImmediately ? 'Visible' : 'Hidden'}
              </button>
              <button
                type="button"
                onClick={handleFinalizeMarks}
                disabled={isFinalizingMarks || !route.examId}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-50"
              >
                {isFinalizingMarks ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Finalize
              </button>
              <button
                type="button"
                onClick={() => setShowPublishPanel(true)}
                disabled={!route.examId}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                <Share2 size={14} />
                Students
              </button>
              <div ref={reportMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsReportMenuOpen((value) => !value)}
                  disabled={!route.examId || isDownloadingReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  {isDownloadingReport ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                  Report
                  <ChevronDown size={14} />
                </button>
                {isReportMenuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-2xl">
                    <button
                      type="button"
                      onClick={() => { setIsReportMenuOpen(false); void handleDownloadExamReport('pdf'); }}
                      disabled={!route.examId || isDownloadingReport}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsReportMenuOpen(false); void handleDownloadExamReport('xlsx'); }}
                      disabled={!route.examId || isDownloadingReport}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,0.7fr)_minmax(260px,0.7fr)_minmax(0,1.2fr)]">
            <StudentListPanel
              studentRows={studentRows}
              selectedSubmissionId={selectedSubmissionId}
              onSelectStudent={setSelectedSubmissionId}
              submissionsLoading={submissionsLoading}
              onViewProctorAlerts={(student) => {
                setSelectedProctorStudent(student);
                setIsProctorAlertsOpen(true);
                onProctorAlertsOpen?.(student);
              }}
            />

            <LiveStudentListPanel
              liveStudents={liveStudents}
              recentSubmissionEvents={recentSubmissionEvents}
              loading={analyticsLoading}
              isExamLiveWindow={isExamLiveWindow}
            />

            <SubmissionReview
              selectedStudent={selectedStudent}
              selectedSubmission={selectedSubmission}
              studentAttempt={studentAttempt}
              attemptLoading={attemptLoading}
              selectedProblem={selectedProblem}
              activeProblemIndex={activeProblemIndex}
              setActiveProblemIndex={setActiveProblemIndex}
              scoreDrafts={scoreDrafts}
              setScoreDrafts={setScoreDrafts}
              onOverrideScore={handleOverrideScore}
              isCodeModalOpen={isCodeModalOpen}
              setIsCodeModalOpen={setIsCodeModalOpen}
              isTeacherRunning={isTeacherRunning}
              setIsTeacherRunning={setIsTeacherRunning}
              teacherInput={teacherInput}
              setTeacherInput={setTeacherInput}
              teacherOutput={teacherOutput}
              setTeacherOutput={setTeacherOutput}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#111113] p-4">
            <p className="mb-4 text-sm font-semibold text-white/70">Proctor Alerts</p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {proctorAlerts.length === 0 && <p className="py-4 text-center text-xs text-white/30">No alerts yet.</p>}
              {proctorAlerts.map((event, idx) => (
                <div key={`${event?.studentId || 'student'}-${idx}`} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <p className="text-sm text-white">{event?.studentName || 'Student'}</p>
                  <p className="text-[11px] text-white/35">
                    {event?.type || 'violation'} · {event?.time || '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

          {showDeleteConfirm && pendingDeleteExam ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-white">Delete Exam</h3>
                <p className="mt-2 text-sm text-white/60">Delete "{pendingDeleteExam.title}"? This removes all attempts and submissions.</p>
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => { setShowDeleteConfirm(false); setPendingDeleteExam(null); }} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06]">Cancel</button>
                  <button type="button" onClick={async () => {
                    try {
                      await deleteExam(pendingDeleteExam._id);
                      toast.success('Exam deleted.');
                      setShowDeleteConfirm(false);
                      setPendingDeleteExam(null);
                      onRefreshCourseExams?.();
                    } catch (err) {
                      toast.error(err.message || 'Unable to delete exam.');
                    }
                  }} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Delete</button>
                </div>
              </div>
            </div>
          ) : null}

          {showPublishPanel && route.examId ? (
            <ExamPublishPanel
              examId={route.examId}
              onClose={() => setShowPublishPanel(false)}
              onSuccess={() => {
                void loadSubmissions(route.examId);
              }}
            />
          ) : null}

          {pendingExamAction ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Confirm Action</p>
                <h3 className="mt-2 text-lg font-bold text-white">
                  {pendingExamAction === 'start' ? 'Start this exam?' : 'Stop this exam?'}
                </h3>
                <p className="mt-3 text-sm text-white/50">
                  {pendingExamAction === 'start'
                    ? 'Students will be able to begin once the exam is running.'
                    : 'This will end the session immediately for all students.'}
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingExamAction(null)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const action = pendingExamAction;
                      setPendingExamAction(null);
                      await runExamAction(action);
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold text-black ${
                      pendingExamAction === 'start' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'
                    }`}
                  >
                    {pendingExamAction === 'start' ? 'Yes, start' : 'Yes, stop'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
    </section>
  );
}

export default ResultsTab;
