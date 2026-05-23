import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, LoaderCircle } from 'lucide-react';
import { createExam } from '../../services/api';
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
    <section className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Exam Builder</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          placeholder="Instructions"
        />
        {examForm.timerType === 'global' ? (
          <div>
            <input
              className={inputClass}
              type="number"
              min="1"
              value={examForm.duration}
              onChange={(event) => setExamForm((prev) => ({ ...prev, duration: event.target.value }))}
              placeholder="Duration (minutes)"
            />
            <p className="text-xs text-gray-400 mt-1">Global duration in minutes — applies to the whole exam.</p>
          </div>
        ) : (
          <div />
        )}
        <select
          className={inputClass}
          value={examForm.timerType}
          onChange={(event) => setExamForm((prev) => ({ ...prev, timerType: event.target.value }))}
        >
          <option value="global">Global</option>
          <option value="per_problem">Per Problem</option>
        </select>
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-300 mb-4">Problems</p>
        <div className="max-h-60 overflow-y-auto flex flex-col gap-4">
          {filteredProblems.map((problem) => {
            const checked = Boolean(selectedProblemMap[problem._id]);
            return (
              <div
                key={problem._id}
                className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-md border border-gray-800 gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProblem(problem._id)}
                  />
                  <span className="text-white">{problem.title || 'Untitled'}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${difficultyBadgeClass(problem.difficulty)}`}>
                  {problem.difficulty || 'Unknown'}
                </span>
                {checked ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-400 mb-1">Marks</label>
                      <input
                        className="w-28 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white"
                        type="number"
                        min="1"
                        value={selectedProblemMap[problem._id]?.marks || 10}
                        onChange={(e) =>
                          setSelectedProblemMap((prev) => ({
                            ...prev,
                            [problem._id]: { ...prev[problem._id], marks: e.target.value }
                          }))
                        }
                        placeholder="Marks"
                      />
                    </div>
                    {examForm.timerType === 'per_problem' ? (
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Time (min)</label>
                        <input
                          className="w-28 bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 text-white"
                          type="number"
                          min="1"
                          value={selectedProblemMap[problem._id]?.duration || 30}
                          onChange={(e) =>
                            setSelectedProblemMap((prev) => ({
                              ...prev,
                              [problem._id]: { ...prev[problem._id], duration: e.target.value }
                            }))
                          }
                          placeholder="Minutes"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!filteredProblems.length && <p className="text-gray-400">No problems available.</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePublishExam}
        disabled={publishingExam}
        className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {publishingExam ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
        {publishingExam ? 'Publishing...' : 'Publish Exam'}
      </button>
    </section>
  );
}

export default ExamsTab;
