import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
import { createProblem } from '../services/codeService';

const DEFAULT_CASE = { input: '', expectedOutput: '', isPublic: true };

function ProblemBuilder({ onProblemCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [testCases, setTestCases] = useState([DEFAULT_CASE]);
  const [saving, setSaving] = useState(false);

  const updateCase = (index, field, value) => {
    setTestCases((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addCase = () => setTestCases((prev) => [...prev, { ...DEFAULT_CASE, isPublic: false }]);

  const removeCase = (index) => {
    setTestCases((prev) => {
      if (prev.length === 1) {
        toast.error('At least one test case is required.');
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const saveProblem = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    if (testCases.some((item) => !String(item.expectedOutput || '').trim())) {
      toast.error('Each test case requires expected output.');
      return;
    }

    setSaving(true);
    try {
      await createProblem({
        title: title.trim(),
        description: description.trim(),
        difficulty,
        testCases: testCases.map((item) => ({
          input: String(item.input || ''),
          expectedOutput: String(item.expectedOutput || '').trim(),
          isPublic: Boolean(item.isPublic)
        }))
      });
      toast.success('Problem saved.');
      setTitle('');
      setDescription('');
      setDifficulty('easy');
      setTestCases([DEFAULT_CASE]);
      onProblemCreated?.();
    } catch (error) {
      toast.error(error.message || 'Unable to save problem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.title}>Problem Builder</h3>
        <button type="button" onClick={saveProblem} disabled={saving} style={styles.btnPrimary}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save Problem'}
        </button>
      </div>

      <div style={styles.formRow}>
        <input style={styles.input} placeholder="Problem title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select style={styles.input} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
      </div>

      <textarea style={styles.textarea} placeholder="Problem description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <div style={styles.caseHead}>
        <span>Test Cases</span>
        <button type="button" onClick={addCase} style={styles.btnGhost}><Plus size={14} /> Add</button>
      </div>

      <div style={styles.caseList}>
        {testCases.map((testCase, idx) => (
          <div key={idx} style={styles.caseCard}>
            <div style={styles.caseTop}>
              <strong>#{idx + 1}</strong>
              <div style={styles.caseControls}>
                <label style={styles.toggleLabel}>
                  <input type="checkbox" checked={testCase.isPublic} onChange={(e) => updateCase(idx, 'isPublic', e.target.checked)} /> public
                </label>
                <button type="button" onClick={() => removeCase(idx)} style={styles.deleteBtn}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={styles.formRow}>
              <textarea style={styles.smallText} placeholder="Input" value={testCase.input} onChange={(e) => updateCase(idx, 'input', e.target.value)} />
              <textarea style={styles.smallText} placeholder="Expected Output" value={testCase.expectedOutput} onChange={(e) => updateCase(idx, 'expectedOutput', e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, height: '100%', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 16 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 },
  input: { background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '10px 12px', outline: 'none' },
  textarea: { minHeight: 110, background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '10px 12px', outline: 'none', resize: 'vertical' },
  caseHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700 },
  caseList: { display: 'flex', flexDirection: 'column', gap: 10 },
  caseCard: { border: '1px solid #2d2d2d', borderRadius: 8, padding: 10, background: '#0a0a0a' },
  caseTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  caseControls: { display: 'flex', alignItems: 'center', gap: 8 },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  smallText: { minHeight: 72, background: '#080808', border: '1px solid #2d2d2d', color: '#eff1f6', borderRadius: 8, padding: '8px 10px', outline: 'none', resize: 'vertical' },
  btnPrimary: { background: '#2cbb5d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  btnGhost: { background: '#111', color: '#ddd', border: '1px solid #2d2d2d', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', color: '#ff5f56', border: 'none', display: 'flex', cursor: 'pointer' }
};

export default ProblemBuilder;
