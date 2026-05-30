import { LoaderCircle, Minus, Plus, Save, X } from 'lucide-react';
import { inputClass } from '../constants';

function ProblemForm({ problemForm, setProblemForm, onSubmit, isLoading, editingId, onCancel }) {
  const addTestCase = (type) => {
    const field = type === 'public' ? 'publicTestCases' : 'hiddenTestCases';
    setProblemForm((prev) => ({
      ...prev,
      [field]: [...prev[field], { input: '', output: '' }]
    }));
  };

  const removeTestCase = (type, idx) => {
    const field = type === 'public' ? 'publicTestCases' : 'hiddenTestCases';
    setProblemForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== idx)
    }));
  };

  const updateTestCase = (type, idx, field, value) => {
    const tcField = type === 'public' ? 'publicTestCases' : 'hiddenTestCases';
    setProblemForm((prev) => ({
      ...prev,
      [tcField]: prev[tcField].map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    }));
  };

  const isDesignProblem = problemForm.problemType === 'design';

  return (
    <div>
      {editingId && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Editing mode — save changes or cancel to return.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
        <input
          className={inputClass}
          value={problemForm.title}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Problem title"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className={inputClass}
            value={problemForm.difficulty}
            onChange={(event) => setProblemForm((prev) => ({ ...prev, difficulty: event.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            className={inputClass}
            value={problemForm.problemType}
            onChange={(event) => setProblemForm((prev) => ({ ...prev, problemType: event.target.value }))}
          >
            <option value="testcase">Testcase</option>
            <option value="design">Design</option>
          </select>
        </div>
        <textarea
          className={`${inputClass} resize-none md:col-span-2`}
          rows={3}
          value={problemForm.description}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Problem description (supports markdown-style formatting)"
        />
      </div>

      {/* Test Cases */}
      {!isDesignProblem && (
        <div className="space-y-4 mb-4">
          {/* Public Test Cases */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Public Test Cases</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.06]"
                  onClick={() => addTestCase('public')}
                >
                  <Plus size={10} /> Add
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.06] disabled:opacity-30"
                  disabled={problemForm.publicTestCases.length <= 1}
                  onClick={() => removeTestCase('public', problemForm.publicTestCases.length - 1)}
                >
                  <Minus size={10} /> Remove
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {problemForm.publicTestCases.map((tc, idx) => (
                <div key={`pub-${idx}`} className="grid grid-cols-2 gap-2">
                  <input
                    className={inputClass}
                    value={tc.input}
                    onChange={(e) => updateTestCase('public', idx, 'input', e.target.value)}
                    placeholder={`Input ${idx + 1}`}
                  />
                  <input
                    className={inputClass}
                    value={tc.output}
                    onChange={(e) => updateTestCase('public', idx, 'output', e.target.value)}
                    placeholder={`Expected output ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Test Cases */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Hidden Test Cases</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.06]"
                  onClick={() => addTestCase('hidden')}
                >
                  <Plus size={10} /> Add
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 hover:bg-white/[0.06] disabled:opacity-30"
                  disabled={problemForm.hiddenTestCases.length <= 1}
                  onClick={() => removeTestCase('hidden', problemForm.hiddenTestCases.length - 1)}
                >
                  <Minus size={10} /> Remove
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {problemForm.hiddenTestCases.map((tc, idx) => (
                <div key={`hidden-${idx}`} className="grid grid-cols-2 gap-2">
                  <input
                    className={inputClass}
                    value={tc.input}
                    onChange={(e) => updateTestCase('hidden', idx, 'input', e.target.value)}
                    placeholder={`Input ${idx + 1}`}
                  />
                  <input
                    className={inputClass}
                    value={tc.output}
                    onChange={(e) => updateTestCase('hidden', idx, 'output', e.target.value)}
                    placeholder={`Expected output ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDesignProblem && (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-indigo-300">
          Design problems don't require test cases. Students will be evaluated manually.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
        >
          {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          {editingId ? (isLoading ? 'Saving...' : 'Save Changes') : (isLoading ? 'Creating...' : 'Create Problem')}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.06]"
          >
            <X size={14} />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default ProblemForm;
