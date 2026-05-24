import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { updateExam, getStudentAttempt, getSubmissionsByExam, overrideSubmissionScore } from '../../../services/api';
import { cardClass } from '../constants';
import StudentListPanel from './StudentListPanel';
import SubmissionReview from './SubmissionReview';

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
  onProctorAlertsOpen
}) {
  const [route, setRoute] = useState(getResultRoute);

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

  useEffect(() => {
    if (route.page !== 'students') return;
    void loadSubmissions(route.examId);
  }, [route.page, route.examId, loadSubmissions]);

  const selectedCourse = useMemo(
    () => courses.find((item) => item._id === (route.courseId || selectedCourseId)) || null,
    [courses, route.courseId, selectedCourseId]
  );

  const selectedExam = useMemo(
    () => courseExams.find((item) => item._id === (route.examId || selectedExamId)) || null,
    [courseExams, route.examId, selectedExamId]
  );

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
    <section className={cardClass}>
      {route.page === 'courses' ? (
        <>
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-gray-400">No courses found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <button
                  key={course._id}
                  type="button"
                  onClick={() => openCourse(course._id)}
                  className="rounded-lg border border-gray-800 bg-[#0a0a0a] p-4 text-left transition-colors hover:border-[#ffa116] hover:bg-[#141414]"
                >
                  <p className="font-medium text-white">{course.title}</p>
                  <p className="mt-1 text-xs text-gray-400">{course.courseCode || 'No course code'}</p>
                  {course.description ? <p className="mt-3 line-clamp-2 text-sm text-gray-300">{course.description}</p> : null}
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {route.page === 'exams' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={goToCourses} className="mb-2 inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white">
                <ArrowLeft size={14} /> Courses
              </button>
              <h2 className="text-lg font-semibold">{selectedCourse?.title || 'Course Exams'}</h2>
            </div>
          </div>
          {courseExams.length === 0 ? (
            <p className="text-sm text-gray-400">No exams found for this course.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courseExams.map((exam) => (
                <button
                  key={exam._id}
                  type="button"
                  onClick={() => openExam(exam._id)}
                  className="rounded-lg border border-gray-800 bg-[#0a0a0a] p-4 text-left transition-colors hover:border-[#ffa116] hover:bg-[#141414]"
                >
                  <p className="font-medium text-white">{exam.title}</p>
                  <p className="mt-2 text-xs text-gray-400">{exam.problems?.length || 0} problems</p>
                  <p className="mt-1 text-xs text-gray-400">Duration: {exam.totalDuration || exam.duration || 0} min</p>
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {route.page === 'students' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <button type="button" onClick={goToExams} className="mb-2 inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white">
                <ArrowLeft size={14} /> Exams
              </button>
              <h2 className="text-lg font-semibold">{selectedExam?.title || 'Exam Students'}</h2>
              <p className="mt-1 text-sm text-gray-400">{selectedCourse?.title || 'Selected course'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleResultVisibility(!showMarksImmediately)}
                disabled={isFinalizingMarks || !route.examId}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:opacity-50 ${
                  showMarksImmediately ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {showMarksImmediately ? <Eye size={14} /> : <EyeOff size={14} />}
                {showMarksImmediately ? 'Results Visible' : 'Results Hidden'}
              </button>
              <button
                type="button"
                onClick={handleFinalizeMarks}
                disabled={isFinalizingMarks || !route.examId}
                className="inline-flex items-center gap-2 rounded-md bg-[#ffa116] px-3 py-2 text-sm font-medium text-black hover:bg-orange-500 disabled:opacity-50"
              >
                {isFinalizingMarks ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isFinalizingMarks ? 'Saving...' : 'Finalize Marks'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
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

          <div className="mt-4 rounded-lg border border-gray-800 bg-[#0a0a0a] p-4">
            <p className="mb-4">Proctor Alerts</p>
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
              {proctorAlerts.length === 0 && <p className="text-gray-400">No alerts yet.</p>}
              {proctorAlerts.map((event, idx) => (
                <div key={`${event?.studentId || 'student'}-${idx}`} className="rounded-md border border-gray-800 bg-[#111] p-3">
                  <p className="text-sm text-white">{event?.studentName || 'Student'}</p>
                  <p className="text-xs text-gray-400">
                    {event?.type || 'violation'} · {event?.time || '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default ResultsTab;
