import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProblems } from '../services/codeService';

function QuestionBank({ selected = [], onChange }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getProblems();
        if (mounted) {
          setProblems(data || []);
        }
      } catch (error) {
        toast.error(error.message || 'Unable to fetch problems.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (problemId) => {
    if (selectedSet.has(problemId)) {
      onChange?.(selected.filter((id) => id !== problemId));
      return;
    }

    onChange?.([...selected, problemId]);
  };

  if (loading) {
    return <div style={styles.center}><Loader2 size={18} className="spin" /> Loading problems...</div>;
  }

  if (!problems.length) {
    return <div style={styles.center}>No problems found</div>;
  }

  return (
    <div style={styles.list}>
      {problems.map((problem) => (
        <label key={problem._id} style={styles.card}>
          <input type="checkbox" checked={selectedSet.has(problem._id)} onChange={() => toggle(problem._id)} />
          <span style={styles.title}>{problem.title}</span>
          <span style={styles.diff}>{problem.difficulty}</span>
        </label>
      ))}
    </div>
  );
}

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: 10, padding: 16, overflow: 'auto', height: '100%' },
  card: { display: 'grid', gridTemplateColumns: '16px 1fr auto', alignItems: 'center', gap: 10, border: '1px solid #2d2d2d', borderRadius: 8, background: '#0a0a0a', padding: '10px 12px', cursor: 'pointer' },
  title: { fontSize: 13, fontWeight: 600 },
  diff: { fontSize: 11, color: '#aaa', textTransform: 'uppercase' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', gap: 8 }
};

export default QuestionBank;
