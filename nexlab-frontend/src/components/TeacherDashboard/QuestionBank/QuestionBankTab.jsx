import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Library, LoaderCircle, Plus } from 'lucide-react';
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
  const [showForm, setShowForm] = useState(false);

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

      if (problemForm.problemType === 'testcase') {
        payload.publicTestCases = problemForm.publicTestCases.filter((item) => String(item.output || '').trim());
        payload.hiddenTestCases = problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim());
      }

      await createProblem(payload);
      setProblemForm(DEFAULT_PROBLEM_FORM);
      setShowForm(false);
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
    setShowForm(true);
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
    setShowForm(false);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Library size={20} className="text-amber-400" />
            Question Bank
          </h2>
          <p className="mt-1 text-sm text-white/40">Create and manage coding problems for your exams.</p>
        </div>
        <button
          type="button"
          onClick={() => { resetProblemForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110"
        >
          <Plus size={16} />
          New Problem
        </button>
      </div>

      {/* Problem Form */}
      {(showForm || editingProblemId) && (
        <div className={cardClass}>
          <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">
            {editingProblemId ? 'Edit Problem' : 'Create New Problem'}
          </h3>
          <ProblemForm
            problemForm={problemForm}
            setProblemForm={setProblemForm}
            onSubmit={editingProblemId ? handleUpdateProblem : handleCreateProblem}
            isLoading={isCreatingProblem || isSavingProblem}
            editingId={editingProblemId}
            onCancel={resetProblemForm}
          />
        </div>
      )}

      {/* Search & Filter */}
      <ProblemSearch
        query={query}
        setQuery={setQuery}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
        totalCount={problems.length}
        filteredCount={filteredProblems.length}
      />

      {/* Problem List */}
      <ProblemList
        problems={filteredProblems}
        onEdit={handleEditProblem}
        onDelete={handleDeleteProblem}
        isDeletingId={isDeletingProblemId}
      />

      {/* Delete Problem Confirmation Modal */}
      {confirmDeleteProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Delete Problem</h3>
            <p className="mt-2 text-sm text-white/60">
              Delete <span className="font-semibold text-white">{confirmDeleteProblem.title || 'Untitled'}</span>?
            </p>
            <p className="mt-2 text-xs text-white/30">This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteProblem(null)}
                disabled={isDeletingProblemId === confirmDeleteProblem._id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06] disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
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
