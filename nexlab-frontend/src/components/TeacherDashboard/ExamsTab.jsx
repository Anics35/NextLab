import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { LoaderCircle, Rocket } from 'lucide-react';
import { cardClass, inputClass, DEFAULT_EXAM_FORM, difficultyBadgeClass } from './constants';

function ExamsTab({
  courses,
  problems,
  examForm,
  setExamForm,
  selectedProblemMap,
  setSelectedProblemMap,
  onPublish
}) {
  const [publishingExam, setPublishingExam] = useState(false);

  const filteredProblems = useMemo(() => {
    return problems;
  }, [problems]);

  const toggleProblem = (problemId) => {
    setSelectedProblemMap((prev) => {
      if (prev[problemId]) {
        const next = { ...prev };
        delete next[problemId];
        return next;
      }
      return { ...prev, [problemId]: { marks: 10, duration: 30 } };
    });
  };

  const selectedCount = Object.keys(selectedProblemMap).length;

  const handlePublishExam = async () => {
    const selectedIds = Object.keys(selectedProblemMap);
    if (!examForm.title.trim() || !examForm.courseId || selectedIds.length === 0) {
      toast.error('Exam title, course and at least one problem are required.');
      return;
    }

    const payloadProblems = selectedIds.map((problemId) => ({
      problemId,
      marks: Number(selectedProblemMap[problemId]?.marks || 0),
      duration: examForm.timerType === 'per_problem' ? Number(selectedProblemMap[problemId]?.duration || 0) : undefined
    }));

    if (payloadProblems.some((item) => !Number.isFinite(item.marks) || item.marks <= 0)) {
      toast.error('Each selected problem needs marks > 0.');
      return;
    }

    if (examForm.timerType === 'per_problem' && payloadProblems.some((item) => !Number.isFinite(item.duration) || item.duration <= 0)) {
      toast.error('Each selected problem needs duration in per_problem mode.');
      return;
    }

    setPublishingExam(true);
    try {
      const payload = {
        courseId: examForm.courseId,
        title: examForm.title,
        instructions: examForm.instructions,
        timerType: examForm.timerType,
        duration: Number(examForm.duration),
        problems: payloadProblems,
        navigationControl: true
      };
      await onPublish(payload);
      toast.success('Exam published.');
      setExamForm((prev) => ({ ...DEFAULT_EXAM_FORM, courseId: prev.courseId }));
      setSelectedProblemMap({});
    } catch (error) {
      toast.error(error.message || 'Unable to publish exam.');
    } finally {
      setPublishingExam(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Exam Builder</h2>
        <p className="mt-1 text-sm text-white/40">Create and publish exams for your courses.</p>
      </div>

      {/* Exam Details */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">Exam Details</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className={inputClass}
            value={examForm.title}
            onChange={(event) => setExamForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Exam title"
          />
          <select
            className={inputClass}
            value={examForm.courseId}
            onChange={(event) => setExamForm((prev) => ({ ...prev, courseId: event.target.value }))}
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
          <textarea
            className={`${inputClass} resize-none md:col-span-2`}
            rows={3}
            value={examForm.instructions}
            onChange={(event) => setExamForm((prev) => ({ ...prev, instructions: event.target.value }))}
            placeholder="Instructions for students"
          />
          <select
            className={inputClass}
            value={examForm.timerType}
            onChange={(event) => setExamForm((prev) => ({ ...prev, timerType: event.target.value }))}
          >
            <option value="global">Global Timer</option>
            <option value="per_problem">Per Problem Timer</option>
          </select>
          {examForm.timerType === 'global' && (
            <div>
              <input
                className={inputClass}
                type="number"
                min="1"
                value={examForm.duration}
                onChange={(event) => setExamForm((prev) => ({ ...prev, duration: event.target.value }))}
                placeholder="Duration (minutes)"
              />
              <p className="mt-1 text-[11px] text-white/30">Total exam duration in minutes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Problem Selection */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Select Problems</h3>
          {selectedCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filteredProblems.map((problem) => {
            const checked = Boolean(selectedProblemMap[problem._id]);
            return (
              <div
                key={problem._id}
                className={`rounded-xl border p-3 transition-all ${
                  checked
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProblem(problem._id)}
                      className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                    />
                    <span className="truncate text-sm text-white">{problem.title || 'Untitled'}</span>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>
                    {problem.difficulty || 'Unknown'}
                  </span>
                </div>
                {checked && (
                  <div className="mt-3 ml-7 flex gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-white/30 mb-1">Marks</label>
                      <input
                        className="w-24 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/40"
                        type="number"
                        min="1"
                        value={selectedProblemMap[problem._id]?.marks || 10}
                        onChange={(e) =>
                          setSelectedProblemMap((prev) => ({
                            ...prev,
                            [problem._id]: { ...prev[problem._id], marks: e.target.value }
                          }))
                        }
                      />
                    </div>
                    {examForm.timerType === 'per_problem' && (
                      <div className="flex flex-col">
                        <label className="text-[10px] text-white/30 mb-1">Time (min)</label>
                        <input
                          className="w-24 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/40"
                          type="number"
                          min="1"
                          value={selectedProblemMap[problem._id]?.duration || 30}
                          onChange={(e) =>
                            setSelectedProblemMap((prev) => ({
                              ...prev,
                              [problem._id]: { ...prev[problem._id], duration: e.target.value }
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!filteredProblems.length && (
            <p className="py-8 text-center text-sm text-white/30">No problems available. Create some in the Question Bank first.</p>
          )}
        </div>
      </div>

      {/* Publish Button */}
      <button
        type="button"
        onClick={handlePublishExam}
        disabled={publishingExam}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110 disabled:opacity-50"
      >
        {publishingExam ? <LoaderCircle size={16} className="animate-spin" /> : <Rocket size={16} />}
        {publishingExam ? 'Publishing...' : 'Publish Exam'}
      </button>
    </section>
  );
}

export default ExamsTab;
