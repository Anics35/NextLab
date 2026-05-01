import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Save, FileCode2, Eye, EyeOff, LayoutTemplate } from 'lucide-react';

function ProblemCreator() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState([
    { input: '', expectedOutput: '', isPublic: true }
  ]);

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isPublic: false }]);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length === 1) {
      toast.error("You must have at least one test case.");
      return;
    }
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleSaveProblem = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and Description are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      // Replace this URL with your actual backend endpoint if different
      const response = await fetch('http://localhost:5001/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          testCases
        })
      });

      if (!response.ok) throw new Error("Failed to save problem");

      toast.success("Exam Problem Created Successfully!");
      setTitle('');
      setDescription('');
      setTestCases([{ input: '', expectedOutput: '', isPublic: true }]);
      
    } catch (error) {
      toast.error(error.message || "Could not save problem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCode2 color="#ffa116" size={20} />
          <h2 style={styles.title}>Exam Builder</h2>
        </div>
        <button onClick={handleSaveProblem} disabled={isSubmitting} style={styles.saveBtn}>
          <Save size={14} /> {isSubmitting ? 'Saving...' : 'Publish Exam'}
        </button>
      </div>

      <div style={styles.formGrid}>
        {/* LEFT COLUMN: PROBLEM DETAILS */}
        <div style={styles.card}>
          <div style={styles.cardHeader}><LayoutTemplate size={14} /> Problem Specification</div>
          <div style={styles.cardBody}>
            <label style={styles.label}>Problem Title</label>
            <input 
              style={styles.input} 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g., Two Sum, Reverse Linked List..." 
            />

            <label style={styles.label}>Problem Description</label>
            <textarea 
              style={styles.textarea} 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Clearly explain the problem, constraints, and edge cases..." 
            />
          </div>
        </div>

        {/* RIGHT COLUMN: TEST CASES */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
               <FileCode2 size={14} /> Test Case Manager
            </div>
            <button onClick={handleAddTestCase} style={styles.addBtn}><Plus size={12} /> Add Case</button>
          </div>
          
          <div style={styles.testCaseList}>
            {testCases.map((tc, idx) => (
              <div key={idx} style={styles.testCaseItem}>
                <div style={styles.tcHeader}>
                  <span style={styles.tcTitle}>Test Case #{idx + 1}</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleTestCaseChange(idx, 'isPublic', !tc.isPublic)}
                      style={{ ...styles.toggleBtn, color: tc.isPublic ? '#2cbb5d' : '#888' }}
                      title={tc.isPublic ? "Public (Visible to student)" : "Hidden (Used for grading)"}
                    >
                      {tc.isPublic ? <Eye size={14} /> : <EyeOff size={14} />} 
                      <span style={{fontSize: '10px'}}>{tc.isPublic ? 'Public' : 'Hidden'}</span>
                    </button>
                    <button onClick={() => handleRemoveTestCase(idx)} style={styles.deleteBtn}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div style={styles.tcBody}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Standard Input</label>
                    <textarea 
                      style={styles.tcInput} 
                      value={tc.input} 
                      onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="Input variables..."
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Expected Output</label>
                    <textarea 
                      style={styles.tcInput} 
                      value={tc.expectedOutput} 
                      onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                      placeholder="Exact output string..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', gap: '15px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#282828', padding: '15px 20px', borderRadius: '8px', border: '1px solid #333' },
  title: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#eff1f6' },
  saveBtn: { backgroundColor: '#2cbb5d', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', flex: 1, overflow: 'hidden' },
  card: { backgroundColor: '#282828', borderRadius: '8px', border: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cardHeader: { backgroundColor: '#33333366', padding: '12px 15px', borderBottom: '1px solid #333', fontSize: '11px', fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '5px', display: 'block' },
  input: { backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#eff1f6', fontSize: '13px', width: '100%', outline: 'none' },
  textarea: { backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#eff1f6', fontSize: '13px', width: '100%', outline: 'none', flex: 1, resize: 'none', fontFamily: 'monospace' },
  addBtn: { backgroundColor: '#ffa11622', color: '#ffa116', border: '1px solid #ffa11644', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  testCaseList: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1 },
  testCaseItem: { backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden' },
  tcHeader: { backgroundColor: '#111', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' },
  tcTitle: { fontSize: '12px', fontWeight: 'bold', color: '#ffa116' },
  tcBody: { padding: '15px', display: 'flex', gap: '10px' },
  tcInput: { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', padding: '8px', color: '#fff', fontSize: '12px', width: '100%', height: '80px', resize: 'none', fontFamily: 'monospace', outline: 'none' },
  deleteBtn: { background: 'none', border: 'none', color: '#ff5f56', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  toggleBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }
};

export default ProblemCreator;