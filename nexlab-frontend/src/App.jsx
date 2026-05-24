import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { AlertTriangle, BookOpen, FileText, LogOut, ShieldCheck } from 'lucide-react';

import AuthForm from './components/AuthForm';
import SecureIDE from './components/SecureIDE/SecureIDE';
import StudentDashboard from './components/StudentDashboard/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard/TeacherDashboard';
import { clearPersistentAuthForTabClose, getAuthToken, getStoredUser, logout } from './services/authService';
import { runCode } from './services/codeService';
import { finalizeExamAttempt, getCourseExams, getExamById, getMyAttempt, saveExamAttempt, startExamAttempt, submitExamAnswer } from './services/api';
import { emitEvent, initSocket } from './services/socket';

const LANGUAGE_CONFIG = {
  javascript: { label: 'JavaScript', defaultCode: '// Node.js\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf8");\nconsole.log(input);' },
  python: { label: 'Python 3', defaultCode: '# Python 3\nimport sys\nprint(sys.stdin.read())' },
  cpp: { label: 'C++ (GCC 9.2)', defaultCode: '#include <iostream>\nusing namespace std;\nint main() {\n  return 0;\n}' },
  java: { label: 'Java', defaultCode: 'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n  }\n}' }
};

const getProblemId = (problem) => problem?._id || problem?.id;
const getDefaultLanguage = () => 'javascript';
const getTimerStorageKey = (examId) => `nextlab_per_problem_remaining_${examId}`;

const getDefaultCode = (problem, language) => {
  const starterCode = problem?.starterCode;
  if (starterCode && typeof starterCode === 'object') {
    return starterCode[language] || starterCode[getDefaultLanguage()] || Object.values(starterCode)[0] || '';
  }
  if (typeof starterCode === 'string' && starterCode.trim()) {
    return starterCode;
  }
  return LANGUAGE_CONFIG[language]?.defaultCode || '';
};

const buildProblemState = (problem, answer) => {
  const language = answer?.language || getDefaultLanguage();
  return {
    language,
    code: answer?.code || getDefaultCode(problem, language),
    input: answer?.input || '',
    output: answer?.output || '',
    result: answer ? {
      passed: answer.passed || 0,
      total: answer.total || 0,
      passedPublic: answer.passedPublic || 0,
      totalPublic: answer.totalPublic || 0,
      passedHidden: answer.passedHidden || 0,
      totalHidden: answer.totalHidden || 0,
      score: answer.finalScore ?? answer.score ?? 0,
      details: answer.details || answer.testResults || []
    } : null
  };
};

const buildSubmissionMap = (attempt, examProblems) => {
  const answers = attempt?.answers || [];
  const map = {};
  examProblems.forEach((problem, index) => {
    const problemId = getProblemId(problem);
    const answer = answers.find((item) => String(item.problemId) === String(problemId));
    map[problemId] = Boolean(answer?.submittedAt || answer?.total > 0 || answer?.passed > 0 || attempt?.currentProblemIndex > index);
  });
  return map;
};

const getExamDurationSeconds = (exam) => {
  const duration = Number(exam?.duration ?? exam?.totalDuration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return duration > 1000 ? duration : duration * 60;
};

function App() {
  const [user, setUser] = useState(() => {
    return getStoredUser();
  });

  const [activeCourse, setActiveCourse] = useState(() => {
    const saved = localStorage.getItem('nextlab_active_course');
    return saved ? JSON.parse(saved) : null;
  });
  const [courseExams, setCourseExams] = useState([]);
  const [courseExamsLoading, setCourseExamsLoading] = useState(false);
  const [exam, setExam] = useState(() => {
    const saved = localStorage.getItem('nextlab_current_exam');
    return saved ? JSON.parse(saved) : null;
  });
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [submissions, setSubmissions] = useState({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [attempt, setAttempt] = useState(null);
  const [problemStates, setProblemStates] = useState({});
  const [perProblemRemaining, setPerProblemRemaining] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lastRunCodeMap, setLastRunCodeMap] = useState({});
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const autoFinalizeRef = useRef(false);
  const autoSubmitMapRef = useRef({});

  const currentProblem = problems[currentProblemIndex] || null;
  const currentProblemId = getProblemId(currentProblem);
  const currentProblemState = problemStates[currentProblemId] || buildProblemState(currentProblem);
  const isPerProblemTimer = exam?.timerType === 'per_problem';
  const currentPerProblemTimeLeft = currentProblemId ? perProblemRemaining[currentProblemId] ?? 0 : 0;
  const isCurrentProblemLocked = isPerProblemTimer && currentPerProblemTimeLeft <= 0;
  const examId = exam?._id || null;

  const canShowResults = Boolean(
    exam?.marksFinalized === true &&
    (
      exam?.showResultsImmediately === true ||
      exam?.resultVisibility === 'immediate' ||
      exam?.resultsVisible === true
    )
  );

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    initSocket(getAuthToken());
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handlePageHide = () => {
      clearPersistentAuthForTabClose();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [user]);

  // Persist activeCourse to localStorage
  useEffect(() => {
    if (activeCourse) {
      localStorage.setItem('nextlab_active_course', JSON.stringify(activeCourse));
    }
  }, [activeCourse]);

  // Persist current exam to localStorage
  useEffect(() => {
    if (exam) {
      localStorage.setItem('nextlab_current_exam', JSON.stringify(exam));
    }
  }, [exam]);

  // When page reloads with activeCourse but no exam, load the courseExams
  useEffect(() => {
    if (!user || user.role === 'teacher') return;
    if (!activeCourse) return;
    // Only load courseExams if we don't have an exam in progress
    // If exam is being restored, it will load its own data
    if (exam) return; // Exam is already loaded/loading, don't fetch courseExams
    
    if (courseExams.length === 0 && !courseExamsLoading) {
      // activeCourse was restored from localStorage and no exam is in progress
      // Load the courseExams for this course
      (async () => {
        try {
          const data = await getCourseExams(activeCourse._id);
          if (data.serverTime) setServerTimeOffset(new Date(data.serverTime).getTime() - Date.now());
          setCourseExams(data.exams || []);
        } catch (error) {
          setCourseExams([]);
        }
      })();
    }
  }, [user, activeCourse, exam, courseExams.length, courseExamsLoading]);

  const canReviewExam = useCallback((item) => Boolean(
    item?.marksFinalized === true &&
    (item?.resultsVisible === true || item?.showResultsImmediately === true || item?.resultVisibility === 'immediate')
  ), []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleLogout = useCallback(() => {
    // Clear all cached page state
    localStorage.removeItem('nextlab_active_course');
    localStorage.removeItem('nextlab_current_exam');
    localStorage.removeItem('nextlab_problem_index');
    localStorage.removeItem('nextlab_teacher_active_tab');
    logout();
    setUser(null);
  }, []);

  const handleKeyDown = useCallback((event) => {
    const forbiddenKeys = ['c', 'v', 'x', 'u'];
    if (isExamStarted && (event.ctrlKey || event.metaKey) && forbiddenKeys.includes(event.key.toLowerCase())) {
      event.preventDefault();
      toast.error(`Security: Ctrl+${event.key.toUpperCase()} blocked`);
      emitEvent('proctor_event', { type: `shortcut_${event.key}`, time: new Date(), examId: exam?._id });
    }
  }, [exam?._id, isExamStarted]);

  const exitFullscreenIfNeeded = useCallback(async () => {
    if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn('Unable to exit fullscreen.', error);
      }
    }
  }, []);

  const resetExamSession = useCallback(() => {
    autoFinalizeRef.current = false;
    autoSubmitMapRef.current = {};
    setExam(null);
    setProblems([]);
    setCurrentProblemIndex(0);
    setSubmissions({});
    setRemainingTime(0);
    setAttempt(null);
    setProblemStates({});
    setPerProblemRemaining({});
    setIsRunning(false);
    setIsSubmitting(false);
    setIsExamStarted(false);
    setIsExamLocked(false);
    setShowExitConfirm(false);
    setLastRunCodeMap({});
  }, []);

  const loadCourseExams = useCallback(async (course) => {
    if (!course?._id) {
      setCourseExams([]);
      setActiveCourse(null);
      return;
    }

    setActiveCourse(course);
    setCourseExamsLoading(true);
    resetExamSession();

    try {
      const data = await getCourseExams(course._id);
      console.log('[Student] selectedCourseId', course._id);
      console.log('[Student] getCourseExams response', data);
      if (data.serverTime) setServerTimeOffset(new Date(data.serverTime).getTime() - Date.now());
      setCourseExams(data.exams || []);
    } catch (error) {
      setCourseExams([]);
      toast.error(error.message || 'Unable to load course exams.');
    } finally {
      setCourseExamsLoading(false);
    }
  }, [resetExamSession]);

  const loadExamSession = useCallback(async (examId, { reviewMode = false } = {}) => {
    if (!examId) return;
    setIsLoadingExam(true);
    autoFinalizeRef.current = false;

    try {
      const examResponse = await getExamById(examId);
      const loadedExam = examResponse.exam;
      const loadedProblems = (loadedExam?.problems || []).map((item) => ({ ...(item.problemId || {}), marks: item.marks, duration: item.duration }));

      const attemptResponse = reviewMode
        ? await getMyAttempt(examId)
        : await startExamAttempt(examId);

      const resumedAttempt = attemptResponse.attempt || (reviewMode ? null : (await getMyAttempt(examId)).attempt);
      console.log(reviewMode ? '[Student] openExamForReview' : '[Student] startSelectedExam', { examId, examResponse, attemptResponse });
      if (examResponse.serverTime) setServerTimeOffset(new Date(examResponse.serverTime).getTime() - Date.now());

      const nextProblemStates = {};

      loadedProblems.forEach((problem) => {
        const problemId = getProblemId(problem);
        const answer = resumedAttempt?.answers?.find((item) => String(item.problemId) === String(problemId));
        nextProblemStates[problemId] = buildProblemState(problem, answer);
      });

      setExam(loadedExam);
      setAttempt(resumedAttempt);
      setProblems(loadedProblems);
      setProblemStates(nextProblemStates);
      setSubmissions(buildSubmissionMap(resumedAttempt, loadedProblems));
      setCurrentProblemIndex(Math.min(resumedAttempt?.currentProblemIndex || 0, Math.max(loadedProblems.length - 1, 0)));
      setIsExamStarted(!reviewMode);
      setIsExamLocked(reviewMode || (resumedAttempt?.status && resumedAttempt.status !== 'ongoing'));

      const timerStorageKey = getTimerStorageKey(examId);
      const savedTimerMap = localStorage.getItem(timerStorageKey);
      const parsed = savedTimerMap ? JSON.parse(savedTimerMap) : null;
      const nextRemaining = {};
      loadedProblems.forEach((problem) => {
        const pid = getProblemId(problem);
        const baseSeconds = Math.max(1, Number(problem.duration || loadedExam.duration || loadedExam.totalDuration || 1)) * 60;
        nextRemaining[pid] = Math.max(0, Number(parsed?.[pid] ?? baseSeconds));
      });
      setPerProblemRemaining(nextRemaining);
    } catch (error) {
      toast.error(error.message || (reviewMode ? 'Unable to open exam results.' : 'Unable to start exam.'));
    } finally {
      setIsLoadingExam(false);
    }
  }, []);

  const startSelectedExam = useCallback(async (examId) => {
    if (typeof document !== 'undefined' && document.documentElement?.requestFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.warn('Unable to enter fullscreen automatically.', error);
      }
    }
    return loadExamSession(examId, { reviewMode: false });
  }, [loadExamSession]);
  const openExamResults = useCallback((examId) => loadExamSession(examId, { reviewMode: true }), [loadExamSession]);

  const returnToDashboard = useCallback(() => {
    const selectedCourse = activeCourse;
    void exitFullscreenIfNeeded().finally(() => {
      resetExamSession();
      if (selectedCourse?._id) {
        void loadCourseExams(selectedCourse);
      }
    });
  }, [activeCourse, exitFullscreenIfNeeded, loadCourseExams, resetExamSession]);

  const updateCurrentProblemState = useCallback((patch) => {
    if (!currentProblemId) return;
    setProblemStates((prev) => ({ ...prev, [currentProblemId]: { ...buildProblemState(currentProblem), ...prev[currentProblemId], ...patch } }));
  }, [currentProblem, currentProblemId]);

  const handleRunCode = async (editorCode) => {
    if (!currentProblem || isExamLocked || isCurrentProblemLocked) return;
    const sourceCode = String(editorCode ?? currentProblemState.code ?? '');
    const runningProblemId = getProblemId(currentProblem);
    const runtimeInput = String(currentProblemState.input ?? '');

    console.log('FINAL CODE:', sourceCode);
    console.log('SENT CODE:', sourceCode);
    setIsRunning(true);
    try {
      emitEvent('run_clicked', { examId: exam?._id, problemId: runningProblemId, at: new Date().toISOString() });
      updateCurrentProblemState({ code: sourceCode, input: runtimeInput });
      if (runningProblemId) {
        setLastRunCodeMap((prev) => ({ ...prev, [runningProblemId]: sourceCode }));
      }
      const response = await runCode(currentProblemState.language, sourceCode, runtimeInput);
      console.log('[Student] runCode response', response);
      updateCurrentProblemState({ output: response.output || response.error || 'No output' });
    } catch {
      updateCurrentProblemState({ output: 'Runtime Error.' });
      toast.error('Run failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const autoSubmitPendingProblems = useCallback(async () => {
    if (!examId || !problems.length) return;

    let nextAttempt = null;

    for (const problem of problems) {
      const problemId = getProblemId(problem);
      if (!problemId || submissions[problemId]) continue;

      const state = problemStates[problemId] || buildProblemState(problem);
      const language = state.language || getDefaultLanguage();
      const codeToSubmit = String(lastRunCodeMap[problemId] ?? state.code ?? getDefaultCode(problem, language));

      try {
        const response = await submitExamAnswer({
          examId,
          problemId,
          code: codeToSubmit,
          language,
          input: state.input || ''
        });
        nextAttempt = response?.attempt || nextAttempt;
      } catch (error) {
        console.warn('Auto-submit failed for problem', problemId, error);
      }
    }

    if (nextAttempt) {
      setAttempt(nextAttempt);
      setSubmissions(buildSubmissionMap(nextAttempt, problems));
    }
  }, [examId, lastRunCodeMap, problemStates, problems, submissions]);

  const finalizeExamSession = useCallback(async (trigger = 'manual') => {
    if (!examId || autoFinalizeRef.current) return;
    autoFinalizeRef.current = true;
    setIsExamLocked(true);

    try {
      if (trigger === 'timeout') {
        await autoSubmitPendingProblems();
      }

      const response = await finalizeExamAttempt(examId);
      setAttempt(response.attempt || null);
      toast[trigger === 'timeout' ? 'error' : 'success'](trigger === 'timeout' ? 'Time is over. Exam submitted automatically.' : 'Exam submitted successfully.');

      if (trigger === 'manual' || trigger === 'timeout') {
        returnToDashboard();
      }
    } catch (error) {
      toast.error(error.message || 'Unable to finalize exam.');
      autoFinalizeRef.current = false;
      setIsExamLocked(false);
    }
  }, [autoSubmitPendingProblems, examId, returnToDashboard]);

  const handleCloseExamView = useCallback(() => {
    if (!exam) return;

    if (!isExamLocked && isExamStarted) {
      const shouldSubmit = window.confirm('This exam is still ongoing. Do you want to submit and close it?');
      if (!shouldSubmit) {
        return;
      }
      void finalizeExamSession('manual');
      return;
    }

    returnToDashboard();
  }, [exam, finalizeExamSession, isExamLocked, isExamStarted, returnToDashboard]);

  const handleExitFromResults = useCallback(() => {
    setShowExitConfirm(false);
    returnToDashboard();
  }, [returnToDashboard]);

  const submitCurrentProblem = async (editorCode, { force = false } = {}) => {
    if (!examId || !currentProblemId || isExamLocked || isSubmitting) return;
    const sourceCode = String(editorCode ?? currentProblemState.code ?? '');

    if (!sourceCode.trim() && !force) {
      toast.error('Cannot submit empty code.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('FINAL CODE:', sourceCode);
      console.log('SENT CODE:', sourceCode);
      console.log("SUBMIT CODE:", sourceCode);
      console.log("Submitting examId:", examId);
      updateCurrentProblemState({ code: sourceCode });
      emitEvent('submit_clicked', { examId, problemId: currentProblemId, at: new Date().toISOString() });
      const response = await submitExamAnswer({ examId, problemId: currentProblemId, code: sourceCode, language: currentProblemState.language, input: currentProblemState.input });
      console.log('[Student] submitExamAnswer response', response);

      const nextAttempt = response.attempt;
      localStorage.removeItem(`exam_${examId}_problem_${currentProblemId}`);
      setAttempt(nextAttempt);
      setSubmissions(buildSubmissionMap(nextAttempt, problems));
      updateCurrentProblemState({
        result: {
          passed: response.passed || 0,
          total: response.total || 0,
          passedPublic: response.passedPublic || 0,
          totalPublic: response.totalPublic || 0,
          passedHidden: response.passedHidden || 0,
          totalHidden: response.totalHidden || 0,
          score: response.finalScore ?? response.score ?? 0,
          details: response.testResults || response.details || []
        },
        output: response.output || response.error || `Passed ${response.passed || 0}/${response.total || 0}`
      });
      toast.success('Problem submitted successfully.');

      if (exam.navigationControl === false && currentProblemIndex < problems.length - 1) {
        setCurrentProblemIndex(Math.min(nextAttempt?.currentProblemIndex ?? currentProblemIndex + 1, problems.length - 1));
      }
    } catch (error) {
      toast.error(error.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      !exam?._id ||
      !currentProblemId ||
      !currentProblemState ||
      isSubmitting ||
      isExamLocked ||
      submissions?.[currentProblemId]
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveExamAttempt({ examId: exam._id, problemId: currentProblemId, code: currentProblemState.code, language: currentProblemState.language, currentProblemIndex }).catch(() => {});
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [currentProblemId, currentProblemIndex, currentProblemState, exam?._id, isExamLocked, isSubmitting, submissions]);

  useEffect(() => {
    if (!exam) {
      return;
    }

    const durationSeconds = getExamDurationSeconds(exam);
    const startTimeMs = new Date(exam.startTime).getTime();
    const fallbackEndTimeMs = startTimeMs + durationSeconds * 1000;
    const endTimeMs = exam.endTime ? new Date(exam.endTime).getTime() : fallbackEndTimeMs;

    const tick = () => {
      const serverNow = Date.now() + serverTimeOffset;
      const secondsLeft = Math.max(0, Math.floor((endTimeMs - serverNow) / 1000));
      setRemainingTime(secondsLeft);
      if (secondsLeft === 13 && !isExamLocked) {
        setIsExamLocked(true);
        void finalizeExamSession('timeout');
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [exam, finalizeExamSession, isExamLocked, serverTimeOffset]);

  useEffect(() => {
    if (!exam?._id || !isPerProblemTimer || !currentProblemId || isExamLocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPerProblemRemaining((prev) => {
        const current = Number(prev[currentProblemId] ?? 0);
        if (current <= 0) return prev;

        const next = { ...prev, [currentProblemId]: current - 1 };
        localStorage.setItem(getTimerStorageKey(exam._id), JSON.stringify(next));
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentProblemId, exam?._id, isExamLocked, isPerProblemTimer]);

  useEffect(() => {
    if (!isPerProblemTimer || !currentProblemId || isExamLocked) return;

    if ((perProblemRemaining[currentProblemId] ?? 0) <= 0 && !autoSubmitMapRef.current[currentProblemId]) {
      autoSubmitMapRef.current[currentProblemId] = true;
      toast.error('Problem timer expired. Auto-submitting current problem.');
      void submitCurrentProblem(undefined, { force: true });
    }
  }, [currentProblemId, isExamLocked, isPerProblemTimer, perProblemRemaining, submitCurrentProblem]);

  // Auto-finalize exam when all problems are submitted
  useEffect(() => {
    if (!exam?._id || isExamLocked || !problems.length || !isExamStarted) return;

    const allSubmitted = problems.every((problem) => submissions[getProblemId(problem)]);
    if (allSubmitted && !autoFinalizeRef.current) {
      toast.success('All problems submitted. Finalizing exam...');
      void finalizeExamSession('auto-submit');
    }
  }, [exam?._id, isExamLocked, problems, submissions, isExamStarted, finalizeExamSession]);

  const visibleCourseExams = useMemo(() => {
    const serverNow = clockNow + serverTimeOffset;
    return courseExams.filter((item) => item.status !== 'draft').map((item) => {
      const start = new Date(item.startTime).getTime();
      const end = new Date(item.endTime).getTime();
      let runtimeState = 'upcoming';
      if (serverNow >= start && serverNow <= end) runtimeState = 'ongoing';
      else if (serverNow > end) runtimeState = 'ended';
      return { ...item, runtimeState };
    });
  }, [clockNow, courseExams, serverTimeOffset]);

  if (!user) return <AuthForm onAuthSuccess={setUser} />;
  if (user.role === 'teacher') return <TeacherDashboard />;

  const showResultPanel = Boolean(isExamLocked && attempt);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 outline-none" onKeyDown={handleKeyDown} tabIndex="0">
      <Toaster position="top-right" />

      {exam && currentProblem ? (
        <div className="relative h-screen flex flex-col">
          <div className="h-12 border-b border-white/10 bg-[#0b0b0b] px-4 flex items-center justify-between">
            <div className="text-sm text-white/80">{exam.title}</div>
            <div className="flex items-center gap-2">
              {showResultPanel ? (
                <button type="button" onClick={() => setShowExitConfirm(true)} className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15">Exit</button>
              ) : (
                <button type="button" onClick={handleCloseExamView} className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15">Close</button>
              )}
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20"><LogOut size={14} />Logout</button>
            </div>
          </div>

          {showResultPanel ? (
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4">
              {canShowResults ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">Total Score: <span className="font-semibold">{attempt?.totalScore ?? 0}</span></div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">Problems Evaluated: <span className="font-semibold">{attempt?.answers?.length || 0}</span></div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {problems.map((problem, idx) => {
                      const problemId = getProblemId(problem);
                      const answer = (attempt?.answers || []).find((item) => String(item.problemId) === String(problemId));
                      return (
                        <div key={problemId || idx} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                          <div className="font-medium text-white">Problem {idx + 1}</div>
                          <div className="mt-1 text-white/70">Marks: <span className="font-semibold text-white">{answer ? (answer.finalScore ?? answer.score ?? 0) : 0} / {answer?.marks ?? problem?.marks ?? 0}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">Results are hidden until your teacher finalizes and publishes marks.</div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <SecureIDE
                exam={exam}
                examId={exam._id}
                currentProblem={currentProblem}
                problems={problems}
                currentProblemIndex={currentProblemIndex}
                submissions={submissions}
                remainingTime={remainingTime}
                perProblemTimeLeft={currentPerProblemTimeLeft}
                isPerProblemTimer={isPerProblemTimer}
                submitExam={() => finalizeExamSession('manual')}
                submitCurrentProblem={submitCurrentProblem}
                setCurrentProblemIndex={setCurrentProblemIndex}
                navigationControl={exam.navigationControl}
                code={currentProblemState.code}
                setCode={(nextCode) => updateCurrentProblemState({ code: nextCode })}
                language={currentProblemState.language}
                setLanguage={(nextLanguage) => updateCurrentProblemState({ language: nextLanguage, code: getDefaultCode(currentProblem, nextLanguage) })}
                output={currentProblemState.output}
                input={currentProblemState.input}
                setInput={(nextInput) => updateCurrentProblemState({ input: nextInput })}
                result={currentProblemState.result}
                isRunning={isRunning}
                isSubmitting={isSubmitting}
                onRunCode={handleRunCode}
                isExamStarted={isExamStarted}
                isLocked={isExamLocked || isCurrentProblemLocked}
                languageOptions={LANGUAGE_CONFIG}
              />
            </div>
          )}

          {showExitConfirm ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-sm rounded-lg border border-white/15 bg-[#101010] p-4">
                <h3 className="text-sm font-semibold text-white">Do you want to exit?</h3>
                <p className="mt-1 text-xs text-white/60">You will return to the main dashboard.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowExitConfirm(false)} className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">No</button>
                  <button type="button" onClick={handleExitFromResults} className="rounded-md border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30">Yes</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-3 p-3">
          <div className="rounded-xl border border-white/10 bg-[#101010] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/90"><ShieldCheck size={16} className="text-emerald-400" />Secure Student Mode</div>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"><LogOut size={14} />Logout</button>
            </div>
            <StudentDashboard activeCourseId={activeCourse?._id} onSelectCourse={loadCourseExams} />
          </div>

          <section className="rounded-xl border border-white/10 bg-[#101010] p-4 flex flex-col min-h-115">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><FileText size={16} className="text-amber-400" />{activeCourse ? `${activeCourse.title} Exams` : 'Available Exams'}</div>

            {!activeCourse ? (
              <div className="flex-1 flex items-center justify-center text-white/60 text-sm"><BookOpen size={18} className="mr-2" />Select a course to load exams.</div>
            ) : courseExamsLoading ? (
              <div className="flex-1 flex items-center justify-center text-white/60 text-sm">Loading exams...</div>
            ) : courseExams.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-amber-300 text-sm"><AlertTriangle size={16} className="mr-2" />No exams available for this course.</div>
            ) : (
              <div className="grid gap-3 overflow-y-auto pr-1">
                {visibleCourseExams.map((item) => {
                  const reviewReady = canReviewExam(item);
                  const buttonLabel = item.runtimeState === 'ongoing'
                    ? 'Start Exam'
                    : reviewReady
                      ? 'View Results'
                      : item.runtimeState === 'upcoming'
                        ? 'Upcoming'
                        : 'Result Not Declared Yet';

                  return (
                  <article key={item._id} className="rounded-lg border border-white/10 bg-[#0b0b0b] p-3">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-white/60">{item.problems?.length || 0} problems · {item.runtimeState}</p>
                    <p className="mt-1 text-xs text-white/60">Starts: {new Date(item.startTime).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-white/60">Duration: {item.totalDuration} min</p>
                    <button
                      type="button"
                      onClick={() => (item.runtimeState === 'ongoing' ? startSelectedExam(item._id) : reviewReady ? openExamResults(item._id) : null)}
                      disabled={isLoadingExam || (item.runtimeState !== 'ongoing' && !reviewReady)}
                      className="mt-3 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      {isLoadingExam ? 'Loading...' : buttonLabel}
                    </button>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
