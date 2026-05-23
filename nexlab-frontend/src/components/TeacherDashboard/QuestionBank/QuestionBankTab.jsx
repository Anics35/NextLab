import { useMemo } from 'react';
import { toast } from 'react-hot-toast';
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
        publicTestCases: problemForm.publicTestCases.filter((item) => String(item.output || '').trim()),
        hiddenTestCases: problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim())
      };
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
        publicTestCases: problemForm.publicTestCases.filter((item) => String(item.output || '').trim()),
        hiddenTestCases: problemForm.hiddenTestCases.filter((item) => String(item.output || '').trim())
      };
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
    const shouldDelete = window.confirm(`Delete problem "${problem.title || 'Untitled'}"? This cannot be undone.`);
    if (!shouldDelete) return;

    setIsDeletingProblemId(problem._id);
    try {
      await deleteProblem(problem._id);
      toast.success('Problem deleted.');
      if (editingProblemId === problem._id) {
        resetProblemForm();
      }
      await onRefresh();
    } catch (error) {
      toast.error(error.message || 'Unable to delete problem.');
    } finally {
      setIsDeletingProblemId('');
    }
  };

  const handleEditProblem = (problem) => {
    setEditingProblemId(problem._id);
    setProblemForm({
      title: problem.title || '',
      description: problem.description || '',
      difficulty: problem.difficulty || 'easy',
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
    </section>
  );
}

export default QuestionBankTab;
