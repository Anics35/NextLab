import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { toast, Toaster } from 'react-hot-toast';
import { AlertTriangle, Clock, LoaderCircle, Lock, Maximize2, Minimize2, Play, Send, TerminalSquare } from 'lucide-react';
import { socket } from '../services/socket';

const AUTO_SAVE_INTERVAL = 10000;
const LEFT_MIN = 22;
const LEFT_MAX = 48;
const CENTER_MIN = 28;
const RIGHT_MIN = 18;
const RIGHT_MAX = 40;

const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const getProblemId = (problem) => problem?._id || problem?.id;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function SecureIDE({
  exam,
  examId,
  currentProblem,
  problems = [],
  currentProblemIndex = 0,
  submissions = {},
  remainingTime = 0,
  perProblemTimeLeft = null,
  isPerProblemTimer = false,
  submitExam,
  submitCurrentProblem,
  setCurrentProblemIndex,
  navigationControl = true,
  code = '',
  setCode,
  language = 'javascript',
  setLanguage,
  output = '',
  input = '',
  setInput,
  result = null,
  isRunning = false,
  isSubmitting = false,
  onRunCode,
  isExamStarted = false,
  isLocked = false,
  languageOptions = {}
}) {
  const currentProblemId = getProblemId(currentProblem);
  const storageKey = useMemo(() => (examId && currentProblemId ? `exam_${examId}_problem_${currentProblemId}` : null), [examId, currentProblemId]);

  const [leftWidth, setLeftWidth] = useState(30);
  const [rightWidth, setRightWidth] = useState(20);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const latestCodeRef = useRef(code);
  const dragStateRef = useRef(null);
  const editorRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const isSequentialMode = navigationControl === false;
  const currentProblemSubmitted = Boolean(submissions?.[currentProblemId]);
  const centerWidth = 100 - leftWidth - rightWidth;
  const problemTimerExpired = isPerProblemTimer && Number(perProblemTimeLeft) <= 0;
  const effectiveLocked = isLocked || problemTimerExpired;

  useEffect(() => {
    latestCodeRef.current = code || '';
  }, [code]);

  useEffect(() => () => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
  }, []);

  const handleSecurityInvasion = useCallback((event) => {
    event.preventDefault();
    if (!isExamStarted) {
      return;
    }

    toast.error('Security Alert: Action blocked.');
    socket?.emit('proctor_event', { type: event.type, timestamp: new Date(), examId });
    socket?.emit('copy_paste', { type: event.type, timestamp: new Date(), examId });
  }, [examId, isExamStarted]);

  useEffect(() => {
    const handleBlur = () => {
      if (!isExamStarted) return;
      socket?.emit('proctor_event', { type: 'blur', timestamp: new Date(), examId });
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [examId, isExamStarted]);

  useEffect(() => {
    const fn = () => {
      if (document.hidden && isExamStarted) {
        socket?.emit('proctor_event', { type: 'tab_switch', examId });
      }
    };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, [examId, isExamStarted]);

  useEffect(() => {
    if (!storageKey || typeof setCode !== 'function') {
      return;
    }

    const savedCode = localStorage.getItem(storageKey);
    if (savedCode !== null && savedCode !== latestCodeRef.current) {
      setCode(savedCode);
      latestCodeRef.current = savedCode;
    }
  }, [setCode, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextCode = latestCodeRef.current || '';
      localStorage.setItem(storageKey, nextCode);
      socket?.emit('auto_save_code', { examId, problemId: currentProblemId, code: nextCode });
    }, AUTO_SAVE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [currentProblemId, examId, storageKey]);

  const handleProblemNavigation = (targetIndex) => {
    if (targetIndex === currentProblemIndex || typeof setCurrentProblemIndex !== 'function') {
      return;
    }

    const movingForward = targetIndex > currentProblemIndex;
    const locked = isSequentialMode && movingForward && !currentProblemSubmitted;
    if (locked) {
      toast.error('Submit current problem to unlock next one.');
      return;
    }

    setCurrentProblemIndex(targetIndex);
  };

  const onMouseMove = useCallback((event) => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const viewportWidth = window.innerWidth || 1;
    const deltaPercent = ((event.clientX - dragState.startX) / viewportWidth) * 100;

    if (dragState.type === 'left') {
      const nextLeft = clamp(dragState.startLeft + deltaPercent, LEFT_MIN, LEFT_MAX);
      const maxLeft = 100 - rightWidth - CENTER_MIN;
      setLeftWidth(clamp(nextLeft, LEFT_MIN, maxLeft));
      return;
    }

    const nextRight = clamp(dragState.startRight - deltaPercent, RIGHT_MIN, RIGHT_MAX);
    const maxRight = 100 - leftWidth - CENTER_MIN;
    setRightWidth(clamp(nextRight, RIGHT_MIN, maxRight));
  }, [leftWidth, rightWidth]);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [onMouseMove, stopDragging]);

  useEffect(() => {
    const onFullScreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error('Unable to toggle fullscreen.');
    }
  };

  const startDragging = (type, event) => {
    event.preventDefault();
    dragStateRef.current = { type, startX: event.clientX, startLeft: leftWidth, startRight: rightWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const getEditorCode = () => editorRef.current?.getValue?.() ?? latestCodeRef.current ?? code ?? '';
  const syncEditorCode = useCallback(() => {
    const nextCode = getEditorCode();
    latestCodeRef.current = nextCode;
    if (typeof setCode === 'function' && nextCode !== code) {
      setCode(nextCode);
    }
    return nextCode;
  }, [code, setCode]);

  if (!problems.length || !currentProblem) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center max-w-lg">
          <p className="text-lg font-semibold">No problems are available in this exam.</p>
          <p className="mt-2 text-sm text-white/60">Contact your teacher to verify exam configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 selection:bg-indigo-500/20">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#090909]/95 backdrop-blur px-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">{exam?.title || 'Exam Workspace'}</h1>
          <p className="text-xs text-white/50">Problem {currentProblemIndex + 1} of {problems.length}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${remainingTime <= 60 ? 'border-red-500/30 text-red-400' : 'border-white/15 text-white/80'}`}>
            <Clock size={14} />
            Global {formatTime(remainingTime)}
          </div>
          {isPerProblemTimer ? (
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${problemTimerExpired ? 'border-red-500/30 text-red-400' : 'border-indigo-500/30 text-indigo-300'}`}>
              <Clock size={14} />
              Problem {formatTime(perProblemTimeLeft)}
            </div>
          ) : null}
          <button type="button" onClick={submitExam} disabled={isLocked} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50">Finish Exam</button>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 hover:bg-white/10">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)] overflow-hidden">
        <section className="overflow-y-auto border-r border-white/10 bg-[#0a0a0a]" style={{ width: `${leftWidth}%`, minWidth: '280px' }}>
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {problems.map((problem, index) => {
                const problemId = getProblemId(problem);
                const movingForward = index > currentProblemIndex;
                const locked = isSequentialMode && movingForward && !currentProblemSubmitted;
                const active = index === currentProblemIndex;

                return (
                  <button
                    key={problemId || index}
                    type="button"
                    onClick={() => handleProblemNavigation(index)}
                    disabled={locked}
                    className={`rounded-full border px-3 py-1 text-xs transition ${active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-white/15 bg-white/5 text-white/70'} disabled:opacity-50`}
                  >
                    {locked ? <Lock className="mr-1 inline" size={11} /> : null}
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {isSequentialMode && !currentProblemSubmitted ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
                <AlertTriangle size={13} className="mt-0.5" />
                Submit current problem to unlock next one.
              </div>
            ) : null}

            <h2 className="text-xl font-semibold text-white">{currentProblem?.title || 'Untitled problem'}</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">{currentProblem?.description || 'No description available.'}</div>
            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-white/50">Public Test Cases</p>
              {(currentProblem?.publicTestCases || []).length === 0 ? <p className="text-xs text-white/50">No public test cases.</p> : null}
              {(currentProblem?.publicTestCases || []).map((testCase, index) => (
                <div key={`pub-${index}`} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs">
                  <div>Input: {testCase.input || '(empty)'}</div>
                  <div>Expected: {testCase.output}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-2 cursor-col-resize bg-white/5 hover:bg-indigo-500/50" onMouseDown={(event) => startDragging('left', event)} />

        <section className="flex min-w-[360px] flex-col border-r border-white/10 bg-[#060606]" style={{ width: `${centerWidth}%` }} onCopy={handleSecurityInvasion} onPaste={handleSecurityInvasion} onContextMenu={handleSecurityInvasion}>
          <div className="flex h-12 items-center justify-between border-b border-white/10 bg-[#0b0b0b] px-4">
            <select value={language} onChange={(event) => setLanguage?.(event.target.value)} disabled={effectiveLocked} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white disabled:opacity-50">
              {Object.entries(languageOptions).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRunCode?.(syncEditorCode())}
                disabled={isRunning || effectiveLocked || isSubmitting}
                className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
              >
                {isRunning ? <LoaderCircle size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
                {isRunning ? 'Running...' : 'Run'}
              </button>
              <button
                type="button"
                onClick={() => submitCurrentProblem?.(syncEditorCode())}
                disabled={isSubmitting || effectiveLocked || currentProblemSubmitted || isRunning}
                className="inline-flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}
                {currentProblemSubmitted ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              key={`${currentProblemId || 'problem'}-${language}`}
              height="100%"
              theme="vs-dark"
              language={language}
              defaultValue={code}
              onMount={(editor) => {
                editorRef.current = editor;
                latestCodeRef.current = editor.getValue();
              }}
              onChange={(value) => {
                latestCodeRef.current = value || '';
                console.log('EDITOR CODE:', latestCodeRef.current);
                if (syncTimeoutRef.current) {
                  window.clearTimeout(syncTimeoutRef.current);
                }
                syncTimeoutRef.current = window.setTimeout(() => {
                  syncTimeoutRef.current = null;
                  if (typeof setCode === 'function') {
                    setCode(latestCodeRef.current);
                  }
                }, 300);
              }}
              options={{
                readOnly: effectiveLocked,
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                automaticLayout: true,
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on'
              }}
            />
          </div>
        </section>

        <div className="w-2 cursor-col-resize bg-white/5 hover:bg-indigo-500/50" onMouseDown={(event) => startDragging('right', event)} />

        <section className="overflow-y-auto bg-[#0a0a0a]" style={{ width: `${rightWidth}%`, minWidth: '240px' }}>
          <div className="flex h-full flex-col p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/50"><TerminalSquare size={13} /> Output</div>
            <textarea
              placeholder="Enter custom input"
              value={input}
              onChange={(event) => setInput?.(event.target.value)}
              disabled={effectiveLocked || isSubmitting}
              className="mb-3 min-h-28 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-200 outline-none placeholder:text-white/35 disabled:opacity-50"
            />
            <pre className={`flex-1 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs ${String(output).includes('Error') ? 'text-red-400' : 'text-gray-300'}`}>
              {output || '> Ready for execution'}
            </pre>
            {result ? <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">Public {result.passedPublic || 0}/{result.totalPublic || 0} · Hidden {result.passedHidden || 0}/{result.totalHidden || 0} · Score {result.score ?? 0}</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

export default SecureIDE;

