import { AlertTriangle, Lock } from 'lucide-react';
import { getProblemId } from './constants';

function ProblemsPanel({ problems, currentProblemIndex, isSequentialMode, currentProblemSubmitted, currentProblem, onNavigate }) {
  return (
    <section className="overflow-y-auto border-r border-white/10 bg-[#0a0a0a]" style={{ width: '30%', minWidth: '280px' }}>
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
                onClick={() => onNavigate(index)}
                disabled={locked}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-white/15 bg-white/5 text-white/70'
                } disabled:opacity-50`}
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
        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
          {currentProblem?.description || 'No description available.'}
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/50">Public Test Cases</p>
          {(currentProblem?.publicTestCases || []).length === 0 ? (
            <p className="text-xs text-white/50">No public test cases.</p>
          ) : null}
          {(currentProblem?.publicTestCases || []).map((testCase, index) => (
            <div key={`pub-${index}`} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs">
              <div>Input: {testCase.input || '(empty)'}</div>
              <div>Expected: {testCase.output}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProblemsPanel;
