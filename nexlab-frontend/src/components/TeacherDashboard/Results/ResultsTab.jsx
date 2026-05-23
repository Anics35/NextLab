import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { updateExam, getStudentAttempt, getSubmissionsByExam, overrideSubmissionScore } from '../../../services/api';
import { cardClass } from '../constants';
import ResultsHeader from './ResultsHeader';
import StudentListPanel from './StudentListPanel';
import SubmissionReview from './SubmissionReview';

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
  selectedProctorStudent,
  setSelectedProctorStudent,
  isProctorAlertsOpen,
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
    void loadSubmissions(selectedExamId);
  }, [selectedExamId, loadSubmissions]);

  const selectedExam = useMemo(
    () => courseExams.find((item) => item._id === selectedExamId) || null,
    [courseExams, selectedExamId]
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
          examId: selectedExamId,
          totalScore: (submission.problems || []).reduce((sum, problem) => sum + Number(problem.score || 0), 0)
        }))
        .sort((a, b) => b.totalScore - a.totalScore),
    [submissions, selectedExamId]
  );

  const selectedStudent = useMemo(
    () => studentRows.find((item) => item._id === selectedSubmissionId) || null,
    [selectedSubmissionId, studentRows]
  );

  const reviewProblems = selectedSubmission?.problems || [];
  const selectedProblem = reviewProblems[activeProblemIndex] || null;

  useEffect(() => {
    if (!selectedSubmission || reviewProblems.length === 0) {
      return;
    }
    if (activeProblemIndex > reviewProblems.length - 1) {
      setActiveProblemIndex(0);
    }
  }, [activeProblemIndex, reviewProblems, selectedSubmission, setActiveProblemIndex]);

  useEffect(() => {
    if (!selectedExamId || !selectedStudent?.studentId) {
      setStudentAttempt(null);
      return;
    }
    const run = async () => {
      setAttemptLoading(true);
      try {
        const data = await getStudentAttempt(selectedExamId, selectedStudent.studentId);
        setStudentAttempt(data.attempt || null);
      } catch {
        setStudentAttempt(null);
      } finally {
        setAttemptLoading(false);
      }
    };
    void run();
  }, [selectedExamId, selectedStudent, setStudentAttempt, setAttemptLoading]);

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
  }, [selectedExamId, setSelectedSubmissionId, setSelectedSubmission, setStudentAttempt, setActiveProblemIndex]);

  const handleToggleResultVisibility = async (visible) => {
    if (!selectedExamId) {
      toast.error('Select an exam first.');
      return;
    }

    setIsFinalizingMarks(true);
    try {
      const response = await updateExam(selectedExamId, {
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
    if (!selectedExamId) return;
    setIsFinalizingMarks(true);
    try {
      await updateExam(selectedExamId, {
        marksFinalized: true,
        showResultsImmediately: true,
        resultVisibility: 'immediate',
        resultsVisible: true
      });
      setShowMarksImmediately(true);
      toast.success('Marks finalized.');
      await loadSubmissions(selectedExamId);
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
      await loadSubmissions(selectedExamId);
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

  return (
    <section className={cardClass}>
      <ResultsHeader
        selectedCourseId={selectedCourseId}
        setSelectedCourseId={setSelectedCourseId}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        courses={courses}
        courseExams={courseExams}
        showMarksImmediately={showMarksImmediately}
        onToggleResultVisibility={handleToggleResultVisibility}
        onFinalizeMarks={handleFinalizeMarks}
        isLoading={isFinalizingMarks}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
          <p className="mb-4">Proctor Alerts</p>
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {proctorAlerts.length === 0 && <p className="text-gray-400">No alerts yet.</p>}
            {proctorAlerts.map((event, idx) => (
              <div key={`${event?.studentId || 'student'}-${idx}`} className="bg-[#111] border border-gray-800 rounded-md p-3">
                <p className="text-sm text-white">{event?.studentName || 'Student'}</p>
                <p className="text-xs text-gray-400">
                  {event?.type || 'violation'} · {event?.time || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResultsTab;
