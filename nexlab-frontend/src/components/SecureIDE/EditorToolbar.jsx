import { Lock, LoaderCircle, Play, Send } from 'lucide-react';

function EditorToolbar({ language, setLanguage, languageOptions, isRunning, onRunCode, isSubmitting, onSubmit, currentProblemSubmitted, effectiveLocked, currentProblem }) {
  const normalizedProblemType = String(currentProblem?.problemType || '').trim().toLowerCase();
  const isDesignProblem = normalizedProblemType === 'design' || normalizedProblemType === 'designproblem';

  return (
    <div className="flex h-12 items-center justify-between border-b border-white/10 bg-[#0b0b0b] px-4">
      <select
        value={language}
        onChange={(event) => setLanguage?.(event.target.value)}
        disabled={effectiveLocked}
        className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {Object.entries(languageOptions).map(([value, config]) => (
          <option key={value} value={value}>
            {config.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        {!isDesignProblem && (
          <button
            type="button"
            onClick={() => onRunCode?.()}
            disabled={isRunning || effectiveLocked || isSubmitting}
            className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
          >
            {isRunning ? <LoaderCircle size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSubmit?.()}
          disabled={isSubmitting || effectiveLocked || currentProblemSubmitted || isRunning}
          className="inline-flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}
          {currentProblemSubmitted ? 'Submitted' : isSubmitting ? 'Submitting...' : isDesignProblem ? 'Submit Code' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default EditorToolbar;
