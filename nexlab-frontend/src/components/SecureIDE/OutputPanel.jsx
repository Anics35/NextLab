import { TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function OutputPanel({ input, setInput, output, result, effectiveLocked, isSubmitting, currentProblem }) {
  const isDesignProblem = currentProblem?.problemType === 'design';
  const [terminalInput, setTerminalInput] = useState('');
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!isDesignProblem) {
      return;
    }

    setTerminalInput(input || '');
  }, [input, isDesignProblem]);

  const submitTerminalInput = () => {
    if (effectiveLocked || isSubmitting) return;
    setInput?.(terminalInput);
  };

  return (
    <div className="overflow-y-auto bg-[#0a0a0a]" style={{ width: '20%', minWidth: '240px' }}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/50">
          <TerminalSquare size={13} /> {isDesignProblem ? 'Terminal' : 'Output'}
        </div>
        {isDesignProblem ? (
          <div className="flex flex-1 flex-col rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-300">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">Terminal session</div>
            <pre className={`${String(output).includes('Error') ? 'text-red-400' : 'text-gray-300'} flex-1 whitespace-pre-wrap overflow-auto`}>
              {output || '> Ready. Click Run to execute your program.'}
            </pre>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2 py-2">
              <span className="text-emerald-300">$</span>
              <input
                ref={terminalRef}
                value={terminalInput}
                onChange={(event) => setTerminalInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitTerminalInput();
                  }
                }}
                disabled={effectiveLocked || isSubmitting}
                placeholder="Type terminal input here"
                className="flex-1 border-0 bg-transparent text-xs text-white outline-none placeholder:text-white/35 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={submitTerminalInput}
                disabled={effectiveLocked || isSubmitting}
                className="rounded bg-white/10 px-2 py-1 text-[11px] text-white/80 hover:bg-white/15 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {result?.isDesignProblem ? <p className="mt-2 text-green-300 font-semibold">✓ Code submitted successfully!</p> : null}
          </div>
        ) : (
          <textarea
            placeholder="Enter custom input"
            value={input}
            onChange={(event) => setInput?.(event.target.value)}
            disabled={effectiveLocked || isSubmitting}
            className="mb-3 min-h-28 w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-gray-200 outline-none placeholder:text-white/35 disabled:opacity-50"
          />
        )}
        {!isDesignProblem && (
          <pre
            className={`flex-1 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs ${
              String(output).includes('Error') ? 'text-red-400' : 'text-gray-300'
            }`}
          >
            {output || '> Ready for execution'}
          </pre>
        )}
        {result && !isDesignProblem ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">
              <div className="font-semibold">Test Results</div>
              <div className="mt-1">
                Passed {result.passed || 0}/{result.total || 0} · Public {result.passedPublic || 0}/{result.totalPublic || 0} ·
                Hidden {result.passedHidden || 0}/{result.totalHidden || 0}
              </div>
            </div>
            {Array.isArray(result.details) && result.details.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.details.map((detail, index) => (
                  <div 
                    key={`${detail.input || ''}-${index}`} 
                    className={`rounded-lg border p-2 text-xs ${
                      detail.passed 
                        ? 'border-emerald-500/30 bg-emerald-500/10' 
                        : 'border-red-500/30 bg-red-500/10'
                    }`}
                  >
                    <div className={`font-semibold ${detail.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                      Test {index + 1} {(detail.isPublic ?? detail.visibility === 'public') ? '(Public)' : '(Hidden)'}: {detail.passed ? '✓ Pass' : '✗ Fail'}
                    </div>
                    {detail.input && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Input:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.input}</pre>
                      </div>
                    )}
                    {detail.expectedOutput && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Expected:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.expectedOutput}</pre>
                      </div>
                    )}
                    {!detail.passed && detail.actualOutput && (
                      <div className="mt-1 text-white/70">
                        <div className="text-white/50">Your Output:</div>
                        <pre className="text-white/60 whitespace-pre-wrap wrap-break-word">{detail.actualOutput}</pre>
                      </div>
                    )}
                    {!detail.passed && detail.error && (
                      <div className="mt-1 text-red-400">
                        <div className="text-red-300">Error:</div>
                        <pre className="text-red-400 whitespace-pre-wrap wrap-break-word">{detail.error}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OutputPanel;
