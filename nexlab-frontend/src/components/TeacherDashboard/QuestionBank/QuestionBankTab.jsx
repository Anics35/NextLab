import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LoaderCircle } from 'lucide-react';
import { createProblem, updateProblem, deleteProblem } from '../../../services/api';
import { cardClass, DEFAULT_PROBLEM_FORM } from '../constants';
import ProblemForm from './ProblemForm';
import ProblemList from './ProblemList';
import ProblemSearch from './ProblemSearch';

function QuestionBankTab({
  problems,
  query,
  setQuery,
  difficultyFilter,
  setDifficultyFilter,
  problemForm,
  setProblemForm,
  editingProblemId,
  setEditingProblemId,
  isCreatingProblem,
  setIsCreatingProblem,
  isSavingProblem,
  setIsSavingProblem,
  isDeletingProblemId,
  setIsDeletingProblemId,
  onRefresh
}) {
  const filteredProblems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const titleMatch = !normalized || String(problem.title || '').toLowerCase().includes(normalized);
      const difficultyMatch = difficultyFilter === 'all' || String(problem.difficulty || '').toLowerCase() === difficultyFilter;
      return titleMatch && difficultyMatch;
    });
  }, [difficultyFilter, problems, query]);

  const [confirmDeleteProblem, setConfirmDeleteProblem] = useState(null);

  const handleCreateProblem = async () => {
    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      toast.error('Problem title and description are required.');
      return;
    }
    setIsCreatingProblem(true);
    try {
      const payload = {
        title: problemForm.title.trim(),
        description: problemForm.description.trim(),
        difficulty: problemForm.difficulty,
        problemType: problemForm.problemType || 'testcase'
      };

      // Only include test cases for testcase problems
      if (problemForm.problemType === 'testcase') {
        payload.publicTestCases = problemForm.publicTestCases.filter((item) => String(item.output || '').trim());
        payload.hiddenTestCases = problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim());
      }

      await createProblem(payload);
      setProblemForm(DEFAULT_PROBLEM_FORM);
      toast.success('Problem created.');
      await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Unable to create problem.');
    } finally {
      setIsCreatingProblem(false);
    }
  };

  const handleUpdateProblem = async () => {
    if (!editingProblemId) {
      toast.error('Select a problem to edit first.');
      return;
    }
    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      toast.error('Problem title and description are required.');
      return;
    }

    setIsSavingProblem(true);
    try {
      const payload = {
        title: problemForm.title.trim(),
        description: problemForm.description.trim(),
        difficulty: problemForm.difficulty,
        problemType: problemForm.problemType || 'testcase'
      };

      // Only include test cases for testcase problems
      if (problemForm.problemType === 'testcase') {
        payload.publicTestCases = problemForm.publicTestCases.filter((item) => String(item.output || '').trim());
        payload.hiddenTestCases = problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim());
      }

      await updateProblem(editingProblemId, payload);
      toast.success('Problem updated.');
      resetProblemForm();
      await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Unable to update problem.');
    } finally {
      setIsSavingProblem(false);
    }
  };

  const handleDeleteProblem = async (problem) => {
    setConfirmDeleteProblem(problem);
  };

  const handleEditProblem = (problem) => {
    setEditingProblemId(problem._id);
    setProblemForm({
      title: problem.title || '',
      description: problem.description || '',
      difficulty: problem.difficulty || 'easy',
      problemType: problem.problemType || 'testcase',
      publicTestCases: (problem.publicTestCases || []).length
        ? problem.publicTestCases.map((item) => ({ input: item.input || '', output: item.output || '' }))
        : [{ input: '', output: '' }],
      hiddenTestCases: (problem.hiddenTestCases || []).length
        ? problem.hiddenTestCases.map((item) => ({ input: item.input || '', output: item.output || '' }))
        : [{ input: '', output: '' }]
    });
  };

  const resetProblemForm = () => {
    setProblemForm(DEFAULT_PROBLEM_FORM);
    setEditingProblemId('');
  };

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Question Bank</h2>
      <ProblemForm
        problemForm={problemForm}
        setProblemForm={setProblemForm}
        onSubmit={editingProblemId ? handleUpdateProblem : handleCreateProblem}
        isLoading={isCreatingProblem || isSavingProblem}
        editingId={editingProblemId}
        onCancel={resetProblemForm}
      />
      <ProblemSearch
        query={query}
        setQuery={setQuery}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
      />
      <ProblemList
        problems={filteredProblems}
        onEdit={handleEditProblem}
        onDelete={handleDeleteProblem}
        isDeletingId={isDeletingProblemId}
      />

      {/* Delete Problem Confirmation Modal */}
      {confirmDeleteProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-gray-800 bg-[#0a0a0a] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Delete Problem</h3>
            <p className="mt-2 text-gray-300">
              Are you sure you want to delete <span className="font-semibold">{confirmDeleteProblem.title || 'Untitled'}</span>?
            </p>
            <p className="mt-3 text-sm text-gray-400">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteProblem(null)}
                disabled={isDeletingProblemId === confirmDeleteProblem._id}
                className="rounded-md border border-gray-700 bg-gray-900/50 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingProblemId(confirmDeleteProblem._id);
                  try {
                    await deleteProblem(confirmDeleteProblem._id);
                    toast.success('Problem deleted.');
                    if (editingProblemId === confirmDeleteProblem._id) {
                      resetProblemForm();
                    }
                    setConfirmDeleteProblem(null);
                    await onRefresh();
                  } catch (error) {
                    toast.error(error.message || 'Unable to delete problem.');
                  } finally {
                    setIsDeletingProblemId('');
                  }
                }}
                disabled={isDeletingProblemId === confirmDeleteProblem._id}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingProblemId === confirmDeleteProblem._id && <LoaderCircle size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuestionBankTab;
