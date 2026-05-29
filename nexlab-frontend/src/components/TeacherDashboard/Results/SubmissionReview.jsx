import { Editor } from '@monaco-editor/react';
import { LoaderCircle, Play, Save, Maximize2, Minimize2, X } from 'lucide-react';
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
    ? `Public ${teacherRunResult.passedPublic || 0}/${teacherRunResult.totalPublic || 0}`
    : 'Public -/-';
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

  return (
    <>
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
      <p className="mb-4">Submission Details</p>
      {!selectedStudent && <p className="text-gray-400">Select a student.</p>}
      {attemptLoading && <p className="text-gray-400">Loading attempt...</p>}

      {selectedStudent ? (
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {/* Problem Selector */}
          <div className="flex flex-wrap gap-2">
            {reviewProblems.map((problem, index) => (
              <button
                key={`${selectedSubmission?._id}-problem-${index}`}
                type="button"
                onClick={() => setActiveProblemIndex(index)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  activeProblemIndex === index
                    ? 'border-[#ffa116] bg-[#ffa116] text-black'
                    : 'border-gray-700 bg-[#0a0a0a] text-white'
                }`}
              >
                Problem {index + 1}
              </button>
            ))}
          </div>

          {/* Problem Summary */}
          {reviewProblems.map((problem, index) => (
            <button
              key={`${selectedSubmission?._id}-summary-${index}`}
              type="button"
              onClick={() => setActiveProblemIndex(index)}
              className={`bg-[#111] border border-gray-800 rounded-md p-3 text-left ${
                activeProblemIndex === index ? 'ring-1 ring-[#ffa116]' : ''
              }`}
            >
              <p className="font-medium mb-2">
                Problem {index + 1}: {problem.problemId?.title || 'Problem'}
              </p>
              <p className="text-sm text-gray-300">
                Public {problem.passedPublic}/{problem.totalPublic} · Hidden {problem.passedHidden}/{problem.totalHidden}
              </p>
            </button>
          ))}

          {/* Selected Problem Details */}
          {selectedProblem ? (
            <div className="bg-[#111] border border-gray-800 rounded-md p-3">
              <p className="font-medium mb-4">{selectedProblem.problemId?.title || 'Problem'}</p>
              <p className="text-sm text-gray-300 mb-4">Score: {selectedProblem.score ?? 0}</p>

              <div className="flex items-center gap-4 mb-4">
                <input
                  className="w-24 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white"
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
                      [`${selectedSubmission._id}_${selectedProblem.problemId?._id || selectedProblem.problemId}`]:
                        e.target.value
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    onOverrideScore(selectedSubmission._id, selectedProblem.problemId?._id || selectedProblem.problemId)
                  }
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 inline-flex items-center gap-2"
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={openFullscreenRunner}
                  className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500"
                >
                  Fullscreen
                </button>
              </div>

              <div className="h-56 overflow-hidden rounded-md border border-gray-800 bg-black">
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
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-300">Teacher Run Input</p>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    {publicRunLabel}
                  </span>
                </div>
                <textarea
                  className="w-full p-2 bg-black border border-gray-800 rounded-md text-sm text-white mb-3"
                  value={teacherInput}
                  onChange={(event) => setTeacherInput(event.target.value)}
                  placeholder="Enter input"
                  rows={4}
                />
                <button
                  type="button"
                  onClick={handleTeacherRunCode}
                  disabled={isTeacherRunning}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 inline-flex items-center gap-2"
                >
                  {isTeacherRunning ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}
                  {isTeacherRunning ? 'Running...' : 'Run Code'}
                </button>
                <pre className="mt-3 bg-black/40 border border-gray-800 rounded-md p-3 text-xs text-gray-300 overflow-auto whitespace-pre-wrap max-h-32">
                  {teacherOutput || 'No output'}
                </pre>
                {teacherRunResult?.details?.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {teacherRunResult.details.map((detail, index) => (
                      <div
                        key={`${selectedSubmission._id}-teacher-run-${index}`}
                        className={`rounded-md border p-2 text-xs ${
                          detail.passed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'
                        }`}
                      >
                        Public {index + 1}: {detail.passed ? 'Pass' : 'Fail'}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Test Results */}
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-300">Test Case Checks</p>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                  {(selectedProblem.testResults || []).length === 0 ? (
                    <p className="text-xs text-gray-400">No testcase details available.</p>
                  ) : null}
                  {(selectedProblem.testResults || []).map((detail, index) => (
                    <div
                      key={`${selectedSubmission._id}-detail-${index}`}
                      className="rounded-md border border-gray-800 bg-black/30 p-3 text-xs text-gray-300"
                    >
                      <p>Input: {detail.input || '(empty)'}</p>
                      <p>Expected: {detail.expected || '(empty)'}</p>
                      <p>Output: {detail.output || detail.error || '(empty)'}</p>
                      <p>Status: {detail.passed ? 'Pass' : 'Fail'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stored Test Cases */}
              <div className="mt-4">
                <p className="mb-2 text-sm text-gray-300">Stored Test Cases</p>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                  {[
                    ...(selectedProblem.problemId?.publicTestCases || []),
                    ...(selectedProblem.problemId?.testCases || [])
                      .filter((testCase) => testCase.isPublic)
                      .map((testCase) => ({ input: testCase.input, output: testCase.expectedOutput }))
                  ].length === 0 ? (
                    <p className="text-xs text-gray-400">No public test cases available.</p>
                  ) : null}
                  {[
                    ...(selectedProblem.problemId?.publicTestCases || []),
                    ...(selectedProblem.problemId?.testCases || [])
                      .filter((testCase) => testCase.isPublic)
                      .map((testCase) => ({ input: testCase.input, output: testCase.expectedOutput }))
                  ].map((testCase, index) => (
                    <div
                      key={`${selectedSubmission._id}-stored-${index}`}
                      className="rounded-md border border-gray-800 bg-black/30 p-3 text-xs text-gray-300"
                    >
                      <p>Input: {testCase.input || '(empty)'}</p>
                      <p>Expected: {testCase.output || '(empty)'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attempt Summary */}
              {studentAttempt?.answers?.length ? (
                <div className="bg-[#111] border border-gray-800 rounded-md p-3 mt-4">
                  <p className="mb-4 font-medium">Attempt Summary</p>
                  <div className="flex flex-col gap-4">
                    {studentAttempt.answers.map((answer, idx) => (
                      <p key={`${answer.problemId}-${idx}`} className="text-sm text-gray-300">
                        Problem {idx + 1}: {answer.finalScore ?? answer.score ?? 0} / {answer.marks ?? 0}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>

      {/* Code Fullscreen Modal */}
      {isCodeModalOpen && selectedProblem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div ref={modalRef} className={`bg-[#0a0a0a] border border-gray-800 rounded-xl flex flex-col ${
            isModalFullscreen ? 'w-screen h-screen' : 'w-full h-[90vh] max-w-6xl'
          }`}>
            {/* Modal Header */}
            <div className="border-b border-gray-800 p-4 flex items-center justify-between bg-[#111]">
              <div>
                <h3 className="font-semibold text-white">{selectedProblem.problemId?.title || 'Code Submission'}</h3>
                <p className="text-xs text-gray-400">{selectedProblem.language}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleModalFullscreen}
                  className="p-2 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                  title={isModalFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isModalFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={closeFullscreenRunner}
                  className="p-2 rounded-lg border border-gray-700/50 bg-gray-700/20 text-white/70 hover:bg-gray-700/40 transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 overflow-hidden p-4">
              <div className="min-h-0 overflow-hidden rounded-md border border-gray-800 bg-black">
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
                  }}
                  theme="vs-dark"
                />
              </div>
              {isDesignProblem ? (
                <DesignTerminal
                  code={selectedProblem.code || ''}
                  onRunCode={handleTeacherTerminalRunCode}
                  onInputChange={setTeacherInput}
                  disabled={isTeacherRunning}
                  className="h-full"
                />
              ) : (
                <div className="flex min-h-0 flex-col rounded-md border border-gray-800 bg-black/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">Teacher Run</p>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                      {publicRunLabel}
                    </span>
                  </div>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-gray-800 bg-black p-2 text-sm text-white outline-none"
                    value={teacherInput}
                    onChange={(event) => setTeacherInput(event.target.value)}
                    placeholder="Enter input"
                  />
                  <button
                    type="button"
                    onClick={handleTeacherRunCode}
                    disabled={isTeacherRunning}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    {isTeacherRunning ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}
                    {isTeacherRunning ? 'Running...' : 'Run Code'}
                  </button>
                  <pre className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-gray-800 bg-black p-3 text-xs text-gray-300 whitespace-pre-wrap">
                    {teacherOutput || 'No output'}
                  </pre>
                  {teacherRunResult?.details?.length ? (
                    <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                      {teacherRunResult.details.map((detail, index) => (
                        <div
                          key={`${selectedSubmission._id}-modal-run-${index}`}
                          className={`rounded-md border p-2 text-xs ${
                            detail.passed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'
                          }`}
                        >
                          Public {index + 1}: {detail.passed ? 'Pass' : 'Fail'}
                        </div>
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
