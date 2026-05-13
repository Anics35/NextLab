import { useCallback, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { toast, Toaster } from 'react-hot-toast';
import { CheckCircle2, FileText, LoaderCircle, LogOut, Play, Save, Search } from 'lucide-react';

import { logout } from '../services/authService';
import { getProblems, runCode } from '../services/codeService';
import ProctorAlerts from './ProctorAlerts';
import {
  deleteProblem,
  createCourse,
  createExam,
  createProblem,
  getCourseById,
  getCourseExams,
  getMyCourses,
  getStudentAttempt,
  getSubmissionsByExam,
  overrideSubmissionScore,
  updateProblem,
  updateCourse,
  updateExam
} from '../services/api';
import AppLayout from './layout/AppLayout';
import { initSocket, socket } from '../services/socket';

const TABS = ['courses', 'question-bank', 'exams', 'results'];
const DEFAULT_COURSE_FORM = { title: '', description: '', courseCode: '' };
const DEFAULT_EXAM_FORM = { title: '', courseId: '', instructions: '', duration: 60, timerType: 'global' };

const inputClass = 'w-full bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#ffa116] outline-none text-white';
const cardClass = 'bg-[#111] border border-gray-800 rounded-xl p-5 shadow-sm';

const difficultyBadgeClass = (difficulty) => {
  const level = String(difficulty || '').toLowerCase();
  if (level === 'easy') return 'bg-green-500/20 text-green-300 border border-green-500/40';
  if (level === 'medium') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
  if (level === 'hard') return 'bg-red-500/20 text-red-300 border border-red-500/40';
  return 'bg-gray-500/20 text-gray-300 border border-gray-500/40';
};

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('courses');
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [problems, setProblems] = useState([]);
  const [courseExams, setCourseExams] = useState([]);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseEditForm, setCourseEditForm] = useState(DEFAULT_COURSE_FORM);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [courseForm, setCourseForm] = useState(DEFAULT_COURSE_FORM);
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [examForm, setExamForm] = useState(DEFAULT_EXAM_FORM);
  const [selectedProblemMap, setSelectedProblemMap] = useState({});
  const [publishingExam, setPublishingExam] = useState(false);

  const [query, setQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [problemForm, setProblemForm] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    publicTestCases: [{ input: '', output: '' }],
    hiddenTestCases: [{ input: '', output: '' }]
  });
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState('');
  const [isSavingProblem, setIsSavingProblem] = useState(false);
  const [isDeletingProblemId, setIsDeletingProblemId] = useState('');

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

  const loadWorkspace = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const [courseData, problemData] = await Promise.all([getMyCourses(), getProblems()]);
      console.log('[TeacherDashboard] loadWorkspace response', { courses: courseData, problems: problemData });
      const nextCourses = courseData.courses || [];
      setCourses(nextCourses);
      setProblems(problemData || []);
      const nextCourse = selectedCourseId || nextCourses[0]?._id || '';
      setSelectedCourseId(nextCourse);
      setExamForm((prev) => ({ ...prev, courseId: prev.courseId || nextCourse }));
    } catch (error) {
      toast.error(error.message || 'Unable to load workspace.');
    } finally {
      setCoursesLoading(false);
    }
  }, [selectedCourseId]);

  const loadCourseExams = useCallback(async (courseId) => {
    if (!courseId) {
      setCourseExams([]);
      setSelectedExamId('');
      return;
    }
    try {
      console.log('[TeacherDashboard] selectedCourseId', courseId);
      const data = await getCourseExams(courseId);
      console.log('[TeacherDashboard] getCourseExams response', data);
      const exams = data.exams || [];
      setCourseExams(exams);
      setSelectedExamId((prev) => (exams.some((exam) => exam._id === prev) ? prev : (exams[0]?._id || '')));
    } catch (error) {
      toast.error(error.message || 'Unable to load exams.');
    }
  }, []);

  const loadCourseDetail = useCallback(async (courseId) => {
    if (!courseId) {
      setSelectedCourseDetail(null);
      setIsEditingCourse(false);
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
        courseCode: course?.courseCode || ''
      });
      setIsEditingCourse(false);
    } catch (error) {
      toast.error(error.message || 'Unable to load course details.');
    } finally {
      setCourseDetailLoading(false);
    }
  }, []);

  const loadSubmissions = useCallback(async (examId) => {
    if (!examId) {
      setSubmissions([]);
      return;
    }
    setSubmissionsLoading(true);
    try {
      console.log("Fetching examId:", examId);
      const data = await getSubmissionsByExam(examId, 500);
      console.log('[TeacherDashboard] loadSubmissions response', data);
      setSubmissions(data.submissions || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load submissions.');
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => { void loadCourseExams(selectedCourseId); }, [loadCourseExams, selectedCourseId]);
  useEffect(() => { void loadSubmissions(selectedExamId); }, [loadSubmissions, selectedExamId]);

  useEffect(() => {
    initSocket(localStorage.getItem('token'));
    const onProctorAlert = (event) => {
      console.log('[TeacherDashboard] proctor_alert', event);
      setProctorAlerts((prev) => [event, ...prev].slice(0, 50));
      toast.error(`Alert: ${event?.studentName || 'Student'} - ${event?.type || 'violation'}`);
    };
    socket?.on('proctor_alert', onProctorAlert);
    return () => socket?.off('proctor_alert', onProctorAlert);
  }, []);

  const selectedExam = useMemo(() => courseExams.find((item) => item._id === selectedExamId) || null, [courseExams, selectedExamId]);
  useEffect(() => {
    if (!selectedExam) return;
    setShowMarksImmediately(Boolean(selectedExam.showResultsImmediately === true || selectedExam.resultVisibility === 'immediate' || selectedExam.resultsVisible === true));
  }, [selectedExam]);

  const filteredProblems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const titleMatch = !normalized || String(problem.title || '').toLowerCase().includes(normalized);
      const difficultyMatch = difficultyFilter === 'all' || String(problem.difficulty || '').toLowerCase() === difficultyFilter;
      return titleMatch && difficultyMatch;
    });
  }, [difficultyFilter, problems, query]);

  const studentRows = useMemo(() => submissions.map((submission) => ({
    ...submission,
    studentId: submission.userId?._id,
    name: submission.userId?.name || 'Student',
    rollNumber: submission.userId?.rollNumber || '-',
    semester: submission.userId?.semester || '-',
    totalScore: (submission.problems || []).reduce((sum, problem) => sum + Number(problem.score || 0), 0)
  })).sort((a, b) => b.totalScore - a.totalScore), [submissions]);
  const selectedStudent = useMemo(() => studentRows.find((item) => item._id === selectedSubmissionId) || null, [selectedSubmissionId, studentRows]);
  const reviewProblems = selectedSubmission?.problems || [];
  const selectedProblem = reviewProblems[activeProblemIndex] || null;

  useEffect(() => {
    if (!selectedSubmission || reviewProblems.length === 0) {
      return;
    }
    if (activeProblemIndex > reviewProblems.length - 1) {
      setActiveProblemIndex(0);
    }
  }, [activeProblemIndex, reviewProblems, selectedSubmission]);

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
  }, [selectedExamId, selectedStudent]);

  useEffect(() => {
    if (!selectedSubmissionId) return;
    const initialSubmission = submissions.find((item) => item._id === selectedSubmissionId) || null;
    setSelectedSubmission(initialSubmission);
    setActiveProblemIndex(0);
  }, [selectedSubmissionId, submissions]);

  useEffect(() => {
    if (!selectedProblem) {
      setTeacherInput('');
      setTeacherOutput('');
      setIsCodeModalOpen(false);
      return;
    }
    console.log("DISPLAY CODE:", selectedProblem.code);
    setTeacherInput(selectedProblem.input || '');
    setTeacherOutput(selectedProblem.output || '');
  }, [selectedProblem]);

  useEffect(() => {
    setSelectedSubmissionId('');
    setSelectedSubmission(null);
    setStudentAttempt(null);
    setActiveProblemIndex(0);
  }, [selectedExamId]);

  const toggleProblem = (problemId) => {
    setSelectedProblemMap((prev) => {
      if (prev[problemId]) {
        const next = { ...prev };
        delete next[problemId];
        return next;
      }
      return { ...prev, [problemId]: { marks: 10, duration: 30 } };
    });
  };

  const handleCreateCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.courseCode.trim()) {
      toast.error('Course title and code are required.');
      return;
    }
    setCreatingCourse(true);
    try {
      await createCourse(courseForm);
      toast.success('Course created.');
      setCourseForm(DEFAULT_COURSE_FORM);
      await loadWorkspace();
    } catch (error) {
      toast.error(error.message || 'Unable to create course.');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleOpenCourseDetail = async (courseId) => {
    setSelectedCourseId(courseId);
    setActiveTab('courses');
    await loadCourseDetail(courseId);
  };

  const handleSaveCourse = async () => {
    if (!selectedCourseDetail?._id) {
      toast.error('Select a course first.');
      return;
    }

    if (!courseEditForm.title.trim() || !courseEditForm.courseCode.trim()) {
      toast.error('Course title and code are required.');
      return;
    }

    setIsSavingCourse(true);
    try {
      const response = await updateCourse(selectedCourseDetail._id, {
        title: courseEditForm.title.trim(),
        description: courseEditForm.description,
        courseCode: courseEditForm.courseCode
      });
      const updatedCourse = response.course || null;
      if (updatedCourse) {
        setSelectedCourseDetail(updatedCourse);
        setCourseEditForm({
          title: updatedCourse.title || '',
          description: updatedCourse.description || '',
          courseCode: updatedCourse.courseCode || ''
        });
        setCourses((prev) => prev.map((course) => (course._id === updatedCourse._id ? { ...course, ...updatedCourse } : course)));
      }
      setIsEditingCourse(false);
      toast.success('Course updated.');
    } catch (error) {
      toast.error(error.message || 'Unable to update course.');
    } finally {
      setIsSavingCourse(false);
    }
  };

  const closeCourseDetail = () => {
    setSelectedCourseDetail(null);
    setIsEditingCourse(false);
  };

  const handleCreateProblem = async () => {
    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      toast.error('Problem title and description are required.');
      return;
    }
    setIsCreatingProblem(true);
    try {
      const payload = {
        title: problemForm.title.trim(),
        description: problemForm.description.trim(),
        difficulty: problemForm.difficulty,
        publicTestCases: problemForm.publicTestCases.filter((item) => String(item.output || '').trim()),
        hiddenTestCases: problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim())
      };
      console.log('[TeacherDashboard] createProblem payload', payload);
      await createProblem(payload);
      setProblems(await getProblems());
      setProblemForm({ title: '', description: '', difficulty: 'easy', publicTestCases: [{ input: '', output: '' }], hiddenTestCases: [{ input: '', output: '' }] });
      toast.success('Problem created.');
    } catch (error) {
      toast.error(error.message || 'Unable to create problem.');
    } finally {
      setIsCreatingProblem(false);
    }
  };

  const resetProblemForm = () => {
    setProblemForm({
      title: '',
      description: '',
      difficulty: 'easy',
      publicTestCases: [{ input: '', output: '' }],
      hiddenTestCases: [{ input: '', output: '' }]
    });
    setEditingProblemId('');
  };

  const handleEditProblem = (problem) => {
    setEditingProblemId(problem._id);
    setProblemForm({
      title: problem.title || '',
      description: problem.description || '',
      difficulty: problem.difficulty || 'easy',
      publicTestCases: (problem.publicTestCases || []).length
        ? problem.publicTestCases.map((item) => ({ input: item.input || '', output: item.output || '' }))
        : [{ input: '', output: '' }],
      hiddenTestCases: (problem.hiddenTestCases || []).length
        ? problem.hiddenTestCases.map((item) => ({ input: item.input || '', output: item.output || '' }))
        : [{ input: '', output: '' }]
    });
    setActiveTab('question-bank');
  };

  const handleUpdateProblem = async () => {
    if (!editingProblemId) {
      toast.error('Select a problem to edit first.');
      return;
    }
    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      toast.error('Problem title and description are required.');
      return;
    }

    setIsSavingProblem(true);
    try {
      const payload = {
        title: problemForm.title.trim(),
        description: problemForm.description.trim(),
        difficulty: problemForm.difficulty,
        publicTestCases: problemForm.publicTestCases.filter((item) => String(item.output || '').trim()),
        hiddenTestCases: problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim())
      };
      await updateProblem(editingProblemId, payload);
      toast.success('Problem updated.');
      await loadWorkspace();
      resetProblemForm();
    } catch (error) {
      toast.error(error.message || 'Unable to update problem.');
    } finally {
      setIsSavingProblem(false);
    }
  };

  const handleDeleteProblem = async (problem) => {
    const shouldDelete = window.confirm(`Delete problem "${problem.title || 'Untitled'}"? This cannot be undone.`);
    if (!shouldDelete) return;

    setIsDeletingProblemId(problem._id);
    try {
      await deleteProblem(problem._id);
      toast.success('Problem deleted.');
      if (editingProblemId === problem._id) {
        resetProblemForm();
      }
      await loadWorkspace();
    } catch (error) {
      toast.error(error.message || 'Unable to delete problem.');
    } finally {
      setIsDeletingProblemId('');
    }
  };

  const handlePublishExam = async () => {
    const selectedIds = Object.keys(selectedProblemMap);
    if (!examForm.title.trim() || !examForm.courseId || selectedIds.length === 0) {
      toast.error('Exam title, course and at least one problem are required.');
      return;
    }
    const payloadProblems = selectedIds.map((problemId) => ({
      problemId,
      marks: Number(selectedProblemMap[problemId]?.marks || 0),
      duration: examForm.timerType === 'per_problem' ? Number(selectedProblemMap[problemId]?.duration || 0) : undefined
    }));
    if (payloadProblems.some((item) => !Number.isFinite(item.marks) || item.marks <= 0)) {
      toast.error('Each selected problem needs marks > 0.');
      return;
    }
    if (examForm.timerType === 'per_problem' && payloadProblems.some((item) => !Number.isFinite(item.duration) || item.duration <= 0)) {
      toast.error('Each selected problem needs duration in per_problem mode.');
      return;
    }

    setPublishingExam(true);
    try {
      const payload = {
        courseId: examForm.courseId,
        title: examForm.title,
        instructions: examForm.instructions,
        timerType: examForm.timerType,
        duration: Number(examForm.duration),
        problems: payloadProblems,
        navigationControl: true
      };
      console.log('[TeacherDashboard] publishExam payload', payload);
      await createExam(payload);
      toast.success('Exam published.');
      setExamForm((prev) => ({ ...DEFAULT_EXAM_FORM, courseId: prev.courseId }));
      setSelectedProblemMap({});
      await loadCourseExams(examForm.courseId);
      setActiveTab('results');
    } catch (error) {
      toast.error(error.message || 'Unable to publish exam.');
    } finally {
      setPublishingExam(false);
    }
  };

  const handleOverrideScore = async (submissionId, problemId) => {
    const draftKey = `${submissionId}_${problemId}`;
    const fallbackScore = selectedProblem && String(selectedProblem.problemId?._id || selectedProblem.problemId) === String(problemId)
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
        setSelectedSubmission((prev) => prev ? ({
          ...prev,
          problems: prev.problems.map((problem) => String(problem.problemId?._id || problem.problemId) === String(problemId)
            ? { ...problem, score: nextScore, manualOverride: true }
            : problem)
        }) : prev);
      }
    } catch (error) {
      toast.error(error.message || 'Unable to update score.');
    }
  };

  const persistResultVisibility = async (visible) => {
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
      setCourseExams((prev) => prev.map((exam) => (
        exam._id === selectedExamId ? { ...exam, ...(response.exam || {}), resultsVisible: visible, showResultsImmediately: visible, resultVisibility: visible ? 'immediate' : 'manual' } : exam
      )));
      toast.success(visible ? 'Results are visible to students.' : 'Results are hidden from students.');
    } catch (error) {
      toast.error(error.message || 'Unable to update result visibility.');
    } finally {
      setIsFinalizingMarks(false);
    }
  };

  const finalizeMarks = async () => {
    if (!selectedExamId) return;
    setIsFinalizingMarks(true);
    try {
      const response = await updateExam(selectedExamId, {
        marksFinalized: true,
        showResultsImmediately: true,
        resultVisibility: 'immediate',
        resultsVisible: true
      });
      setShowMarksImmediately(true);
      setCourseExams((prev) => prev.map((exam) => (
        exam._id === selectedExamId ? { ...exam, ...(response.exam || {}), marksFinalized: true, showResultsImmediately: true, resultVisibility: 'immediate', resultsVisible: true } : exam
      )));
      toast.success('Marks finalized.');
      await loadSubmissions(selectedExamId);
    } catch (error) {
      toast.error(error.message || 'Finalize endpoint unavailable for this exam state.');
    } finally {
      setIsFinalizingMarks(false);
    }
  };

  const handleTeacherRunCode = async () => {
    if (!selectedProblem?.code) {
      toast.error('No submitted code available.');
      return;
    }

    setIsTeacherRunning(true);
    try {
      const response = await runCode(selectedProblem.language, selectedProblem.code, teacherInput);
      setTeacherOutput(response.output || response.error || 'No output');
    } catch (error) {
      setTeacherOutput(error.message || 'No output');
      toast.error(error.message || 'Unable to run submission.');
    } finally {
      setIsTeacherRunning(false);
    }
  };

  const sidebar = (
    <>
      <div className="mb-4"><p className="text-lg font-semibold">NextLab</p><p className="text-xs text-gray-400">Teacher Dashboard</p></div>
      <div className="flex flex-col gap-4 mb-4">
        {TABS.map((tab) => {
          const label = tab === 'question-bank' ? 'Question Bank' : tab.charAt(0).toUpperCase() + tab.slice(1);
          return <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`text-left rounded-md px-3 py-2 border ${activeTab === tab ? 'bg-[#ffa116] text-black border-[#ffa116]' : 'bg-[#111] text-white border-gray-800 hover:bg-[#1a1a1a]'}`}>{label}</button>;
        })}
      </div>
      <button type="button" onClick={logout} className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 inline-flex items-center justify-center gap-2"><LogOut size={14} /> Logout</button>
    </>
  );

  return (
    <AppLayout sidebar={sidebar}>
      <Toaster position="top-right" />

      {activeTab === 'courses' ? (
        selectedCourseDetail ? (
          <section className={`${cardClass} mb-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Course Students</h2>
              <p className="text-sm text-gray-400">View enrolled students and edit course details.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={closeCourseDetail} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">Back</button>
              <button type="button" onClick={() => setIsEditingCourse((prev) => !prev)} className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500">
                {isEditingCourse ? 'Close Edit' : 'Edit Course'}
              </button>
            </div>
          </div>

          {courseDetailLoading ? (
            <p className="text-gray-400">Loading course details...</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4">
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Course title</p>
                  <h3 className="text-xl font-semibold text-white">{selectedCourseDetail.title}</h3>
                  <p className="text-sm text-gray-400 mt-3">Course code</p>
                  <p className="text-[#ffa116] font-semibold">{selectedCourseDetail.courseCode}</p>
                  <p className="text-sm text-gray-400 mt-3">Invite code</p>
                  <p className="text-green-400 font-semibold">{selectedCourseDetail.inviteCode || '-'}</p>
                  <p className="text-sm text-gray-400 mt-3">Students enrolled</p>
                  <p className="text-white font-semibold">{selectedCourseDetail.students?.length || 0}</p>
                </div>

                {isEditingCourse ? (
                  <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 space-y-3">
                    <h3 className="text-lg font-semibold text-white">Edit Course</h3>
                    <input className={inputClass} value={courseEditForm.title} onChange={(event) => setCourseEditForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Course title" />
                    <input className={inputClass} value={courseEditForm.courseCode} onChange={(event) => setCourseEditForm((prev) => ({ ...prev, courseCode: event.target.value.toUpperCase() }))} placeholder="Course code" />
                    <textarea className={`${inputClass} resize-none`} rows={4} value={courseEditForm.description} onChange={(event) => setCourseEditForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Course description" />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveCourse} disabled={isSavingCourse} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center gap-2">
                        {isSavingCourse ? <LoaderCircle size={14} className="animate-spin" /> : null}
                        {isSavingCourse ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setIsEditingCourse(false)} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Student List</h3>
                <div className="space-y-3 max-h-130 overflow-y-auto pr-1">
                  {(selectedCourseDetail.students || []).length === 0 ? (
                    <p className="text-gray-400">No students have joined this course yet.</p>
                  ) : selectedCourseDetail.students.map((student) => (
                    <div key={student._id} className="rounded-lg border border-gray-800 bg-[#111] p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{student.name || 'Student'}</p>
                        <p className="text-sm text-gray-400">Roll No: {student.rollNumber || '-'}</p>
                        <p className="text-sm text-gray-400">Semester: {student.semester || '-'}</p>
                      </div>
                      <span className="text-xs rounded-full bg-white/5 border border-white/10 px-2 py-1 text-gray-300">{student.email || 'No email'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
        ) : (
          <section className={`${cardClass} mb-4`}>
            <h2 className="text-lg font-semibold mb-4">Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input className={inputClass} value={courseForm.title} onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Course title" />
              <input className={inputClass} value={courseForm.courseCode} onChange={(event) => setCourseForm((prev) => ({ ...prev, courseCode: event.target.value.toUpperCase() }))} placeholder="Course code" />
              <button type="button" onClick={handleCreateCourse} disabled={creatingCourse} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center justify-center gap-2">{creatingCourse ? <LoaderCircle size={14} className="animate-spin" /> : null}{creatingCourse ? 'Creating...' : 'Create Course'}</button>
            </div>
            <textarea className={`${inputClass} resize-none mb-4`} rows={3} value={courseForm.description} onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Course description" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {coursesLoading ? <p className="text-gray-400">Loading courses...</p> : null}
              {!coursesLoading && courses.length === 0 ? <p className="text-gray-400">No courses found.</p> : null}
              {courses.map((course) => (
                <article key={course._id} className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
                  <p className="text-white font-semibold mb-4">{course.title}</p>
                  <p className="text-sm text-gray-400">Invite code</p>
                  <p className="text-[#ffa116] mb-4">{course.inviteCode || '-'}</p>
                  <p className="text-sm text-gray-400 mb-4">Students: {course.students?.length || 0}</p>
                  <button type="button" className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500" onClick={() => handleOpenCourseDetail(course._id)}>Select</button>
                </article>
              ))}
            </div>
          </section>
        )
      ) : null}

      {activeTab === 'question-bank' ? (
        <section className={`${cardClass} mb-4`}>
          <h2 className="text-lg font-semibold mb-4">Question Bank</h2>
          {editingProblemId ? <div className="mb-3 rounded-md border border-[#ffa116]/30 bg-[#ffa116]/10 px-3 py-2 text-sm text-[#ffcb6b]">Editing problem. Save changes or cancel to return to new problem mode.</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input className={inputClass} value={problemForm.title} onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Problem title" />
            <select className={inputClass} value={problemForm.difficulty} onChange={(event) => setProblemForm((prev) => ({ ...prev, difficulty: event.target.value }))}><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select>
            <textarea className={`${inputClass} resize-none md:col-span-2`} rows={3} value={problemForm.description} onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Problem description" />
            <div className="md:col-span-2 border border-gray-700 rounded-md p-3">
              <p className="text-sm text-gray-300 mb-2">Public Test Cases</p>
              <div className="flex flex-col gap-2">
                {problemForm.publicTestCases.map((tc, idx) => <div key={`pub-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2"><input className={inputClass} value={tc.input} onChange={(e) => setProblemForm((prev) => ({ ...prev, publicTestCases: prev.publicTestCases.map((item, i) => i === idx ? { ...item, input: e.target.value } : item) }))} placeholder="Input" /><input className={inputClass} value={tc.output} onChange={(e) => setProblemForm((prev) => ({ ...prev, publicTestCases: prev.publicTestCases.map((item, i) => i === idx ? { ...item, output: e.target.value } : item) }))} placeholder="Output" /></div>)}
              </div>
              <div className="mt-2 flex gap-2"><button type="button" className="bg-[#ffa116] text-black px-3 py-1 rounded-md" onClick={() => setProblemForm((prev) => ({ ...prev, publicTestCases: [...prev.publicTestCases, { input: '', output: '' }] }))}>Add Public</button><button type="button" className="bg-gray-700 text-white px-3 py-1 rounded-md disabled:opacity-50" disabled={problemForm.publicTestCases.length <= 1} onClick={() => setProblemForm((prev) => ({ ...prev, publicTestCases: prev.publicTestCases.slice(0, -1) }))}>Remove Last</button></div>
            </div>
            <div className="md:col-span-2 border border-gray-700 rounded-md p-3">
              <p className="text-sm text-gray-300 mb-2">Hidden Test Cases</p>
              <div className="flex flex-col gap-2">
                {problemForm.hiddenTestCases.map((tc, idx) => <div key={`hidden-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2"><input className={inputClass} value={tc.input} onChange={(e) => setProblemForm((prev) => ({ ...prev, hiddenTestCases: prev.hiddenTestCases.map((item, i) => i === idx ? { ...item, input: e.target.value } : item) }))} placeholder="Input" /><input className={inputClass} value={tc.output} onChange={(e) => setProblemForm((prev) => ({ ...prev, hiddenTestCases: prev.hiddenTestCases.map((item, i) => i === idx ? { ...item, output: e.target.value } : item) }))} placeholder="Output" /></div>)}
              </div>
              <div className="mt-2 flex gap-2"><button type="button" className="bg-[#ffa116] text-black px-3 py-1 rounded-md" onClick={() => setProblemForm((prev) => ({ ...prev, hiddenTestCases: [...prev.hiddenTestCases, { input: '', output: '' }] }))}>Add Hidden</button><button type="button" className="bg-gray-700 text-white px-3 py-1 rounded-md disabled:opacity-50" disabled={problemForm.hiddenTestCases.length <= 1} onClick={() => setProblemForm((prev) => ({ ...prev, hiddenTestCases: prev.hiddenTestCases.slice(0, -1) }))}>Remove Last</button></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={editingProblemId ? handleUpdateProblem : handleCreateProblem} disabled={isCreatingProblem || isSavingProblem} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center gap-2">{isCreatingProblem || isSavingProblem ? <LoaderCircle size={14} className="animate-spin" /> : null}{editingProblemId ? (isSavingProblem ? 'Saving...' : 'Save Problem') : (isCreatingProblem ? 'Adding...' : 'Add Problem')}</button>
            {editingProblemId ? <button type="button" onClick={resetProblemForm} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">Cancel Edit</button> : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <label className="md:col-span-2 flex items-center gap-2 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2"><Search size={14} className="text-gray-400" /><input className="w-full bg-transparent outline-none text-white" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems" /></label>
            <select className={inputClass} value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">All</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProblems.length === 0 ? <p className="text-gray-400">No problems found.</p> : null}
            {filteredProblems.map((problem) => <div key={problem._id} className="bg-[#0a0a0a] p-3 rounded-md flex flex-col gap-3 border border-gray-800"><div className="flex justify-between items-center gap-4"><span className="text-white">{problem.title || 'Untitled'}</span><span className={`text-xs px-2 py-1 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>{problem.difficulty || 'Unknown'}</span></div><div className="flex gap-2"><button type="button" onClick={() => handleEditProblem(problem)} className="bg-[#ffa116] text-black px-3 py-1.5 rounded-md hover:bg-orange-500 text-sm">Edit</button><button type="button" onClick={() => handleDeleteProblem(problem)} disabled={isDeletingProblemId === problem._id} className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500 disabled:opacity-50 text-sm inline-flex items-center gap-2">{isDeletingProblemId === problem._id ? <LoaderCircle size={14} className="animate-spin" /> : null}{isDeletingProblemId === problem._id ? 'Deleting...' : 'Delete'}</button></div></div>)}
          </div>
        </section>
      ) : null}

      {activeTab === 'exams' ? (
        <section className={`${cardClass} mb-4`}>
          <h2 className="text-lg font-semibold mb-4">Exam Builder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input className={inputClass} value={examForm.title} onChange={(event) => setExamForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Exam title" />
            <select className={inputClass} value={examForm.courseId} onChange={(event) => setExamForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}</select>
            <textarea className={`${inputClass} resize-none md:col-span-2`} rows={3} value={examForm.instructions} onChange={(event) => setExamForm((prev) => ({ ...prev, instructions: event.target.value }))} placeholder="Instructions" />
            {examForm.timerType === 'global' ? (
              <div>
                <input className={inputClass} type="number" min="1" value={examForm.duration} onChange={(event) => setExamForm((prev) => ({ ...prev, duration: event.target.value }))} placeholder="Duration (minutes)" />
                <p className="text-xs text-gray-400 mt-1">Global duration in minutes — applies to the whole exam.</p>
              </div>
            ) : <div />}
            <select className={inputClass} value={examForm.timerType} onChange={(event) => setExamForm((prev) => ({ ...prev, timerType: event.target.value }))}><option value="global">Global</option><option value="per_problem">Per Problem</option></select>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 mb-4"><p className="text-sm text-gray-300 mb-4">Problems</p><div className="max-h-60 overflow-y-auto flex flex-col gap-4">
            {filteredProblems.map((problem) => {
              const checked = Boolean(selectedProblemMap[problem._id]);
              return <div key={problem._id} className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-md border border-gray-800 gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <input type="checkbox" checked={checked} onChange={() => toggleProblem(problem._id)} />
                  <span className="text-white">{problem.title || 'Untitled'}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>{problem.difficulty || 'Unknown'}</span>
                {checked ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-400 mb-1">Marks</label>
                      <input className="w-28 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white" type="number" min="1" value={selectedProblemMap[problem._id]?.marks || 10} onChange={(e) => setSelectedProblemMap((prev) => ({ ...prev, [problem._id]: { ...prev[problem._id], marks: e.target.value } }))} placeholder="Marks" />
                    </div>
                    {examForm.timerType === 'per_problem' ? (
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Time (min)</label>
                        <input className="w-28 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white" type="number" min="1" value={selectedProblemMap[problem._id]?.duration || 30} onChange={(e) => setSelectedProblemMap((prev) => ({ ...prev, [problem._id]: { ...prev[problem._id], duration: e.target.value } }))} placeholder="Minutes" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>;
            })}
            {!filteredProblems.length ? <p className="text-gray-400">No problems available.</p> : null}
          </div></div>
          <button type="button" onClick={handlePublishExam} disabled={publishingExam} className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500 disabled:opacity-50 inline-flex items-center gap-2">{publishingExam ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}{publishingExam ? 'Publishing...' : 'Publish Exam'}</button>
        </section>
      ) : null}

      {activeTab === 'results' ? (
        <section className={`${cardClass} mb-4`}>
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><select className={inputClass} value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}><option value="">Select course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}</select><select className={inputClass} value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}><option value="">Select exam</option>{courseExams.map((exam) => <option key={exam._id} value={exam._id}>{exam.title}</option>)}</select></div>
          <div className="flex items-center gap-4 mb-4"><button type="button" onClick={() => persistResultVisibility(!showMarksImmediately)} disabled={isFinalizingMarks || !selectedExamId} className={`${showMarksImmediately ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'} text-white px-4 py-2 rounded-md disabled:opacity-50`}>{showMarksImmediately ? 'Results Visible' : 'Results Hidden'}</button><button type="button" onClick={finalizeMarks} disabled={isFinalizingMarks || !selectedExamId} className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500 disabled:opacity-50 inline-flex items-center gap-2">{isFinalizingMarks ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}{isFinalizingMarks ? 'Saving...' : 'Finalize Marks'}</button></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4"><p className="mb-4">Students</p><div className="flex flex-col gap-4 max-h-96 overflow-y-auto">{submissionsLoading ? <p className="text-gray-400">Loading...</p> : null}{!submissionsLoading && studentRows.length === 0 ? <p className="text-gray-400">No submissions found.</p> : null}{studentRows.map((student) => <div key={student._id} className="bg-[#111] border border-gray-800 rounded-md p-3"><button type="button" onClick={() => setSelectedSubmissionId(student._id)} className={`w-full text-left pb-2 border-b border-gray-700 mb-2 ${selectedSubmissionId === student._id ? 'border-[#ffa116]' : ''}`}><p className="font-medium">{student.name}</p><p className="text-sm text-gray-400">{student.rollNumber} · Semester {student.semester}</p><p className="text-sm text-gray-300">Score {student.totalScore.toFixed(2)}</p></button><button type="button" onClick={() => { setSelectedProctorStudent({ id: student.studentId, name: student.name, examId: selectedExamId }); setIsProctorAlertsOpen(true); }} className="w-full bg-[#ffa116] text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-orange-500 transition-colors">View Proctor Alerts</button></div>)}</div></div>
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
              <p className="mb-4">Submission Details</p>
              {!selectedStudent ? <p className="text-gray-400">Select a student.</p> : null}
              {attemptLoading ? <p className="text-gray-400">Loading attempt...</p> : null}
              {selectedStudent ? (
                <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {reviewProblems.map((problem, index) => (
                      <button
                        key={`${selectedSubmission?._id}-problem-${index}`}
                        type="button"
                        onClick={() => setActiveProblemIndex(index)}
                        className={`rounded-full border px-3 py-1 text-xs ${activeProblemIndex === index ? 'border-[#ffa116] bg-[#ffa116] text-black' : 'border-gray-700 bg-[#0a0a0a] text-white'}`}
                      >
                        Problem {index + 1}
                      </button>
                    ))}
                  </div>

                  {reviewProblems.map((problem, index) => (
                    <button
                      key={`${selectedSubmission?._id}-summary-${index}`}
                      type="button"
                      onClick={() => setActiveProblemIndex(index)}
                      className={`bg-[#111] border border-gray-800 rounded-md p-3 text-left ${activeProblemIndex === index ? 'ring-1 ring-[#ffa116]' : ''}`}
                    >
                      <p className="font-medium mb-2">Problem {index + 1}: {problem.problemId?.title || 'Problem'}</p>
                      <p className="text-sm text-gray-300">Public {problem.passedPublic}/{problem.totalPublic} · Hidden {problem.passedHidden}/{problem.totalHidden}</p>
                    </button>
                  ))}

                  {selectedProblem ? (
                    <div className="bg-[#111] border border-gray-800 rounded-md p-3">
                      <p className="font-medium mb-4">{selectedProblem.problemId?.title || 'Problem'}</p>
                      <p className="text-sm text-gray-300 mb-4">Score: {selectedProblem.score ?? 0}</p>
                      <div className="flex items-center gap-4 mb-4">
                        <input className="w-24 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white" type="number" min="0" step="0.01" value={scoreDrafts[`${selectedSubmission._id}_${selectedProblem.problemId?._id || selectedProblem.problemId}`] ?? selectedProblem.score ?? 0} onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [`${selectedSubmission._id}_${selectedProblem.problemId?._id || selectedProblem.problemId}`]: e.target.value }))} />
                        <button type="button" onClick={() => handleOverrideScore(selectedSubmission._id, selectedProblem.problemId?._id || selectedProblem.problemId)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 inline-flex items-center gap-2"><Save size={14} />Save</button>
                        <button type="button" onClick={() => setIsCodeModalOpen(true)} className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500">Fullscreen</button>
                      </div>
                      <pre className="bg-black/40 border border-gray-800 rounded-md p-3 text-xs text-gray-300 overflow-auto whitespace-pre-wrap">{selectedProblem.code || 'No code submitted.'}</pre>
                      <div className="mt-4">
                        <p className="mb-2 text-sm text-gray-300">Teacher Run Input</p>
                        <textarea className="w-full p-2 bg-black border border-gray-800 rounded-md text-sm text-white mb-3" value={teacherInput} onChange={(event) => setTeacherInput(event.target.value)} placeholder="Enter input" rows={4} />
                        <button type="button" onClick={handleTeacherRunCode} disabled={isTeacherRunning} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 inline-flex items-center gap-2">{isTeacherRunning ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}{isTeacherRunning ? 'Running...' : 'Run Code'}</button>
                        <pre className="mt-3 bg-black/40 border border-gray-800 rounded-md p-3 text-xs text-gray-300 overflow-auto whitespace-pre-wrap">{teacherOutput || 'No output'}</pre>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-sm text-gray-300">Test Case Checks</p>
                        <div className="flex flex-col gap-3">
                          {(selectedProblem.testResults || []).length === 0 ? <p className="text-xs text-gray-400">No testcase details available.</p> : null}
                          {(selectedProblem.testResults || []).map((detail, index) => (
                            <div key={`${selectedSubmission._id}-detail-${index}`} className="rounded-md border border-gray-800 bg-black/30 p-3 text-xs text-gray-300">
                              <p>Input: {detail.input || '(empty)'}</p>
                              <p>Expected: {detail.expected || '(empty)'}</p>
                              <p>Output: {detail.output || detail.error || '(empty)'}</p>
                              <p>Status: {detail.passed ? 'Pass' : 'Fail'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-sm text-gray-300">Stored Test Cases</p>
                        <div className="flex flex-col gap-3">
                          {[
                            ...(selectedProblem.problemId?.publicTestCases || []),
                            ...((selectedProblem.problemId?.testCases || [])
                              .filter((testCase) => testCase.isPublic)
                              .map((testCase) => ({ input: testCase.input, output: testCase.expectedOutput })))
                          ].length === 0 ? <p className="text-xs text-gray-400">No public test cases available.</p> : null}
                          {[
                            ...(selectedProblem.problemId?.publicTestCases || []),
                            ...((selectedProblem.problemId?.testCases || [])
                              .filter((testCase) => testCase.isPublic)
                              .map((testCase) => ({ input: testCase.input, output: testCase.expectedOutput })))
                          ].map((testCase, index) => (
                            <div key={`${selectedSubmission._id}-stored-${index}`} className="rounded-md border border-gray-800 bg-black/30 p-3 text-xs text-gray-300">
                              <p>Input: {testCase.input || '(empty)'}</p>
                              <p>Expected: {testCase.output || '(empty)'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {studentAttempt?.answers?.length ? <div className="bg-[#111] border border-gray-800 rounded-md p-3"><p className="mb-4 font-medium">Attempt Summary</p><div className="flex flex-col gap-4">{studentAttempt.answers.map((answer, idx) => <p key={`${answer.problemId}-${idx}`} className="text-sm text-gray-300">Problem {idx + 1}: {answer.finalScore ?? answer.score ?? 0} / {answer.marks ?? 0}</p>)}</div></div> : null}
                </div>
              ) : null}
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4"><p className="mb-4">Proctor Alerts</p><div className="flex flex-col gap-4 max-h-96 overflow-y-auto">{proctorAlerts.length === 0 ? <p className="text-gray-400">No alerts yet.</p> : null}{proctorAlerts.map((event, idx) => <div key={`${event?.studentId || 'student'}-${idx}`} className="bg-[#111] border border-gray-800 rounded-md p-3"><p className="text-sm text-white">{event?.studentName || 'Student'}</p><p className="text-xs text-gray-400">{event?.type || 'violation'} · {event?.time || '-'}</p></div>)}</div></div>
          </div>
        </section>
      ) : null}

      {selectedSubmission && selectedProblem && isCodeModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-white font-medium">{selectedProblem.problemId?.title || 'Submission Code'}</p>
            <button type="button" onClick={() => setIsCodeModalOpen(false)} className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white">Close</button>
          </div>
          <Editor
            value={selectedProblem.code || ''}
            language={selectedProblem.language || 'javascript'}
            theme="vs-dark"
            options={{ readOnly: true, minimap: { enabled: false }, automaticLayout: true }}
            height="90vh"
          />
        </div>
      ) : null}

      <ProctorAlerts
        examId={selectedProctorStudent?.examId}
        studentId={selectedProctorStudent?.id}
        studentName={selectedProctorStudent?.name}
        isOpen={isProctorAlertsOpen}
        onClose={() => setIsProctorAlertsOpen(false)}
      />
    </AppLayout>
  );
}

export default TeacherDashboard;
