import { LoaderCircle } from 'lucide-react';
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

  return (
    <div className="mb-4">
      {editingId && (
        <div className="mb-3 rounded-md border border-[#ffa116]/30 bg-[#ffa116]/10 px-3 py-2 text-sm text-[#ffcb6b]">
          Editing problem. Save changes or cancel to return to new problem mode.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          className={inputClass}
          value={problemForm.title}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Problem title"
        />
        <select
          className={inputClass}
          value={problemForm.difficulty}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, difficulty: event.target.value }))}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
        <textarea
          className={`${inputClass} resize-none md:col-span-2`}
          rows={3}
          value={problemForm.description}
          onChange={(event) => setProblemForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Problem description"
        />

        {/* Public Test Cases */}
        <div className="md:col-span-2 border border-gray-700 rounded-md p-3">
          <p className="text-sm text-gray-300 mb-2">Public Test Cases</p>
          <div className="flex flex-col gap-2">
            {problemForm.publicTestCases.map((tc, idx) => (
              <div key={`pub-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  value={tc.input}
                  onChange={(e) => updateTestCase('public', idx, 'input', e.target.value)}
                  placeholder="Input"
                />
                <input
                  className={inputClass}
                  value={tc.output}
                  onChange={(e) => updateTestCase('public', idx, 'output', e.target.value)}
                  placeholder="Output"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="bg-[#ffa116] text-black px-3 py-1 rounded-md"
              onClick={() => addTestCase('public')}
            >
              Add Public
            </button>
            <button
              type="button"
              className="bg-gray-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
              disabled={problemForm.publicTestCases.length <= 1}
              onClick={() => removeTestCase('public', problemForm.publicTestCases.length - 1)}
            >
              Remove Last
            </button>
          </div>
        </div>

        {/* Hidden Test Cases */}
        <div className="md:col-span-2 border border-gray-700 rounded-md p-3">
          <p className="text-sm text-gray-300 mb-2">Hidden Test Cases</p>
          <div className="flex flex-col gap-2">
            {problemForm.hiddenTestCases.map((tc, idx) => (
              <div key={`hidden-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className={inputClass}
                  value={tc.input}
                  onChange={(e) => updateTestCase('hidden', idx, 'input', e.target.value)}
                  placeholder="Input"
                />
                <input
                  className={inputClass}
                  value={tc.output}
                  onChange={(e) => updateTestCase('hidden', idx, 'output', e.target.value)}
                  placeholder="Output"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="bg-[#ffa116] text-black px-3 py-1 rounded-md"
              onClick={() => addTestCase('hidden')}
            >
              Add Hidden
            </button>
            <button
              type="button"
              className="bg-gray-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
              disabled={problemForm.hiddenTestCases.length <= 1}
              onClick={() => removeTestCase('hidden', problemForm.hiddenTestCases.length - 1)}
            >
              Remove Last
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : null}
          {editingId ? (isLoading ? 'Saving...' : 'Save Problem') : (isLoading ? 'Adding...' : 'Add Problem')}
        </button>
        {editingId && (
          <button type="button" onClick={onCancel} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">
            Cancel Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default ProblemForm;
