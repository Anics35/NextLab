import { Code2, LoaderCircle, Minus, Palette, Plus, Save, X } from 'lucide-react';
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
      {/* Editing indicator */}
      {editingId && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium text-amber-300">Editing mode</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
          >
            <X size={10} />
            Cancel
          </button>
        </div>
      )}

      {/* Title & Difficulty */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Title *</label>
          <input
            className={inputClass}
            value={problemForm.title}
            onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Problem title"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Difficulty</label>
          <select
            className={inputClass}
            value={problemForm.difficulty}
            onChange={(event) => setProblemForm((prev) => ({ ...prev, difficulty: event.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Problem Type Selection */}
      <div className="mb-4">
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Problem Type *</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProblemForm((prev) => ({ ...prev, problemType: 'testcase' }))}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              !isDesignProblem
                ? 'border-emerald-500/30 bg-emerald-500/10 shadow-sm'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              !isDesignProblem ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-white/30'
            }`}>
              <Code2 size={18} />
            </div>
            <div>
              <p className={`text-sm font-medium ${!isDesignProblem ? 'text-emerald-300' : 'text-white/50'}`}>Testcase</p>
              <p className="text-[10px] text-white/30">Auto-graded with test cases</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setProblemForm((prev) => ({ ...prev, problemType: 'design' }))}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              isDesignProblem
                ? 'border-indigo-500/30 bg-indigo-500/10 shadow-sm'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isDesignProblem ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/[0.04] text-white/30'
            }`}>
              <Palette size={18} />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDesignProblem ? 'text-indigo-300' : 'text-white/50'}`}>Design</p>
              <p className="text-[10px] text-white/30">Manually graded by teacher</p>
            </div>
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Description *</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          value={problemForm.description}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Describe the problem statement clearly..."
        />
      </div>

      {/* Test Cases — only for testcase type */}
      {!isDesignProblem && (
        <div className="space-y-4 mb-5">
          {/* Public Test Cases */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-semibold text-white/50">Public Test Cases</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50 hover:bg-white/[0.06]"
                  onClick={() => addTestCase('public')}
                >
                  <Plus size={10} /> Add
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50 hover:bg-white/[0.06] disabled:opacity-30"
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
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold text-white/50">Hidden Test Cases</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50 hover:bg-white/[0.06]"
                  onClick={() => addTestCase('hidden')}
                >
                  <Plus size={10} /> Add
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50 hover:bg-white/[0.06] disabled:opacity-30"
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

      {/* Design problem info */}
      {isDesignProblem && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
          <Palette size={16} className="text-indigo-400 shrink-0" />
          <p className="text-xs text-indigo-300">Design problems are manually graded. No test cases needed.</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110 disabled:opacity-50"
      >
        {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
        {editingId ? (isLoading ? 'Saving...' : 'Save Changes') : (isLoading ? 'Creating...' : 'Create Problem')}
      </button>
    </div>
  );
}

export default ProblemForm;
