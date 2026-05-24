import { TerminalSquare } from 'lucide-react';

function OutputPanel({ input, setInput, output, result, effectiveLocked, isSubmitting, currentProblem }) {
  const isDesignProblem = currentProblem?.problemType === 'design';

  return (
    <div className="overflow-y-auto bg-[#0a0a0a]" style={{ width: '20%', minWidth: '240px' }}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/50">
          <TerminalSquare size={13} /> {isDesignProblem ? 'Code Submission' : 'Output'}
        </div>
        {isDesignProblem ? (
          <div className="mb-3 rounded-lg border border-blue-700/50 bg-blue-900/20 p-3 text-sm text-blue-300">
            <p className="font-semibold mb-2">Design Problem</p>
            <p>This is a design/implementation problem. Your code submission will be accepted as-is without requiring test case validation.</p>
            {result?.isDesignProblem && (
              <p className="mt-2 text-green-300 font-semibold">✓ Code submitted successfully!</p>
            )}
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
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">
            <div>
              Total {result.passed || 0}/{result.total || 0} · Public {result.passedPublic || 0}/{result.totalPublic || 0} ·
              Hidden {result.passedHidden || 0}/{result.totalHidden || 0} · Score {result.score ?? 0}
            </div>
            {Array.isArray(result.details) && result.details.length > 0 ? (
              <div className="mt-2 space-y-1">
                {result.details.map((detail, index) => (
                  <div key={`${detail.input || ''}-${index}`} className={detail.passed ? 'text-emerald-300' : 'text-red-300'}>
                    Test {index + 1} {(detail.isPublic ?? detail.visibility === 'public') ? '(Public)' : '(Hidden)'}: {detail.passed ? 'Pass' : 'Fail'}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OutputPanel;
