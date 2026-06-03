import { useCallback, useEffect, useRef, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { FileText, Maximize2, Minimize2, X } from 'lucide-react';
import { socket } from '../../services/socket';
import {
  AUTO_SAVE_INTERVAL,
  LEFT_MIN,
  LEFT_MAX,
  CENTER_MIN,
  RIGHT_MIN,
  RIGHT_MAX,
  getProblemId,
  clamp
} from './constants';
import EditorToolbar from './EditorToolbar';
import CodeEditorPanel from './CodeEditorPanel';
import OutputPanel from './OutputPanel';
import ProblemsPanel from './ProblemsPanel';
import TimerDisplay from './TimerDisplay';
import SplitPanelDivider from './SplitPanelDivider';

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
  const storageKey = currentProblemId && examId ? `exam_${examId}_problem_${currentProblemId}` : null;

  const [leftWidth, setLeftWidth] = useState(30);
  const [rightWidth, setRightWidth] = useState(20);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const latestCodeRef = useRef(code);
  const dragStateRef = useRef(null);
  const editorRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const setCodeRef = useRef(setCode);

  const isSequentialMode = navigationControl === false;
  const currentProblemSubmitted = Boolean(submissions?.[currentProblemId]);
  const centerWidth = 100 - leftWidth - rightWidth;
  const problemTimerExpired = isPerProblemTimer && Number(perProblemTimeLeft) < 0;
  const effectiveLocked = isLocked || problemTimerExpired;
  const examInstructions = typeof exam?.instructions === 'string' ? exam.instructions.trim() : '';

  // Update refs
  useEffect(() => {
    latestCodeRef.current = code || '';
  }, [code]);

  useEffect(() => {
    setCodeRef.current = setCode;
  }, [setCode]);

  useEffect(() => () => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
  }, []);

  // Security handlers
  const handleSecurityInvasion = useCallback(
    (event) => {
      event.preventDefault();
      if (!isExamStarted || isLocked) {
        return;
      }

      toast.error('Security Alert: Action blocked.');
      socket?.emit('proctor_event', { type: event.type, timestamp: new Date(), examId });
      socket?.emit('copy_paste', { type: event.type, timestamp: new Date(), examId });
    },
    [examId, isExamStarted, isLocked]
  );

  useEffect(() => {
    const handleBlur = () => {
      if (!isExamStarted || isLocked) return;
      socket?.emit('proctor_event', { type: 'blur', timestamp: new Date(), examId });
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [examId, isExamStarted, isLocked]);

  useEffect(() => {
    const fn = () => {
      if (document.hidden && isExamStarted && !isLocked) {
        socket?.emit('proctor_event', { type: 'tab_switch', examId });
      }
    };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, [examId, isExamStarted, isLocked]);

  // Code storage
  useEffect(() => {
    if (!storageKey || typeof setCode !== 'function') {
      return;
    }

    const savedCode = localStorage.getItem(storageKey);
    if (savedCode !== null && savedCode !== latestCodeRef.current) {
      setCodeRef.current?.(savedCode);
      latestCodeRef.current = savedCode;
    }
  }, [storageKey]);

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

  // Navigation
  const handleProblemNavigation = (targetIndex) => {
    if (targetIndex === currentProblemIndex || typeof setCurrentProblemIndex !== 'function') {
      return;
    }

    const movingForward = targetIndex > currentProblemIndex;

    // Allow free navigation in view-only mode (when exam is locked)
    if (isLocked) {
      setCurrentProblemIndex(targetIndex);
      return;
    }

    // Block navigation if per-problem timer is still running
    if (isPerProblemTimer && perProblemTimeLeft > 0) {
      toast.error('Complete the current problem before moving to the next.');
      return;
    }
    const locked = isSequentialMode && movingForward && !currentProblemSubmitted;
    if (locked) {
      toast.error('Submit current problem to unlock next one.');
      return;
    }

    setCurrentProblemIndex(targetIndex);
  };

  // Dragging
  const onMouseMove = useCallback(
    (event) => {
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
    },
    [leftWidth, rightWidth]
  );

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

  // Fullscreen
  useEffect(() => {
    const onFullScreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  useEffect(() => {
    if (!isExamStarted || document.fullscreenElement) {
      return;
    }

    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } catch (error) {
        console.warn('Unable to enter fullscreen automatically.', error);
      }
    };

    void requestFullscreen();
  }, [isExamStarted]);

  const toggleFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } else {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen().catch(() => {
            toast.error('Fullscreen not supported in this browser or context.');
          });
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        } else {
          toast.error('Fullscreen is not supported by your browser.');
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Unable to toggle fullscreen.');
    }
  };

  const startDragging = (type, event) => {
    event.preventDefault();
    dragStateRef.current = { type, startX: event.clientX, startLeft: leftWidth, startRight: rightWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const syncEditorCode = useCallback(() => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const nextCode = editorRef.current?.getValue?.() ?? latestCodeRef.current ?? code ?? '';
    latestCodeRef.current = nextCode;
    if (typeof setCodeRef.current === 'function' && nextCode !== code) {
      setCodeRef.current(nextCode);
    }
    return nextCode;
  }, [code]);

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
    <div className="flex h-screen flex-col bg-[#050505] text-gray-200 selection:bg-indigo-500/20">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-white/10 bg-[#090909]/95 backdrop-blur px-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">{exam?.title || 'Exam Workspace'}</h1>
          <p className="text-xs text-white/50">
            Problem {currentProblemIndex + 1} of {problems.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TimerDisplay
            remainingTime={remainingTime}
            perProblemTimeLeft={perProblemTimeLeft}
            isPerProblemTimer={isPerProblemTimer}
            problemTimerExpired={problemTimerExpired}
          />
          <button 
            type="button" 
            onClick={toggleFullscreen} 
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 hover:bg-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={submitExam}
            className="rounded-lg border border-gray-700/50 bg-gray-700/20 p-2 text-white/70 hover:bg-gray-700/40 transition-colors"
            title="Close exam"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {examInstructions ? (
        <section className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-6 py-3">
          <div className="flex gap-3">
            <FileText size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Exam Instructions</p>
              <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap break-words pr-2 text-sm leading-relaxed text-white/85">
                {examInstructions}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <ProblemsPanel
          problems={problems}
          currentProblemIndex={currentProblemIndex}
          isSequentialMode={isSequentialMode}
          currentProblemSubmitted={currentProblemSubmitted}
          currentProblem={currentProblem}
          onNavigate={handleProblemNavigation}
          isPerProblemTimer={isPerProblemTimer}
          perProblemTimeLeft={perProblemTimeLeft}
        />

        <SplitPanelDivider type="left" onMouseDown={startDragging} />

        <section
          className="flex min-w-90 flex-col border-r border-white/10 bg-[#060606]"
          style={{ width: `${centerWidth}%` }}
          onCopy={handleSecurityInvasion}
          onPaste={handleSecurityInvasion}
          onContextMenu={handleSecurityInvasion}
        >

          <EditorToolbar
            language={language}
            setLanguage={setLanguage}
            languageOptions={languageOptions}
            isRunning={isRunning}
            onRunCode={() => onRunCode?.(syncEditorCode())}
            isSubmitting={isSubmitting}
            onSubmit={() => submitCurrentProblem?.(syncEditorCode())}
            currentProblemSubmitted={currentProblemSubmitted}
            effectiveLocked={effectiveLocked}
            currentProblem={currentProblem}
          />

          <CodeEditorPanel
            currentProblemId={currentProblemId}
            language={language}
            code={code}
            editorRef={editorRef}
            latestCodeRef={latestCodeRef}
            syncTimeoutRef={syncTimeoutRef}
            setCode={setCode}
            isLocked={effectiveLocked}
          />
        </section>

        <SplitPanelDivider type="right" onMouseDown={startDragging} />

        <OutputPanel editorRef={editorRef} code={code} input={input} setInput={setInput} output={output} result={result} effectiveLocked={effectiveLocked} isSubmitting={isSubmitting} currentProblem={currentProblem} onRunCode={(nextInput) => onRunCode?.(syncEditorCode(), nextInput)} />
      </main>
    </div>
  );
}

export default SecureIDE;
