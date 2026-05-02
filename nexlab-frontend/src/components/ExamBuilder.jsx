import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DEFAULT = {
  title: '',
  instructions: '',
  courseId: '',
  totalDuration: 60,
  timerType: 'global',
  navigationControl: false,
  startTime: '',
  endTime: ''
};

function ExamBuilder({ courses = [], problems = [], publishing = false, onPublish }) {
  const [form, setForm] = useState(DEFAULT);
  const [selectedMap, setSelectedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('teacher_exam_selected_problems') || '{}');
    } catch {
      return {};
    }
  });

  const selectedIds = useMemo(() => Object.keys(selectedMap), [selectedMap]);

  const visibleProblems = useMemo(() => {
    const byId = new Map();
    problems.forEach((item) => {
      if (!byId.has(item._id)) {
        byId.set(item._id, item);
      }
    });
    return [...byId.values()];
  }, [problems]);

  const persist = (next) => {
    setSelectedMap(next);
    localStorage.setItem('teacher_exam_selected_problems', JSON.stringify(next));
  };

  const toggleProblem = (problemId) => {
    const next = { ...selectedMap };
    if (next[problemId]) {
      delete next[problemId];
    } else {
      next[problemId] = { marks: 10 };
    }
    persist(next);
  };

  const updateConfig = (problemId, value) => {
    persist({ ...selectedMap, [problemId]: { ...selectedMap[problemId], marks: value } });
  };

  const publish = async () => {
    if (!form.title.trim() || !form.courseId) {
      toast.error('Exam title and course are required.');
      return;
    }

    if (!selectedIds.length) {
      toast.error('Select at least one problem.');
      return;
    }

    const cleanedProblems = selectedIds.map((problemId) => ({
      problemId,
      marks: Number(selectedMap[problemId]?.marks || 0)
    }));

    if (cleanedProblems.some((item) => !Number.isFinite(item.marks) || item.marks <= 0)) {
      toast.error('Each problem must have marks greater than 0.');
      return;
    }

    await onPublish?.({ ...form, problems: cleanedProblems });
  };

  const publishDisabled = publishing || !visibleProblems.length || !selectedIds.length;

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Exam Builder</h3>
      <div style={styles.row}>
        <input style={styles.input} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Exam title" />
        <select style={styles.input} value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}>
          <option value="">Select course</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
        </select>
      </div>

      <textarea style={styles.textarea} value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="Instructions" />

      <div style={styles.row}>
        <input type="number" min="1" style={styles.input} value={form.totalDuration} onChange={(e) => setForm((p) => ({ ...p, totalDuration: e.target.value }))} placeholder="Duration" />
        <select style={styles.input} value={form.timerType} onChange={(e) => setForm((p) => ({ ...p, timerType: e.target.value }))}>
          <option value="global">global</option>
          <option value="per-problem">per-problem</option>
        </select>
      </div>

      <div style={styles.list}>
        {!visibleProblems.length ? (
          <div style={styles.empty}>No problems found</div>
        ) : (
          visibleProblems.map((problem) => {
            const selected = Boolean(selectedMap[problem._id]);
            return (
              <div key={problem._id} style={styles.card}>
                <label style={styles.checkLine}>
                  <input type="checkbox" checked={selected} onChange={() => toggleProblem(problem._id)} />
                  <span>{problem.title}</span>
                  <span style={styles.diff}>{problem.difficulty}</span>
                </label>
                {selected ? (
                  <input type="number" min="1" style={styles.marks} value={selectedMap[problem._id].marks} onChange={(e) => updateConfig(problem._id, e.target.value)} placeholder="Marks" />
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <button type="button" onClick={publish} disabled={publishDisabled} style={styles.btnPrimary}>
        <Save size={14} /> {publishing ? 'Publishing...' : 'Publish Exam'}
      </button>
    </div>
  );
}

const styles = {
  wrap: { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, overflow: 'auto' },
  title: { margin: 0, fontSize: 16 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  input: { background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '10px 12px', outline: 'none' },
  textarea: { minHeight: 90, background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '10px 12px', outline: 'none', resize: 'vertical' },
  list: { border: '1px solid #222', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 180 },
  card: { border: '1px solid #2d2d2d', borderRadius: 8, padding: 10, background: '#0a0a0a' },
  checkLine: { display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 8, alignItems: 'center', cursor: 'pointer' },
  diff: { fontSize: 11, color: '#aaa', textTransform: 'uppercase' },
  marks: { marginTop: 8, width: 120, background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '8px 10px', outline: 'none' },
  btnPrimary: { background: '#2cbb5d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  empty: { color: '#888', textAlign: 'center', padding: 12 }
};

export default ExamBuilder;
