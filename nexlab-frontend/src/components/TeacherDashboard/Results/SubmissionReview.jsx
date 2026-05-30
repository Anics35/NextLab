import { Editor } from '@monaco-editor/react';
import { CheckCircle2, Code2, FileText, LoaderCircle, Maximize2, Minimize2, Play, Save, X, XCircle } from 'lucide-react';
import { runCode } from '../../../services/codeService';
import { toast } from 'react-hot-toast';
import { useEffect, useRef, useState } from 'react';
import DesignTerminal from '../../SecureIDE/DesignTerminal';

function SubmissionReview({
  selectedStudent,
  selectedSubmission,
  studentAttempt,
  attemptLoading,
  selectedProblem,
  activeProblemIndex,
  setActiveProblemIndex,
  scoreDrafts,
  setScoreDrafts,
  onOverrideScore,
  isCodeModalOpen,
  setIsCodeModalOpen,
  isTeacherRunning,
  setIsTeacherRunning,
  teacherInput,
  setTeacherInput,
  teacherOutput,
  setTeacherOutput
}) {
  const reviewProblems = selectedSubmission?.problems || [];
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  const [teacherRunResult, setTeacherRunResult] = useState(null);
  const modalRef = useRef(null);

  const selectedProblemId = selectedProblem?.problemId?._id || selectedProblem?.problemId || '';

  useEffect(() => {
    setTeacherOutput('');
    setTeacherRunResult(null);
  }, [selectedProblemId, setTeacherOutput]);

  const handleTeacherRunCode = async () => {
    if (!selectedProblem?.code) {
      toast.error('No submitted code available.');
      return;
    }

    setIsTeacherRunning(true);
    try {
      const response = await runCode(selectedProblem.language, selectedProblem.code, teacherInput, { problemId: selectedProblemId });
      setTeacherRunResult(response.publicRun || null);
      setTeacherOutput(response.output || response.error || 'No output');
    } catch (error) {
      setTeacherOutput(error.message || 'No output');
      setTeacherRunResult(null);
      toast.error(error.message || 'Unable to run submission.');
    } finally {
      setIsTeacherRunning(false);
    }
  };

  const openFullscreenRunner = async () => {
    setIsCodeModalOpen(true);
    setIsModalFullscreen(true);
    if (document.documentElement?.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const closeFullscreenRunner = async () => {
    setIsCodeModalOpen(false);
    setIsModalFullscreen(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const toggleModalFullscreen = async () => {
    const nextFullscreen = !isModalFullscreen;
    setIsModalFullscreen(nextFullscreen);
    if (nextFullscreen && modalRef.current?.requestFullscreen && !document.fullscreenElement) {
      await modalRef.current.requestFullscreen().catch(() => {});
    } else if (!nextFullscreen && document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const publicRunLabel = teacherRunResult
    ? `${teacherRunResult.passedPublic || 0}/${teacherRunResult.totalPublic || 0} passed`
    : '—';
  const normalizedProblemType = String(selectedProblem?.problemId?.problemType || selectedProblem?.problemType || '').trim().toLowerCase();
  const hasNoTestcaseResults = Number(selectedProblem?.totalPublic || 0) === 0 && Number(selectedProblem?.totalHidden || 0) === 0;
  const isDesignProblem = normalizedProblemType === 'design' || normalizedProblemType === 'designproblem' || hasNoTestcaseResults;

  const handleTeacherTerminalRunCode = async (runtimeInput) => {
    if (!selectedProblem?.code) {
      toast.error('No submitted code available.');
      return { success: false, output: '', error: 'No submitted code available.' };
    }

    setIsTeacherRunning(true);
    try {
      const response = await runCode(selectedProblem.language, selectedProblem.code, runtimeInput, { problemId: selectedProblemId });
      setTeacherRunResult(response.publicRun || null);
      setTeacherOutput(response.output || response.error || 'No output');
      setTeacherInput(runtimeInput);
      return response;
    } catch (error) {
      const message = error.message || 'Unable to run submission.';
      setTeacherOutput(message);
      setTeacherRunResult(null);
      toast.error(message);
      return { success: false, output: '', error: message };
    } finally {
      setIsTeacherRunning(false);
    }
  };

  const storedTestCases = [
    ...(selectedProblem?.problemId?.publicTestCases || []),
    ...(selectedProblem?.problemId?.testCases || [])
      .filter((tc) => tc.isPublic)
      .map((tc) => ({ input: tc.input, output: tc.expectedOutput }))
  ];

  return (
    <>
      <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <FileText size={14} className="text-indigo-400" />
          <p className="text-sm font-semibold text-white/70">Review</p>
        </div>

        {/* Empty state */}
        {!selectedStudent && (
          <p className="py-12 text-center text-xs text-white/30">Select a student to review their submission.</p>
        )}
        {attemptLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        )}

        {selectedStudent && !attemptLoading ? (
          <div className="flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-1">
            {/* Problem Tabs */}
            {reviewProblems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {reviewProblems.map((_p, index) => (
                  <button
                    key={`${selectedSubmission?._id}-tab-${index}`}
                    type="button"
                    onClick={() => setActiveProblemIndex(index)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      activeProblemIndex === index
                        ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                        : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                    }`}
                  >
                    P{index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Problem Summary Cards */}
            <div className="grid gap-2 sm:grid-cols-2">
              {reviewProblems.map((problem, index) => (
                <button
                  key={`${selectedSubmission?._id}-summary-${index}`}
                  type="button"
                  onClick={() => setActiveProblemIndex(index)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    activeProblemIndex === index
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                  }`}
                >
                  <p className="text-xs font-medium text-white truncate">
                    {problem.problemId?.title || `Problem ${index + 1}`}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 size={10} /> {problem.passedPublic}/{problem.totalPublic}
                    </span>
                    <span className="text-[10px] text-white/20">·</span>
                    <span className="text-[10px] text-white/35">
                      Hidden {problem.passedHidden}/{problem.totalHidden}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Problem Detail */}
            {selectedProblem && (
              <div className="space-y-4">
                {/* Score & Actions */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {selectedProblem.problemId?.title || 'Problem'}
                    </h4>
                    <span className="shrink-0 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                      {selectedProblem.language || 'unknown'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">Score</p>
                      <input
                        className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/40"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          scoreDrafts[`${selectedSubmission._id}_${selectedProblem.problemId?._id || selectedProblem.problemId}`] ??
                          selectedProblem.score ??
                          0
                        }
                        onChange={(e) =>
                          setScoreDrafts((prev) => ({
                            ...prev,
                            [`${selectedSubmission._id}_${selectedProblem.problemId?._id || selectedProblem.problemId}`]: e.target.value
                          }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onOverrideScore(selectedSubmission._id, selectedProblem.problemId?._id || selectedProblem.problemId)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      <Save size={12} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={openFullscreenRunner}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
                    >
                      <Maximize2 size={12} />
                      Expand
                    </button>
                  </div>
                </div>

                {/* Code Editor */}
                <div className="h-52 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                  <Editor
                    height="100%"
                    language={selectedProblem.language || 'javascript'}
                    value={selectedProblem.code || '// No code submitted'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: "'Fira Code', 'Courier New', monospace",
                      scrollBeyondLastLine: false
                    }}
                    theme="vs-dark"
                  />
                </div>

                {/* Teacher Run */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Run Code</p>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      {publicRunLabel}
                    </span>
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-white/[0.06] bg-black/40 p-3 text-xs text-white placeholder-white/20 outline-none focus:border-amber-500/30 resize-none"
                    value={teacherInput}
                    onChange={(event) => setTeacherInput(event.target.value)}
                    placeholder="Enter custom input..."
                    rows={3}
                  />
                  <button
                    type="button"
                    onClick={handleTeacherRunCode}
                    disabled={isTeacherRunning}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isTeacherRunning ? <LoaderCircle size={12} className="animate-spin" /> : <Play size={12} />}
                    {isTeacherRunning ? 'Running...' : 'Run'}
                  </button>
                  {teacherOutput && (
                    <pre className="mt-3 max-h-28 overflow-auto rounded-lg border border-white/[0.04] bg-black/30 p-3 text-[11px] text-white/60 whitespace-pre-wrap font-mono">
                      {teacherOutput}
                    </pre>
                  )}
                  {teacherRunResult?.details?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {teacherRunResult.details.map((detail, index) => (
                        <span
                          key={`${selectedSubmission._id}-run-${index}`}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${
                            detail.passed
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-red-500/20 bg-red-500/10 text-red-300'
                          }`}
                        >
                          {detail.passed ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                          TC {index + 1}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Test Results */}
                {(selectedProblem.testResults || []).length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Test Results</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedProblem.testResults.map((detail, index) => (
                        <div
                          key={`${selectedSubmission._id}-detail-${index}`}
                          className={`rounded-lg border p-3 text-[11px] ${
                            detail.passed
                              ? 'border-emerald-500/15 bg-emerald-500/5'
                              : 'border-red-500/15 bg-red-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-white/60">Test {index + 1}</span>
                            <span className={`inline-flex items-center gap-1 ${detail.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                              {detail.passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              {detail.passed ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-white/40">
                            <div>
                              <p className="text-[9px] text-white/25 mb-0.5">Input</p>
                              <p className="font-mono truncate">{detail.input || '(empty)'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-white/25 mb-0.5">Expected</p>
                              <p className="font-mono truncate">{detail.expected || '(empty)'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-white/25 mb-0.5">Output</p>
                              <p className="font-mono truncate">{detail.output || detail.error || '(empty)'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stored Test Cases */}
                {storedTestCases.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Stored Test Cases</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {storedTestCases.map((testCase, index) => (
                        <div
                          key={`${selectedSubmission._id}-stored-${index}`}
                          className="rounded-lg border border-white/[0.04] bg-black/20 p-2.5 text-[11px]"
                        >
                          <div className="grid grid-cols-2 gap-3 text-white/40">
                            <div>
                              <p className="text-[9px] text-white/25 mb-0.5">Input</p>
                              <p className="font-mono">{testCase.input || '(empty)'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-white/25 mb-0.5">Expected</p>
                              <p className="font-mono">{testCase.output || '(empty)'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attempt Summary */}
                {studentAttempt?.answers?.length ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Attempt Summary</p>
                    <div className="space-y-1.5">
                      {studentAttempt.answers.map((answer, idx) => (
                        <div key={`${answer.problemId}-${idx}`} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                          <span className="text-xs text-white/50">Problem {idx + 1}</span>
                          <span className="text-xs font-semibold text-white">
                            {answer.finalScore ?? answer.score ?? 0} <span className="text-white/30">/ {answer.marks ?? 0}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Code Fullscreen Modal */}
      {isCodeModalOpen && selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div ref={modalRef} className={`flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl ${
            isModalFullscreen ? 'h-screen w-screen' : 'h-[90vh] w-full max-w-6xl'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedProblem.problemId?.title || 'Code Submission'}</h3>
                <p className="mt-0.5 text-[11px] text-white/35">{selectedProblem.language} · Read-only</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleModalFullscreen}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                  title={isModalFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isModalFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  type="button"
                  onClick={closeFullscreenRunner}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-0 overflow-hidden">
              {/* Code Panel */}
              <div className="min-h-0 overflow-hidden border-r border-white/[0.06]">
                <Editor
                  height="100%"
                  language={selectedProblem.language || 'javascript'}
                  value={selectedProblem.code || '// No code submitted'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    scrollBeyondLastLine: false,
                    padding: { top: 16 }
                  }}
                  theme="vs-dark"
                />
              </div>

              {/* Run Panel */}
              {isDesignProblem ? (
                <DesignTerminal
                  code={selectedProblem.code || ''}
                  onRunCode={handleTeacherTerminalRunCode}
                  onInputChange={setTeacherInput}
                  disabled={isTeacherRunning}
                  className="h-full"
                />
              ) : (
                <div className="flex min-h-0 flex-col p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Teacher Run</p>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      {publicRunLabel}
                    </span>
                  </div>
                  <textarea
                    className="min-h-24 w-full resize-y rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs text-white placeholder-white/20 outline-none focus:border-amber-500/30"
                    value={teacherInput}
                    onChange={(event) => setTeacherInput(event.target.value)}
                    placeholder="Enter input..."
                  />
                  <button
                    type="button"
                    onClick={handleTeacherRunCode}
                    disabled={isTeacherRunning}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isTeacherRunning ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}
                    {isTeacherRunning ? 'Running...' : 'Run Code'}
                  </button>
                  <pre className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.04] bg-black/30 p-3 text-[11px] text-white/50 whitespace-pre-wrap font-mono">
                    {teacherOutput || 'Output will appear here...'}
                  </pre>
                  {teacherRunResult?.details?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {teacherRunResult.details.map((detail, index) => (
                        <span
                          key={`${selectedSubmission._id}-modal-run-${index}`}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${
                            detail.passed
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-red-500/20 bg-red-500/10 text-red-300'
                          }`}
                        >
                          {detail.passed ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                          TC {index + 1}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SubmissionReview;
